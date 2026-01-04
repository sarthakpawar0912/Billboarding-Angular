import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampaignService } from '../../../services/campaign.service';
import {
  Campaign,
  CampaignCreateRequest,
  CampaignAnalytics,
  DailyAnalytics,
  CampaignStats
} from '../../../models/campaign.model';

@Component({
  selector: 'app-advertiser-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './campaigns.component.html',
  styleUrl: './campaigns.component.css'
})
export class AdvertiserCampaignsComponent implements OnInit {
  // State signals
  campaigns = signal<Campaign[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // Stats
  stats = signal<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalBudget: 0,
    totalSpent: 0,
    totalImpressions: 0,
    avgCPM: 0
  });

  // Create Campaign Modal
  showCreateModal = signal(false);
  isCreating = signal(false);
  createError = signal('');
  newCampaign: CampaignCreateRequest = {
    name: '',
    budget: 0,
    billboards: 1,
    startDate: '',
    endDate: '',
    cities: []
  };
  cityInput = '';

  // Analytics Modal
  showAnalyticsModal = signal(false);
  isLoadingAnalytics = signal(false);
  analyticsError = signal('');
  selectedCampaign = signal<Campaign | null>(null);
  campaignAnalytics = signal<CampaignAnalytics | null>(null);
  dailyAnalytics = signal<DailyAnalytics[]>([]);

  // Delete Confirmation
  showDeleteConfirm = signal(false);
  campaignToDelete = signal<Campaign | null>(null);
  isDeleting = signal(false);

  // Attach Booking Modal
  showAttachBookingModal = signal(false);
  selectedCampaignForBooking = signal<Campaign | null>(null);
  bookingIdToAttach = '';
  isAttachingBooking = signal(false);
  attachBookingError = signal('');

  // Loading states for individual campaigns
  loadingCampaigns = new Set<number>();

  constructor(private campaignService: CampaignService) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  // ============ CRUD Operations ============

  loadCampaigns(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.campaignService.getAllCampaigns().subscribe({
      next: (campaigns) => {
        this.campaigns.set(campaigns);
        this.calculateStats(campaigns);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading campaigns:', err);
        this.errorMessage.set(err.message || 'Failed to load campaigns');
        this.isLoading.set(false);
      }
    });
  }

  calculateStats(campaigns: Campaign[]): void {
    const stats = this.campaignService.calculateStats(campaigns);
    this.stats.set(stats);
  }

  // Create Campaign
  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.createError.set('');
    this.newCampaign = {
      name: '',
      budget: 0,
      billboards: 1,
      startDate: '',
      endDate: '',
      cities: []
    };
    this.cityInput = '';
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createError.set('');
  }

  addCity(): void {
    const city = this.cityInput.trim();
    if (city && !this.newCampaign.cities.includes(city)) {
      this.newCampaign.cities.push(city);
      this.cityInput = '';
    }
  }

  removeCity(city: string): void {
    this.newCampaign.cities = this.newCampaign.cities.filter(c => c !== city);
  }

  createCampaign(): void {
    // Validation
    if (!this.newCampaign.name.trim()) {
      this.createError.set('Please enter a campaign name');
      return;
    }
    if (this.newCampaign.billboards <= 0) {
      this.createError.set('Please enter a valid number of billboards');
      return;
    }
    if (this.newCampaign.budget <= 0) {
      this.createError.set('Please enter a valid budget');
      return;
    }
    if (!this.newCampaign.startDate || !this.newCampaign.endDate) {
      this.createError.set('Please select start and end dates');
      return;
    }
    if (new Date(this.newCampaign.startDate) > new Date(this.newCampaign.endDate)) {
      this.createError.set('End date must be after start date');
      return;
    }
    if (this.newCampaign.cities.length === 0) {
      this.createError.set('Please add at least one city');
      return;
    }

    this.isCreating.set(true);
    this.createError.set('');

    this.campaignService.createCampaign(this.newCampaign).subscribe({
      next: (campaign) => {
        const current = this.campaigns();
        this.campaigns.set([campaign, ...current]);
        this.calculateStats([campaign, ...current]);
        this.isCreating.set(false);
        this.closeCreateModal();
        this.successMessage.set('Campaign created successfully!');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        console.error('Error creating campaign:', err);
        this.createError.set(err.message || 'Failed to create campaign');
        this.isCreating.set(false);
      }
    });
  }

  // Delete Campaign
  openDeleteConfirm(campaign: Campaign): void {
    this.campaignToDelete.set(campaign);
    this.showDeleteConfirm.set(true);
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm.set(false);
    this.campaignToDelete.set(null);
  }

  confirmDelete(): void {
    const campaign = this.campaignToDelete();
    if (!campaign) return;

    this.isDeleting.set(true);
    this.campaignService.deleteCampaign(campaign.id).subscribe({
      next: () => {
        const updated = this.campaigns().filter(c => c.id !== campaign.id);
        this.campaigns.set(updated);
        this.calculateStats(updated);
        this.isDeleting.set(false);
        this.closeDeleteConfirm();
        this.successMessage.set(`Campaign "${campaign.name}" deleted successfully`);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        console.error('Error deleting campaign:', err);
        this.errorMessage.set(err.message || 'Failed to delete campaign');
        this.isDeleting.set(false);
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  // ============ Campaign Status Operations ============

  pauseCampaign(campaign: Campaign): void {
    if (this.loadingCampaigns.has(campaign.id)) return;

    this.loadingCampaigns.add(campaign.id);
    this.campaignService.pauseCampaign(campaign.id).subscribe({
      next: (updated) => {
        this.updateCampaignInList(updated);
        this.loadingCampaigns.delete(campaign.id);
        this.successMessage.set(`Campaign "${campaign.name}" paused`);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        console.error('Error pausing campaign:', err);
        this.loadingCampaigns.delete(campaign.id);
        this.errorMessage.set(err.message || 'Failed to pause campaign');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  resumeCampaign(campaign: Campaign): void {
    if (this.loadingCampaigns.has(campaign.id)) return;

    this.loadingCampaigns.add(campaign.id);
    this.campaignService.resumeCampaign(campaign.id).subscribe({
      next: (updated) => {
        this.updateCampaignInList(updated);
        this.loadingCampaigns.delete(campaign.id);
        this.successMessage.set(`Campaign "${campaign.name}" resumed`);
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => {
        console.error('Error resuming campaign:', err);
        this.loadingCampaigns.delete(campaign.id);
        this.errorMessage.set(err.message || 'Failed to resume campaign');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  updateCampaignInList(updated: Campaign): void {
    const campaigns = this.campaigns();
    const index = campaigns.findIndex(c => c.id === updated.id);
    if (index !== -1) {
      campaigns[index] = updated;
      this.campaigns.set([...campaigns]);
      this.calculateStats(campaigns);
    }
  }

  // ============ Booking Operations ============

  openAttachBookingModal(campaign: Campaign): void {
    this.selectedCampaignForBooking.set(campaign);
    this.showAttachBookingModal.set(true);
    this.bookingIdToAttach = '';
    this.attachBookingError.set('');
  }

  closeAttachBookingModal(): void {
    this.showAttachBookingModal.set(false);
    this.selectedCampaignForBooking.set(null);
    this.bookingIdToAttach = '';
    this.attachBookingError.set('');
  }

  attachBooking(): void {
    const campaign = this.selectedCampaignForBooking();
    if (!campaign) return;

    const bookingId = parseInt(this.bookingIdToAttach);
    if (isNaN(bookingId) || bookingId <= 0) {
      this.attachBookingError.set('Please enter a valid booking ID');
      return;
    }

    this.isAttachingBooking.set(true);
    this.attachBookingError.set('');

    this.campaignService.attachBookingToCampaign(campaign.id, bookingId).subscribe({
      next: () => {
        this.isAttachingBooking.set(false);
        this.closeAttachBookingModal();
        this.successMessage.set(`Booking #${bookingId} attached to campaign`);
        setTimeout(() => this.successMessage.set(''), 3000);
        this.loadCampaigns(); // Reload to get updated data
      },
      error: (err) => {
        console.error('Error attaching booking:', err);
        this.attachBookingError.set(err.message || 'Failed to attach booking');
        this.isAttachingBooking.set(false);
      }
    });
  }

  // ============ Analytics Operations ============

  openAnalyticsModal(campaign: Campaign): void {
    this.selectedCampaign.set(campaign);
    this.showAnalyticsModal.set(true);
    this.isLoadingAnalytics.set(true);
    this.analyticsError.set('');
    this.campaignAnalytics.set(null);
    this.dailyAnalytics.set([]);

    // Load both campaign analytics and daily analytics
    this.campaignService.getCampaignAnalytics(campaign.id).subscribe({
      next: (analytics) => {
        this.campaignAnalytics.set(analytics);
        this.loadDailyAnalytics(campaign.id);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.analyticsError.set(err.message || 'Failed to load analytics');
        this.isLoadingAnalytics.set(false);
      }
    });
  }

  loadDailyAnalytics(campaignId: number): void {
    this.campaignService.getDailyAnalytics(campaignId).subscribe({
      next: (daily) => {
        this.dailyAnalytics.set(daily);
        this.isLoadingAnalytics.set(false);
      },
      error: (err) => {
        console.error('Error loading daily analytics:', err);
        this.isLoadingAnalytics.set(false);
      }
    });
  }

  closeAnalyticsModal(): void {
    this.showAnalyticsModal.set(false);
    this.selectedCampaign.set(null);
    this.campaignAnalytics.set(null);
    this.dailyAnalytics.set([]);
  }

  // ============ Helper Methods ============

  isCampaignLoading(campaignId: number): boolean {
    return this.loadingCampaigns.has(campaignId);
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

  isCompleted(campaign: Campaign): boolean {
    return campaign.status === 'COMPLETED';
  }

  getStatusClass(status: string): string {
    return this.campaignService.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return this.campaignService.getStatusIcon(status);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Active',
      'PAUSED': 'Paused',
      'SCHEDULED': 'Scheduled',
      'COMPLETED': 'Completed',
      'CANCELLED': 'Cancelled'
    };
    return labels[status] || status;
  }

  formatCurrency(amount: number): string {
    return this.campaignService.formatCurrency(amount);
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
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

  getDaysRemaining(campaign: Campaign): number {
    return this.campaignService.getDaysRemaining(campaign.endDate);
  }

  getCampaignProgress(campaign: Campaign): number {
    return this.campaignService.getCampaignProgress(campaign.startDate, campaign.endDate);
  }

  getCitiesString(cities: string[]): string {
    if (!cities || cities.length === 0) return 'All Cities';
    return cities.join(', ');
  }

  getMinDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getMaxSpend(dailyData: DailyAnalytics[]): number {
    if (!dailyData || dailyData.length === 0) return 0;
    return Math.max(...dailyData.map(d => d.spend));
  }

  getBarHeight(spend: number, maxSpend: number): number {
    if (maxSpend === 0) return 0;
    return (spend / maxSpend) * 100;
  }

  getCostPerView(campaign: Campaign): string {
    if (!campaign.impressions || campaign.impressions === 0) {
      return this.formatCurrency(0);
    }
    const cpm = (campaign.spent / campaign.impressions) * 1000;
    return this.formatCurrency(cpm);
  }
}
