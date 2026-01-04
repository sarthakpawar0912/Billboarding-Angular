import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Analytics interfaces
export interface AdminAnalytics {
  totalRevenue: number;
  totalBookings: number;
  totalBillboards: number;
  monthlyGrowth: number;
  revenueByMonth: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
}

export interface CancellationAnalytics {
  totalCancellations: number;
  cancellationRate: number;
  cancellationsByMonth: { month: string; count: number }[];
  topReasons: { reason: string; count: number }[];
  averageRefundAmount: number;
  totalRefunded: number;
}

export interface TopAdvertiser {
  name: string;
  email: string;
  bookings: number;
  spent: number;
}

export interface TopOwner {
  name: string;
  email: string;
  billboards: number;
  revenue: number;
}

export interface BillboardTypeDistribution {
  type: string;
  demand: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminAnalyticsService {
  private apiUrl = `${environment.apiUrl}/admin`;

  // Cache for analytics data
  private analyticsCache$: Observable<AdminAnalytics> | null = null;
  private cancellationCache$: Observable<CancellationAnalytics> | null = null;
  private billboardTypesCache$: Observable<BillboardTypeDistribution[]> | null = null;

  constructor(private http: HttpClient) {}

  // Clear all caches
  clearCache(): void {
    this.analyticsCache$ = null;
    this.cancellationCache$ = null;
    this.billboardTypesCache$ = null;
  }

  // Get dashboard analytics (cached)
  getAnalytics(forceRefresh = false): Observable<AdminAnalytics> {
    if (!this.analyticsCache$ || forceRefresh) {
      this.analyticsCache$ = this.http.get<AdminAnalytics>(`${this.apiUrl}/analytics`).pipe(
        shareReplay(1),
        catchError(error => {
          this.analyticsCache$ = null;
          console.error('Get analytics error:', error);
          throw error;
        })
      );
    }
    return this.analyticsCache$;
  }

  // Get cancellation analytics (cached)
  getCancellationAnalytics(forceRefresh = false): Observable<CancellationAnalytics> {
    if (!this.cancellationCache$ || forceRefresh) {
      this.cancellationCache$ = this.http.get<CancellationAnalytics>(`${this.apiUrl}/analytics/cancellations`).pipe(
        shareReplay(1),
        catchError(error => {
          this.cancellationCache$ = null;
          console.error('Get cancellation analytics error:', error);
          throw error;
        })
      );
    }
    return this.cancellationCache$;
  }

  // Get billboard type distribution (cached)
  getBillboardTypes(forceRefresh = false): Observable<BillboardTypeDistribution[]> {
    if (!this.billboardTypesCache$ || forceRefresh) {
      this.billboardTypesCache$ = this.http.get<BillboardTypeDistribution[]>(`${this.apiUrl}/analytics/billboard-types`).pipe(
        shareReplay(1),
        catchError(error => {
          this.billboardTypesCache$ = null;
          console.error('Get billboard types error:', error);
          throw error;
        })
      );
    }
    return this.billboardTypesCache$;
  }

  // Get top advertisers by spend
  getTopAdvertisers(): Observable<TopAdvertiser[]> {
    return this.http.get<TopAdvertiser[]>(`${this.apiUrl}/analytics/top-advertisers`).pipe(
      catchError(error => {
        console.error('Get top advertisers error:', error);
        throw error;
      })
    );
  }

  // Get top owners by revenue
  getTopOwners(): Observable<TopOwner[]> {
    return this.http.get<TopOwner[]>(`${this.apiUrl}/analytics/top-owners`).pipe(
      catchError(error => {
        console.error('Get top owners error:', error);
        throw error;
      })
    );
  }

  // Get revenue by city
  getRevenueByCity(): Observable<{ city: string; revenue: number }[]> {
    return this.http.get<{ city: string; revenue: number }[]>(`${this.apiUrl}/analytics/revenue-by-city`).pipe(
      catchError(error => {
        console.error('Get revenue by city error:', error);
        throw error;
      })
    );
  }
}
