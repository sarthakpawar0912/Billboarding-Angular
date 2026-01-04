import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnerService, OwnerBooking, DiscountLimits } from '../../../services/owner.service';

type BookingTab = 'all' | 'requests' | 'upcoming' | 'completed';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css'
})
export class OwnerBookingsComponent implements OnInit {
  // State signals
  bookings = signal<OwnerBooking[]>([]);
  pendingRequests = signal<OwnerBooking[]>([]);
  upcomingBookings = signal<OwnerBooking[]>([]);
  completedBookings = signal<OwnerBooking[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Tab management
  activeTab = signal<BookingTab>('all');

  // Search and filter
  searchTerm = signal('');
  statusFilter = signal('all');
  paymentFilter = signal('all');

  // Modal state
  showModal = signal(false);
  selectedBooking = signal<OwnerBooking | null>(null);

  // ================= DISCOUNT STATE =================
  showDiscountModal = signal(false);
  discountBooking = signal<OwnerBooking | null>(null);
  discountLimits = signal<DiscountLimits | null>(null);
  discountPercent = signal(0);
  discountProcessing = signal(false);
  discountError = signal<string | null>(null);

  // Computed filtered bookings based on active tab
  displayedBookings = computed(() => {
    let result: OwnerBooking[] = [];

    switch (this.activeTab()) {
      case 'requests':
        result = this.pendingRequests();
        break;
      case 'upcoming':
        result = this.upcomingBookings();
        break;
      case 'completed':
        result = this.completedBookings();
        break;
      default:
        result = this.bookings();
    }

    // Apply search filter
    const term = this.searchTerm().toLowerCase();
    if (term) {
      result = result.filter(b =>
        (b.billboard?.title?.toLowerCase() || '').includes(term) ||
        (b.billboard?.location?.toLowerCase() || '').includes(term) ||
        (b.advertiser?.name?.toLowerCase() || '').includes(term) ||
        (b.advertiser?.email?.toLowerCase() || '').includes(term) ||
        String(b.id).includes(term)
      );
    }

    // Apply status filter (only for 'all' tab)
    if (this.activeTab() === 'all' && this.statusFilter() !== 'all') {
      result = result.filter(b => b.status.toLowerCase() === this.statusFilter().toLowerCase());
    }

    // Apply payment filter
    if (this.paymentFilter() !== 'all') {
      result = result.filter(b => b.paymentStatus.toLowerCase() === this.paymentFilter().toLowerCase().replace(' ', '_'));
    }

    return result;
  });

  // Sorted displayed bookings - PENDING requests always at top
  sortedDisplayedBookings = computed(() => {
    const bookings = [...this.displayedBookings()];
    return bookings.sort((a, b) => {
      // PENDING first
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      // Then by creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  // Computed stats
  stats = computed(() => ({
    total: this.bookings().length,
    pending: this.bookings().filter(b => b.status === 'PENDING').length,
    approved: this.bookings().filter(b => b.status === 'APPROVED').length,
    completed: this.bookings().filter(b => b.status === 'COMPLETED').length,
    rejected: this.bookings().filter(b => b.status === 'REJECTED').length,
    cancelled: this.bookings().filter(b => b.status === 'CANCELLED').length,
    totalEarnings: this.bookings()
      .filter(b => b.status === 'COMPLETED' || b.status === 'APPROVED')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    pendingPayment: this.bookings().filter(b => b.paymentStatus === 'PENDING').length,
    paidBookings: this.bookings().filter(b => b.paymentStatus === 'PAID').length
  }));

  constructor(private ownerService: OwnerService) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load all bookings
    this.ownerService.getMyBookings().subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.error.set('Failed to load bookings. Please try again.');
        this.loading.set(false);
      }
    });

    // Load pending requests
    this.ownerService.getBookingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests.set(requests);
      },
      error: (err) => {
        console.error('Error loading requests:', err);
      }
    });

    // Load upcoming bookings
    this.ownerService.getUpcomingBookings().subscribe({
      next: (upcoming) => {
        this.upcomingBookings.set(upcoming);
      },
      error: (err) => {
        console.error('Error loading upcoming:', err);
      }
    });

    // Load completed bookings
    this.ownerService.getCompletedBookings().subscribe({
      next: (completed) => {
        this.completedBookings.set(completed);
      },
      error: (err) => {
        console.error('Error loading completed:', err);
      }
    });
  }

  // Helper method to auto-hide messages
  private autoHideMessage(): void {
    setTimeout(() => {
      this.successMessage.set(null);
      this.errorMessage.set(null);
    }, 5000);
  }

  setActiveTab(tab: BookingTab): void {
    this.activeTab.set(tab);
    // Reset filters when changing tabs
    if (tab !== 'all') {
      this.statusFilter.set('all');
    }
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  onPaymentFilter(event: Event): void {
    this.paymentFilter.set((event.target as HTMLSelectElement).value);
  }

  viewBooking(booking: OwnerBooking): void {
    this.selectedBooking.set(booking);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedBooking.set(null);
  }

  approveBooking(id: number): void {
    this.processing.set(true);
    this.ownerService.approveBooking(id).subscribe({
      next: () => {
        // Update all booking lists
        this.bookings.update(bookings =>
          bookings.map(b => b.id === id ? { ...b, status: 'APPROVED' as const } : b)
        );
        this.pendingRequests.update(requests =>
          requests.filter(r => r.id !== id)
        );
        this.processing.set(false);
        this.successMessage.set('Booking approved successfully!');
        this.autoHideMessage();
        // Reload upcoming bookings
        this.ownerService.getUpcomingBookings().subscribe({
          next: (upcoming) => this.upcomingBookings.set(upcoming)
        });
      },
      error: (err) => {
        console.error('Error approving booking:', err);
        this.errorMessage.set('Failed to approve booking. Please try again.');
        this.autoHideMessage();
        this.processing.set(false);
      }
    });
  }

  rejectBooking(id: number): void {
    this.processing.set(true);
    this.ownerService.rejectBooking(id).subscribe({
      next: () => {
        this.bookings.update(bookings =>
          bookings.map(b => b.id === id ? { ...b, status: 'REJECTED' as const } : b)
        );
        this.pendingRequests.update(requests =>
          requests.filter(r => r.id !== id)
        );
        this.processing.set(false);
        this.successMessage.set('Booking rejected.');
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Error rejecting booking:', err);
        this.errorMessage.set('Failed to reject booking. Please try again.');
        this.autoHideMessage();
        this.processing.set(false);
      }
    });
  }

  // Helper methods for nested data access
  getBillboardTitle(booking: OwnerBooking): string {
    return booking.billboard?.title || `Billboard #${booking.billboard?.id || 'N/A'}`;
  }

  getBillboardLocation(booking: OwnerBooking): string {
    if (booking.billboard?.location) return booking.billboard.location;
    if (booking.billboard?.latitude && booking.billboard?.longitude) {
      return `${booking.billboard.latitude.toFixed(4)}, ${booking.billboard.longitude.toFixed(4)}`;
    }
    return 'Location not specified';
  }

  getAdvertiserName(booking: OwnerBooking): string {
    return booking.advertiser?.name || 'Unknown';
  }

  getAdvertiserEmail(booking: OwnerBooking): string {
    return booking.advertiser?.email || '';
  }

  getAdvertiserPhone(booking: OwnerBooking): string {
    return booking.advertiser?.phone || '';
  }

  calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'pending': 'status-pending',
      'APPROVED': 'status-approved',
      'approved': 'status-approved',
      'REJECTED': 'status-rejected',
      'rejected': 'status-rejected',
      'COMPLETED': 'status-completed',
      'completed': 'status-completed',
      'CANCELLED': 'status-cancelled',
      'cancelled': 'status-cancelled'
    };
    return classes[status] || '';
  }

  getPaymentClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'payment-pending',
      'pending': 'payment-pending',
      'PAID': 'payment-paid',
      'paid': 'payment-paid',
      'NOT_PAID': 'payment-not-paid',
      'not_paid': 'payment-not-paid',
      'FAILED': 'payment-failed',
      'failed': 'payment-failed',
      'REFUNDED': 'payment-refunded',
      'refunded': 'payment-refunded'
    };
    return classes[status] || 'payment-pending';
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

  // Get booking flow status for owner view
  getBookingFlowStatus(booking: OwnerBooking): { label: string; icon: string; class: string; description: string } {
    if (booking.status === 'CANCELLED') {
      return { label: 'Cancelled', icon: '🚫', class: 'flow-cancelled', description: 'Booking was cancelled by advertiser' };
    }
    if (booking.status === 'REJECTED') {
      return { label: 'Rejected', icon: '❌', class: 'flow-rejected', description: 'You rejected this booking request' };
    }
    if (booking.status === 'COMPLETED') {
      return { label: 'Completed', icon: '🎉', class: 'flow-completed', description: 'Campaign completed successfully' };
    }
    if (booking.status === 'PENDING') {
      return { label: 'Awaiting Your Approval', icon: '⏳', class: 'flow-pending', description: 'Review and approve/reject this request' };
    }
    if (booking.status === 'APPROVED') {
      if (booking.paymentStatus === 'PAID') {
        return { label: 'Active Campaign', icon: '🎯', class: 'flow-active', description: 'Advertiser has paid - campaign is running' };
      }
      return { label: 'Awaiting Payment', icon: '💳', class: 'flow-awaiting-payment', description: 'Approved - waiting for advertiser to pay' };
    }
    return { label: booking.status, icon: '📋', class: 'flow-unknown', description: '' };
  }

  // Check if payment is expected for this booking
  isAwaitingPayment(booking: OwnerBooking): boolean {
    return booking.status === 'APPROVED' && booking.paymentStatus !== 'PAID';
  }

  // Check if booking is active (paid and approved)
  isActiveCampaign(booking: OwnerBooking): boolean {
    return booking.status === 'APPROVED' && booking.paymentStatus === 'PAID';
  }

  // Get status icon
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PENDING': '⏳',
      'APPROVED': '✅',
      'REJECTED': '❌',
      'COMPLETED': '🎉',
      'CANCELLED': '🚫'
    };
    return icons[status] || '📋';
  }

  // Get payment status icon
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

  // ================= DISCOUNT MANAGEMENT =================

  /**
   * Check if discount can be applied to a booking
   */
  canApplyDiscount(booking: OwnerBooking): boolean {
    return (booking.status === 'PENDING' || booking.status === 'APPROVED') &&
           booking.paymentStatus !== 'PAID';
  }

  /**
   * Open discount modal for a booking
   */
  openDiscountModal(booking: OwnerBooking): void {
    this.discountBooking.set(booking);
    this.discountPercent.set(booking.discountPercent || 0);
    this.discountError.set(null);
    this.showDiscountModal.set(true);

    // Fetch discount limits
    this.ownerService.getDiscountLimits(booking.id).subscribe({
      next: (limits) => {
        this.discountLimits.set(limits);
        this.discountPercent.set(limits.currentDiscountPercent);
      },
      error: (err) => {
        console.error('Error fetching discount limits:', err);
        this.discountError.set('Failed to load discount limits');
      }
    });
  }

  /**
   * Close discount modal
   */
  closeDiscountModal(): void {
    this.showDiscountModal.set(false);
    this.discountBooking.set(null);
    this.discountLimits.set(null);
    this.discountPercent.set(0);
    this.discountError.set(null);
  }

  /**
   * Apply discount to the selected booking
   */
  applyDiscount(): void {
    const booking = this.discountBooking();
    if (!booking) return;

    const percent = this.discountPercent();
    const limits = this.discountLimits();

    // Validate
    if (percent < 0) {
      this.discountError.set('Discount cannot be negative');
      return;
    }
    if (limits && percent > limits.maxDiscountPercent) {
      this.discountError.set(`Discount cannot exceed ${limits.maxDiscountPercent}%`);
      return;
    }

    this.discountProcessing.set(true);
    this.discountError.set(null);

    this.ownerService.applyDiscount(booking.id, percent).subscribe({
      next: (updatedBooking) => {
        // Update all booking lists
        this.updateBookingInAllLists(updatedBooking);

        this.discountProcessing.set(false);
        this.closeDiscountModal();
        this.successMessage.set(`Discount of ${percent}% applied successfully!`);
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Error applying discount:', err);
        this.discountError.set(err.error?.message || 'Failed to apply discount');
        this.discountProcessing.set(false);
      }
    });
  }

  /**
   * Remove discount from a booking
   */
  removeDiscount(booking: OwnerBooking): void {
    this.processing.set(true);

    this.ownerService.removeDiscount(booking.id).subscribe({
      next: (updatedBooking) => {
        this.updateBookingInAllLists(updatedBooking);
        this.processing.set(false);
        this.successMessage.set('Discount removed successfully');
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Error removing discount:', err);
        this.errorMessage.set('Failed to remove discount');
        this.autoHideMessage();
        this.processing.set(false);
      }
    });
  }

  /**
   * Update a booking in all lists
   */
  private updateBookingInAllLists(updatedBooking: OwnerBooking): void {
    this.bookings.update(list =>
      list.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)
    );
    this.pendingRequests.update(list =>
      list.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)
    );
    this.upcomingBookings.update(list =>
      list.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b)
    );
  }

  /**
   * Calculate estimated new total with discount.
   * Uses commission and GST percentages from backend (via discount limits).
   */
  calculateDiscountedTotal(): number {
    const limits = this.discountLimits();
    const percent = this.discountPercent();
    if (!limits) return 0;

    const discountAmount = limits.originalBaseAmount * percent / 100;
    const newBase = limits.originalBaseAmount - discountAmount;
    // Use commission and GST percentages from backend
    const commissionRate = (limits.commissionPercent || 15) / 100;
    const gstRate = (limits.gstPercent || 18) / 100;
    const commission = newBase * commissionRate;
    const gst = (newBase + commission) * gstRate;
    return newBase + commission + gst;
  }
}
