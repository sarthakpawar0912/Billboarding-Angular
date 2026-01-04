// Security-related interfaces for authentication and user management

// ==================== LOGIN HISTORY ====================

export interface LoginHistoryEntry {
  id: number;
  email: string;
  ipAddress: string;
  loginAt: string;
  userAgent: string;
  twoFactorUsed?: boolean;
  status?: 'SUCCESS' | 'FAILED';
  location?: string;
  city?: string;
  country?: string;
}

// ==================== 2FA RESET ====================

export interface TwoFactorResetRequest {
  email: string;
}

export interface TwoFactorResetResponse {
  message: string;
  success: boolean;
  resetTokenSent?: boolean;
}

export interface TwoFactorResetConfirmRequest {
  token: string;
}

export interface TwoFactorResetConfirmResponse {
  message: string;
  success: boolean;
}

// ==================== EMAIL UPDATE ====================

export interface EmailUpdateRequest {
  newEmail: string;
  password: string;
}

export interface EmailUpdateResponse {
  message: string;
  success: boolean;
  emailVerificationRequired?: boolean;
  pendingEmail?: string;
}

export interface AdminEmailUpdateRequest {
  userId: number;
  newEmail: string;
}

// ==================== USER UNLOCK (ADMIN) ====================

export interface UnlockUserRequest {
  userId: number;
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

// ==================== DEVICE INFO PARSING ====================

export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown';
}
