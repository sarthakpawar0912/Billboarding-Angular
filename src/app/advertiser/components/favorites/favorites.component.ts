import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdvertiserService, FavoriteBillboard } from '../../../services/advertiser.service';

@Component({
  selector: 'app-advertiser-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.css'
})
export class AdvertiserFavoritesComponent implements OnInit {
  // State signals
  favorites = signal<FavoriteBillboard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filter/Sort
  searchTerm = signal('');
  sortBy = signal('newest');
  viewMode = signal<'grid' | 'list'>('grid');

  // Actions
  removingId = signal<number | null>(null);
  successMessage = signal<string | null>(null);

  // Booking modal
  showBookingModal = signal(false);
  selectedBillboard = signal<FavoriteBillboard['billboard'] | null>(null);
  bookingStartDate = '';
  bookingEndDate = '';
  processing = signal(false);

  // Computed filtered favorites
  filteredFavorites = computed(() => {
    let result = this.favorites();
    const term = this.searchTerm().toLowerCase();
    const sort = this.sortBy();

    // Search filter
    if (term) {
      result = result.filter(f =>
        f.billboard.title?.toLowerCase().includes(term) ||
        f.billboard.location?.toLowerCase().includes(term) ||
        f.billboard.owner?.name?.toLowerCase().includes(term)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price-low':
          return (a.billboard.pricePerDay || 0) - (b.billboard.pricePerDay || 0);
        case 'price-high':
          return (b.billboard.pricePerDay || 0) - (a.billboard.pricePerDay || 0);
        case 'name':
          return (a.billboard.title || '').localeCompare(b.billboard.title || '');
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return result;
  });

  constructor(private advertiserService: AdvertiserService) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.loading.set(true);
    this.error.set(null);

    this.advertiserService.getFavorites().subscribe({
      next: (favorites) => {
        this.favorites.set(favorites);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading favorites:', err);
        this.error.set('Failed to load favorites. Please try again.');
        this.loading.set(false);
      }
    });
  }

  removeFromFavorites(billboardId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.removingId.set(billboardId);

    this.advertiserService.removeFromFavorites(billboardId).subscribe({
      next: () => {
        this.favorites.update(favs => favs.filter(f => f.billboard.id !== billboardId));
        this.removingId.set(null);
        this.showSuccess('Removed from favorites');
      },
      error: (err) => {
        console.error('Error removing from favorites:', err);
        this.removingId.set(null);
        alert('Failed to remove from favorites. Please try again.');
      }
    });
  }

  showSuccess(message: string): void {
    this.successMessage.set(message);
    setTimeout(() => this.successMessage.set(null), 3000);
  }

  // Open booking modal
  openBookingModal(billboard: FavoriteBillboard['billboard']): void {
    this.selectedBillboard.set(billboard);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.showBookingModal.set(true);
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
    this.selectedBillboard.set(null);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
  }

  // Calculate booking total
  calculateTotal(): number {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.bookingStartDate || !this.bookingEndDate) return 0;
    return this.advertiserService.calculateTotalAmount(
      billboard.pricePerDay || 0,
      this.bookingStartDate,
      this.bookingEndDate
    );
  }

  // Calculate number of days
  calculateDays(): number {
    if (!this.bookingStartDate || !this.bookingEndDate) return 0;
    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Submit booking
  submitBooking(): void {
    const billboard = this.selectedBillboard();
    if (!billboard) return;

    if (!this.bookingStartDate || !this.bookingEndDate) {
      alert('Please select start and end dates');
      return;
    }

    if (new Date(this.bookingEndDate) < new Date(this.bookingStartDate)) {
      alert('End date must be after start date');
      return;
    }

    this.processing.set(true);

    this.advertiserService.createBooking({
      billboardId: billboard.id,
      startDate: this.bookingStartDate,
      endDate: this.bookingEndDate
    }).subscribe({
      next: (booking) => {
        this.processing.set(false);
        this.closeBookingModal();
        this.showSuccess(`Booking request submitted successfully! Booking ID: #${booking.id}`);
      },
      error: (err) => {
        this.processing.set(false);
        alert(err.error?.message || 'Failed to submit booking request. Please try again.');
      }
    });
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value);
  }

  toggleView(mode: 'grid' | 'list'): void {
    this.viewMode.set(mode);
  }

  getBillboardTypeInfo(type: string): { label: string; icon: string } {
    const types: Record<string, { label: string; icon: string }> = {
      'STATIC': { label: 'Static', icon: '📋' },
      'LED': { label: 'LED', icon: '📺' },
      'DIGITAL': { label: 'Digital', icon: '💻' },
      'NEON': { label: 'Neon', icon: '✨' }
    };
    return types[type?.toUpperCase()] || { label: type || 'Unknown', icon: '📋' };
  }

  formatCurrency(amount: number | null): string {
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

  getTimeAgo(date: string): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  getImageUrl(imagePath: string): string {
    return this.advertiserService.getImageUrl(imagePath);
  }

  getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
}
