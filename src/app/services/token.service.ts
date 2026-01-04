import { Injectable, signal, computed } from '@angular/core';

/**
 * TokenService - Secure JWT Token Management
 *
 * IMPORTANT SECURITY NOTES:
 * - Tokens are stored in localStorage (configurable)
 * - NEVER store OTPs or sensitive codes
 * - Clear JWT on logout
 * - After 2FA reset, force fresh login
 */

export interface TokenPayload {
  sub: string;      // Subject (user ID or email)
  exp: number;      // Expiration timestamp
  iat: number;      // Issued at timestamp
  role?: string;    // User role
  userId?: number;  // User ID
}

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly TOKEN_KEY = 'boabp_token';
  private readonly STORAGE_TYPE: 'localStorage' | 'sessionStorage' | 'memory' = 'localStorage';

  // In-memory token storage (most secure, but lost on page refresh)
  private memoryToken: string | null = null;

  // Signals for reactive token state
  private tokenSignal = signal<string | null>(null);

  hasValidToken = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    return !this.isTokenExpired(token);
  });

  constructor() {
    // Initialize token from storage
    this.loadToken();
  }

  /**
   * Store the JWT token securely
   * @param token - The JWT token to store
   */
  setToken(token: string): void {
    if (!token) {
      console.warn('Attempted to store empty token');
      return;
    }

    switch (this.STORAGE_TYPE) {
      case 'memory':
        this.memoryToken = token;
        break;
      case 'sessionStorage':
        sessionStorage.setItem(this.TOKEN_KEY, token);
        break;
      case 'localStorage':
      default:
        localStorage.setItem(this.TOKEN_KEY, token);
        break;
    }

    this.tokenSignal.set(token);
  }

  /**
   * Retrieve the stored JWT token
   * @returns The stored token or null
   */
  getToken(): string | null {
    switch (this.STORAGE_TYPE) {
      case 'memory':
        return this.memoryToken;
      case 'sessionStorage':
        return sessionStorage.getItem(this.TOKEN_KEY);
      case 'localStorage':
      default:
        return localStorage.getItem(this.TOKEN_KEY);
    }
  }

  /**
   * Clear the stored JWT token (MUST be called on logout)
   */
  clearToken(): void {
    this.memoryToken = null;
    localStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    this.tokenSignal.set(null);
  }

  /**
   * Load token from storage into signal
   */
  private loadToken(): void {
    const token = this.getToken();
    if (token && !this.isTokenExpired(token)) {
      this.tokenSignal.set(token);
    } else if (token) {
      // Token exists but is expired - clear it
      this.clearToken();
    }
  }

  /**
   * Decode JWT token payload (without verification)
   * NOTE: This does NOT verify the token signature - that's done server-side
   * @param token - The JWT token to decode
   * @returns The decoded payload or null
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Check if the token is expired
   * @param token - The JWT token to check
   * @returns true if expired, false if valid
   */
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    // Add 60 second buffer for clock skew
    const expirationTime = payload.exp * 1000;
    const currentTime = Date.now() - 60000;

    return currentTime >= expirationTime;
  }

  /**
   * Get time remaining until token expires (in seconds)
   * @param token - The JWT token to check
   * @returns Seconds until expiration, or 0 if expired
   */
  getTokenExpirationTime(token?: string): number {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return 0;

    const payload = this.decodeToken(tokenToCheck);
    if (!payload || !payload.exp) return 0;

    const expirationTime = payload.exp * 1000;
    const remaining = Math.max(0, expirationTime - Date.now());

    return Math.floor(remaining / 1000);
  }

  /**
   * Get user role from token
   * @returns The user role or null
   */
  getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    return payload?.role || null;
  }

  /**
   * Get user ID from token
   * @returns The user ID or null
   */
  getUserIdFromToken(): number | null {
    const token = this.getToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    return payload?.userId || null;
  }

  /**
   * Check if we have a valid, non-expired token
   * @returns true if we have a valid token
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  /**
   * Force refresh token state (call after 2FA reset to clear any cached state)
   */
  forceRefresh(): void {
    this.clearToken();
    this.tokenSignal.set(null);
  }
}
