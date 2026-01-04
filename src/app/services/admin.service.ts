import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError, map, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginHistoryEntry, EmailUpdateResponse, UnlockUserResponse } from './auth.service';

// User interface for admin management
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'OWNER' | 'ADVERTISER';
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
  blocked: boolean;
  createdAt: string;
  profileImage?: string;
}

// Owner with aggregated stats (from /api/admin/owners)
export interface OwnerStats {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED';
  blocked: boolean;
  createdAt: string;
  billboardCount: number;
  totalEarnings: number;
  company?: string;
}

// KYC Request interface
export interface KycRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  documentType: string;
  documentNumber: string;
  documentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

// Nested user interface for booking responses
export interface BookingUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  kycStatus: string;
  blocked: boolean;
  createdAt: string;
}

// Nested billboard interface for booking responses
export interface BookingBillboard {
  id: number;
  title: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  pricePerDay: number | null;
  size: string | null;
  available: boolean;
  type: 'DIGITAL' | 'STATIC' | 'LED';
  owner: BookingUser;
  createdAt: string;
  imagePaths: string[];
}

// Booking interface for admin - matches actual API response with nested objects
export interface AdminBooking {
  id: number;
  advertiser: BookingUser;
  billboard: BookingBillboard;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  paymentStatus: 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
}

// Analytics interface
export interface AdminAnalytics {
  totalUsers: number;
  totalOwners: number;
  totalAdvertisers: number;
  totalBillboards: number;
  totalBookings: number;
  pendingKyc: number;
  totalRevenue: number;
  activeBookings: number;
}

// Dashboard Stats interface (from /api/admin/dashboard/stats)
export interface DashboardStats {
  totalUsers: number;
  totalOwners: number;
  totalAdvertisers: number;
  totalPendingKyc: number;
  totalBlockedUsers: number;
  totalBillboards: number;
  availableBillboards: number;
  bookedBillboards: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
}

// Cancellation Analytics (from /api/admin/analytics/cancellations)
export interface CancellationAnalytics {
  totalCancelled: number;
  cancelledNoRefund: number;
  cancelledBeforePayment: number;
  revenueRetained: number;
}

// Booking Audit Entry (single action in audit trail)
export interface BookingAuditEntry {
  action: string; // CREATED, APPROVED, REJECTED, CANCELLED, PAID, etc.
  timestamp: string;
  performedBy: string; // email or name of the user who performed the action
  details?: string; // optional additional details
}

// Booking Audit Response (from /api/admin/bookings/{id}/audit)
export interface BookingAudit {
  bookingId: number;
  history: BookingAuditEntry[];
}

// Platform Settings interface (from /api/admin/platform-settings)
export interface PlatformSettings {
  id?: number;
  platformName: string;
  supportEmail: string;
  commissionPercent: number | null;
  gstPercent: number | null;
  currency: string;
  timezone: string;
}

// Admin Wallet interface
export interface AdminWallet {
  currentBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
  availableForWithdrawal: number;
  updatedAt: string;
}

// Admin Wallet Transaction interface
export interface AdminWalletTransaction {
  id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference: string;
  description: string;
  bookingId: number;
  ownerId: number;
  ownerName: string;
  balanceAfter: number;
  time: string;
}

// Admin Withdrawal Response interface
export interface AdminWithdrawalResponse {
  success: boolean;
  message: string;
  amountWithdrawn: number;
  newBalance: number;
  payout?: AdminPayout;
}

// Payout Request interface
export interface PayoutRequest {
  id: number;
  owner: AdminUser;
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'FAILED' | 'REJECTED';
  razorpayPayoutId?: string;
  failureReason?: string;
  createdAt: string;
  processedAt?: string;
}

// Chart Point interface
export interface ChartPoint {
  label: string;
  value: number;
}

// Platform Stats interface
export interface PlatformStats {
  totalRevenue: number;
  totalCommission: number;
  totalGst: number;
  totalBookings: number;
  pendingBookings: number;
}

// Admin Bank Account interface
export interface AdminBankAccount {
  id: number;
  accountHolderName: string;
  maskedAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: string;
  isPrimary: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Admin Bank Account Request interface
export interface AdminBankAccountRequest {
  accountHolderName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountType: string;
}

// Admin Payout interface
export interface AdminPayout {
  id: number;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  bankAccountMasked: string;
  bankName: string;
  utrNumber: string;
  notes: string;
  failureReason: string;
  initiatedAt: string;
  processedAt: string;
  completedAt: string;
}

// Admin Billboard interface
export interface AdminBillboard {
  id: number;
  title: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  pricePerDay: number;
  size: string;
  available: boolean;
  adminBlocked: boolean; // True if admin has blocked this billboard
  type: 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';
  owner: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  imagePaths: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = `${environment.apiUrl}/admin`;

  // Users
  private usersSubject = new BehaviorSubject<AdminUser[]>([]);
  users$ = this.usersSubject.asObservable();

  // Pending KYC
  private pendingKycSubject = new BehaviorSubject<AdminUser[]>([]);
  pendingKyc$ = this.pendingKycSubject.asObservable();

  // Bookings
  private bookingsSubject = new BehaviorSubject<AdminBooking[]>([]);
  bookings$ = this.bookingsSubject.asObservable();

  // Loading states
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // ==================== USER MANAGEMENT ====================

  // Get all users
  getAllUsers(): Observable<AdminUser[]> {
    this.loadingSubject.next(true);
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users`).pipe(
      tap(users => {
        this.usersSubject.next(users);
        this.loadingSubject.next(false);
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }

  // Get all owners with aggregated stats (billboard count, earnings)
  getAllOwnersWithStats(): Observable<OwnerStats[]> {
    return this.http.get<OwnerStats[]>(`${this.apiUrl}/owners`).pipe(
      catchError(err => {
        console.error('Error fetching owners with stats:', err);
        throw err;
      })
    );
  }

  // Get users with pending KYC
  getPendingKycUsers(): Observable<AdminUser[]> {
    this.loadingSubject.next(true);
    return this.http.get<AdminUser[]>(`${this.apiUrl}/users/pending-kyc`).pipe(
      tap(users => {
        this.pendingKycSubject.next(users);
        this.loadingSubject.next(false);
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }

  // Approve user KYC
  approveUserKyc(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${userId}/kyc-approve`, {}).pipe(
      tap(() => {
        // Update local state
        this.pendingKycSubject.next(
          this.pendingKycSubject.value.filter(u => u.id !== userId)
        );
        // Update users list
        this.usersSubject.next(
          this.usersSubject.value.map(u =>
            u.id === userId ? { ...u, kycStatus: 'APPROVED' as const } : u
          )
        );
      })
    );
  }

  // Reject user KYC
  rejectUserKyc(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${userId}/kyc-reject`, {}).pipe(
      tap(() => {
        // Update local state
        this.pendingKycSubject.next(
          this.pendingKycSubject.value.filter(u => u.id !== userId)
        );
        // Update users list
        this.usersSubject.next(
          this.usersSubject.value.map(u =>
            u.id === userId ? { ...u, kycStatus: 'REJECTED' as const } : u
          )
        );
      })
    );
  }

  // Block user
  blockUser(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${userId}/block`, {}).pipe(
      tap(() => {
        this.usersSubject.next(
          this.usersSubject.value.map(u =>
            u.id === userId ? { ...u, blocked: true } : u
          )
        );
      })
    );
  }

  // Unblock user
  unblockUser(userId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/${userId}/unblock`, {}).pipe(
      tap(() => {
        this.usersSubject.next(
          this.usersSubject.value.map(u =>
            u.id === userId ? { ...u, blocked: false } : u
          )
        );
      })
    );
  }

  // ==================== BOOKING MANAGEMENT ====================

  // Get all bookings (with optional status filter)
  getAllBookings(status?: string): Observable<AdminBooking[]> {
    this.loadingSubject.next(true);
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<AdminBooking[]>(`${this.apiUrl}/bookings`, { params }).pipe(
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

  // Get booking audit trail/history
  getBookingAudit(bookingId: number): Observable<BookingAudit> {
    return this.http.get<BookingAudit>(`${this.apiUrl}/bookings/${bookingId}/audit`);
  }

  // ==================== KYC MANAGEMENT (Legacy endpoints) ====================

  // Get pending KYC requests (legacy endpoint)
  getPendingKycRequests(): Observable<KycRequest[]> {
    return this.http.get<KycRequest[]>(`${this.apiUrl}/kyc/pending`);
  }

  // Approve KYC request (legacy endpoint)
  approveKyc(kycId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/kyc/approve/${kycId}`, {});
  }

  // Reject KYC request with reason (legacy endpoint)
  rejectKyc(kycId: number, reason: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/kyc/reject/${kycId}`, null, {
      params: { reason }
    });
  }

  // ==================== ANALYTICS ====================

  // Get dashboard stats from new API endpoint
  getDashboardStats(forceRefresh = false): Observable<DashboardStats> {
    // Removed caching - direct API call to ensure fresh data
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`);
  }

  // Get dashboard analytics
  getAnalytics(): Observable<AdminAnalytics> {
    return this.http.get<AdminAnalytics>(`${this.apiUrl}/analytics`);
  }

  // Get cancellation analytics
  getCancellationAnalytics(): Observable<CancellationAnalytics> {
    return this.http.get<CancellationAnalytics>(`${this.apiUrl}/analytics/cancellations`);
  }

  // Get computed analytics from local data
  getComputedAnalytics(): AdminAnalytics {
    const users = this.usersSubject.value;
    const bookings = this.bookingsSubject.value;

    return {
      totalUsers: users.length,
      totalOwners: users.filter(u => u.role === 'OWNER').length,
      totalAdvertisers: users.filter(u => u.role === 'ADVERTISER').length,
      totalBillboards: 0, // Will be fetched separately
      totalBookings: bookings.length,
      pendingKyc: users.filter(u => u.kycStatus === 'PENDING').length,
      totalRevenue: bookings
        .filter(b => b.status === 'COMPLETED' || b.status === 'APPROVED')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
      activeBookings: bookings.filter(b => b.status === 'APPROVED').length
    };
  }

  // ==================== REPORTS ====================

  // Download Users Report as CSV
  downloadUsersReportCsv(): void {
    this.http.get(`${this.apiUrl}/reports/users/csv`, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'users-report.csv', 'text/csv'),
      error: (err) => console.error('Error downloading users CSV:', err)
    });
  }

  // Download Users Report as PDF
  downloadUsersReportPdf(): void {
    this.http.get(`${this.apiUrl}/reports/users/pdf`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'users-report.pdf', 'application/pdf'),
      error: (err) => console.error('Error downloading users PDF:', err)
    });
  }

  // Download Bookings Report as CSV
  downloadBookingsReportCsv(): void {
    this.http.get(`${this.apiUrl}/reports/bookings/csv`, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'bookings-report.csv', 'text/csv'),
      error: (err) => console.error('Error downloading bookings CSV:', err)
    });
  }

  // Download Bookings Report as PDF
  downloadBookingsReportPdf(): void {
    this.http.get(`${this.apiUrl}/reports/bookings/pdf`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'bookings-report.pdf', 'application/pdf'),
      error: (err) => console.error('Error downloading bookings PDF:', err)
    });
  }

  // Download Revenue Report as CSV
  downloadRevenueReportCsv(): void {
    this.http.get(`${this.apiUrl}/reports/revenue/csv`, {
      responseType: 'blob',
      headers: { 'Accept': 'text/csv' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'revenue-report.csv', 'text/csv'),
      error: (err) => console.error('Error downloading revenue CSV:', err)
    });
  }

  // Download Revenue Report as PDF
  downloadRevenueReportPdf(): void {
    this.http.get(`${this.apiUrl}/reports/revenue/pdf`, {
      responseType: 'blob',
      headers: { 'Accept': 'application/pdf' }
    }).subscribe({
      next: (blob) => this.downloadFile(blob, 'revenue-report.pdf', 'application/pdf'),
      error: (err) => console.error('Error downloading revenue PDF:', err)
    });
  }

  // Helper method to trigger file download
  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    const url = window.URL.createObjectURL(new Blob([blob], { type: mimeType }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  // ==================== USER EMAIL MANAGEMENT ====================

  // Update user email (admin action)
  updateUserEmail(userId: number, newEmail: string): Observable<EmailUpdateResponse> {
    // Backend only expects newEmail in body, userId is in URL
    return this.http.put<EmailUpdateResponse>(`${this.apiUrl}/admin/users/${userId}/email`, {
      newEmail
    }).pipe(
      tap((response) => {
        if (response.success) {
          // Update local users state if cached
          const users = this.usersSubject.value;
          const updatedUsers = users.map(u =>
            u.id === userId ? { ...u, email: newEmail } : u
          );
          this.usersSubject.next(updatedUsers);
        }
      }),
      catchError(error => {
        console.error('Admin update user email error:', error);
        throw error;
      })
    );
  }

  // ==================== USER UNLOCK ====================

  // Unlock blocked user (admin action)
  unlockUser(userId: number, email?: string, reason?: string): Observable<UnlockUserResponse> {
    // Backend might accept email or userId
    return this.http.post<UnlockUserResponse>(`${this.apiUrl}/admin/security/unlock-user`, {
      email,
      userId,
      reason
    }).pipe(
      tap((response) => {
        if (response.success) {
          // Update local users state if cached
          const users = this.usersSubject.value;
          const updatedUsers = users.map(u =>
            u.id === userId ? { ...u, blocked: false } : u
          );
          this.usersSubject.next(updatedUsers);
        }
      }),
      catchError(error => {
        console.error('Admin unlock user error:', error);
        throw error;
      })
    );
  }

  // ==================== USER LOGIN HISTORY (ADMIN VIEW) ====================

  // Get login history for specific user (admin only)
  getUserLoginHistory(userId: number): Observable<LoginHistoryEntry[]> {
    return this.http.get<LoginHistoryEntry[]>(`${this.apiUrl}/admin/users/${userId}/login-history`).pipe(
      catchError(error => {
        console.error('Get user login history error:', error);
        throw error;
      })
    );
  }

  // ==================== SECURITY MANAGEMENT ====================

  // Force 2FA for all users (admin only)
  force2FAForAllUsers(): Observable<{ message: string; success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/security/force-2fa`, {}).pipe(
      map((response: any) => {
        // Handle string response from backend
        if (typeof response === 'string') {
          return { success: true, message: response };
        }
        return response || { success: true, message: '2FA enforced for all users' };
      }),
      catchError(error => {
        console.error('Force 2FA error:', error);
        throw {
          message: error.error?.message || error.error || 'Failed to enforce 2FA'
        };
      })
    );
  }

  // Disable forced 2FA for all users (admin only)
  disableForced2FA(): Observable<{ message: string; success: boolean }> {
    return this.http.post<any>(`${this.apiUrl}/security/disable-force-2fa`, {}).pipe(
      map((response: any) => {
        if (typeof response === 'string') {
          return { success: true, message: response };
        }
        return response || { success: true, message: 'Forced 2FA disabled' };
      }),
      catchError(error => {
        console.error('Disable forced 2FA error:', error);
        throw {
          message: error.error?.message || error.error || 'Failed to disable forced 2FA'
        };
      })
    );
  }

  // Get platform security settings
  getSecuritySettings(): Observable<{
    force2FAEnabled: boolean;
    totalUsersWithout2FA: number;
    totalUsersWithEmailOTP: number;
    totalUsersWithMagicLink: number;
  }> {
    return this.http.get<any>(`${this.apiUrl}/security/settings`).pipe(
      catchError(error => {
        console.error('Get security settings error:', error);
        throw error;
      })
    );
  }

  // Get login history for admin's own account
  getAdminLoginHistory(): Observable<LoginHistoryEntry[]> {
    return this.http.get<LoginHistoryEntry[]>(`${this.apiUrl}/security/login-history`).pipe(
      catchError(error => {
        console.error('Get admin login history error:', error);
        throw error;
      })
    );
  }

  // Change admin password
  changeAdminPassword(oldPassword: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/security/change-password`,
      { oldPassword, newPassword }
    ).pipe(
      catchError(error => {
        console.error('Change admin password error:', error);
        throw error;
      })
    );
  }

  // ==================== USER 2FA MANAGEMENT ====================

  // Get user's 2FA status
  getUserTwoFactorStatus(userId: number): Observable<{
    userId: number;
    email: string;
    name: string;
    twoFactorEnabled: boolean;
    twoFactorMethod: string;
    forceTwoFactor: boolean;
  }> {
    return this.http.get<any>(`${this.apiUrl}/security/users/${userId}/2fa-status`).pipe(
      catchError(error => {
        console.error('Get user 2FA status error:', error);
        throw error;
      })
    );
  }

  // Enforce 2FA for a specific user
  enforceTwoFactorForUser(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/security/users/${userId}/enforce-2fa`, {}
    ).pipe(
      catchError(error => {
        console.error('Enforce 2FA for user error:', error);
        throw error;
      })
    );
  }

  // Remove 2FA enforcement for a specific user (allows them to disable 2FA)
  removeForceTwoFactor(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/security/users/${userId}/remove-force-2fa`, {}
    ).pipe(
      catchError(error => {
        console.error('Remove force 2FA error:', error);
        throw error;
      })
    );
  }

  // Completely disable 2FA for a user (admin override)
  disableTwoFactorForUser(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/security/users/${userId}/disable-2fa`, {}
    ).pipe(
      catchError(error => {
        console.error('Disable 2FA for user error:', error);
        throw error;
      })
    );
  }

  // Reset 2FA for a user (clears current setup, requires re-setup)
  resetTwoFactorForUser(userId: number): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(
      `${this.apiUrl}/security/users/${userId}/reset-2fa`, {}
    ).pipe(
      catchError(error => {
        console.error('Reset 2FA for user error:', error);
        throw error;
      })
    );
  }

  // ==================== PLATFORM SETTINGS ====================

  // Get platform settings
  getPlatformSettings(forceRefresh = false): Observable<PlatformSettings> {
    // Direct API call - no caching to avoid stale data issues
    return this.http.get<PlatformSettings>(`${this.apiUrl}/platform-settings`).pipe(
      catchError(error => {
        console.error('Get platform settings error:', error);
        throw error;
      })
    );
  }

  // Update platform settings
  updatePlatformSettings(settings: PlatformSettings): Observable<PlatformSettings> {
    return this.http.put<PlatformSettings>(`${this.apiUrl}/platform-settings`, settings).pipe(
      catchError(error => {
        console.error('Update platform settings error:', error);
        throw error;
      })
    );
  }

  // ==================== ADMIN PROFILE ====================

  // Update admin profile with optional photo
  updateAdminProfile(profile: { name: string; email: string }, photoFile?: File): Observable<any> {
    const formData = new FormData();

    // Add profile data as JSON string
    formData.append('data', JSON.stringify(profile));

    // Add photo file if provided
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    return this.http.put<any>(`${this.apiUrl}/profile`, formData).pipe(
      catchError(error => {
        console.error('Update admin profile error:', error);
        throw error;
      })
    );
  }

  // Upload admin profile photo only
  uploadAdminPhoto(file: File): Observable<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    return this.http.post<{ photoUrl: string }>(`${this.apiUrl}/profile/photo`, formData).pipe(
      catchError(error => {
        console.error('Upload admin photo error:', error);
        throw error;
      })
    );
  }

  // ==================== ADMIN WALLET ====================

  // Get admin wallet balance
  getAdminWallet(): Observable<AdminWallet> {
    return this.http.get<AdminWallet>(`${this.apiUrl}/wallet`).pipe(
      catchError(error => {
        console.error('Get admin wallet error:', error);
        throw error;
      })
    );
  }

  // Get admin wallet transactions
  getAdminWalletTransactions(): Observable<AdminWalletTransaction[]> {
    return this.http.get<AdminWalletTransaction[]>(`${this.apiUrl}/wallet/transactions`).pipe(
      catchError(error => {
        console.error('Get admin wallet transactions error:', error);
        throw error;
      })
    );
  }

  // Withdraw commission from admin wallet
  withdrawCommission(amount: number, notes?: string): Observable<AdminWithdrawalResponse> {
    return this.http.post<AdminWithdrawalResponse>(`${this.apiUrl}/wallet/withdraw`, {
      amount,
      notes
    }).pipe(
      catchError(error => {
        console.error('Withdraw commission error:', error);
        throw error;
      })
    );
  }

  // Get admin wallet analytics
  getAdminWalletAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/wallet/analytics`).pipe(
      catchError(error => {
        console.error('Get admin wallet analytics error:', error);
        throw error;
      })
    );
  }

  // ==================== PAYOUT MANAGEMENT ====================

  // Get all payout requests
  getAllPayouts(): Observable<PayoutRequest[]> {
    return this.http.get<PayoutRequest[]>(`${this.apiUrl}/payouts`).pipe(
      catchError(error => {
        console.error('Get all payouts error:', error);
        throw error;
      })
    );
  }

  // Get payouts by status
  getPayoutsByStatus(status: string): Observable<PayoutRequest[]> {
    return this.http.get<PayoutRequest[]>(`${this.apiUrl}/payouts/status/${status}`).pipe(
      catchError(error => {
        console.error('Get payouts by status error:', error);
        throw error;
      })
    );
  }

  // Approve and process payout
  approvePayout(payoutId: number, fundAccountId: string): Observable<PayoutRequest> {
    return this.http.post<PayoutRequest>(
      `${this.apiUrl}/payouts/${payoutId}/approve`,
      null,
      { params: { fundAccountId } }
    ).pipe(
      catchError(error => {
        console.error('Approve payout error:', error);
        throw error;
      })
    );
  }

  // Reject payout request
  rejectPayout(payoutId: number, reason?: string): Observable<PayoutRequest> {
    let params: any = {};
    if (reason) {
      params.reason = reason;
    }
    return this.http.post<PayoutRequest>(
      `${this.apiUrl}/payouts/${payoutId}/reject`,
      null,
      { params }
    ).pipe(
      catchError(error => {
        console.error('Reject payout error:', error);
        throw error;
      })
    );
  }

  // ==================== ANALYTICS CHARTS ====================

  // Get monthly revenue chart data
  getRevenueChart(): Observable<ChartPoint[]> {
    return this.http.get<ChartPoint[]>(`${this.apiUrl}/analytics/revenue-chart`).pipe(
      catchError(error => {
        console.error('Get revenue chart error:', error);
        throw error;
      })
    );
  }

  // Get monthly bookings chart data
  getBookingsChart(): Observable<ChartPoint[]> {
    return this.http.get<ChartPoint[]>(`${this.apiUrl}/analytics/bookings-chart`).pipe(
      catchError(error => {
        console.error('Get bookings chart error:', error);
        throw error;
      })
    );
  }

  // Get top cities by billboard count
  getTopCities(): Observable<{ city: string; count: number }[]> {
    return this.http.get<{ city: string; count: number }[]>(`${this.apiUrl}/analytics/top-cities`).pipe(
      catchError(error => {
        console.error('Get top cities error:', error);
        throw error;
      })
    );
  }

  // Get billboard type distribution
  getBillboardTypes(forceRefresh = false): Observable<{ type: string; demand: number }[]> {
    return this.http.get<{ type: string; demand: number }[]>(`${this.apiUrl}/analytics/billboard-types`).pipe(
      catchError(error => {
        console.error('Get billboard types error:', error);
        throw error;
      })
    );
  }

  // Get top advertisers by spend
  getTopAdvertisers(): Observable<{ name: string; email: string; bookings: number; spent: number }[]> {
    return this.http.get<{ name: string; email: string; bookings: number; spent: number }[]>(`${this.apiUrl}/analytics/top-advertisers`).pipe(
      catchError(error => {
        console.error('Get top advertisers error:', error);
        throw error;
      })
    );
  }

  // Get platform stats (commission, GST, etc.)
  getPlatformStats(): Observable<PlatformStats> {
    return this.http.get<PlatformStats>(`${this.apiUrl}/analytics/platform-stats`).pipe(
      catchError(error => {
        console.error('Get platform stats error:', error);
        throw error;
      })
    );
  }

  // ==================== ADMIN BANK ACCOUNTS ====================

  // Get all bank accounts
  getAdminBankAccounts(): Observable<AdminBankAccount[]> {
    return this.http.get<AdminBankAccount[]>(`${this.apiUrl}/bank-accounts`).pipe(
      catchError(error => {
        console.error('Get admin bank accounts error:', error);
        throw error;
      })
    );
  }

  // Get primary bank account
  getPrimaryBankAccount(): Observable<AdminBankAccount> {
    return this.http.get<AdminBankAccount>(`${this.apiUrl}/bank-accounts/primary`).pipe(
      catchError(error => {
        console.error('Get primary bank account error:', error);
        throw error;
      })
    );
  }

  // Add new bank account
  addBankAccount(request: AdminBankAccountRequest): Observable<AdminBankAccount> {
    return this.http.post<AdminBankAccount>(`${this.apiUrl}/bank-accounts`, request).pipe(
      catchError(error => {
        console.error('Add bank account error:', error);
        throw error;
      })
    );
  }

  // Update bank account
  updateBankAccount(id: number, request: AdminBankAccountRequest): Observable<AdminBankAccount> {
    return this.http.put<AdminBankAccount>(`${this.apiUrl}/bank-accounts/${id}`, request).pipe(
      catchError(error => {
        console.error('Update bank account error:', error);
        throw error;
      })
    );
  }

  // Delete bank account
  deleteBankAccount(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/bank-accounts/${id}`).pipe(
      catchError(error => {
        console.error('Delete bank account error:', error);
        throw error;
      })
    );
  }

  // Set bank account as primary
  setBankAccountPrimary(id: number): Observable<AdminBankAccount> {
    return this.http.post<AdminBankAccount>(`${this.apiUrl}/bank-accounts/${id}/set-primary`, {}).pipe(
      catchError(error => {
        console.error('Set primary bank account error:', error);
        throw error;
      })
    );
  }

  // Verify bank account
  verifyBankAccount(id: number): Observable<AdminBankAccount> {
    return this.http.post<AdminBankAccount>(`${this.apiUrl}/bank-accounts/${id}/verify`, {}).pipe(
      catchError(error => {
        console.error('Verify bank account error:', error);
        throw error;
      })
    );
  }

  // ==================== ADMIN PAYOUTS (Commission Withdrawals) ====================

  // Get all admin payouts
  getAdminPayouts(): Observable<AdminPayout[]> {
    return this.http.get<AdminPayout[]>(`${this.apiUrl}/bank-accounts/payouts`).pipe(
      catchError(error => {
        console.error('Get admin payouts error:', error);
        throw error;
      })
    );
  }

  // Get payout by ID
  getAdminPayoutById(id: number): Observable<AdminPayout> {
    return this.http.get<AdminPayout>(`${this.apiUrl}/bank-accounts/payouts/${id}`).pipe(
      catchError(error => {
        console.error('Get admin payout error:', error);
        throw error;
      })
    );
  }

  // Get payouts by status
  getAdminPayoutsByStatus(status: string): Observable<AdminPayout[]> {
    return this.http.get<AdminPayout[]>(`${this.apiUrl}/bank-accounts/payouts/status/${status}`).pipe(
      catchError(error => {
        console.error('Get admin payouts by status error:', error);
        throw error;
      })
    );
  }

  // ==================== BILLBOARD MANAGEMENT ====================

  // Get all billboards
  getAllBillboards(): Observable<AdminBillboard[]> {
    return this.http.get<AdminBillboard[]>(`${this.apiUrl}/billboards`).pipe(
      catchError(error => {
        console.error('Get all billboards error:', error);
        throw error;
      })
    );
  }

  // Get billboard by ID
  getBillboard(id: number): Observable<AdminBillboard> {
    return this.http.get<AdminBillboard>(`${this.apiUrl}/billboards/${id}`).pipe(
      catchError(error => {
        console.error('Get billboard error:', error);
        throw error;
      })
    );
  }

  // Enable billboard (set available = true)
  enableBillboard(id: number): Observable<AdminBillboard> {
    return this.http.post<AdminBillboard>(`${this.apiUrl}/billboards/${id}/enable`, {}).pipe(
      catchError(error => {
        console.error('Enable billboard error:', error);
        throw error;
      })
    );
  }

  // Disable billboard (set available = false)
  disableBillboard(id: number): Observable<AdminBillboard> {
    return this.http.post<AdminBillboard>(`${this.apiUrl}/billboards/${id}/disable`, {}).pipe(
      catchError(error => {
        console.error('Disable billboard error:', error);
        throw error;
      })
    );
  }

  // Admin Block billboard (sets adminBlocked = true, prevents owner from unblocking)
  blockBillboard(id: number): Observable<AdminBillboard> {
    return this.http.post<AdminBillboard>(`${this.apiUrl}/billboards/${id}/block`, {}).pipe(
      catchError(error => {
        console.error('Block billboard error:', error);
        throw error;
      })
    );
  }

  // Admin Unblock billboard (sets adminBlocked = false, allows owner to control availability)
  unblockBillboard(id: number): Observable<AdminBillboard> {
    return this.http.post<AdminBillboard>(`${this.apiUrl}/billboards/${id}/unblock`, {}).pipe(
      catchError(error => {
        console.error('Unblock billboard error:', error);
        throw error;
      })
    );
  }

  // Update billboard price
  updateBillboardPrice(id: number, price: number): Observable<AdminBillboard> {
    return this.http.put<AdminBillboard>(`${this.apiUrl}/billboards/${id}/price`, { price }).pipe(
      catchError(error => {
        console.error('Update billboard price error:', error);
        throw error;
      })
    );
  }

  // Delete billboard
  deleteBillboard(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/billboards/${id}`).pipe(
      catchError(error => {
        console.error('Delete billboard error:', error);
        throw error;
      })
    );
  }
}
