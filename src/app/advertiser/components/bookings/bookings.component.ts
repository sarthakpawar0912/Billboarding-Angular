import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdvertiserService, AdvertiserBooking, AdvertiserBillboard, CreateBookingRequest, BookingStatus, PricePreviewResponse, DayAvailability } from '../../../services/advertiser.service';
import { PaymentService, RazorpayResponse } from '../../../services/payment.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { InvoiceComponent, InvoiceData } from '../../../shared/components/invoice/invoice.component';
import { AvailabilityCalendarComponent } from '../../../shared/components/availability-calendar/availability-calendar.component';

@Component({
  selector: 'app-advertiser-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, InvoiceComponent, AvailabilityCalendarComponent],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class AdvertiserBookingsComponent implements OnInit {
  // State signals
  bookings = signal<AdvertiserBooking[]>([]);
  billboards = signal<AdvertiserBillboard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);

  // Filter and search
  statusFilter = signal<'all' | BookingStatus>('all');
  searchTerm = signal('');

  // Modal states
  showCreateModal = signal(false);
  showDetailModal = signal(false);
  showCancelModal = signal(false);
  showInvoiceModal = signal(false);
  selectedBooking = signal<AdvertiserBooking | null>(null);
  invoiceData = signal<InvoiceData | null>(null);

  // Create booking form
  selectedBillboard = signal<AdvertiserBillboard | null>(null);
  bookingStartDate = '';
  bookingEndDate = '';

  // ================= PRICE PREVIEW (FROM BACKEND - AUTHORITATIVE) =================
  // CRITICAL: Never calculate prices locally. Always fetch from backend.
  pricePreview = signal<PricePreviewResponse | null>(null);
  pricePreviewLoading = signal(false);
  pricePreviewError = signal<string | null>(null);

  // Legacy signals for template compatibility (populated from pricePreview)
  calculatedDays = signal(0);
  calculatedBaseAmount = signal(0);      // Base amount AFTER discount
  calculatedCommission = signal(0);       // Platform fee
  calculatedGst = signal(0);              // GST
  calculatedTotal = signal(0);            // Total payable

  // Discount display
  calculatedDiscount = signal(0);         // Discount amount
  calculatedDiscountPercent = signal(0);  // Discount %
  originalBaseAmount = signal(0);         // Original base before discount

  // Success/Error messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Payment state
  paymentProcessing = signal<number | null>(null);

  // Computed filtered bookings
  filteredBookings = computed(() => {
    const status = this.statusFilter();
    const term = this.searchTerm().toLowerCase();
    let result = this.bookings();

    if (status !== 'all') {
      result = result.filter(b => b.status === status);
    }

    if (term) {
      result = result.filter(b =>
        b.billboardTitle?.toLowerCase().includes(term) ||
        b.billboardLocation?.toLowerCase().includes(term) ||
        b.ownerName?.toLowerCase().includes(term)
      );
    }

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // Computed stats
  stats = computed(() => ({
    total: this.bookings().length,
    pending: this.bookings().filter(b => b.status === 'PENDING').length,
    approved: this.bookings().filter(b => b.status === 'APPROVED').length,
    completed: this.bookings().filter(b => b.status === 'COMPLETED').length,
    cancelled: this.bookings().filter(b => b.status === 'CANCELLED' || b.status === 'CANCELLED_NO_REFUND').length,
    cancelledNoRefund: this.bookings().filter(b => b.status === 'CANCELLED_NO_REFUND').length,
    rejected: this.bookings().filter(b => b.status === 'REJECTED').length,
    totalSpent: this.bookings()
      .filter(b => b.paymentStatus === 'PAID')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
    unpaidAmount: this.bookings()
      .filter(b => b.status === 'APPROVED' && b.paymentStatus !== 'PAID')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0)
  }));

  // Today's date for min date validation
  today = new Date().toISOString().split('T')[0];

  constructor(
    private advertiserService: AdvertiserService,
    private paymentService: PaymentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load bookings
    this.advertiserService.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error.set('Failed to load your bookings. Please try again.');
        this.loading.set(false);
      }
    });

    // Load billboards for create booking modal
    this.advertiserService.getAvailableBillboards().subscribe({
      next: (billboards) => {
        this.billboards.set(billboards);
      },
      error: (err) => {
        console.error('Error loading billboards:', err);
      }
    });
  }

  // Filter functions
  setStatusFilter(status: 'all' | BookingStatus): void {
    this.statusFilter.set(status);
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  // Create Booking Modal
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.selectedBillboard.set(null);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    // Reset all price signals (use backend values only)
    this.resetPriceSignals();
    this.pricePreviewError.set(null);
    this.clearMessages();
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.selectedBillboard.set(null);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
  }

  selectBillboard(billboard: AdvertiserBillboard): void {
    this.selectedBillboard.set(billboard);
    // Reset dates when billboard changes
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.resetPriceSignals();
  }

  // Handle date selection from availability calendar
  onCalendarDateSelected(event: { startDate: string; endDate: string; totalPrice: number; days: number }): void {
    this.bookingStartDate = event.startDate;
    this.bookingEndDate = event.endDate;
    // Fetch authoritative price from backend (not calendar's sum)
    this.calculateTotal();
  }

  // Handle availability data loaded from calendar
  onAvailabilityLoaded(availability: DayAvailability[]): void {
    // Can be used for additional logic if needed
    console.log('Availability loaded:', availability.length, 'days');
  }

  /**
   * Fetch price preview from backend.
   * CRITICAL: This is the SINGLE SOURCE OF TRUTH for prices.
   * Never calculate prices locally - always fetch from backend.
   */
  calculateTotal(): void {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.bookingStartDate || !this.bookingEndDate) {
      this.resetPriceSignals();
      return;
    }

    // Validate dates before calling API
    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);
    if (end < start) {
      this.resetPriceSignals();
      return;
    }

    // Fetch price preview from backend (AUTHORITATIVE)
    this.pricePreviewLoading.set(true);
    this.pricePreviewError.set(null);

    this.advertiserService.getPricePreview(
      billboard.id,
      this.bookingStartDate,
      this.bookingEndDate
    ).subscribe({
      next: (preview) => {
        this.pricePreview.set(preview);
        this.pricePreviewLoading.set(false);

        // Update legacy signals for template compatibility
        this.calculatedDays.set(preview.totalDays);
        this.calculatedBaseAmount.set(preview.baseAmount);
        this.calculatedCommission.set(preview.commissionAmount);
        this.calculatedGst.set(preview.gstAmount);
        this.calculatedTotal.set(preview.totalAmount);

        // Discount signals
        this.originalBaseAmount.set(preview.originalBaseAmount);
        this.calculatedDiscountPercent.set(preview.discountPercent || 0);
        this.calculatedDiscount.set(preview.discountAmount || 0);
      },
      error: (err) => {
        console.error('Error fetching price preview:', err);
        this.pricePreviewError.set('Failed to calculate price. Please try again.');
        this.pricePreviewLoading.set(false);
        this.resetPriceSignals();
      }
    });
  }

  /**
   * Reset all price signals to zero.
   */
  private resetPriceSignals(): void {
    this.pricePreview.set(null);
    this.calculatedDays.set(0);
    this.calculatedBaseAmount.set(0);
    this.calculatedCommission.set(0);
    this.calculatedGst.set(0);
    this.calculatedTotal.set(0);
    this.originalBaseAmount.set(0);
    this.calculatedDiscountPercent.set(0);
    this.calculatedDiscount.set(0);
  }

  confirmCreateBooking(): void {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.bookingStartDate || !this.bookingEndDate) {
      this.errorMessage.set('Please fill all booking details.');
      return;
    }

    if (new Date(this.bookingStartDate) > new Date(this.bookingEndDate)) {
      this.errorMessage.set('End date must be after start date.');
      return;
    }

    this.processing.set(true);

    const request: CreateBookingRequest = {
      billboardId: billboard.id,
      startDate: this.bookingStartDate,
      endDate: this.bookingEndDate
    };

    this.advertiserService.createBooking(request).subscribe({
      next: (booking) => {
        this.processing.set(false);
        this.closeCreateModal();
        this.successMessage.set('Booking created successfully! Waiting for owner approval.');
        this.loadData();
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create booking. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Detail Modal
  openDetailModal(booking: AdvertiserBooking): void {
    this.selectedBooking.set(booking);
    this.showDetailModal.set(true);
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedBooking.set(null);
  }

  // Cancel Modal
  openCancelModal(booking: AdvertiserBooking): void {
    this.selectedBooking.set(booking);
    this.showCancelModal.set(true);
    this.clearMessages();
  }

  closeCancelModal(): void {
    this.showCancelModal.set(false);
    this.selectedBooking.set(null);
  }

  // Invoice Modal
  openInvoiceModal(booking: AdvertiserBooking): void {
    const user = this.authService.currentUser();
    const days = this.getDaysDiff(booking.startDate, booking.endDate);

    // ================= ALL AMOUNTS FROM BACKEND (AUTHORITATIVE) =================
    // Use actual amounts from booking (already calculated by backend)
    const originalAmount = booking.originalBaseAmount || booking.baseAmount;
    const discountPercent = booking.discountPercent || 0;
    const discountAmount = booking.discountAmount || 0;
    const baseAmount = booking.baseAmount;           // Base AFTER discount
    const commissionAmount = booking.commissionAmount;  // Platform fee
    const taxableValue = baseAmount + commissionAmount;
    const ratePerDay = originalAmount / days;  // Rate before discount

    // Use LOCKED commission % from booking (set at payment time)
    const commissionPercent = booking.commissionPercent
      ?? (baseAmount > 0 ? (commissionAmount / baseAmount) * 100 : 15);

    // GST from backend
    const gstPercent = booking.gstPercentage ?? 18;
    const cgstRate = gstPercent / 2;
    const sgstRate = gstPercent / 2;
    const cgstAmount = booking.gstAmount / 2;
    const sgstAmount = booking.gstAmount / 2;
    const totalGst = booking.gstAmount;

    // Total is what customer paid (already includes GST)
    const totalAmount = booking.totalAmount;

    // Generate invoice number
    const invoiceNo = `INV-${String(booking.id).padStart(4, '0')}`;

    this.invoiceData.set({
      invoiceNo: invoiceNo,
      invoiceDate: booking.paymentDate || new Date().toISOString(),
      // Seller details
      sellerName: 'Billboard & Hoarding Pvt Ltd',
      sellerGstin: '27ABCDE1234F1Z5',
      sellerAddress: '123 Business Park, Andheri East, Mumbai - 400069',
      sellerState: 'Maharashtra',
      sellerStateCode: '27',
      // Buyer details
      buyerName: user?.name || 'Customer',
      buyerEmail: user?.email || '',
      buyerPhone: (user as any)?.phone || '',
      buyerState: 'Maharashtra',
      buyerStateCode: '27',
      // Service details
      billboardName: booking.billboardTitle || `Billboard #${booking.billboardId}`,
      fromDate: booking.startDate,
      toDate: booking.endDate,
      days: days,
      ratePerDay: ratePerDay,
      // Discount breakdown (from backend)
      originalAmount: originalAmount,
      discountPercent: discountPercent,
      discountAmount: discountAmount,
      amount: baseAmount,  // Base AFTER discount
      // Platform Commission
      commissionAmount: commissionAmount,
      commissionPercent: commissionPercent,
      // Tax
      subtotal: taxableValue,
      cgstRate: cgstRate,
      cgstAmount: cgstAmount,
      sgstRate: sgstRate,
      sgstAmount: sgstAmount,
      totalGst: totalGst,
      totalAmount: totalAmount,
      // Payment
      paymentId: booking.razorpayPaymentId || '',
      orderId: booking.razorpayOrderId || '',
      // SAC Code
      sacCode: '998365'
    });

    this.selectedBooking.set(booking);
    this.showInvoiceModal.set(true);
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal.set(false);
    this.invoiceData.set(null);
  }

  // Check if booking can be cancelled
  canCancel(booking: AdvertiserBooking): boolean {
    return booking.status === 'PENDING' || booking.status === 'APPROVED';
  }

  // Check if cancellation will result in no refund (paid bookings)
  isNoRefundCancellation(booking: AdvertiserBooking): boolean {
    return booking.status === 'APPROVED' && booking.paymentStatus === 'PAID';
  }

  confirmCancel(): void {
    const booking = this.selectedBooking();
    if (!booking) return;

    this.processing.set(true);

    // Use different API endpoint based on payment status
    const isAfterPayment = this.isNoRefundCancellation(booking);
    const cancelObservable = isAfterPayment
      ? this.advertiserService.cancelBookingAfterPayment(booking.id)
      : this.advertiserService.cancelBooking(booking.id);

    cancelObservable.subscribe({
      next: () => {
        this.processing.set(false);
        this.closeCancelModal();

        // Different message based on refund status
        if (isAfterPayment) {
          this.successMessage.set('Booking cancelled. No refund will be issued as per policy.');
          this.bookings.update(bookings =>
            bookings.map(b => b.id === booking.id ? { ...b, status: 'CANCELLED_NO_REFUND' as const } : b)
          );
        } else {
          this.successMessage.set('Booking cancelled successfully.');
          this.bookings.update(bookings =>
            bookings.map(b => b.id === booking.id ? { ...b, status: 'CANCELLED' as const } : b)
          );
        }

        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to cancel booking.');
        this.autoHideMessage();
      }
    });
  }

  // Get booking flow steps for timeline
  getBookingFlowSteps(booking: AdvertiserBooking): { step: string; label: string; status: 'completed' | 'active' | 'pending' | 'failed'; icon: string }[] {
    type StepStatus = 'completed' | 'active' | 'pending' | 'failed';

    const steps: { step: string; label: string; status: StepStatus; icon: string }[] = [
      { step: 'created', label: 'Booking Created', status: 'completed', icon: '📝' },
      { step: 'pending', label: 'Awaiting Approval', status: 'pending', icon: '⏳' },
      { step: 'approved', label: 'Owner Approved', status: 'pending', icon: '✅' },
      { step: 'paid', label: 'Payment Done', status: 'pending', icon: '💳' },
      { step: 'active', label: 'Campaign Active', status: 'pending', icon: '🎯' }
    ];

    if (booking.status === 'CANCELLED') {
      return [
        { step: 'created', label: 'Booking Created', status: 'completed', icon: '📝' },
        { step: 'cancelled', label: 'Cancelled', status: 'failed', icon: '🚫' }
      ];
    }

    if (booking.status === 'CANCELLED_NO_REFUND') {
      return [
        { step: 'created', label: 'Booking Created', status: 'completed', icon: '📝' },
        { step: 'approved', label: 'Owner Approved', status: 'completed', icon: '✅' },
        { step: 'paid', label: 'Payment Done', status: 'completed', icon: '💳' },
        { step: 'cancelled', label: 'Cancelled (No Refund)', status: 'failed', icon: '🚫' }
      ];
    }

    if (booking.status === 'REJECTED') {
      return [
        { step: 'created', label: 'Booking Created', status: 'completed', icon: '📝' },
        { step: 'pending', label: 'Sent for Approval', status: 'completed', icon: '⏳' },
        { step: 'rejected', label: 'Rejected by Owner', status: 'failed', icon: '❌' }
      ];
    }

    // Mark steps based on current status
    if (booking.status === 'PENDING') {
      steps[1].status = 'active';
    } else if (booking.status === 'APPROVED') {
      steps[1].status = 'completed';
      steps[2].status = 'completed';
      if (booking.paymentStatus === 'PAID') {
        steps[3].status = 'completed';
        steps[4].status = 'active';
      } else {
        steps[3].status = 'active';
      }
    } else if (booking.status === 'COMPLETED') {
      steps.forEach(s => s.status = 'completed');
    }

    return steps;
  }

  // Payment
  canPay(booking: AdvertiserBooking): boolean {
    return booking.status === 'APPROVED' &&
           (booking.paymentStatus === 'NOT_PAID' || booking.paymentStatus === 'PENDING' || !booking.paymentStatus);
  }

  initiatePayment(booking: AdvertiserBooking): void {
    if (this.paymentProcessing()) return;

    this.paymentProcessing.set(booking.id);

    const user = this.authService.currentUser();
    const userDetails = {
      name: user?.name || 'Customer',
      email: user?.email || '',
      phone: (user as any)?.phone || ''
    };

    this.paymentService.createOrder(booking.id).subscribe({
      next: (order) => {
        this.paymentService.openCheckout(
          order,
          userDetails,
          (response: RazorpayResponse) => this.handlePaymentSuccess(response, booking.id),
          (error) => this.handlePaymentError(error),
          () => this.handlePaymentDismiss()
        ).subscribe();
      },
      error: (err) => {
        console.error('Error creating order:', err);
        this.errorMessage.set('Failed to initiate payment. Please try again.');
        this.paymentProcessing.set(null);
        this.autoHideMessage();
      }
    });
  }

  private handlePaymentSuccess(response: RazorpayResponse, bookingId: number): void {
    this.paymentService.verifyPayment({
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    }).subscribe({
      next: (verifiedBooking) => {
        this.bookings.update(bookings =>
          bookings.map(b => b.id === bookingId
            ? {
                ...b,
                paymentStatus: 'PAID' as const,
                razorpayPaymentId: verifiedBooking.razorpayPaymentId,
                paymentDate: verifiedBooking.paymentDate
              }
            : b
          )
        );
        this.successMessage.set('Payment successful! Thank you.');
        this.paymentProcessing.set(null);
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Payment verification failed:', err);
        this.errorMessage.set('Payment verification failed. Please contact support if amount was deducted.');
        this.paymentProcessing.set(null);
        this.autoHideMessage();
      }
    });
  }

  private handlePaymentError(error: any): void {
    console.error('Payment error:', error);
    this.errorMessage.set('Payment failed. Please try again.');
    this.paymentProcessing.set(null);
    this.autoHideMessage();
  }

  private handlePaymentDismiss(): void {
    this.paymentProcessing.set(null);
  }

  // Utility functions
  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  autoHideMessage(): void {
    setTimeout(() => this.clearMessages(), 5000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDaysDiff(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PENDING': '⏳',
      'APPROVED': '✅',
      'REJECTED': '❌',
      'COMPLETED': '🎉',
      'CANCELLED': '🚫',
      'CANCELLED_NO_REFUND': '🚫'
    };
    return icons[status] || '📋';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled',
      'CANCELLED_NO_REFUND': 'Cancelled (No Refund)'
    };
    return labels[status] || status;
  }

  getPaymentStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'NOT_PAID': '💳',
      'PENDING': '⏳',
      'PAID': '✅',
      'FAILED': '❌',
      'REFUNDED': '↩️'
    };
    return icons[status] || '💳';
  }

  getBillboardImage(billboard: AdvertiserBillboard): string {
    if (billboard.imagePaths && billboard.imagePaths.length > 0) {
      return `${environment.apiUrl.replace('/api', '')}/${billboard.imagePaths[0]}`;
    }
    return 'assets/billboard-placeholder.jpg';
  }

  getBillboardTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'STATIC': '🖼️',
      'LED': '💡',
      'DIGITAL': '📺',
      'NEON': '✨'
    };
    return icons[type] || '📋';
  }

  trackByBookingId(index: number, booking: AdvertiserBooking): number {
    return booking.id;
  }

  trackByBillboardId(index: number, billboard: AdvertiserBillboard): number {
    return billboard.id;
  }

  // Check if invoice can be downloaded (only for paid bookings)
  canDownloadInvoice(booking: AdvertiserBooking): boolean {
    return booking.paymentStatus === 'PAID';
  }

  // Get the commission % to display for a booking
  // For PAID bookings: use locked commissionPercent
  // For unpaid bookings: use current platform rate (may change before payment)
  getDisplayCommissionPercent(booking: AdvertiserBooking): number {
    if (booking.paymentStatus === 'PAID' && booking.commissionPercent != null) {
      return booking.commissionPercent;
    }
    // Fallback: calculate from amounts or use platform default (15%)
    if (booking.baseAmount > 0 && booking.commissionAmount > 0) {
      return Math.round((booking.commissionAmount / booking.baseAmount) * 100 * 10) / 10;
    }
    // Default fallback - will be recalculated from backend at payment time
    return 15;
  }

  // Check if price might change (for unpaid bookings without locked prices)
  isPriceSubjectToChange(booking: AdvertiserBooking): boolean {
    return booking.paymentStatus !== 'PAID' &&
           (booking.status === 'PENDING' || booking.status === 'APPROVED');
  }

  // Check if billboard price has changed since booking was created
  hasPriceChanged(booking: AdvertiserBooking): boolean {
    if (!booking.pricePerDayAtBooking || !booking.billboardPricePerDay) {
      return false;
    }
    return Math.abs(booking.pricePerDayAtBooking - booking.billboardPricePerDay) > 0.01;
  }

  // Download invoice PDF
  downloadInvoice(booking: AdvertiserBooking): void {
    this.advertiserService.downloadInvoice(booking.id);
  }

  // Download GST invoice PDF
  downloadGstInvoice(booking: AdvertiserBooking): void {
    this.advertiserService.downloadGstInvoice(booking.id);
  }
}
