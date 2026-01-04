import { Component, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminBooking, BookingAudit, BookingAuditEntry } from '../../../services/admin.service';

@Component({
  selector: 'app-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bookings.component.html',
  styleUrl: './bookings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BookingsComponent implements OnInit {
  // State signals
  bookings = signal<AdminBooking[]>([]);
  searchTerm = signal('');
  statusFilter = signal<string>('all');
  selectedBooking = signal<AdminBooking | null>(null);
  showModal = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  processing = signal(false);

  // Audit trail modal
  showAuditModal = signal(false);
  auditData = signal<BookingAudit | null>(null);
  auditLoading = signal(false);

  // Payment status filter
  paymentFilter = signal<string>('all');

  // Computed filtered bookings
  filteredBookings = computed(() => {
    let result = this.bookings();

    // Apply search filter
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(b =>
        (b.billboard?.title?.toLowerCase() || '').includes(term) ||
        (b.billboard?.location?.toLowerCase() || '').includes(term) ||
        (b.advertiser?.name?.toLowerCase() || '').includes(term) ||
        (b.advertiser?.email?.toLowerCase() || '').includes(term) ||
        (b.billboard?.owner?.name?.toLowerCase() || '').includes(term) ||
        (b.billboard?.owner?.email?.toLowerCase() || '').includes(term) ||
        String(b.id).includes(term)
      );
    }

    // Apply status filter
    if (this.statusFilter() !== 'all') {
      result = result.filter(b => b.status.toLowerCase() === this.statusFilter().toLowerCase());
    }

    // Apply payment status filter
    if (this.paymentFilter() !== 'all') {
      result = result.filter(b => b.paymentStatus.toLowerCase() === this.paymentFilter().toLowerCase());
    }

    return result;
  });

  // Computed stats
  stats = computed(() => ({
    total: this.bookings().length,
    pending: this.bookings().filter(b => b.status === 'PENDING').length,
    approved: this.bookings().filter(b => b.status === 'APPROVED').length,
    completed: this.bookings().filter(b => b.status === 'COMPLETED').length,
    rejected: this.bookings().filter(b => b.status === 'REJECTED').length,
    cancelled: this.bookings().filter(b => b.status === 'CANCELLED').length,
    pendingPayment: this.bookings().filter(b => b.paymentStatus === 'PENDING').length,
    paidBookings: this.bookings().filter(b => b.paymentStatus === 'PAID').length,
    totalRevenue: this.bookings()
      .filter(b => b.paymentStatus === 'PAID')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    expectedRevenue: this.bookings()
      .filter(b => b.status === 'APPROVED' && b.paymentStatus !== 'PAID')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
  }));

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getAllBookings().subscribe({
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
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  onPaymentFilter(status: string): void {
    this.paymentFilter.set(status);
  }

  viewBooking(booking: AdminBooking): void {
    this.selectedBooking.set(booking);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedBooking.set(null);
  }

  approveBooking(id: number): void {
    this.processing.set(true);
    this.adminService.approveBooking(id).subscribe({
      next: () => {
        this.bookings.update(bookings =>
          bookings.map(b => b.id === id ? { ...b, status: 'APPROVED' as const } : b)
        );
        this.processing.set(false);
      },
      error: (err) => {
        console.error('Error approving booking:', err);
        alert('Failed to approve booking. Please try again.');
        this.processing.set(false);
      }
    });
  }

  rejectBooking(id: number): void {
    this.processing.set(true);
    this.adminService.rejectBooking(id).subscribe({
      next: () => {
        this.bookings.update(bookings =>
          bookings.map(b => b.id === id ? { ...b, status: 'REJECTED' as const } : b)
        );
        this.processing.set(false);
      },
      error: (err) => {
        console.error('Error rejecting booking:', err);
        alert('Failed to reject booking. Please try again.');
        this.processing.set(false);
      }
    });
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

  // Helper methods to access nested properties safely
  getBillboardTitle(booking: AdminBooking): string {
    return booking.billboard?.title || `Billboard #${booking.billboard?.id || 'N/A'}`;
  }

  getBillboardLocation(booking: AdminBooking): string {
    if (booking.billboard?.location) return booking.billboard.location;
    if (booking.billboard?.latitude && booking.billboard?.longitude) {
      return `${booking.billboard.latitude.toFixed(4)}, ${booking.billboard.longitude.toFixed(4)}`;
    }
    return 'Location not specified';
  }

  getAdvertiserName(booking: AdminBooking): string {
    return booking.advertiser?.name || 'Unknown Advertiser';
  }

  getAdvertiserEmail(booking: AdminBooking): string {
    return booking.advertiser?.email || '';
  }

  getOwnerName(booking: AdminBooking): string {
    return booking.billboard?.owner?.name || 'Unknown Owner';
  }

  getOwnerEmail(booking: AdminBooking): string {
    return booking.billboard?.owner?.email || '';
  }

  calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
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

  // Compact date format for table
  formatDateShort(date: string | Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  }

  // ==================== AUDIT TRAIL ====================

  auditError = signal<string | null>(null);

  viewAudit(booking: AdminBooking): void {
    this.selectedBooking.set(booking);
    this.showAuditModal.set(true);
    this.auditLoading.set(true);
    this.auditData.set(null);
    this.auditError.set(null);

    this.adminService.getBookingAudit(booking.id).subscribe({
      next: (audit) => {
        // Ensure history array exists
        if (!audit.history) {
          audit.history = [];
        }
        this.auditData.set(audit);
        this.auditLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading audit trail:', err);
        this.auditError.set('Failed to load audit trail. Please try again.');
        this.auditLoading.set(false);
      }
    });
  }

  closeAuditModal(): void {
    this.showAuditModal.set(false);
    this.auditData.set(null);
  }

  formatDateTime(date: string | Date): string {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAuditActionIcon(action: string): string {
    const icons: Record<string, string> = {
      'CREATED': '📝',
      'APPROVED': '✅',
      'REJECTED': '❌',
      'CANCELLED': '🚫',
      'CANCELLED_NO_REFUND': '💸',
      'PAID': '💳',
      'PAYMENT_VERIFIED': '✓',
      'PAYMENT_FAILED': '⚠️',
      'COMPLETED': '🎉',
      'UPDATED': '📋',
      'STATUS_CHANGED': '🔄'
    };
    return icons[action.toUpperCase()] || '📌';
  }

  getAuditActionClass(action: string): string {
    const classes: Record<string, string> = {
      'CREATED': 'audit-created',
      'APPROVED': 'audit-approved',
      'REJECTED': 'audit-rejected',
      'CANCELLED': 'audit-cancelled',
      'CANCELLED_NO_REFUND': 'audit-cancelled',
      'PAID': 'audit-paid',
      'PAYMENT_VERIFIED': 'audit-paid',
      'PAYMENT_FAILED': 'audit-failed',
      'COMPLETED': 'audit-completed',
      'UPDATED': 'audit-updated',
      'STATUS_CHANGED': 'audit-updated'
    };
    return classes[action.toUpperCase()] || 'audit-default';
  }
}
