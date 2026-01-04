import { Component, OnInit, signal, computed, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdminService, AdminUser, AdminBooking, DashboardStats, CancellationAnalytics } from '../../../services/admin.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  // Signals for reactive state
  stats = signal<DashboardStats | null>(null);
  cancellationStats = signal<CancellationAnalytics | null>(null);
  users = signal<AdminUser[]>([]);
  bookings = signal<AdminBooking[]>([]);
  pendingKycUsers = signal<AdminUser[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Recent bookings (last 5)
  recentBookings = computed(() => {
    return this.bookings()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  });

  // Monthly revenue data for chart
  monthlyRevenue = computed(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const allBookings = this.bookings();
    const data: { month: string; revenue: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthBookings = allBookings.filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === monthIndex &&
               (b.status === 'COMPLETED' || b.status === 'APPROVED');
      });

      data.push({
        month: months[monthIndex],
        revenue: monthBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0)
      });
    }

    return data;
  });

  // Top cities from bookings
  topCities = computed(() => {
    const allBookings = this.bookings();
    const cityCount: Record<string, number> = {};

    allBookings.forEach(b => {
      const location = b.billboard?.location || '';
      const city = this.extractCity(location);
      if (city) {
        cityCount[city] = (cityCount[city] || 0) + 1;
      }
    });

    return Object.entries(cityCount)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  // Helper methods for accessing nested booking data
  getBillboardTitle(booking: AdminBooking): string {
    return booking.billboard?.title || `Billboard #${booking.billboard?.id || 'N/A'}`;
  }

  getAdvertiserDisplay(booking: AdminBooking): string {
    return booking.advertiser?.name || booking.advertiser?.email || 'Unknown';
  }

  // Billboard type distribution
  billboardTypes = [
    { type: 'Digital', demand: 35, color: '#7c3aed' },
    { type: 'LED', demand: 30, color: '#9333ea' },
    { type: 'Static', demand: 20, color: '#c084fc' },
    { type: 'Neon', demand: 15, color: '#e879f9' }
  ];

  // Inject DestroyRef for automatic subscription cleanup
  private destroyRef = inject(DestroyRef);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load dashboard stats from API
    this.adminService.getDashboardStats().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (stats) => {
        this.stats.set(stats);
      },
      error: (err) => {
        console.error('Error loading stats:', err);
      }
    });

    // Load cancellation analytics
    this.adminService.getCancellationAnalytics().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (cancellationStats) => {
        this.cancellationStats.set(cancellationStats);
      },
      error: (err) => {
        console.error('Error loading cancellation stats:', err);
      }
    });

    // Load all users
    this.adminService.getAllUsers().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        this.users.set(users);
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });

    // Load pending KYC users
    this.adminService.getPendingKycUsers().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        this.pendingKycUsers.set(users);
      },
      error: (err) => {
        console.error('Error loading pending KYC:', err);
      }
    });

    // Load all bookings
    this.adminService.getAllBookings().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (bookings) => {
        this.bookings.set(bookings);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.loading.set(false);
        this.error.set('Failed to load dashboard data. Please try again.');
      }
    });
  }

  private extractCity(location: string): string {
    if (!location) return 'Unknown';
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || parts[0]?.trim() || 'Unknown';
  }

  // KYC Actions
  approveKyc(userId: number): void {
    this.adminService.approveUserKyc(userId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.pendingKycUsers.update(users => users.filter(u => u.id !== userId));
        // Refresh stats
        this.adminService.getDashboardStats(true).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(stats => this.stats.set(stats));
      },
      error: (err) => {
        console.error('Error approving KYC:', err);
        alert('Failed to approve KYC. Please try again.');
      }
    });
  }

  rejectKyc(userId: number): void {
    this.adminService.rejectUserKyc(userId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        this.pendingKycUsers.update(users => users.filter(u => u.id !== userId));
        // Refresh stats
        this.adminService.getDashboardStats(true).pipe(
          takeUntilDestroyed(this.destroyRef)
        ).subscribe(stats => this.stats.set(stats));
      },
      error: (err) => {
        console.error('Error rejecting KYC:', err);
        alert('Failed to reject KYC. Please try again.');
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
      'CANCELLED': 'status-cancelled',
      'cancelled': 'status-cancelled',
      'COMPLETED': 'status-completed',
      'completed': 'status-completed',
      'blocked': 'status-blocked',
      'paid': 'status-paid',
      'NOT_SUBMITTED': 'status-pending'
    };
    return classes[status] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Helper for max revenue in chart
  getMaxRevenue(): number {
    const revenues = this.monthlyRevenue().map(m => m.revenue);
    return Math.max(...revenues, 1);
  }

  // ==================== REPORT DOWNLOADS ====================

  // Users Reports
  downloadUsersCSV(): void {
    this.adminService.downloadUsersReportCsv();
  }

  downloadUsersPDF(): void {
    this.adminService.downloadUsersReportPdf();
  }

  // Bookings Reports
  downloadBookingsCSV(): void {
    this.adminService.downloadBookingsReportCsv();
  }

  downloadBookingsPDF(): void {
    this.adminService.downloadBookingsReportPdf();
  }

  // Revenue Reports
  downloadRevenueCSV(): void {
    this.adminService.downloadRevenueReportCsv();
  }

  downloadRevenuePDF(): void {
    this.adminService.downloadRevenueReportPdf();
  }

  // Math helper for template
  Math = Math;
}
