import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, map, of } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Campaign,
  CampaignCreateRequest,
  CampaignAnalytics,
  DailyAnalytics,
  CampaignStats,
  AvailableBooking
} from '../models/campaign.model';

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
  private apiUrl = environment.apiUrl;

  // HTTP Headers for JSON requests
  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  constructor(private http: HttpClient) {}

  // ============ Campaign CRUD Operations ============

  // Get all campaigns for the advertiser
  getAllCampaigns(): Observable<Campaign[]> {
    console.log('Fetching campaigns from:', `${this.apiUrl}/advertiser/campaigns`);
    return this.http.get<Campaign[]>(`${this.apiUrl}/advertiser/campaigns`).pipe(
      tap(campaigns => console.log('Campaigns loaded:', campaigns)),
      catchError(error => {
        console.error('Get campaigns error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to load campaigns' };
      })
    );
  }

  // Get single campaign by ID
  getCampaignById(id: number): Observable<Campaign> {
    console.log('Fetching campaign:', id);
    return this.http.get<Campaign>(`${this.apiUrl}/advertiser/campaigns/${id}`).pipe(
      tap(campaign => console.log('Campaign loaded:', campaign)),
      catchError(error => {
        console.error('Get campaign error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to load campaign' };
      })
    );
  }

  // Create new campaign
  createCampaign(data: CampaignCreateRequest): Observable<Campaign> {
    console.log('Creating campaign:', data);
    return this.http.post<Campaign>(`${this.apiUrl}/advertiser/campaigns`, data).pipe(
      tap(response => {
        console.log('Campaign created:', response);
      }),
      catchError(error => {
        console.error('Create campaign error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to create campaign' };
      })
    );
  }

  // Update campaign
  updateCampaign(id: number, data: Partial<CampaignCreateRequest>): Observable<Campaign> {
    console.log('Updating campaign:', id, data);
    return this.http.put<Campaign>(`${this.apiUrl}/advertiser/campaigns/${id}`, data).pipe(
      tap(campaign => console.log('Campaign updated:', campaign)),
      catchError(error => {
        console.error('Update campaign error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to update campaign' };
      })
    );
  }

  // Delete campaign
  deleteCampaign(id: number): Observable<{ message: string }> {
    console.log('Deleting campaign:', id);
    return this.http.delete(`${this.apiUrl}/advertiser/campaigns/${id}`, {
      responseType: 'text'
    }).pipe(
      map(response => {
        console.log('Delete campaign response:', response);
        return { message: response || 'Campaign deleted successfully' };
      }),
      catchError(error => {
        // Check if it's actually a success with wrong content-type
        if (error.status === 200 || error.status === 204) {
          return of({ message: 'Campaign deleted successfully' });
        }
        console.error('Delete campaign error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to delete campaign' };
      })
    );
  }

  // ============ Campaign Status Operations ============

  // Pause campaign
  // PATCH /api/advertiser/campaigns/{campaignId}/pause
  pauseCampaign(id: number): Observable<Campaign> {
    const url = `${this.apiUrl}/advertiser/campaigns/${id}/pause`;
    const token = localStorage.getItem('boabp_token');

    console.log('=== PAUSE CAMPAIGN DEBUG ===');
    console.log('Campaign ID:', id);
    console.log('Full URL:', url);
    console.log('Token exists:', !!token);
    console.log('Token (first 50 chars):', token?.substring(0, 50));
    console.log('============================');

    return this.http.patch<Campaign>(url, {}, this.httpOptions).pipe(
      tap(campaign => console.log('Campaign paused successfully:', campaign)),
      catchError(error => {
        console.error('=== PAUSE ERROR DEBUG ===');
        console.error('Status:', error.status);
        console.error('StatusText:', error.statusText);
        console.error('Error body:', error.error);
        console.error('Full error:', error);
        console.error('=========================');
        throw { message: this.extractErrorMessage(error) || 'Failed to pause campaign' };
      })
    );
  }

  // Resume campaign
  // PATCH /api/advertiser/campaigns/{campaignId}/resume
  resumeCampaign(id: number): Observable<Campaign> {
    console.log('Resuming campaign:', id);
    console.log('URL:', `${this.apiUrl}/advertiser/campaigns/${id}/resume`);

    return this.http.patch<Campaign>(
      `${this.apiUrl}/advertiser/campaigns/${id}/resume`,
      {},
      this.httpOptions
    ).pipe(
      tap(campaign => console.log('Campaign resumed:', campaign)),
      catchError(error => {
        console.error('Resume campaign error:', error);
        console.error('Error status:', error.status);
        console.error('Error body:', error.error);
        throw { message: this.extractErrorMessage(error) || 'Failed to resume campaign' };
      })
    );
  }

  // ============ Booking Operations ============

  // Attach booking to campaign
  // POST /api/advertiser/campaigns/{campaignId}/attach-booking/{bookingId}
  attachBookingToCampaign(campaignId: number, bookingId: number): Observable<{ message: string }> {
    console.log('Attaching booking:', bookingId, 'to campaign:', campaignId);
    return this.http.post(
      `${this.apiUrl}/advertiser/campaigns/${campaignId}/attach-booking/${bookingId}`,
      {},
      { responseType: 'text' }
    ).pipe(
      map(response => {
        console.log('Attach booking response:', response);
        return { message: response || 'Booking attached successfully' };
      }),
      catchError(error => {
        // Check if it's actually a success with wrong content-type
        if (error.status === 200 || error.status === 204) {
          return of({ message: 'Booking attached successfully' });
        }
        console.error('Attach booking error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to attach booking to campaign' };
      })
    );
  }

  // Detach booking from campaign
  // DELETE /api/advertiser/campaigns/{campaignId}/detach-booking/{bookingId}
  detachBookingFromCampaign(campaignId: number, bookingId: number): Observable<{ message: string }> {
    console.log('Detaching booking:', bookingId, 'from campaign:', campaignId);
    return this.http.delete(
      `${this.apiUrl}/advertiser/campaigns/${campaignId}/detach-booking/${bookingId}`,
      { responseType: 'text' }
    ).pipe(
      map(response => {
        console.log('Detach booking response:', response);
        return { message: response || 'Booking detached successfully' };
      }),
      catchError(error => {
        // Check if it's actually a success with wrong content-type
        if (error.status === 200 || error.status === 204) {
          return of({ message: 'Booking detached successfully' });
        }
        console.error('Detach booking error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to detach booking from campaign' };
      })
    );
  }

  // Get available bookings for attaching to campaigns
  // Returns approved bookings that are not already attached to a campaign
  getAvailableBookings(): Observable<AvailableBooking[]> {
    return this.http.get<any[]>(`${this.apiUrl}/advertiser/bookings`).pipe(
      map(bookings => {
        // Filter for approved/paid bookings that can be attached to campaigns
        return bookings
          .filter(b => b.status === 'APPROVED' && b.paymentStatus === 'PAID')
          .map(b => ({
            id: b.id,
            billboardId: b.billboard?.id || 0,
            billboardTitle: b.billboard?.title || `Billboard #${b.billboard?.id}`,
            billboardLocation: b.billboard?.location || 'Unknown Location',
            startDate: b.startDate,
            endDate: b.endDate,
            totalAmount: b.totalPrice || 0,
            status: b.status,
            paymentStatus: b.paymentStatus
          }));
      }),
      catchError(error => {
        console.error('Get available bookings error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to load available bookings' };
      })
    );
  }

  // ============ Analytics Operations ============

  // Get campaign analytics
  // GET /api/advertiser/campaigns/{campaignId}/analytics
  getCampaignAnalytics(id: number): Observable<CampaignAnalytics> {
    console.log('Fetching campaign analytics for:', id);
    return this.http.get<CampaignAnalytics>(
      `${this.apiUrl}/advertiser/campaigns/${id}/analytics`
    ).pipe(
      tap(analytics => console.log('Campaign analytics loaded:', analytics)),
      catchError(error => {
        console.error('Get campaign analytics error:', error);
        throw { message: this.extractErrorMessage(error) || 'Failed to load campaign analytics' };
      })
    );
  }

  // Get daily analytics for campaign
  // GET /api/advertiser/campaigns/{campaignId}/daily-analytics
  getDailyAnalytics(id: number): Observable<DailyAnalytics[]> {
    console.log('Fetching daily analytics for:', id);
    return this.http.get<any[]>(
      `${this.apiUrl}/advertiser/campaigns/${id}/daily-analytics`
    ).pipe(
      tap(dailyAnalytics => console.log('Daily analytics raw response:', dailyAnalytics)),
      map(data => {
        // Map backend response to our model, handling different field names
        return data.map(item => ({
          date: item.date,
          // Handle different possible field names for spend
          spend: item.spend ?? item.dailySpend ?? item.amount ?? item.cost ?? 0,
          impressions: item.impressions ?? item.dailyImpressions ?? 0
        }));
      }),
      tap(mapped => console.log('Daily analytics mapped:', mapped)),
      catchError(error => {
        console.error('Get daily analytics error:', error);
        // Return empty array on error so component can still render
        return of([]);
      })
    );
  }

  // ============ Helper Methods ============

  // Extract error message from various error formats
  private extractErrorMessage(error: any): string {
    console.log('Full error object:', error);
    console.log('Error status:', error.status);
    console.log('Error statusText:', error.statusText);
    console.log('Error body:', error.error);

    // Check for HTTP status errors
    if (error.status === 0) {
      return 'Unable to connect to server. Please check if the backend is running.';
    }
    if (error.status === 401) {
      return 'Unauthorized. Please log in again.';
    }
    if (error.status === 403) {
      return 'Forbidden. You do not have permission for this action.';
    }
    if (error.status === 404) {
      return 'Resource not found.';
    }
    if (error.status === 500) {
      return 'Internal server error. Please try again later.';
    }

    if (typeof error.error === 'string') {
      try {
        const parsed = JSON.parse(error.error);
        return parsed.message || parsed.error || error.error;
      } catch {
        return error.error;
      }
    }
    return error.error?.message || error.error?.error || error.message || `Error: ${error.status} ${error.statusText}`;
  }

  // Calculate campaign stats from campaigns array
  calculateStats(campaigns: Campaign[]): CampaignStats {
    const stats: CampaignStats = {
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter(c => c.status === 'ACTIVE').length,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalSpent: campaigns.reduce((sum, c) => sum + (c.spent || 0), 0),
      totalImpressions: campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0),
      avgCPM: 0
    };

    // Calculate average CPM
    if (stats.totalImpressions > 0) {
      stats.avgCPM = (stats.totalSpent / stats.totalImpressions) * 1000;
    }

    return stats;
  }

  // Get status color class
  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'ACTIVE': 'status-active',
      'PAUSED': 'status-paused',
      'SCHEDULED': 'status-scheduled',
      'COMPLETED': 'status-completed',
      'CANCELLED': 'status-cancelled'
    };
    return colors[status] || 'status-default';
  }

  // Get status icon
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

  // Format currency
  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Calculate days remaining
  getDaysRemaining(endDate: string): number {
    const end = new Date(endDate);
    const today = new Date();
    const diff = end.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  // Calculate campaign progress
  getCampaignProgress(startDate: string, endDate: string): number {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const today = new Date().getTime();

    if (today < start) return 0;
    if (today > end) return 100;

    const total = end - start;
    const elapsed = today - start;
    return Math.round((elapsed / total) * 100);
  }
}
