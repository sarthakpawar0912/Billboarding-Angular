import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, forkJoin, throwError, Subject } from 'rxjs';
import { tap, catchError, map, switchMap, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Billboard interface for advertisers (browsing)
// NOTE: Backend returns 'type' field, frontend uses 'billboardType' for consistency
export interface AdvertiserBillboard {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  billboardType: 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';
  type?: 'STATIC' | 'LED' | 'DIGITAL' | 'NEON'; // Backend field name
  size: string;
  pricePerDay: number;
  available: boolean;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  imageUrl?: string;
  imagePaths?: string[];
}

// Booking request interface
export interface CreateBookingRequest {
  billboardId: number;
  startDate: string; // YYYY-MM-DD format
  endDate: string;   // YYYY-MM-DD format
}

// Backend booking response (raw from API)
export interface BookingApiResponse {
  id: number;
  advertiser: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  billboard: {
    id: number;
    title: string | null;
    location: string | null;
    latitude: number;
    longitude: number;
    pricePerDay: number | null;
    size: string | null;
    available: boolean;
    type: string;
    owner: {
      id: number;
      name: string;
      email: string;
    };
    createdAt: string;
    imagePaths: string[];
  };
  startDate: string;
  endDate: string;
  // ================= PRICE BREAKDOWN (AUTHORITATIVE - from backend) =================
  originalBaseAmount?: number;   // Original base (before discount)
  discountPercent?: number;      // Discount % applied by owner (0-50)
  discountAmount?: number;       // Discount amount
  baseAmount: number;            // Base amount AFTER discount
  commissionAmount: number;      // Platform commission
  gstAmount: number;             // GST (18% of base + commission)
  totalPrice: number;            // Total = base + commission + GST
  gstPercentage?: number;        // GST percentage (e.g., 18)
  // Locked values (set at payment time - immutable after payment)
  commissionPercent?: number;      // Commission % used (locked at payment)
  pricePerDayAtBooking?: number;   // Billboard price when booking was created
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CANCELLED_NO_REFUND' | 'COMPLETED';
  paymentStatus: 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  currency?: string;
  paymentDate?: string;
}

// Booking status type
export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CANCELLED_NO_REFUND' | 'COMPLETED';

// Booking response interface (flattened for UI)
export interface AdvertiserBooking {
  id: number;
  billboardId: number;
  billboardTitle: string;
  billboardLocation: string;
  ownerId: number;
  ownerName: string;
  ownerEmail: string;
  startDate: string;
  endDate: string;
  // ================= PRICE BREAKDOWN (AUTHORITATIVE - from backend) =================
  originalBaseAmount?: number;  // Original base (before discount)
  discountPercent?: number;     // Discount % applied by owner (0-50)
  discountAmount?: number;      // Discount amount
  baseAmount: number;           // Base amount AFTER discount
  commissionAmount: number;     // Platform commission
  gstAmount: number;            // GST amount
  totalAmount: number;          // Total = base + commission + GST
  gstPercentage?: number;       // GST % (e.g., 18)
  // Locked values (immutable after payment)
  commissionPercent?: number;      // Commission % used (locked at payment)
  pricePerDayAtBooking?: number;   // Billboard price when booking was created
  // Billboard current price (may differ from pricePerDayAtBooking if owner updated)
  billboardPricePerDay?: number;
  status: BookingStatus;
  paymentStatus: 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  currency?: string;
  paymentDate?: string;
}

// Advertiser dashboard stats (legacy)
export interface AdvertiserStats {
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  completedBookings: number;
  totalSpent: number;
}

// Advertiser Dashboard Stats (from /api/advertiser/dashboard)
export interface AdvertiserDashboardStats {
  totalBookings: number;
  activeBookings: number;
  pendingBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  rejectedBookings: number;
  totalSpent: number;
  totalFavorites: number;
  recentBookings: AdvertiserBooking[];
}

// Favorite billboard interface (matches backend response)
export interface FavoriteBillboard {
  id: number;
  advertiser?: any;
  billboard: {
    id: number;
    title: string | null;
    location: string | null;
    latitude: number;
    longitude: number;
    pricePerDay: number | null;
    size: string | null;
    available: boolean;
    type: string;
    owner: {
      id: number;
      name: string;
      email: string;
    };
    createdAt: string;
    imagePaths: string[];
  };
  createdAt: string;
}

// Availability check response
export interface AvailabilityResponse {
  available: boolean;
  billboardId: number;
  startDate: string;
  endDate: string;
  conflictingBookings?: {
    id: number;
    startDate: string;
    endDate: string;
    status: string;
  }[];
  message?: string;
}

// ================= PRICE PREVIEW (SINGLE SOURCE OF TRUTH) =================
// Frontend MUST use this for displaying prices. DO NOT calculate locally.
export interface PricePreviewResponse {
  // Billboard info
  billboardId: number;
  billboardTitle: string;
  pricePerDay: number;

  // Booking dates
  startDate: string;
  endDate: string;
  totalDays: number;

  // Price breakdown
  originalBaseAmount: number;     // Before smart pricing adjustments
  baseAmount: number;             // After smart pricing (demand/weekend surge)
  demandSurgeApplied: boolean;
  weekendSurgeApplied: boolean;

  // Commission
  commissionPercent: number;
  commissionAmount: number;

  // GST
  gstPercent: number;
  gstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  taxableValue: number;

  // Total
  totalAmount: number;
  currency: string;

  // Discount (if any)
  discountPercent: number;
  discountAmount: number;
  discountedBaseAmount: number;
  maxDiscountPercent: number;

  // Owner contact (for negotiation)
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}

// Calendar day availability (for day-wise availability calendar)
export interface DayAvailability {
  date: string; // YYYY-MM-DD
  status: 'AVAILABLE' | 'BOOKED' | 'PENDING';
  price: number; // Dynamic price per day
}

// Availability calendar response
export type AvailabilityCalendarResponse = DayAvailability[];

// Advertiser Profile API Response (from /api/advertiser/settings/profile)
// Backend now returns a flat response with hasLogo boolean
export interface AdvertiserProfileResponse {
  fullName: string;
  email: string;
  phone: string;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  hasLogo: boolean;
}

// Profile for UI use
export interface AdvertiserProfile {
  fullName: string;
  email: string;
  phone: string;
  companyName: string | null;
  industry: string | null;
  website: string | null;
  hasLogo: boolean;
}

// Update profile request data (sent as JSON string in 'data' field)
export interface UpdateProfileRequest {
  fullName?: string;
  phone?: string;
  companyName?: string;
  industry?: string;
  website?: string;
}

// Payment Method types
export type PaymentMethodType = 'CARD' | 'UPI' | 'NET_BANKING' | 'WALLET';

// Payment Method API Response
export interface PaymentMethodResponse {
  id: number;
  user?: any;
  type: PaymentMethodType;
  label: string;
  addedAt: string;
  default: boolean;
}

// Payment Method for UI
export interface PaymentMethod {
  id: number;
  type: PaymentMethodType;
  label: string;
  addedAt: string;
  isDefault: boolean;
}

// Add Payment Method Request
export interface AddPaymentMethodRequest {
  type: PaymentMethodType;
  label: string;
}

// Notification Preferences API Response
export interface NotificationPreferencesResponse {
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentNotifications: boolean;
  campaignNotifications: boolean;
  systemNotifications: boolean;
}

// Notification Preferences for UI
export interface NotificationPreferences {
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentNotifications: boolean;
  campaignNotifications: boolean;
  systemNotifications: boolean;
}

// Update Notification Preferences Request
export interface UpdateNotificationPreferencesRequest {
  emailNotifications: boolean;
  smsNotifications: boolean;
  paymentNotifications: boolean;
  campaignNotifications: boolean;
  systemNotifications: boolean;
}

// Change Password Request
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// Login History Entry
export interface LoginHistoryEntry {
  id: number;
  email: string;
  ipAddress: string | null;
  ip?: string;
  loginAt: string;
  userAgent: string;
  risky?: boolean;
}

// Campaign Status
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT' | null;

// Campaign API Response
export interface CampaignResponse {
  id: number;
  name: string;
  advertiser?: any;
  status: CampaignStatus;
  billboards: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number | null;
  impressions: number | null;
  cities: string[];
  createdAt: string;
}

// Campaign for UI
export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  billboards: number;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  impressions: number;
  cities: string[];
  createdAt: string;
}

// Create Campaign Request
export interface CreateCampaignRequest {
  name: string;
  billboards: number;
  budget: number;
  startDate: string;
  endDate: string;
  cities: string[];
}

// Campaign Analytics Response
export interface CampaignAnalytics {
  campaignId: number;
  campaignName: string;
  status: CampaignStatus;
  budget: number;
  spent: number;
  impressions: number;
  cpm: number;
  budgetUtilization: number;
  startDate: string;
  endDate: string;
}

// Map billboard interface (from /api/advertiser/map/billboards)
export interface MapBillboard {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  size: string;
  available: boolean;
  type: 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string;
    role: string;
    kycStatus: string;
    blocked: boolean;
    createdAt: string;
  };
  createdAt: string;
  imagePaths: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdvertiserService {
  private apiUrl = `${environment.apiUrl}/advertiser`;

  // Profile image change notifier
  private profileImageChanged = new Subject<void>();
  profileImageChanged$ = this.profileImageChanged.asObservable();

  // Available billboards for browsing
  private billboardsSubject = new BehaviorSubject<AdvertiserBillboard[]>([]);
  billboards$ = this.billboardsSubject.asObservable();

  // My bookings
  private bookingsSubject = new BehaviorSubject<AdvertiserBooking[]>([]);
  bookings$ = this.bookingsSubject.asObservable();

  // Loading states
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== BILLBOARD BROWSING ====================

  // Get all billboards with map data (includes full details for map view)
  // Maps backend 'type' field properly
  getMapBillboards(): Observable<MapBillboard[]> {
    return this.http.get<any[]>(`${this.apiUrl}/map/billboards`).pipe(
      map(billboards => billboards.map(b => ({
        ...b,
        type: b.type || 'STATIC' // Ensure type is always set
      })))
    );
  }

  // Get nearby billboards within a radius (in km)
  // Maps backend 'type' field properly
  getNearbyBillboards(lat: number, lng: number, radius: number): Observable<MapBillboard[]> {
    return this.http.get<any[]>(`${this.apiUrl}/map/nearby`, {
      params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() }
    }).pipe(
      map(billboards => billboards.map(b => ({
        ...b,
        type: b.type || 'STATIC' // Ensure type is always set
      })))
    );
  }

  // Get all available billboards for booking
  // Maps backend 'type' field to frontend 'billboardType' for consistency
  getAvailableBillboards(): Observable<AdvertiserBillboard[]> {
    this.loadingSubject.next(true);
    return this.http.get<any[]>(`${this.apiUrl}/billboards`).pipe(
      map(billboards => billboards.map(b => ({
        ...b,
        billboardType: b.type || b.billboardType || 'STATIC' // Map 'type' to 'billboardType'
      }))),
      tap(billboards => {
        this.billboardsSubject.next(billboards);
        this.loadingSubject.next(false);
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }

  // Get billboard by ID
  // Maps backend 'type' field to frontend 'billboardType' for consistency
  getBillboardById(id: number): Observable<AdvertiserBillboard> {
    return this.http.get<any>(`${this.apiUrl}/billboards/${id}`).pipe(
      map(b => ({
        ...b,
        billboardType: b.type || b.billboardType || 'STATIC' // Map 'type' to 'billboardType'
      }))
    );
  }

  // Check billboard availability for given dates
  checkAvailability(billboardId: number, startDate: string, endDate: string): Observable<AvailabilityResponse> {
    return this.http.get<AvailabilityResponse>(`${this.apiUrl}/billboards/${billboardId}/check-availability`, {
      params: { startDate, endDate }
    });
  }

  // Get day-wise availability calendar for a billboard
  // Returns array of dates with status: AVAILABLE (green), BOOKED (red), PENDING (yellow) + price per day
  getAvailabilityCalendar(billboardId: number, startDate: string, endDate: string): Observable<AvailabilityCalendarResponse> {
    // API is at /api/advertiser/billboards/{id}/availability
    return this.http.get<AvailabilityCalendarResponse>(`${this.apiUrl}/billboards/${billboardId}/availability`, {
      params: { start: startDate, end: endDate }
    });
  }

  // Get single day availability with dynamic price
  // API: GET /api/advertiser/availability/{billboardId}?date=YYYY-MM-DD
  getDayAvailability(billboardId: number, date: string): Observable<DayAvailability> {
    return this.http.get<DayAvailability>(`${this.apiUrl}/availability/${billboardId}`, {
      params: { date }
    });
  }

  // ==================== BOOKING MANAGEMENT ====================

  // ================= PRICE PREVIEW (SINGLE SOURCE OF TRUTH) =================

  /**
   * Get price preview for a potential booking.
   * Frontend MUST use this to display prices. DO NOT calculate locally.
   *
   * @param billboardId Billboard ID
   * @param startDate Start date (YYYY-MM-DD)
   * @param endDate End date (YYYY-MM-DD)
   * @returns Complete price breakdown from backend
   */
  getPricePreview(billboardId: number, startDate: string, endDate: string): Observable<PricePreviewResponse> {
    return this.http.get<PricePreviewResponse>(`${this.apiUrl}/bookings/price-preview`, {
      params: { billboardId: billboardId.toString(), startDate, endDate }
    });
  }

  // Create new booking
  createBooking(booking: CreateBookingRequest): Observable<AdvertiserBooking> {
    // Pre-API validation
    if (!booking.billboardId || booking.billboardId <= 0) {
      return throwError(() => ({
        error: { message: 'Please select a valid billboard' }
      }));
    }

    if (!booking.startDate || !booking.endDate) {
      return throwError(() => ({
        error: { message: 'Please select both start and end dates' }
      }));
    }

    // Validate date format and logic
    const startDate = new Date(booking.startDate);
    const endDate = new Date(booking.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return throwError(() => ({
        error: { message: 'Invalid date format. Please select valid dates.' }
      }));
    }

    if (startDate < today) {
      return throwError(() => ({
        error: { message: 'Start date cannot be in the past' }
      }));
    }

    if (endDate < startDate) {
      return throwError(() => ({
        error: { message: 'End date must be after or equal to start date' }
      }));
    }

    return this.http.post<AdvertiserBooking>(`${this.apiUrl}/bookings`, booking).pipe(
      tap(newBooking => {
        const current = this.bookingsSubject.value;
        this.bookingsSubject.next([newBooking, ...current]);
      }),
      catchError((err) => {
        // Transform backend errors to user-friendly messages
        const message = this.extractErrorMessage(err);
        return throwError(() => ({ error: { message } }));
      })
    );
  }

  // Extract user-friendly error message from backend response
  private extractErrorMessage(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.error?.fieldErrors) {
      // Handle validation errors - combine all field errors
      const errors = Object.entries(err.error.fieldErrors)
        .map(([field, msg]) => `${field}: ${msg}`)
        .join(', ');
      return errors || 'Validation failed. Please check your input.';
    }
    if (err?.message) {
      return err.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  // Get all my bookings
  getMyBookings(): Observable<AdvertiserBooking[]> {
    this.loadingSubject.next(true);
    return this.http.get<BookingApiResponse[]>(`${this.apiUrl}/bookings`).pipe(
      map(apiBookings => apiBookings.map(b => this.mapBookingResponse(b))),
      tap(bookings => {
        this.bookingsSubject.next(bookings);
        this.loadingSubject.next(false);
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }

  // Map API response to UI interface
  private mapBookingResponse(apiBooking: BookingApiResponse): AdvertiserBooking {
    return {
      id: apiBooking.id,
      billboardId: apiBooking.billboard?.id || 0,
      billboardTitle: apiBooking.billboard?.title || `Billboard #${apiBooking.billboard?.id}`,
      billboardLocation: apiBooking.billboard?.location || 'Unknown Location',
      ownerId: apiBooking.billboard?.owner?.id || 0,
      ownerName: apiBooking.billboard?.owner?.name || 'N/A',
      ownerEmail: apiBooking.billboard?.owner?.email || '',
      startDate: apiBooking.startDate,
      endDate: apiBooking.endDate,
      // ================= PRICE BREAKDOWN (AUTHORITATIVE - from backend) =================
      originalBaseAmount: apiBooking.originalBaseAmount,
      discountPercent: apiBooking.discountPercent,
      discountAmount: apiBooking.discountAmount,
      baseAmount: apiBooking.baseAmount || 0,
      commissionAmount: apiBooking.commissionAmount || 0,
      gstAmount: apiBooking.gstAmount || 0,
      totalAmount: apiBooking.totalPrice || 0,
      gstPercentage: apiBooking.gstPercentage,
      // Locked values (set at payment time - immutable after payment)
      commissionPercent: apiBooking.commissionPercent,
      pricePerDayAtBooking: apiBooking.pricePerDayAtBooking,
      // Current billboard price (may differ if owner updated after booking)
      billboardPricePerDay: apiBooking.billboard?.pricePerDay || undefined,
      status: apiBooking.status,
      paymentStatus: apiBooking.paymentStatus || 'NOT_PAID',
      createdAt: apiBooking.createdAt,
      razorpayOrderId: apiBooking.razorpayOrderId,
      razorpayPaymentId: apiBooking.razorpayPaymentId,
      currency: apiBooking.currency,
      paymentDate: apiBooking.paymentDate
    };
  }

  // Cancel booking (for unpaid bookings)
  cancelBooking(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bookings/${bookingId}/cancel`, {}).pipe(
      tap(() => {
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, status: 'CANCELLED' as const } : b
          )
        );
      })
    );
  }

  // Cancel booking after payment (no refund)
  cancelBookingAfterPayment(bookingId: number): Observable<AdvertiserBooking> {
    return this.http.post<any>(`${this.apiUrl}/bookings/${bookingId}/cancel-after-payment`, {}).pipe(
      map(response => this.mapBookingResponse(response)),
      tap((cancelledBooking) => {
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, status: 'CANCELLED_NO_REFUND' as const } : b
          )
        );
      })
    );
  }

  // ==================== STATS/ANALYTICS ====================

  // Get advertiser stats
  getStats(): Observable<AdvertiserStats> {
    return this.http.get<AdvertiserStats>(`${this.apiUrl}/stats`);
  }

  // Compute stats from local data
  getComputedStats(): AdvertiserStats {
    const bookings = this.bookingsSubject.value;

    return {
      totalBookings: bookings.length,
      activeBookings: bookings.filter(b => b.status === 'APPROVED').length,
      pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
      completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
      totalSpent: bookings
        .filter(b => b.status === 'COMPLETED' || b.status === 'APPROVED')
        .reduce((sum, b) => sum + b.totalAmount, 0)
    };
  }

  // ==================== INVOICE ====================

  // Get invoice data (JSON) for display in modal
  // GET /api/invoices/{bookingId}
  getInvoice(bookingId: number): Observable<any> {
    return this.http.get(`${environment.apiUrl}/invoices/${bookingId}`);
  }

  // Download invoice PDF for a booking
  // GET /api/invoices/{bookingId}/pdf - returns PDF
  downloadInvoice(bookingId: number): void {
    this.http.get(`${environment.apiUrl}/invoices/${bookingId}/pdf`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `gst-invoice-booking-${bookingId}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error downloading invoice:', err);
        alert('Failed to download invoice. Please try again.');
      }
    });
  }

  // Download GST Invoice PDF for a booking (same as downloadInvoice now)
  // GET /api/invoices/{bookingId}/pdf - returns PDF
  downloadGstInvoice(bookingId: number): void {
    this.downloadInvoice(bookingId);
  }

  // ==================== UTILITY ====================

  // Get image URL
  getImageUrl(imagePath: string): string {
    return `${environment.apiUrl.replace('/api', '')}/${imagePath}`;
  }

  // Calculate total amount for booking
  calculateTotalAmount(pricePerDay: number, startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return pricePerDay * diffDays;
  }

  // ==================== DASHBOARD ====================

  // Get advertiser dashboard stats - with fallback to computed stats
  getDashboardStats(forceRefresh = false): Observable<AdvertiserDashboardStats> {
    return this.http.get<AdvertiserDashboardStats>(`${this.apiUrl}/dashboard`).pipe(
      map(stats => this.ensureCompleteStats(stats)),
      catchError(err => {
        console.warn('Dashboard API failed, computing stats locally:', err);
        return this.computeDashboardStatsFromBookings();
      })
    );
  }

  // Ensure the stats object has all required fields
  private ensureCompleteStats(stats: Partial<AdvertiserDashboardStats>): AdvertiserDashboardStats {
    return {
      totalBookings: stats.totalBookings ?? 0,
      activeBookings: stats.activeBookings ?? 0,
      pendingBookings: stats.pendingBookings ?? 0,
      completedBookings: stats.completedBookings ?? 0,
      cancelledBookings: stats.cancelledBookings ?? 0,
      rejectedBookings: stats.rejectedBookings ?? 0,
      totalSpent: stats.totalSpent ?? 0,
      totalFavorites: stats.totalFavorites ?? 0,
      recentBookings: stats.recentBookings ?? []
    };
  }

  // Compute dashboard stats from bookings and favorites when API fails
  private computeDashboardStatsFromBookings(): Observable<AdvertiserDashboardStats> {
    return forkJoin({
      bookings: this.http.get<BookingApiResponse[]>(`${this.apiUrl}/bookings`).pipe(
        map(apiBookings => apiBookings.map(b => this.mapBookingResponse(b))),
        catchError(() => of([] as AdvertiserBooking[]))
      ),
      favorites: this.http.get<FavoriteBillboard[]>(`${this.apiUrl}/favourites`).pipe(
        catchError(() => of([] as FavoriteBillboard[]))
      )
    }).pipe(
      map(({ bookings, favorites }) => {
        const totalSpent = bookings
          .filter(b => b.status === 'APPROVED' || b.status === 'COMPLETED')
          .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

        const recentBookings = [...bookings]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5);

        return {
          totalBookings: bookings.length,
          activeBookings: bookings.filter(b => b.status === 'APPROVED').length,
          pendingBookings: bookings.filter(b => b.status === 'PENDING').length,
          completedBookings: bookings.filter(b => b.status === 'COMPLETED').length,
          cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
          rejectedBookings: bookings.filter(b => b.status === 'REJECTED').length,
          totalSpent,
          totalFavorites: favorites.length,
          recentBookings
        };
      })
    );
  }

  // ==================== FAVORITES ====================

  // Favorites tracking - maps billboardId to favoriteId
  private favoriteBillboardIds = new Set<number>();
  private billboardToFavoriteId = new Map<number, number>();
  private favoritesSubject = new BehaviorSubject<FavoriteBillboard[]>([]);
  favorites$ = this.favoritesSubject.asObservable();

  // Get all favorites
  getFavorites(): Observable<FavoriteBillboard[]> {
    return this.http.get<FavoriteBillboard[]>(`${this.apiUrl}/favourites`).pipe(
      tap(favorites => {
        this.favoritesSubject.next(favorites);
        this.favoriteBillboardIds.clear();
        this.billboardToFavoriteId.clear();
        favorites.forEach(f => {
          this.favoriteBillboardIds.add(f.billboard.id);
          this.billboardToFavoriteId.set(f.billboard.id, f.id);
        });
      })
    );
  }

  // Add billboard to favorites (POST uses billboard ID)
  // Backend returns plain text, so we handle it and refresh favorites
  addToFavorites(billboardId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/favourites/${billboardId}`, {}, { responseType: 'text' }).pipe(
      tap(() => {
        this.favoriteBillboardIds.add(billboardId);
      }),
      // After adding, fetch favorites to get the new favorite with its ID
      switchMap(() => this.getFavorites()),
      map(favorites => {
        const newFav = favorites.find(f => f.billboard.id === billboardId);
        return newFav || { id: 0, billboard: { id: billboardId } };
      })
    );
  }

  // Remove from favorites using favorite ID (DELETE uses favorite ID)
  removeFromFavorites(billboardId: number): Observable<any> {
    // First check local mapping
    let favoriteId = this.billboardToFavoriteId.get(billboardId);

    // Fallback: try to find in the subject
    if (!favoriteId) {
      const fav = this.favoritesSubject.value.find(f => f.billboard.id === billboardId);
      if (fav) {
        favoriteId = fav.id;
      }
    }

    // If still not found, fetch favorites first then remove
    if (!favoriteId) {
      return this.getFavorites().pipe(
        switchMap(favorites => {
          const fav = favorites.find(f => f.billboard.id === billboardId);
          if (fav) {
            return this.removeFromFavoritesById(fav.id, billboardId);
          }
          // If not found in API response either, just clean up local state
          this.favoriteBillboardIds.delete(billboardId);
          return of({ message: 'Removed from local state' });
        })
      );
    }

    return this.removeFromFavoritesById(favoriteId, billboardId);
  }

  // Remove by favorite ID
  // Backend returns plain text "Removed from favourites"
  private removeFromFavoritesById(favoriteId: number, billboardId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/favourites/${favoriteId}`, { responseType: 'text' }).pipe(
      tap(() => {
        this.favoriteBillboardIds.delete(billboardId);
        this.billboardToFavoriteId.delete(billboardId);
        this.favoritesSubject.next(
          this.favoritesSubject.value.filter(f => f.id !== favoriteId)
        );
      })
    );
  }

  // Check if billboard is in favorites (local check)
  isFavorite(billboardId: number): boolean {
    return this.favoriteBillboardIds.has(billboardId);
  }

  // Get favorite ID for a billboard
  getFavoriteId(billboardId: number): number | undefined {
    return this.billboardToFavoriteId.get(billboardId);
  }

  // Get current favorites count
  getFavoritesCount(): number {
    return this.favoritesSubject.value.length;
  }

  // ==================== PROFILE/SETTINGS ====================

  // Get advertiser profile
  getProfile(): Observable<AdvertiserProfile> {
    return this.http.get<AdvertiserProfileResponse>(`${this.apiUrl}/settings/profile`).pipe(
      map(response => this.mapProfileResponse(response))
    );
  }

  // Map API response to profile for UI (now flat, just pass through)
  private mapProfileResponse(response: AdvertiserProfileResponse): AdvertiserProfile {
    return {
      fullName: response.fullName || '',
      email: response.email || '',
      phone: response.phone || '',
      companyName: response.companyName,
      industry: response.industry,
      website: response.website,
      hasLogo: response.hasLogo || false
    };
  }

  // Get profile logo URL (used when hasLogo is true)
  getProfileLogoUrl(): string {
    return `${this.apiUrl}/settings/profile/logo`;
  }

  // Fetch profile logo as blob with authentication (for img src)
  getProfileLogo(): Observable<string> {
    return this.http.get(`${this.apiUrl}/settings/profile/logo`, {
      responseType: 'blob'
    }).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of(''))
    );
  }

  // Update advertiser profile with optional logo (multipart/form-data)
  // Backend expects: 'data' field with JSON string, 'logo' field with file (optional)
  updateProfile(profile: UpdateProfileRequest, logoFile?: File): Observable<AdvertiserProfile> {
    const formData = new FormData();

    // Build profile data - only include non-empty fields
    const profileData: Record<string, string> = {};
    if (profile.phone) profileData['phone'] = profile.phone;
    if (profile.companyName) profileData['companyName'] = profile.companyName;
    if (profile.industry) profileData['industry'] = profile.industry;
    if (profile.website) profileData['website'] = profile.website;

    // Add profile data as JSON string
    formData.append('data', JSON.stringify(profileData));

    // Add logo file if provided
    if (logoFile) {
      formData.append('logo', logoFile);
    }

    return this.http.post<AdvertiserProfileResponse>(`${this.apiUrl}/settings/profile`, formData).pipe(
      tap(() => {
        // Notify subscribers if logo was uploaded
        if (logoFile) {
          this.profileImageChanged.next();
        }
      }),
      map(response => this.mapProfileResponse(response))
    );
  }

  // Upload profile logo with current profile data
  uploadLogo(file: File, currentProfile: UpdateProfileRequest): Observable<AdvertiserProfile> {
    const formData = new FormData();

    // Build profile data - only include non-empty fields
    const profileData: Record<string, string> = {};
    if (currentProfile.phone) profileData['phone'] = currentProfile.phone;
    if (currentProfile.companyName) profileData['companyName'] = currentProfile.companyName;
    if (currentProfile.industry) profileData['industry'] = currentProfile.industry;
    if (currentProfile.website) profileData['website'] = currentProfile.website;

    formData.append('data', JSON.stringify(profileData));
    formData.append('logo', file);

    return this.http.post<AdvertiserProfileResponse>(`${this.apiUrl}/settings/profile`, formData).pipe(
      tap(() => {
        // Notify subscribers that profile image has changed
        this.profileImageChanged.next();
      }),
      map(response => this.mapProfileResponse(response))
    );
  }

  // ==================== PAYMENT METHODS ====================

  // Get all payment methods
  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.http.get<PaymentMethodResponse[]>(`${this.apiUrl}/payment-methods`).pipe(
      map(methods => methods.map(m => this.mapPaymentMethodResponse(m)))
    );
  }

  // Map API response to UI interface
  private mapPaymentMethodResponse(response: PaymentMethodResponse): PaymentMethod {
    return {
      id: response.id,
      type: response.type,
      label: response.label,
      addedAt: response.addedAt,
      isDefault: response.default
    };
  }

  // Add new payment method
  addPaymentMethod(request: AddPaymentMethodRequest): Observable<PaymentMethod> {
    const body = new URLSearchParams();
    body.set('type', request.type);
    body.set('label', request.label);

    return this.http.post<PaymentMethodResponse>(`${this.apiUrl}/payment-methods`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }).pipe(
      map(response => this.mapPaymentMethodResponse(response))
    );
  }

  // Remove payment method
  removePaymentMethod(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/payment-methods/${id}`, { responseType: 'text' });
  }

  // Set payment method as default
  setDefaultPaymentMethod(id: number): Observable<PaymentMethod> {
    return this.http.patch<PaymentMethodResponse>(`${this.apiUrl}/payment-methods/${id}/default`, {}).pipe(
      map(response => this.mapPaymentMethodResponse(response))
    );
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  // Get notification preferences (cached - rarely changes)
  getNotificationPreferences(forceRefresh = false): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferencesResponse>(`${this.apiUrl}/settings/notifications`).pipe(
      map(response => this.mapNotificationResponse(response))
    );
  }

  // Map API response to UI interface
  private mapNotificationResponse(response: NotificationPreferencesResponse): NotificationPreferences {
    return {
      emailNotifications: response.emailNotifications ?? true,
      smsNotifications: response.smsNotifications ?? false,
      paymentNotifications: response.paymentNotifications ?? true,
      campaignNotifications: response.campaignNotifications ?? true,
      systemNotifications: response.systemNotifications ?? true
    };
  }

  // Update notification preferences
  updateNotificationPreferences(preferences: UpdateNotificationPreferencesRequest): Observable<NotificationPreferences> {
    return this.http.post<NotificationPreferencesResponse>(`${this.apiUrl}/settings/notifications`, preferences).pipe(
      map(response => this.mapNotificationResponse(response))
    );
  }

  // ==================== SECURITY ====================

  // Change password
  changePassword(request: ChangePasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/settings/security/change-password`, request, {
      responseType: 'text'
    });
  }

  // Delete account
  deleteAccount(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/settings/security/delete-account`, {
      responseType: 'text'
    });
  }

  // Update 2FA setting
  update2FA(enabled: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/settings/security/2fa`, { enabled }, {
      responseType: 'text'
    });
  }

  // Get login history (uses shared user security endpoint)
  getLoginHistory(): Observable<LoginHistoryEntry[]> {
    return this.http.get<LoginHistoryEntry[]>(`${environment.apiUrl}/user/settings/security/login-history`);
  }

  // ==================== CAMPAIGNS ====================

  // Get all campaigns
  getCampaigns(): Observable<Campaign[]> {
    return this.http.get<CampaignResponse[]>(`${this.apiUrl}/campaigns`).pipe(
      map(campaigns => campaigns.map(c => this.mapCampaignResponse(c)))
    );
  }

  // Map API response to UI interface
  private mapCampaignResponse(response: CampaignResponse): Campaign {
    return {
      id: response.id,
      name: response.name,
      status: response.status,
      billboards: response.billboards,
      startDate: response.startDate,
      endDate: response.endDate,
      budget: response.budget,
      spent: response.spent ?? 0,
      impressions: response.impressions ?? 0,
      cities: response.cities || [],
      createdAt: response.createdAt
    };
  }

  // Create new campaign
  createCampaign(campaign: CreateCampaignRequest): Observable<Campaign> {
    return this.http.post<CampaignResponse>(`${this.apiUrl}/campaigns`, campaign).pipe(
      map(response => this.mapCampaignResponse(response))
    );
  }

  // Pause campaign
  pauseCampaign(id: number): Observable<Campaign> {
    return this.http.request<CampaignResponse>('PATCH', `${this.apiUrl}/campaigns/${id}/pause`, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => this.mapCampaignResponse(response)),
      catchError(err => {
        console.error('Pause campaign error:', err);
        throw err;
      })
    );
  }

  // Resume campaign
  resumeCampaign(id: number): Observable<Campaign> {
    return this.http.request<CampaignResponse>('PATCH', `${this.apiUrl}/campaigns/${id}/resume`, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      map(response => this.mapCampaignResponse(response)),
      catchError(err => {
        console.error('Resume campaign error:', err);
        throw err;
      })
    );
  }

  // Get campaign analytics
  getCampaignAnalytics(id: number): Observable<CampaignAnalytics> {
    return this.http.get<CampaignAnalytics>(`${this.apiUrl}/campaigns/analytics/${id}`);
  }
}
