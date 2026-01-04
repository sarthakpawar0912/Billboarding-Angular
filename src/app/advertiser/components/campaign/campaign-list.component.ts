import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CampaignService } from '../../../services/campaign.service';
import {
  Campaign,
  CampaignStats,
  AvailableBooking
} from '../../../models/campaign.model';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './campaign-list.component.html',
  styleUrl: './campaign-list.component.css'
})
export class CampaignListComponent implements OnInit {
  // State
  campaigns = signal<Campaign[]>([]);
  loading = signal(false);
  error = signal('');
  successMessage = signal('');

  stats = signal<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalImpressions: 0,
    avgCPM: 0
  });

  // Filters
  statusFilter = signal<string>('all');
  searchTerm = signal('');

  // Attach Booking Modal
  showAttachModal = signal(false);
  selectedCampaign = signal<Campaign | null>(null);
  availableBookings = signal<AvailableBooking[]>([]);
  selectedBookingId: number | null = null;
  loadingBookings = signal(false);
  processing = signal(false);

  // Delete Modal
  showDeleteModal = signal(false);
  campaignToDelete = signal<Campaign | null>(null);

  constructor(
    private campaignService: CampaignService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    this.loading.set(true);
    this.error.set('');

    this.campaignService.getAllCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns.set(campaigns);
        this.calculateStats(campaigns);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading campaigns:', err);
        this.error.set(err.message || 'Failed to load campaigns');
        this.loading.set(false);
      }
    });
  }

  calculateStats(campaigns: Campaign[]): void {
    const stats = this.campaignService.calculateStats(campaigns);
    this.stats.set(stats);
  }

  // Filtered campaigns
  filteredCampaigns(): Campaign[] {
    let filtered = this.campaigns();

    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(c => c.status === this.statusFilter());
    }

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.cities?.some(city => city.toLowerCase().includes(term))
      );
    }

    return filtered;
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  // Navigation
  navigateToCreate(): void {
    this.router.navigate(['/advertiser/campaigns/create']);
  }

  navigateToAnalytics(campaign: Campaign): void {
    this.router.navigate(['/advertiser/campaigns', campaign.id, 'analytics']);
  }

  // Pause Campaign
  pauseCampaign(campaign: Campaign): void {
    if (this.processing()) return;

    this.processing.set(true);
    this.error.set('');

    this.campaignService.pauseCampaign(campaign.id).subscribe({
      next: (updatedCampaign) => {
        // Update the campaign in the list with the response from server
        this.updateCampaignInList(updatedCampaign);
        this.processing.set(false);
        this.successMessage.set(`Campaign "${campaign.name}" paused successfully`);
        this.autoClearMessage();
      },
      error: (err) => {
        console.error('Error pausing campaign:', err);
        this.processing.set(false);
        this.error.set(err.message || 'Failed to pause campaign');
        this.autoClearMessage();
      }
    });
  }

  // Resume Campaign
  resumeCampaign(campaign: Campaign): void {
    if (this.processing()) return;

    this.processing.set(true);
    this.error.set('');

    this.campaignService.resumeCampaign(campaign.id).subscribe({
      next: (updatedCampaign) => {
        // Update the campaign in the list with the response from server
        this.updateCampaignInList(updatedCampaign);
        this.processing.set(false);
        this.successMessage.set(`Campaign "${campaign.name}" resumed successfully`);
        this.autoClearMessage();
      },
      error: (err) => {
        console.error('Error resuming campaign:', err);
        this.processing.set(false);
        this.error.set(err.message || 'Failed to resume campaign');
        this.autoClearMessage();
      }
    });
  }

  // Delete Campaign
  openDeleteModal(campaign: Campaign): void {
    this.campaignToDelete.set(campaign);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal(): void {
    this.showDeleteModal.set(false);
    this.campaignToDelete.set(null);
  }

  confirmDelete(): void {
    const campaign = this.campaignToDelete();
    if (!campaign || this.processing()) return;

    this.processing.set(true);
    this.campaignService.deleteCampaign(campaign.id).subscribe({
      next: () => {
        const updated = this.campaigns().filter(c => c.id !== campaign.id);
        this.campaigns.set(updated);
        this.calculateStats(updated);
        this.processing.set(false);
        this.closeDeleteModal();
        this.successMessage.set(`Campaign "${campaign.name}" deleted successfully`);
        this.autoClearMessage();
      },
      error: (err) => {
        console.error('Error deleting campaign:', err);
        this.processing.set(false);
        this.error.set(err.message || 'Failed to delete campaign');
        this.autoClearMessage();
      }
    });
  }

  // Update campaign in list with full campaign object from API
  updateCampaignInList(updatedCampaign: Campaign): void {
    const campaigns = this.campaigns();
    const index = campaigns.findIndex(c => c.id === updatedCampaign.id);
    if (index !== -1) {
      campaigns[index] = updatedCampaign;
      this.campaigns.set([...campaigns]);
      this.calculateStats(campaigns);
    }
  }

  // Attach Booking Modal
  openAttachModal(campaign: Campaign): void {
    this.selectedCampaign.set(campaign);
    this.selectedBookingId = null;
    this.showAttachModal.set(true);
    this.loadAvailableBookings();
  }

  closeAttachModal(): void {
    this.showAttachModal.set(false);
    this.selectedCampaign.set(null);
    this.selectedBookingId = null;
    this.availableBookings.set([]);
  }

  loadAvailableBookings(): void {
    this.loadingBookings.set(true);
    this.campaignService.getAvailableBookings().subscribe({
      next: (bookings) => {
        this.availableBookings.set(bookings);
        this.loadingBookings.set(false);
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.loadingBookings.set(false);
      }
    });
  }

  selectBooking(bookingId: number): void {
    this.selectedBookingId = bookingId;
  }

  getSelectedBooking(): AvailableBooking | null {
    if (!this.selectedBookingId) return null;
    return this.availableBookings().find(b => b.id === this.selectedBookingId) || null;
  }

  attachBooking(): void {
    const campaign = this.selectedCampaign();
    if (!campaign || !this.selectedBookingId || this.processing()) return;

    this.processing.set(true);
    this.campaignService.attachBookingToCampaign(campaign.id, this.selectedBookingId).subscribe({
      next: () => {
        this.processing.set(false);
        this.successMessage.set(`Booking attached to "${campaign.name}" successfully`);
        this.closeAttachModal();
        this.loadCampaigns();
        this.autoClearMessage();
      },
      error: (err) => {
        console.error('Error attaching booking:', err);
        this.processing.set(false);
        this.error.set(err.message || 'Failed to attach booking');
        this.autoClearMessage();
      }
    });
  }

  // Helper methods
  clearMessages(): void {
    this.successMessage.set('');
    this.error.set('');
  }

  autoClearMessage(): void {
    setTimeout(() => this.clearMessages(), 5000);
  }

  isActive(campaign: Campaign): boolean {
    return campaign.status === 'ACTIVE';
  }

  isPaused(campaign: Campaign): boolean {
    return campaign.status === 'PAUSED';
  }

  isScheduled(campaign: Campaign): boolean {
    return campaign.status === 'SCHEDULED';
  }

  canPause(campaign: Campaign): boolean {
    return campaign.status === 'ACTIVE' || campaign.status === 'SCHEDULED';
  }

  canResume(campaign: Campaign): boolean {
    return campaign.status === 'PAUSED';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'ACTIVE': '🟢',
      'PAUSED': '⏸️',
      'SCHEDULED': '📅',
      'COMPLETED': '✅',
      'CANCELLED': '❌'
    };
    return icons[status] || '⚪';
  }

  formatCurrency(amount: number): string {
    return this.campaignService.formatCurrency(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getProgress(spent: number, budget: number): number {
    if (budget <= 0) return 0;
    return Math.min(Math.round((spent / budget) * 100), 100);
  }

  getCitiesString(cities: string[]): string {
    if (!cities || cities.length === 0) return 'All Cities';
    if (cities.length <= 2) return cities.join(', ');
    return `${cities.slice(0, 2).join(', ')} +${cities.length - 2}`;
  }

  getDaysDiff(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
