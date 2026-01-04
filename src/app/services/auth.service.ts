import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map, throwError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  twoFactorRequired: boolean;
  token: string | null;
  role: string;
  userId: number;
  message: string;
  twoFactorMethod?: 'EMAIL_OTP' | 'MAGIC_LINK';
  forceTwoFactor?: boolean;
  riskyLogin?: boolean;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  twoFactorRequired: boolean;
  token: string;
  role: string;
  userId: number;
  message: string;
}

export interface TwoFactorMethodRequest {
  method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK';
}

export interface TwoFactorMethodResponse {
  message: string;
  success: boolean;
}

export interface RegisterResponse {
  message: string;
  userId?: number;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  message?: string;
  success?: boolean;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  message: string;
  success: boolean;
}

export interface RecoveryCodesResponse {
  recoveryCodes: string[];
  message: string;
}

export interface VerifyRecoveryRequest {
  email: string;
  code: string;
}

export interface VerifyRecoveryResponse {
  token: string;
  role: string;
  userId: number;
  message: string;
}

export interface ResetRequest {
  email: string;
}

export interface ResetRequestResponse {
  message: string;
  success: boolean;
}

// Magic Link Interfaces
export interface MagicLinkRequest {
  email: string;
}

export interface MagicLinkResponse {
  success: boolean;
  message: string;
}

export interface MagicLinkVerifyRequest {
  token: string;
}

export interface MagicLinkVerifyResponse {
  twoFactorRequired: boolean;
  token: string;
  role: string;
  userId: number;
  message: string;
}

export interface ResetConfirmRequest {
  token: string;
}

export interface ResetConfirmResponse {
  message: string;
  success: boolean;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK';
  forceTwoFactor: boolean;
  hasRecoveryCodes: boolean;
  adminEnforced2FA?: boolean;
}

export interface LoginHistoryEntry {
  id: number;
  email: string;
  ipAddress: string | null;
  ip?: string;
  loginAt: string;
  userAgent: string;
  twoFactorUsed?: boolean;
  status?: 'SUCCESS' | 'FAILED';
  location?: string;
  city?: string;
  country?: string;
  risky?: boolean;
}

export interface EmailUpdateRequest {
  newEmail: string;
  // Note: Backend UpdateEmailRequest doesn't require password
}

export interface EmailUpdateResponse {
  message: string;
  success?: boolean;
  emailVerificationRequired?: boolean;
  pendingEmail?: string;
}

export interface AdminEmailUpdateRequest {
  newEmail: string;
  // userId is in the URL path, not body
}

export interface UnlockUserRequest {
  email?: string;  // Backend might use email instead of userId
  userId?: number;
  reason?: string;
}

export interface UnlockUserResponse {
  message: string;
  success: boolean;
  user?: {
    id: number;
    email: string;
    blocked: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSignal = signal<User | null>(null);

  currentUser = computed(() => this.currentUserSignal());
  isLoggedIn = computed(() => this.currentUserSignal() !== null);
  isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  constructor(private http: HttpClient, private router: Router) {
    this.checkStoredAuth();
  }

  private checkStoredAuth(): void {
    const storedUser = localStorage.getItem('boabp_user');
    if (storedUser) {
      this.currentUserSignal.set(JSON.parse(storedUser));
    }
  }

  // Register new user
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, data).pipe(
      tap(response => {
        console.log('Registration response:', response);
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return of({
          success: false,
          message: error.error?.message || 'Registration failed. Please try again.'
        });
      })
    );
  }

  // Login user
  login(email: string, password: string): Observable<LoginResponse> {
    const loginData: LoginRequest = { email, password };

    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, loginData).pipe(
      tap(response => {
        // Only set token and user if 2FA is not required
        if (!response.twoFactorRequired && response.token) {
          this.handleSuccessfulLogin(email, response.token, response.role, response.userId);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        throw { message: error.error?.message || 'Invalid email or password' };
      })
    );
  }

  // Verify Email OTP for 2FA (Email OTP can be resent)
  verifyOtp(email: string, otp: string): Observable<VerifyOtpResponse> {
    const otpData: VerifyOtpRequest = { email, otp };

    // Using /auth/verify-email-otp as per backend spec
    return this.http.post<VerifyOtpResponse>(`${this.apiUrl}/auth/verify-email-otp`, otpData).pipe(
      tap(response => {
        if (response.token) {
          this.handleSuccessfulLogin(email, response.token, response.role, response.userId);
        }
      }),
      catchError(error => {
        console.error('Email OTP verification error:', error);
        const errorMsg = error.error?.message || 'Invalid OTP. Please try again.';
        // Handle specific error cases
        if (error.status === 410 || errorMsg.toLowerCase().includes('expired')) {
          throw { message: 'OTP has expired. Please request a new one.', code: 'OTP_EXPIRED' };
        }
        if (error.status === 429) {
          throw { message: 'Too many attempts. Please wait before trying again.', code: 'RATE_LIMITED' };
        }
        throw { message: errorMsg };
      })
    );
  }

  // Handle successful login (set token and user)
  private handleSuccessfulLogin(email: string, token: string, role: string, userId: number): void {
    localStorage.setItem('boabp_token', token);

    // Create user object from response
    const user: User = {
      id: userId.toString(),
      email: email,
      name: email.split('@')[0], // Will be updated when we fetch user profile
      role: this.mapRole(role),
      createdAt: new Date()
    };

    this.currentUserSignal.set(user);
    localStorage.setItem('boabp_user', JSON.stringify(user));
  }

  // Map backend role to frontend role format
  private mapRole(backendRole: string): 'admin' | 'billboard_owner' | 'advertiser' {
    const roleMap: Record<string, 'admin' | 'billboard_owner' | 'advertiser'> = {
      'ADMIN': 'admin',
      'OWNER': 'billboard_owner',
      'BILLBOARD_OWNER': 'billboard_owner',
      'ADVERTISER': 'advertiser'
    };
    return roleMap[backendRole.toUpperCase()] || 'advertiser';
  }

  // Logout user
  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem('boabp_user');
    localStorage.removeItem('boabp_token');
    this.router.navigate(['/signin']);
  }

  // Update current user avatar
  updateCurrentUserAvatar(avatarUrl: string): void {
    const user = this.currentUserSignal();
    if (user) {
      const updatedUser = { ...user, avatar: avatarUrl };
      this.currentUserSignal.set(updatedUser);
      localStorage.setItem('boabp_user', JSON.stringify(updatedUser));
    }
  }

  // Get redirect URL based on role
  getRedirectUrl(): string {
    const user = this.currentUserSignal();
    if (!user) return '/signin';

    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'billboard_owner':
        return '/owner/dashboard';
      case 'advertiser':
        return '/advertiser/dashboard';
      default:
        return '/signin';
    }
  }

  // Get current token
  getToken(): string | null {
    return localStorage.getItem('boabp_token');
  }

  // Set user after successful login (can be called from components)
  setUser(user: User): void {
    this.currentUserSignal.set(user);
    localStorage.setItem('boabp_user', JSON.stringify(user));
  }

  // ============ 2FA Management Methods ============

  // Update 2FA method for Admin
  updateAdmin2FA(method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK'): Observable<TwoFactorMethodResponse> {
    const data: TwoFactorMethodRequest = { method };
    console.log('🔵 Admin 2FA Update - Sending:', data, 'to', `${this.apiUrl}/admin/settings/security/2fa`);
    return this.http.post<TwoFactorMethodResponse>(`${this.apiUrl}/admin/settings/security/2fa`, data).pipe(
      map((response: any) => {
        console.log('✅ Admin 2FA Update Success - Response:', response);
        return response || { success: true, message: '2FA method updated successfully' };
      }),
      catchError(error => {
        console.error('❌ Admin 2FA update error - Full error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error body:', error.error);
        console.error('❌ Error message:', error.message);

        // Try to extract meaningful error message
        let errorMsg = 'Failed to update 2FA settings';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.error) {
            errorMsg = error.error.error;
          }
        }

        throw { message: errorMsg };
      })
    );
  }

  // Update 2FA method for Advertiser
  updateAdvertiser2FA(method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK'): Observable<TwoFactorMethodResponse> {
    const data: TwoFactorMethodRequest = { method };
    console.log('🔵 Advertiser 2FA Update - Sending:', data, 'to', `${this.apiUrl}/advertiser/settings/security/2fa`);
    return this.http.post<TwoFactorMethodResponse>(`${this.apiUrl}/advertiser/settings/security/2fa`, data).pipe(
      map((response: any) => {
        console.log('✅ Advertiser 2FA Update Success - Response:', response);
        // Handle string response
        if (typeof response === 'string') {
          return { success: true, message: response };
        }
        return response || { success: true, message: '2FA method updated successfully' };
      }),
      catchError(error => {
        console.error('❌ Advertiser 2FA update error - Full error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error body:', error.error);

        let errorMsg = 'Failed to update 2FA settings';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.error) {
            errorMsg = error.error.error;
          }
        }

        throw { message: errorMsg };
      })
    );
  }

  // Update 2FA method for Owner
  updateOwner2FA(method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK'): Observable<TwoFactorMethodResponse> {
    const data: TwoFactorMethodRequest = { method };
    console.log('🔵 Owner 2FA Update - Sending:', data, 'to', `${this.apiUrl}/owner/settings/security/2fa`);
    return this.http.post<TwoFactorMethodResponse>(`${this.apiUrl}/owner/settings/security/2fa`, data).pipe(
      map((response: any) => {
        console.log('✅ Owner 2FA Update Success - Response:', response);
        // Handle string response
        if (typeof response === 'string') {
          return { success: true, message: response };
        }
        return response || { success: true, message: '2FA method updated successfully' };
      }),
      catchError(error => {
        console.error('❌ Owner 2FA update error - Full error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error statusText:', error.statusText);
        console.error('❌ Error body:', error.error);

        let errorMsg = 'Failed to update 2FA settings';
        if (error.error) {
          if (typeof error.error === 'string') {
            errorMsg = error.error;
          } else if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.error) {
            errorMsg = error.error.error;
          }
        }

        throw { message: errorMsg };
      })
    );
  }

  // Disable 2FA for any user (using JWT)
  disable2FA(): Observable<TwoFactorMethodResponse> {
    return this.http.post<any>(`${this.apiUrl}/user/security/2fa/disable`, {}).pipe(
      map((response: any) => {
        // Handle string response from backend (legacy)
        if (typeof response === 'string') {
          return { success: true, message: response };
        }
        // Check if response indicates failure
        if (response && response.success === false) {
          throw { message: response.message || 'Failed to disable 2FA' };
        }
        return response || { success: true, message: '2FA disabled successfully' };
      }),
      catchError(error => {
        console.error('Disable 2FA error:', error);
        // Extract error message properly
        let errorMsg = error.error?.message || error.message || error.error || 'Failed to disable 2FA';
        // Ensure it's a string
        if (typeof errorMsg !== 'string') {
          errorMsg = JSON.stringify(errorMsg) || 'Failed to disable 2FA';
        }
        throw { message: errorMsg };
      })
    );
  }

  // ============================
  // MAGIC LINK METHODS
  // ============================

  // Request a magic link (for passwordless login)
  requestMagicLink(email: string): Observable<MagicLinkResponse> {
    return this.http.post<MagicLinkResponse>(`${this.apiUrl}/auth/magic-link/request`, { email }).pipe(
      tap(response => console.log('Magic link request response:', response)),
      catchError(error => {
        console.error('Magic link request error:', error);
        const errorMsg = error.error?.message || error.error || 'Failed to send magic link';
        throw { message: errorMsg };
      })
    );
  }

  // Verify magic link token and login
  verifyMagicLink(token: string): Observable<MagicLinkVerifyResponse> {
    return this.http.post<MagicLinkVerifyResponse>(`${this.apiUrl}/auth/magic-link/verify`, { token }).pipe(
      tap(response => {
        console.log('Magic link verify response:', response);
        if (response.token) {
          // Store the JWT token
          localStorage.setItem('boabp_token', response.token);

          // Get user data and store it
          const userData: User = {
            id: response.userId.toString(),
            email: '', // Will be populated by the backend or we can fetch it
            name: '',
            role: response.role.toLowerCase() as 'admin' | 'billboard_owner' | 'advertiser',
            createdAt: new Date()
          };

          // Map role names
          if (response.role === 'OWNER') {
            userData.role = 'billboard_owner';
          } else if (response.role === 'ADVERTISER') {
            userData.role = 'advertiser';
          } else if (response.role === 'ADMIN') {
            userData.role = 'admin';
          }

          localStorage.setItem('boabp_user', JSON.stringify(userData));
          this.currentUserSignal.set(userData);
        }
      }),
      catchError(error => {
        console.error('Magic link verify error:', error);
        const errorMsg = error.error?.message || error.error || 'Invalid or expired magic link';
        throw { message: errorMsg };
      })
    );
  }

  // Generic method to update 2FA - uses universal endpoint for all non-admin users
  // Backend: POST /api/user/settings/security/2fa - works for OWNER, ADVERTISER
  update2FAMethod(method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK'): Observable<TwoFactorMethodResponse> {
    const user = this.currentUserSignal();
    if (!user) {
      console.error('❌ No user logged in');
      return throwError(() => ({ message: 'User not logged in' }));
    }

    // Admin users should not use this endpoint
    if (user.role === 'admin') {
      console.error('❌ Admin users cannot use user security APIs');
      return throwError(() => ({ message: 'Admin users must use admin-specific security settings', code: 'ADMIN_FORBIDDEN' }));
    }

    console.log('🔵 Updating 2FA method:', method, 'for user role:', user.role);

    const data: TwoFactorMethodRequest = { method };

    // Use universal endpoint - works for all non-admin users (owner, advertiser)
    const endpoint = `${this.apiUrl}/user/settings/security/2fa`;
    console.log('🔵 Using endpoint:', endpoint);

    return this.http.post(endpoint, data, {
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        console.log('✅ 2FA Method Update Success:', response);
        return { success: true, message: response || '2FA method updated successfully' };
      }),
      catchError(error => {
        console.error('❌ 2FA update error:', error);
        let errorMsg = 'Failed to update 2FA settings';
        if (error.error) {
          try {
            const parsed = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMsg = parsed.message || errorMsg;
          } catch {
            errorMsg = error.error || errorMsg;
          }
        }
        return throwError(() => ({ message: errorMsg }));
      })
    );
  }

  // ============ Resend OTP Methods ============

  // Resend Email OTP
  resendOtp(email: string): Observable<ResendOtpResponse> {
    const data: ResendOtpRequest = { email };
    return this.http.post<ResendOtpResponse>(`${this.apiUrl}/auth/resend-otp`, data).pipe(
      catchError(error => {
        console.error('Resend OTP error:', error);
        throw { message: error.error?.message || 'Failed to resend OTP' };
      })
    );
  }

  // ============ Recovery Codes Methods ============

  // Generate recovery codes
  generateRecoveryCodes(): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/security/recovery/generate`, {}).pipe(
      catchError(error => {
        console.error('Generate recovery codes error:', error);
        throw { message: error.error?.message || 'Failed to generate recovery codes' };
      })
    );
  }

  // Verify recovery code during login (Recovery codes are ONE-TIME USE ONLY)
  verifyRecoveryCode(email: string, code: string): Observable<VerifyRecoveryResponse> {
    const data: VerifyRecoveryRequest = { email, code };
    return this.http.post<VerifyRecoveryResponse>(`${this.apiUrl}/auth/verify-recovery`, data).pipe(
      tap(response => {
        if (response.token) {
          this.handleSuccessfulLogin(email, response.token, response.role, response.userId);
        }
      }),
      catchError(error => {
        console.error('Recovery code verification error:', error);
        const errorMsg = error.error?.message || 'Invalid recovery code';
        // Handle specific error cases for recovery codes
        if (errorMsg.toLowerCase().includes('already used') || errorMsg.toLowerCase().includes('used')) {
          throw { message: 'This recovery code has already been used. Please use a different code.', code: 'CODE_USED' };
        }
        if (errorMsg.toLowerCase().includes('invalid')) {
          throw { message: 'Invalid recovery code. Please check and try again.', code: 'INVALID_CODE' };
        }
        throw { message: errorMsg };
      })
    );
  }

  // Set 2FA method using universal endpoint
  // NOTE: Admin users should NOT use this endpoint - they must use admin-specific endpoints
  // Backend returns plain text like "2FA updated to EMAIL_OTP"
  setUser2FAMethod(method: 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK'): Observable<TwoFactorMethodResponse> {
    const user = this.currentUserSignal();

    // IMPORTANT: Admin cannot manage their own 2FA using user APIs
    if (user?.role === 'admin') {
      console.error('❌ Admin users cannot use user security APIs');
      return throwError(() => ({ message: 'Admin users must use admin-specific security settings', code: 'ADMIN_FORBIDDEN' }));
    }

    // Use universal endpoint - works for all non-admin users (owner, advertiser)
    const endpoint = `${this.apiUrl}/user/settings/security/2fa`;

    const data: TwoFactorMethodRequest = { method };
    console.log('🔵 Setting User 2FA Method:', data, 'to', endpoint);

    // Backend returns plain text, not JSON
    return this.http.post(endpoint, data, {
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        console.log('✅ User 2FA Method Set Success:', response);
        return { success: true, message: response || '2FA method updated successfully' };
      }),
      catchError(error => {
        console.error('❌ Set User 2FA Method error:', error);
        let errorMsg = 'Failed to update 2FA settings';
        if (error.status === 403) {
          errorMsg = 'You do not have permission to change 2FA settings';
        } else if (error.error) {
          // Error might be JSON or text
          try {
            const parsed = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMsg = parsed.message || errorMsg;
          } catch {
            errorMsg = error.error || errorMsg;
          }
        }
        return throwError(() => ({ message: errorMsg }));
      })
    );
  }

  // ============ 2FA Reset Methods ============

  // Request 2FA reset (sends email with token)
  // Backend returns text like "2FA reset email sent"
  request2FAReset(email: string): Observable<ResetRequestResponse> {
    const data: ResetRequest = { email };
    return this.http.post(`${this.apiUrl}/security/2fa/reset-request`, data, {
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        console.log('✅ 2FA Reset Request Success:', response);
        return { success: true, message: response || '2FA reset email sent' };
      }),
      catchError(error => {
        console.error('2FA reset request error:', error);
        let errorMsg = 'Failed to request 2FA reset';
        if (error.error) {
          try {
            const parsed = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMsg = parsed.message || errorMsg;
          } catch {
            errorMsg = error.error || errorMsg;
          }
        }
        return throwError(() => ({ message: errorMsg }));
      })
    );
  }

  // Confirm 2FA reset with token
  // Backend returns text like "2FA reset successful"
  confirm2FAReset(token: string): Observable<ResetConfirmResponse> {
    const data: ResetConfirmRequest = { token };
    return this.http.post(`${this.apiUrl}/security/2fa/reset-confirm`, data, {
      responseType: 'text'
    }).pipe(
      map((response: string) => {
        console.log('✅ 2FA Reset Confirm Success:', response);
        return { success: true, message: response || '2FA reset successful' };
      }),
      catchError(error => {
        console.error('2FA reset confirm error:', error);
        let errorMsg = 'Failed to confirm 2FA reset';
        if (error.error) {
          try {
            const parsed = typeof error.error === 'string' ? JSON.parse(error.error) : error.error;
            errorMsg = parsed.message || errorMsg;
          } catch {
            errorMsg = error.error || errorMsg;
          }
        }
        return throwError(() => ({ message: errorMsg }));
      })
    );
  }

  // ============ Security Settings Methods ============

  // Get current user security settings
  // Uses universal endpoint: /api/user/settings/security - works for all non-admin users
  getSecuritySettings(): Observable<SecuritySettings> {
    // Use universal endpoint - works for all non-admin users (owner, advertiser)
    // Add timestamp to bust cache
    const endpoint = `${this.apiUrl}/user/settings/security?_t=${Date.now()}`;

    console.log('🔵 Getting security settings from:', endpoint);

    // Add cache-busting headers to ensure fresh data
    return this.http.get<any>(endpoint, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    }).pipe(
      map((response: any) => {
        console.log('🔵 Security Settings Response:', response);
        // Handle various response formats
        if (typeof response === 'string') {
          // Try to parse if it's JSON string
          try {
            response = JSON.parse(response);
          } catch {
            // If string response, return default settings
            return {
              twoFactorEnabled: false,
              twoFactorMethod: 'NONE' as const,
              forceTwoFactor: false,
              hasRecoveryCodes: false
            };
          }
        }
        // Normalize the response - handle different response structures
        const method = response.twoFactorMethod || response.method || 'NONE';
        return {
          twoFactorEnabled: response.twoFactorEnabled || method !== 'NONE',
          twoFactorMethod: method,
          forceTwoFactor: response.forceTwoFactor || response.adminEnforced2FA || response.force2FA || false,
          hasRecoveryCodes: response.hasRecoveryCodes || response.recoveryCodesGenerated || false,
          adminEnforced2FA: response.adminEnforced2FA || response.forceTwoFactor || response.force2FA || false
        };
      }),
      catchError(error => {
        console.error('Get security settings error:', error);
        // If endpoint doesn't exist or returns error, return default settings
        // This allows the UI to still load and show the enable options
        return of({
          twoFactorEnabled: false,
          twoFactorMethod: 'NONE' as const,
          forceTwoFactor: false,
          hasRecoveryCodes: false
        });
      })
    );
  }

  // ============ Login History Methods ============

  // Get login history for current user (role-based)
  getLoginHistory(): Observable<LoginHistoryEntry[]> {
    const user = this.currentUserSignal();
    let endpoint = `${this.apiUrl}/user/settings/security/login-history`;

    // Use role-specific endpoint if needed
    if (user) {
      switch (user.role) {
        case 'admin':
          endpoint = `${this.apiUrl}/admin/security/login-history`;
          break;
        case 'billboard_owner':
        case 'advertiser':
        default:
          // All non-admin users use the shared security endpoint
          endpoint = `${this.apiUrl}/user/settings/security/login-history`;
      }
    }

    return this.http.get<LoginHistoryEntry[]>(endpoint).pipe(
      catchError(error => {
        console.error('Get login history error:', error);
        throw { message: error.error?.message || 'Failed to get login history' };
      })
    );
  }

  // ============ Email Update Methods ============

  // Update current user's email (backend doesn't require password)
  updateUserEmail(newEmail: string): Observable<EmailUpdateResponse> {
    const data: EmailUpdateRequest = { newEmail };
    return this.http.put<EmailUpdateResponse>(`${this.apiUrl}/user/email`, data).pipe(
      tap(response => {
        // Update stored user email if successful
        const user = this.currentUserSignal();
        if (user) {
          user.email = response.pendingEmail || newEmail;
          this.setUser(user);
        }
      }),
      catchError(error => {
        console.error('Update email error:', error);
        throw { message: error.error?.message || 'Failed to update email' };
      })
    );
  }

  // Admin update user email
  adminUpdateUserEmail(userId: number, newEmail: string): Observable<EmailUpdateResponse> {
    const data: AdminEmailUpdateRequest = { newEmail };
    return this.http.put<EmailUpdateResponse>(`${this.apiUrl}/admin/users/${userId}/email`, data).pipe(
      catchError(error => {
        console.error('Admin update email error:', error);
        throw { message: error.error?.message || 'Failed to update user email' };
      })
    );
  }

  // ============ Admin User Management Methods ============

  // Admin unlock user account
  adminUnlockUser(userId: number, reason?: string): Observable<UnlockUserResponse> {
    const data: UnlockUserRequest = { userId, reason };
    return this.http.post<UnlockUserResponse>(`${this.apiUrl}/admin/security/unlock-user`, data).pipe(
      catchError(error => {
        console.error('Admin unlock user error:', error);
        throw { message: error.error?.message || 'Failed to unlock user' };
      })
    );
  }
}
