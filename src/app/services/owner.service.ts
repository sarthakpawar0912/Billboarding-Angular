import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of, Subject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Billboard interfaces
export type BillboardType = 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';

export const BILLBOARD_TYPES: { value: BillboardType; label: string; icon: string; description: string }[] = [
  { value: 'STATIC', label: 'Static', icon: '📋', description: 'Traditional static billboard' },
  { value: 'LED', label: 'LED', icon: '📺', description: 'LED display screen' },
  { value: 'DIGITAL', label: 'Digital', icon: '💻', description: 'Digital display board' },
  { value: 'NEON', label: 'Neon', icon: '✨', description: 'Neon light signage' }
];

export interface BillboardOwnerInfo {
  id: number;
  name: string;
  email: string;
}

export interface OwnerBillboard {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  type: BillboardType;
  size: string;
  pricePerDay: number;
  available: boolean;
  adminBlocked?: boolean; // True if admin has blocked this billboard
  owner?: BillboardOwnerInfo;
  createdAt: string;
  imageUrl?: string;
  imagePaths?: string[];
}

export interface CreateBillboardRequest {
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  type: BillboardType;
  size: string;
  pricePerDay: number;
}

export interface UpdateBillboardRequest {
  title?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  type?: BillboardType;
  size?: string;
  pricePerDay?: number;
  available?: boolean;
}

// Booking interfaces for Owner - Updated for new API structure
export interface BookingAdvertiser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  kycStatus?: string;
  blocked?: boolean;
  createdAt?: string;
}

export interface BookingBillboardOwner {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  kycStatus?: string;
}

export interface BookingBillboard {
  id: number;
  title: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  pricePerDay: number | null;
  size: string | null;
  available: boolean;
  type: 'DIGITAL' | 'STATIC' | 'LED' | 'NEON';
  owner: BookingBillboardOwner;
  createdAt: string;
  imagePaths: string[];
}

export type BookingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OwnerBooking {
  id: number;
  advertiser: BookingAdvertiser;
  billboard: BookingBillboard;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  // ================= PRICE BREAKDOWN =================
  originalBaseAmount?: number;   // Original base (before discount)
  discountPercent?: number;      // Discount % applied by owner (0-50)
  discountAmount?: number;       // Discount amount
  baseAmount?: number;           // Base amount AFTER discount
  commissionAmount?: number;     // Platform commission
  commissionPercent?: number;    // Commission % (from platform settings)
  gstAmount?: number;            // GST amount
  gstPercentage?: number;        // GST %
  // Legacy fields for backward compatibility
  billboardId?: number;
  billboardTitle?: string;
  billboardLocation?: string;
  advertiserId?: number;
  advertiserName?: string;
  advertiserEmail?: string;
  totalAmount?: number;
}

// Discount limits response
export interface DiscountLimits {
  bookingId: number;
  isWeekend: boolean;
  maxDiscountPercent: number;
  currentDiscountPercent: number;
  currentDiscountAmount: number;
  originalBaseAmount: number;
  currentTotal: number;
  // Platform settings for accurate calculation
  commissionPercent: number;
  gstPercent: number;
}

// Owner earnings/analytics
export interface OwnerEarnings {
  totalEarnings: number;
  pendingEarnings: number;
  thisMonthEarnings: number;
  totalBookings: number;
  completedBookings: number;
}

// Billboard stats for dashboard
export interface BillboardStats {
  billboardId: number;
  title: string;
  totalBookings: number;
  totalRevenue: number;
  imageCount: number;
}

// Billboard Revenue Analytics (from /api/owner/analytics)
export interface BillboardRevenue {
  billboardId: number;
  title: string | null;
  totalBookings: number;
  revenue: number;
  imageCount: number;
}

// Owner Analytics Response
export interface OwnerAnalytics {
  totalRevenue: number;
  billboardRevenues: BillboardRevenue[];
  topPerformingBillboard: BillboardRevenue | null;
  monthlyRevenues: { [key: string]: number };
}

// Owner Dashboard Stats (from /api/owner/dashboard)
export interface OwnerDashboardStats {
  totalEarnings: number;
  totalBillboards: number;
  totalBookings: number;
  totalPendingRequests: number;
  billboardStats: BillboardStats[];
}

// Revenue Dashboard Billboard (from /api/owner/revenue/dashboard)
export interface RevenueBillboard {
  billboardId: number;
  title: string | null;
  location: string | null;
  type: 'DIGITAL' | 'STATIC' | 'LED' | 'NEON';
  totalBookings: number;
  totalRevenue: number;
  imageCount: number;
  latitude: number | null;
  longitude: number | null;
}

// Monthly Revenue data (from revenue dashboard)
export interface MonthlyRevenue {
  year: number;
  month: number;
  totalRevenue: number;
}

// Monthly Revenue API response (from /api/owner/revenue/monthly)
export interface MonthlyRevenueItem {
  month: string; // YYYY-MM format
  revenue: number;
}

// Owner Calendar Day (from /api/owner/calendar/{billboardId})
export interface OwnerCalendarDay {
  date: string; // YYYY-MM-DD
  status: 'AVAILABLE' | 'BOOKED' | 'PENDING';
  revenue: number;
}

// Heatmap Point for map visualization
export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;
}

// Revenue Dashboard Response (from /api/owner/revenue/dashboard)
export interface RevenueDashboard {
  totalEarnings: number;
  totalBillboards: number;
  totalBookings: number;
  pendingRequests: number;
  billboards: RevenueBillboard[];
  monthlyRevenue: MonthlyRevenue[];
  heatmapPoints: HeatmapPoint[];
}

// Map analytics point (from /api/owner/map/analytics)
export interface MapAnalyticsPoint {
  latitude: number;
  longitude: number;
  revenue: number;
}

// Map billboard interface (from /api/owner/map/billboards)
export interface OwnerMapBillboard {
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

// Owner Wallet interface
export interface OwnerWallet {
  id: number;
  owner: {
    id: number;
    name: string;
    email: string;
  };
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
}

// Wallet Transaction interface
export interface WalletTransaction {
  id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference: string;
  time: string;
}

// Payout Request interface
export interface OwnerPayoutRequest {
  id: number;
  amount: number;
  status: 'PROCESSING' | 'PAID' | 'FAILED';
  razorpayPayoutId?: string;
  utrNumber?: string;
  bankName?: string;
  accountNumber?: string;
  transferMode?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
}

// Chart Point interface
export interface ChartPoint {
  label: string;
  value: number;
}

// Bank Account interfaces
export interface OwnerBankAccount {
  id: number;
  accountHolderName: string;
  maskedAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'SAVINGS' | 'CURRENT';
  verificationStatus: 'PENDING' | 'VERIFIED' | 'FAILED';
  readyForPayout: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountRequest {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType?: 'SAVINGS' | 'CURRENT';
}

export interface IFSCLookupResponse {
  ifsc: string;
  valid: boolean;
  bankName: string;
}

@Injectable({
  providedIn: 'root'
})
export class OwnerService {
  private apiUrl = `${environment.apiUrl}/owner`;

  // Profile image change notifier
  private profileImageChanged = new Subject<void>();
  profileImageChanged$ = this.profileImageChanged.asObservable();

  // Billboards
  private billboardsSubject = new BehaviorSubject<OwnerBillboard[]>([]);
  billboards$ = this.billboardsSubject.asObservable();

  // Bookings
  private bookingsSubject = new BehaviorSubject<OwnerBooking[]>([]);
  bookings$ = this.bookingsSubject.asObservable();

  // Loading states
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== BILLBOARD MANAGEMENT ====================

  // Get all billboards with map data (includes full details for map view)
  getMapBillboards(): Observable<OwnerMapBillboard[]> {
    return this.http.get<OwnerMapBillboard[]>(`${this.apiUrl}/map/billboards`);
  }

  // Get map analytics (revenue per billboard location)
  getMapAnalytics(): Observable<MapAnalyticsPoint[]> {
    return this.http.get<MapAnalyticsPoint[]>(`${this.apiUrl}/map/analytics`);
  }

  // Get all billboards for current owner
  getMyBillboards(): Observable<OwnerBillboard[]> {
    this.loadingSubject.next(true);
    return this.http.get<OwnerBillboard[]>(`${this.apiUrl}/billboards`).pipe(
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

  // Create new billboard
  createBillboard(billboard: CreateBillboardRequest): Observable<OwnerBillboard> {
    return this.http.post<OwnerBillboard>(`${this.apiUrl}/billboards`, billboard).pipe(
      tap(newBillboard => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next([newBillboard, ...current]);
      })
    );
  }

  // Update billboard
  updateBillboard(id: number, billboard: UpdateBillboardRequest): Observable<OwnerBillboard> {
    return this.http.put<OwnerBillboard>(`${this.apiUrl}/billboards/${id}`, billboard).pipe(
      tap(updatedBillboard => {
        const current = this.billboardsSubject.value;
        const index = current.findIndex(b => b.id === id);
        if (index !== -1) {
          current[index] = updatedBillboard;
          this.billboardsSubject.next([...current]);
        }
      })
    );
  }

  // Delete billboard (with optional force delete)
  deleteBillboard(id: number, force: boolean = false): Observable<any> {
    const url = force
      ? `${this.apiUrl}/billboards/${id}?force=true`
      : `${this.apiUrl}/billboards/${id}`;

    return this.http.delete(url).pipe(
      tap(() => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next(current.filter(b => b.id !== id));
      }),
      catchError(error => {
        console.error('Delete billboard error:', error);
        // Parse error body if it's a string (JSON)
        if (error.error && typeof error.error === 'string') {
          try {
            error.error = JSON.parse(error.error);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
        throw error;
      })
    );
  }

  // Toggle billboard availability using dedicated endpoint
  toggleAvailability(id: number, available: boolean): Observable<OwnerBillboard> {
    return this.http.put<OwnerBillboard>(
      `${this.apiUrl}/billboards/${id}/availability?available=${available}`,
      {}
    ).pipe(
      tap(updatedBillboard => {
        const current = this.billboardsSubject.value;
        const index = current.findIndex(b => b.id === id);
        if (index !== -1) {
          current[index] = updatedBillboard;
          this.billboardsSubject.next([...current]);
        }
      })
    );
  }

  // Upload images for billboard
  uploadImages(billboardId: number, images: File[]): Observable<OwnerBillboard> {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });
    return this.http.post<OwnerBillboard>(`${this.apiUrl}/billboards/${billboardId}/upload-images`, formData).pipe(
      tap(updatedBillboard => {
        const current = this.billboardsSubject.value;
        const index = current.findIndex(b => b.id === billboardId);
        if (index !== -1) {
          current[index] = updatedBillboard;
          this.billboardsSubject.next([...current]);
        }
      })
    );
  }

  // ==================== BOOKING MANAGEMENT ====================

  // Get all bookings for owner's billboards
  getMyBookings(): Observable<OwnerBooking[]> {
    this.loadingSubject.next(true);
    return this.http.get<OwnerBooking[]>(`${this.apiUrl}/bookings`).pipe(
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

  // Get pending booking requests
  getBookingRequests(): Observable<OwnerBooking[]> {
    return this.http.get<OwnerBooking[]>(`${this.apiUrl}/bookings/requests`);
  }

  // Get upcoming approved bookings
  getUpcomingBookings(): Observable<OwnerBooking[]> {
    return this.http.get<OwnerBooking[]>(`${this.apiUrl}/bookings/upcoming`);
  }

  // Get completed bookings
  getCompletedBookings(): Observable<OwnerBooking[]> {
    return this.http.get<OwnerBooking[]>(`${this.apiUrl}/bookings/completed`);
  }

  // Approve booking
  approveBooking(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bookings/${bookingId}/approve`, {}).pipe(
      tap(() => {
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, status: 'APPROVED' as const } : b
          )
        );
      })
    );
  }

  // Reject booking
  rejectBooking(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bookings/${bookingId}/reject`, {}).pipe(
      tap(() => {
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, status: 'REJECTED' as const } : b
          )
        );
      })
    );
  }

  // ==================== DISCOUNT MANAGEMENT ====================

  /**
   * Apply discount to a booking (0-50%)
   * @param bookingId Booking ID
   * @param discountPercent Discount percentage (0-50)
   * @returns Updated booking
   */
  applyDiscount(bookingId: number, discountPercent: number): Observable<OwnerBooking> {
    return this.http.post<OwnerBooking>(
      `${this.apiUrl}/bookings/${bookingId}/discount`,
      null,
      { params: { percent: discountPercent.toString() } }
    ).pipe(
      tap((updatedBooking) => {
        // Update local bookings cache
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, ...updatedBooking } : b
          )
        );
      }),
      catchError(err => {
        console.error('Apply discount error:', err);
        throw err;
      })
    );
  }

  /**
   * Remove discount from a booking (set to 0%)
   */
  removeDiscount(bookingId: number): Observable<OwnerBooking> {
    return this.http.delete<OwnerBooking>(`${this.apiUrl}/bookings/${bookingId}/discount`).pipe(
      tap((updatedBooking) => {
        this.bookingsSubject.next(
          this.bookingsSubject.value.map(b =>
            b.id === bookingId ? { ...b, ...updatedBooking } : b
          )
        );
      }),
      catchError(err => {
        console.error('Remove discount error:', err);
        throw err;
      })
    );
  }

  /**
   * Get discount limits for a booking (max %, current %, etc.)
   */
  getDiscountLimits(bookingId: number): Observable<DiscountLimits> {
    return this.http.get<DiscountLimits>(`${this.apiUrl}/bookings/${bookingId}/discount-limits`).pipe(
      catchError(err => {
        console.error('Get discount limits error:', err);
        throw err;
      })
    );
  }

  // ==================== EARNINGS/ANALYTICS ====================

  // Get owner earnings
  getEarnings(): Observable<OwnerEarnings> {
    return this.http.get<OwnerEarnings>(`${this.apiUrl}/earnings`);
  }

  // Compute earnings from local data
  getComputedEarnings(): OwnerEarnings {
    const bookings = this.bookingsSubject.value;
    const completedBookings = bookings.filter(b => b.status === 'COMPLETED');
    const approvedBookings = bookings.filter(b => b.status === 'APPROVED');

    return {
      totalEarnings: completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      pendingEarnings: approvedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      thisMonthEarnings: this.getThisMonthEarnings(completedBookings),
      totalBookings: bookings.length,
      completedBookings: completedBookings.length
    };
  }

  private getThisMonthEarnings(bookings: OwnerBooking[]): number {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return bookings
      .filter(b => {
        const bookingDate = new Date(b.createdAt);
        return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear;
      })
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  }

  // Get image URL
  getImageUrl(imagePath: string): string {
    return `${environment.apiUrl.replace('/api', '')}/${imagePath}`;
  }

  // ==================== DASHBOARD ====================

  // Get owner dashboard stats
  getDashboardStats(): Observable<OwnerDashboardStats> {
    return this.http.get<OwnerDashboardStats>(`${this.apiUrl}/dashboard`);
  }

  // ==================== ANALYTICS ====================

  // Get owner analytics
  getAnalytics(): Observable<OwnerAnalytics> {
    return this.http.get<OwnerAnalytics>(`${this.apiUrl}/analytics`);
  }

  // ==================== MONTHLY REVENUE ====================

  // Get monthly revenue data (from /api/owner/revenue/monthly)
  getMonthlyRevenue(): Observable<MonthlyRevenueItem[]> {
    return this.http.get<MonthlyRevenueItem[]>(`${this.apiUrl}/revenue/monthly`);
  }

  // ==================== BILLBOARD CALENDAR ====================

  // Get billboard calendar with availability and revenue per day
  getBillboardCalendar(billboardId: number, startDate: string, endDate: string): Observable<OwnerCalendarDay[]> {
    return this.http.get<OwnerCalendarDay[]>(`${this.apiUrl}/calendar/${billboardId}`, {
      params: { start: startDate, end: endDate }
    });
  }

  // ==================== REVENUE DASHBOARD ====================

  // Get revenue dashboard data with optional filters
  getRevenueDashboard(filters?: {
    billboardId?: number;
    start?: string;
    end?: string;
  }): Observable<RevenueDashboard> {
    let params: any = {};
    if (filters?.billboardId) {
      params.billboardId = filters.billboardId;
    }
    if (filters?.start) {
      params.start = filters.start;
    }
    if (filters?.end) {
      params.end = filters.end;
    }
    return this.http.get<RevenueDashboard>(`${this.apiUrl}/revenue/dashboard`, { params });
  }

  // ==================== REVENUE EXPORT ====================

  // Export revenue data as CSV
  exportRevenueCSV(filters?: {
    billboardId?: number;
    start?: string;
    end?: string;
  }): Observable<Blob> {
    let params: any = {};
    if (filters?.billboardId) {
      params.billboardId = filters.billboardId;
    }
    if (filters?.start) {
      params.start = filters.start;
    }
    if (filters?.end) {
      params.end = filters.end;
    }
    return this.http.get(`${this.apiUrl}/revenue/export/csv`, {
      params,
      responseType: 'blob'
    });
  }

  // Export revenue data as PDF
  exportRevenuePDF(filters?: {
    billboardId?: number;
    start?: string;
    end?: string;
  }): Observable<Blob> {
    let params: any = {};
    if (filters?.billboardId) {
      params.billboardId = filters.billboardId;
    }
    if (filters?.start) {
      params.start = filters.start;
    }
    if (filters?.end) {
      params.end = filters.end;
    }
    return this.http.get(`${this.apiUrl}/revenue/export/pdf`, {
      params,
      responseType: 'blob'
    });
  }

  // ==================== SECURITY ====================

  // Change password
  changePassword(request: { oldPassword: string; newPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/settings/security/change-password`, request, {
      responseType: 'text'
    });
  }

  // ==================== WALLET ====================

  // Get owner wallet
  getWallet(): Observable<OwnerWallet> {
    return this.http.get<OwnerWallet>(`${this.apiUrl}/wallet`).pipe(
      catchError(err => {
        console.error('Get wallet error:', err);
        throw err;
      })
    );
  }

  // Get wallet transactions
  getWalletTransactions(): Observable<WalletTransaction[]> {
    return this.http.get<WalletTransaction[]>(`${this.apiUrl}/wallet/transactions`).pipe(
      catchError(err => {
        console.error('Get wallet transactions error:', err);
        throw err;
      })
    );
  }

  // ==================== PAYOUTS ====================

  // Request payout
  requestPayout(amount: number): Observable<OwnerPayoutRequest> {
    return this.http.post<OwnerPayoutRequest>(
      `${this.apiUrl}/payouts/request`,
      null,
      { params: { amount: amount.toString() } }
    ).pipe(
      catchError(err => {
        console.error('Request payout error:', err);
        throw err;
      })
    );
  }

  // Get my payout requests
  getMyPayouts(): Observable<OwnerPayoutRequest[]> {
    return this.http.get<OwnerPayoutRequest[]>(`${this.apiUrl}/payouts`).pipe(
      catchError(err => {
        console.error('Get payouts error:', err);
        throw err;
      })
    );
  }

  // ==================== DASHBOARD CHARTS ====================

  // Get monthly revenue chart
  getRevenueChart(): Observable<ChartPoint[]> {
    return this.http.get<ChartPoint[]>(`${this.apiUrl}/dashboard/charts/revenue`).pipe(
      catchError(err => {
        console.error('Get revenue chart error:', err);
        throw err;
      })
    );
  }

  // Get monthly bookings chart
  getBookingsChart(): Observable<ChartPoint[]> {
    return this.http.get<ChartPoint[]>(`${this.apiUrl}/dashboard/charts/bookings`).pipe(
      catchError(err => {
        console.error('Get bookings chart error:', err);
        throw err;
      })
    );
  }

  // Get revenue by billboard chart
  getBillboardRevenueChart(): Observable<ChartPoint[]> {
    return this.http.get<ChartPoint[]>(`${this.apiUrl}/dashboard/charts/billboard-revenue`).pipe(
      catchError(err => {
        console.error('Get billboard revenue chart error:', err);
        throw err;
      })
    );
  }

  // ==================== BANK ACCOUNT ====================

  // Get owner's bank account
  getBankAccount(): Observable<OwnerBankAccount> {
    return this.http.get<OwnerBankAccount>(`${this.apiUrl}/bank-account`).pipe(
      catchError(err => {
        console.error('Get bank account error:', err);
        throw err;
      })
    );
  }

  // Check if owner has bank account
  hasBankAccount(): Observable<{ exists: boolean }> {
    return this.http.get<{ exists: boolean }>(`${this.apiUrl}/bank-account/exists`).pipe(
      catchError(err => {
        console.error('Check bank account error:', err);
        throw err;
      })
    );
  }

  // Save bank account (create or update)
  saveBankAccount(request: BankAccountRequest): Observable<OwnerBankAccount> {
    return this.http.post<OwnerBankAccount>(`${this.apiUrl}/bank-account`, request).pipe(
      catchError(err => {
        console.error('Save bank account error:', err);
        throw err;
      })
    );
  }

  // Delete bank account
  deleteBankAccount(): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/bank-account`).pipe(
      catchError(err => {
        console.error('Delete bank account error:', err);
        throw err;
      })
    );
  }

  // Lookup IFSC code
  lookupIFSC(ifsc: string): Observable<IFSCLookupResponse> {
    return this.http.get<IFSCLookupResponse>(`${this.apiUrl}/bank-account/lookup-ifsc/${ifsc}`).pipe(
      catchError(err => {
        console.error('IFSC lookup error:', err);
        throw err;
      })
    );
  }

  // ==================== PROFILE IMAGE ====================

  // Get profile image URL (used when hasProfileImage is true)
  getProfileImageUrl(): string {
    return `${this.apiUrl}/settings/profile/image`;
  }

  // Fetch profile image as blob with authentication (for img src)
  getProfileImage(): Observable<string> {
    return this.http.get(`${this.apiUrl}/settings/profile/image`, {
      responseType: 'blob'
    }).pipe(
      map(blob => URL.createObjectURL(blob)),
      catchError(() => of(''))
    );
  }

  // Upload profile image
  uploadProfileImage(file: File): Observable<{ message: string; hasProfileImage: boolean }> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<{ message: string; hasProfileImage: boolean }>(
      `${this.apiUrl}/settings/profile/image`,
      formData
    ).pipe(
      tap(() => {
        // Notify subscribers that profile image has changed
        this.profileImageChanged.next();
      }),
      catchError(err => {
        console.error('Upload profile image error:', err);
        throw err;
      })
    );
  }

  // Check if user has profile image
  hasProfileImage(): Observable<{ hasImage: boolean }> {
    return this.http.get<{ hasImage: boolean }>(`${this.apiUrl}/settings/profile/has-image`).pipe(
      catchError(() => of({ hasImage: false }))
    );
  }
}
