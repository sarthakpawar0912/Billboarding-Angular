import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { RecoveryCodesComponent } from '../recovery-codes/recovery-codes.component';
import { TwofaResetRequestComponent } from '../twofa-reset-request/twofa-reset-request.component';

type TwoFactorMethod = 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK';

@Component({
  selector: 'app-twofa-settings',
  standalone: true,
  imports: [CommonModule, RecoveryCodesComponent, TwofaResetRequestComponent],
  templateUrl: './twofa-settings.component.html',
  styleUrl: './twofa-settings.component.css'
})
export class TwofaSettingsComponent implements OnInit {
  currentMethod = signal<TwoFactorMethod>('NONE');
  isUpdating = signal(false);
  isLoading = signal(true);
  showRecoveryCodes = signal(false);
  showResetModal = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  forceTwoFactor = signal(false);
  hasRecoveryCodes = signal(false);

  // IMPORTANT: Admin cannot manage their own 2FA using user APIs
  // This flag prevents admin users from accessing user security screens
  isAdminBlocked = signal(false);

  constructor(public authService: AuthService) {}

  ngOnInit(): void {
    // Check if user is admin - they cannot use user security APIs
    const user = this.authService.currentUser();
    if (user?.role === 'admin') {
      this.isAdminBlocked.set(true);
      this.isLoading.set(false);
      this.errorMessage.set('Admin users must use admin-specific security settings. User security APIs are not available for admin accounts.');
      return;
    }

    this.loadSecuritySettings();
  }

  loadSecuritySettings(): void {
    // Double-check admin block
    if (this.isAdminBlocked()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.getSecuritySettings().subscribe({
      next: (settings) => {
        console.log('🔵 Security Settings Loaded:', settings);
        this.isLoading.set(false);
        let method = settings.twoFactorMethod;
        console.log('🔵 Raw 2FA Method from backend:', method);
        // Only allow supported methods
        if (method !== 'EMAIL_OTP' && method !== 'MAGIC_LINK') {
          method = 'NONE';
        }
        console.log('🔵 Setting currentMethod to:', method);
        this.currentMethod.set(method as TwoFactorMethod);
        this.forceTwoFactor.set(settings.forceTwoFactor || settings.adminEnforced2FA || false);
        this.hasRecoveryCodes.set(settings.hasRecoveryCodes);
        console.log('🔵 canDisable2FA:', this.currentMethod() !== 'NONE' && !this.forceTwoFactor());
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Failed to load security settings');
        console.error('🔴 Failed to load security settings:', error);
      }
    });
  }

  selectMethod(method: TwoFactorMethod): void {
    this.updateMethod(method);
  }

  updateMethod(method: TwoFactorMethod): void {
    this.isUpdating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    console.log('🟢 Component: Updating 2FA to:', method);

    this.authService.update2FAMethod(method as 'NONE' | 'EMAIL_OTP' | 'MAGIC_LINK').subscribe({
      next: (response) => {
        console.log('🟢 2FA Update Response:', response);
        this.isUpdating.set(false);
        this.currentMethod.set(method);
        this.successMessage.set(response.message || `2FA method updated successfully`);

        // Immediately reload settings to get updated status from server
        this.loadSecuritySettings();

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage.set('');
        }, 3000);
      },
      error: (error) => {
        console.error('🔴 2FA Update Error:', error);
        this.isUpdating.set(false);
        this.errorMessage.set(error.message || 'Failed to update 2FA method');
      }
    });
  }

  disable2FA(): void {
    // Check if 2FA is admin-enforced - cannot disable if enforced
    if (this.forceTwoFactor()) {
      this.errorMessage.set('Cannot disable 2FA: Administrator has enforced two-factor authentication for your account');
      setTimeout(() => this.errorMessage.set(''), 5000);
      return;
    }

    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    this.isUpdating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Use the dedicated disable endpoint
    this.authService.disable2FA().subscribe({
      next: (response) => {
        this.isUpdating.set(false);
        this.currentMethod.set('NONE');
        this.successMessage.set(response.message || '2FA disabled successfully');

        // Immediately reload settings to get updated status from server
        this.loadSecuritySettings();

        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage.set('');
        }, 3000);
      },
      error: (error) => {
        this.isUpdating.set(false);
        // Check for admin-enforced error message
        let errMsg = error.message || error.error?.message || error.error || 'Failed to disable 2FA';
        // Ensure errMsg is a string
        if (typeof errMsg !== 'string') {
          errMsg = JSON.stringify(errMsg) || 'Failed to disable 2FA';
        }
        if (errMsg.toLowerCase().includes('admin enforced') || errMsg.toLowerCase().includes('cannot disable')) {
          this.forceTwoFactor.set(true);
        }
        this.errorMessage.set(errMsg);
      }
    });
  }

  generateRecoveryCodes(): void {
    this.showRecoveryCodes.set(true);
  }

  onRecoveryCodesClose(): void {
    this.showRecoveryCodes.set(false);
    // Reload settings to update hasRecoveryCodes status
    this.loadSecuritySettings();
  }

  // 2FA Reset Modal Methods
  openResetModal(): void {
    this.showResetModal.set(true);
  }

  closeResetModal(): void {
    this.showResetModal.set(false);
  }

  // Recovery Codes Modal Methods
  closeRecoveryCodes(): void {
    this.showRecoveryCodes.set(false);
  }

  getMethodIcon(method: TwoFactorMethod): string {
    switch (method) {
      case 'NONE':
        return '🔓';
      case 'EMAIL_OTP':
        return '📧';
      case 'MAGIC_LINK':
        return '🔗';
      default:
        return '❓';
    }
  }

  getMethodDescription(method: TwoFactorMethod): string {
    switch (method) {
      case 'NONE':
        return 'No two-factor authentication';
      case 'EMAIL_OTP':
        return 'Receive codes via email';
      case 'MAGIC_LINK':
        return 'Login via secure email link';
      default:
        return '';
    }
  }

  getMethodDisplayName(method: TwoFactorMethod): string {
    switch (method) {
      case 'NONE':
        return 'Not Protected';
      case 'EMAIL_OTP':
        return 'Email OTP';
      case 'MAGIC_LINK':
        return 'Magic Link';
      default:
        return 'Unknown';
    }
  }

  canDisable2FA(): boolean {
    // Can disable 2FA only if it's currently enabled AND admin hasn't enforced it
    return this.currentMethod() !== 'NONE' && !this.forceTwoFactor();
  }
}
