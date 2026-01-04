import { Component, OnInit, signal, ChangeDetectionStrategy, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AdvertiserService, AdvertiserDashboardStats, AdvertiserBooking, AdvertiserBillboard, FavoriteBillboard } from '../../../services/advertiser.service';

@Component({
  selector: 'app-advertiser-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvertiserDashboardComponent implements OnInit {
  // Signals for reactive state
  stats = signal<AdvertiserDashboardStats | null>(null);
  recentBookings = signal<AdvertiserBooking[]>([]);
  favorites = signal<FavoriteBillboard[]>([]);
  availableBillboards = signal<AdvertiserBillboard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Inject DestroyRef for automatic subscription cleanup
  private destroyRef = inject(DestroyRef);

  constructor(private advertiserService: AdvertiserService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load all dashboard data in parallel with individual error handling
    forkJoin({
      stats: this.advertiserService.getDashboardStats().pipe(
        catchError(err => {
          console.error('Error loading dashboard stats:', err);
          return of(null);
        })
      ),
      favorites: this.advertiserService.getFavorites().pipe(
        catchError(err => {
          console.error('Error loading favorites:', err);
          return of([] as FavoriteBillboard[]);
        })
      ),
      billboards: this.advertiserService.getAvailableBillboards().pipe(
        catchError(err => {
          console.error('Error loading billboards:', err);
          return of([] as AdvertiserBillboard[]);
        })
      ),
      bookings: this.advertiserService.getMyBookings().pipe(
        catchError(err => {
          console.error('Error loading bookings:', err);
          return of([] as AdvertiserBooking[]);
        })
      )
    }).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: ({ stats, favorites, billboards, bookings }) => {
        // Set favorites
        this.favorites.set(favorites);

        // Set available billboards (recommendations)
        this.availableBillboards.set(billboards.slice(0, 4));

        // Sort bookings by date (newest first)
        const sortedBookings = [...bookings].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // If stats loaded from API
        if (stats) {
          // Update favorites count from actual favorites data
          const updatedStats: AdvertiserDashboardStats = {
            ...stats,
            totalFavorites: favorites.length
          };

          // If stats has no recentBookings or it's empty, use bookings data
          if (!stats.recentBookings || stats.recentBookings.length === 0) {
            updatedStats.recentBookings = sortedBookings.slice(0, 5);
          }

          // If stats has no booking counts, compute from bookings
          if (stats.totalBookings === 0 && bookings.length > 0) {
            updatedStats.totalBookings = bookings.length;
            updatedStats.activeBookings = bookings.filter(b => b.status === 'APPROVED').length;
            updatedStats.pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
            updatedStats.completedBookings = bookings.filter(b => b.status === 'COMPLETED').length;
            updatedStats.cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length;
            updatedStats.rejectedBookings = bookings.filter(b => b.status === 'REJECTED').length;
            updatedStats.totalSpent = bookings
              .filter(b => b.status === 'APPROVED' || b.status === 'COMPLETED')
              .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
          }

          this.stats.set(updatedStats);
          this.recentBookings.set(updatedStats.recentBookings || sortedBookings.slice(0, 5));
        } else {
          // Compute stats from bookings if API failed
          const computedStats: AdvertiserDashboardStats = {
            totalBookings: bookings.length,
            activeBookings: bookings.filter(b => b.status === 'APPROVED').length,
            pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
            completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
            cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
            rejectedBookings: bookings.filter(b => b.status === 'REJECTED').length,
            totalSpent: bookings
              .filter(b => b.status === 'APPROVED' || b.status === 'COMPLETED')
              .reduce((sum, b) => sum + (b.totalAmount || 0), 0),
            totalFavorites: favorites.length,
            recentBookings: sortedBookings.slice(0, 5)
          };

          this.stats.set(computedStats);
          this.recentBookings.set(sortedBookings.slice(0, 5));
        }

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading dashboard data:', err);
        this.loading.set(false);
        this.error.set('Failed to load dashboard data. Please try again.');
      }
    });
  }

  // Cancel booking
  cancelBooking(bookingId: number): void {
    if (confirm('Are you sure you want to cancel this booking?')) {
      this.advertiserService.cancelBooking(bookingId).pipe(
        takeUntilDestroyed(this.destroyRef)
      ).subscribe({
        next: () => {
          // Find the booking being cancelled to check its previous status
          const cancelledBooking = this.recentBookings().find(b => b.id === bookingId);
          const wasPending = cancelledBooking?.status === 'PENDING';
          const wasApproved = cancelledBooking?.status === 'APPROVED';

          // Update local bookings
          this.recentBookings.update(bookings =>
            bookings.map(b => b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b)
          );

          // Update stats locally
          this.stats.update(s => {
            if (!s) return s;
            return {
              ...s,
              cancelledBookings: (s.cancelledBookings || 0) + 1,
              pendingBookings: wasPending ? Math.max((s.pendingBookings || 0) - 1, 0) : s.pendingBookings,
              activeBookings: wasApproved ? Math.max((s.activeBookings || 0) - 1, 0) : s.activeBookings,
              totalSpent: wasApproved ? Math.max((s.totalSpent || 0) - (cancelledBooking?.totalAmount || 0), 0) : s.totalSpent
            };
          });
        },
        error: (err) => {
          console.error('Error cancelling booking:', err);
          alert('Failed to cancel booking. Please try again.');
        }
      });
    }
  }

  // Add to favorites
  addToFavorites(billboardId: number): void {
    this.advertiserService.addToFavorites(billboardId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (favorite) => {
        // Update local state immediately for smooth UI
        this.favorites.update(favs => [favorite, ...favs]);
        // Update stats count
        this.stats.update(s => s ? { ...s, totalFavorites: (s.totalFavorites || 0) + 1 } : s);
      },
      error: (err) => {
        console.error('Error adding to favorites:', err);
        alert('Failed to add to favorites. Please try again.');
      }
    });
  }

  // Remove from favorites
  removeFromFavorites(billboardId: number): void {
    this.advertiserService.removeFromFavorites(billboardId).pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: () => {
        // Update local state immediately for smooth UI
        this.favorites.update(favs => favs.filter(f => f.billboard.id !== billboardId));
        // Update stats count
        this.stats.update(s => s ? { ...s, totalFavorites: Math.max((s.totalFavorites || 1) - 1, 0) } : s);
      },
      error: (err) => {
        console.error('Error removing from favorites:', err);
        alert('Failed to remove from favorites. Please try again.');
      }
    });
  }

  // Check if billboard is in favorites
  isInFavorites(billboardId: number): boolean {
    return this.favorites().some(f => f.billboard.id === billboardId);
  }

  // Get booking breakdown for chart
  getBookingBreakdown(): { label: string; value: number; color: string }[] {
    const s = this.stats();
    if (!s) return [];

    return [
      { label: 'Active', value: s.activeBookings, color: '#22c55e' },
      { label: 'Pending', value: s.pendingBookings, color: '#f59e0b' },
      { label: 'Completed', value: s.completedBookings, color: '#3b82f6' },
      { label: 'Cancelled', value: s.cancelledBookings, color: '#6b7280' },
      { label: 'Rejected', value: s.rejectedBookings, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }

  // Get total for chart percentage calculation
  getTotalBookingsForChart(): number {
    const s = this.stats();
    if (!s) return 1;
    return Math.max(s.totalBookings, 1);
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
      'completed': 'status-completed'
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

  // Get image URL
  getImageUrl(imagePath: string): string {
    return this.advertiserService.getImageUrl(imagePath);
  }

  // Math helper for template
  Math = Math;
}
