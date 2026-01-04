import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdvertiserService, AdvertiserProfile, PaymentMethod, PaymentMethodType, NotificationPreferences, LoginHistoryEntry } from '../../../services/advertiser.service';
import { TwofaSettingsComponent } from '../../../shared/components/twofa-settings/twofa-settings.component';
import { EmailUpdateComponent } from '../../../shared/components/email-update/email-update.component';

@Component({
  selector: 'app-advertiser-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TwofaSettingsComponent, EmailUpdateComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class AdvertiserSettingsComponent implements OnInit {
  activeTab = 'profile';
  currentUser;
  isLoading = false;
  isSaving = false;
  isUploadingLogo = false;
  errorMessage = '';
  successMessage = '';
  logoUrl: string = '';

  profile = {
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    industry: '',
    website: '',
    hasLogo: false
  };

  // Payment Methods
  paymentMethods: PaymentMethod[] = [];
  isLoadingPayments = false;
  isAddingPayment = false;
  showAddPaymentModal = false;
  newPaymentType: PaymentMethodType = 'CARD';
  newPaymentLabel = '';
  paymentError = '';
  paymentSuccess = '';

  // Notification Preferences
  notifications: NotificationPreferences = {
    emailNotifications: true,
    smsNotifications: false,
    paymentNotifications: true,
    campaignNotifications: true,
    systemNotifications: true
  };
  isLoadingNotifications = false;
  isSavingNotifications = false;
  notificationError = '';
  notificationSuccess = '';

  // Security
  showChangePasswordModal = false;
  showDeleteAccountModal = false;
  isChangingPassword = false;
  isDeletingAccount = false;
  securityError = '';
  securitySuccess = '';
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  deleteConfirmText = '';

  // 2FA
  is2FAEnabled = false;
  isUpdating2FA = false;

  // Login History
  loginHistory: LoginHistoryEntry[] = [];
  isLoadingLoginHistory = false;
  showLoginHistoryModal = false;

  // Email Update
  showEmailUpdateModal = false;
  emailUpdateError = '';
  emailUpdateSuccess = '';

  constructor(
    private authService: AuthService,
    private advertiserService: AdvertiserService
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.advertiserService.getProfile().subscribe({
      next: (data: AdvertiserProfile) => {
        this.profile = {
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          companyName: data.companyName || '',
          industry: data.industry || '',
          website: data.website || '',
          hasLogo: data.hasLogo || false
        };
        this.isLoading = false;

        // Load logo if exists
        if (data.hasLogo) {
          this.loadLogo();
        }
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.errorMessage = 'Failed to load profile. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadLogo(): void {
    this.advertiserService.getProfileLogo().subscribe({
      next: (url) => {
        if (url) {
          // Revoke old URL to free memory
          if (this.logoUrl) {
            URL.revokeObjectURL(this.logoUrl);
          }
          this.logoUrl = url;
        }
      },
      error: (err) => {
        console.error('Error loading logo:', err);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.paymentError = '';
    this.paymentSuccess = '';
    this.notificationError = '';
    this.notificationSuccess = '';

    // Load payment methods when switching to payment tab
    if (tab === 'payment' && this.paymentMethods.length === 0) {
      this.loadPaymentMethods();
    }

    // Load notification preferences when switching to notifications tab
    if (tab === 'notifications') {
      this.loadNotificationPreferences();
    }
  }

  saveProfile(): void {
    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const updateData = {
      fullName: this.profile.fullName,
      phone: this.profile.phone,
      companyName: this.profile.companyName || undefined,
      industry: this.profile.industry || undefined,
      website: this.profile.website || undefined
    };

    this.advertiserService.updateProfile(updateData).subscribe({
      next: (data: AdvertiserProfile) => {
        this.profile = {
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          companyName: data.companyName || '',
          industry: data.industry || '',
          website: data.website || '',
          hasLogo: data.hasLogo || false
        };
        this.successMessage = 'Profile saved successfully!';
        this.isSaving = false;

        // Clear success message after 3 seconds
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error saving profile:', err);
        this.errorMessage = err.error?.message || 'Failed to save profile. Please try again.';
        this.isSaving = false;
      }
    });
  }

  // ==================== NOTIFICATION PREFERENCES ====================

  loadNotificationPreferences(): void {
    this.isLoadingNotifications = true;
    this.notificationError = '';

    this.advertiserService.getNotificationPreferences().subscribe({
      next: (preferences) => {
        this.notifications = preferences;
        this.isLoadingNotifications = false;
      },
      error: (err) => {
        console.error('Error loading notification preferences:', err);
        this.notificationError = 'Failed to load notification preferences.';
        this.isLoadingNotifications = false;
      }
    });
  }

  saveNotifications(): void {
    this.isSavingNotifications = true;
    this.notificationError = '';
    this.notificationSuccess = '';

    this.advertiserService.updateNotificationPreferences(this.notifications).subscribe({
      next: (preferences) => {
        this.notifications = preferences;
        this.notificationSuccess = 'Notification preferences saved successfully!';
        this.isSavingNotifications = false;
        setTimeout(() => this.notificationSuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error saving notification preferences:', err);
        this.notificationError = err.error?.message || 'Failed to save notification preferences.';
        this.isSavingNotifications = false;
      }
    });
  }

  // ==================== SECURITY ====================

  openChangePasswordModal(): void {
    this.showChangePasswordModal = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.securityError = '';
    this.securitySuccess = '';
  }

  closeChangePasswordModal(): void {
    this.showChangePasswordModal = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.securityError = '';
  }

  changePassword(): void {
    // Validate passwords
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.securityError = 'Please fill in all password fields.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.securityError = 'New password must be at least 6 characters long.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.securityError = 'New passwords do not match.';
      return;
    }

    if (this.oldPassword === this.newPassword) {
      this.securityError = 'New password must be different from the old password.';
      return;
    }

    this.isChangingPassword = true;
    this.securityError = '';

    this.advertiserService.changePassword({
      oldPassword: this.oldPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: () => {
        this.isChangingPassword = false;
        this.closeChangePasswordModal();
        this.securitySuccess = 'Password changed successfully!';
        setTimeout(() => this.securitySuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error changing password:', err);
        this.securityError = err.error || 'Failed to change password. Please check your current password.';
        this.isChangingPassword = false;
      }
    });
  }

  openDeleteAccountModal(): void {
    this.showDeleteAccountModal = true;
    this.deleteConfirmText = '';
    this.securityError = '';
  }

  closeDeleteAccountModal(): void {
    this.showDeleteAccountModal = false;
    this.deleteConfirmText = '';
    this.securityError = '';
  }

  deleteAccount(): void {
    if (this.deleteConfirmText !== 'DELETE') {
      this.securityError = 'Please type DELETE to confirm account deletion.';
      return;
    }

    this.isDeletingAccount = true;
    this.securityError = '';

    this.advertiserService.deleteAccount().subscribe({
      next: () => {
        this.isDeletingAccount = false;
        // Logout and redirect to home
        this.authService.logout();
      },
      error: (err) => {
        console.error('Error deleting account:', err);
        this.securityError = err.error || 'Failed to delete account. Please try again.';
        this.isDeletingAccount = false;
      }
    });
  }

  // ==================== 2FA ====================

  toggle2FA(): void {
    this.isUpdating2FA = true;
    this.securityError = '';

    const newValue = !this.is2FAEnabled;

    this.advertiserService.update2FA(newValue).subscribe({
      next: () => {
        this.is2FAEnabled = newValue;
        this.isUpdating2FA = false;
        this.securitySuccess = newValue
          ? 'Two-Factor Authentication enabled successfully!'
          : 'Two-Factor Authentication disabled.';
        setTimeout(() => this.securitySuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error updating 2FA:', err);
        this.securityError = err.error || 'Failed to update 2FA settings.';
        this.isUpdating2FA = false;
      }
    });
  }

  // ==================== LOGIN HISTORY ====================

  openLoginHistoryModal(): void {
    this.showLoginHistoryModal = true;
    this.loadLoginHistory();
  }

  closeLoginHistoryModal(): void {
    this.showLoginHistoryModal = false;
  }

  loadLoginHistory(): void {
    this.isLoadingLoginHistory = true;

    this.advertiserService.getLoginHistory().subscribe({
      next: (history) => {
        this.loginHistory = history;
        this.isLoadingLoginHistory = false;
      },
      error: (err) => {
        console.error('Error loading login history:', err);
        this.loginHistory = [];
        this.isLoadingLoginHistory = false;
      }
    });
  }

  formatLoginTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Parse user agent to get browser and device info
  parseUserAgent(userAgent: string): { browser: string; device: string } {
    let browser = 'Unknown Browser';
    let device = 'Unknown Device';

    // Detect browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
    }

    // Detect device/OS
    if (userAgent.includes('Windows')) {
      device = 'Windows PC';
    } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS')) {
      device = 'Mac';
    } else if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
      device = 'Linux PC';
    } else if (userAgent.includes('Android')) {
      device = 'Android';
    } else if (userAgent.includes('iPhone')) {
      device = 'iPhone';
    } else if (userAgent.includes('iPad')) {
      device = 'iPad';
    }

    return { browser, device };
  }

  // ==================== PAYMENT METHODS ====================

  loadPaymentMethods(): void {
    this.isLoadingPayments = true;
    this.paymentError = '';

    this.advertiserService.getPaymentMethods().subscribe({
      next: (methods) => {
        this.paymentMethods = methods;
        this.isLoadingPayments = false;
      },
      error: (err) => {
        console.error('Error loading payment methods:', err);
        this.paymentError = 'Failed to load payment methods.';
        this.isLoadingPayments = false;
      }
    });
  }

  openAddPaymentModal(): void {
    this.showAddPaymentModal = true;
    this.newPaymentType = 'CARD';
    this.newPaymentLabel = '';
    this.paymentError = '';
  }

  closeAddPaymentModal(): void {
    this.showAddPaymentModal = false;
    this.newPaymentLabel = '';
    this.paymentError = '';
  }

  addPaymentMethod(): void {
    if (!this.newPaymentLabel.trim()) {
      this.paymentError = 'Please enter a label for the payment method.';
      return;
    }

    this.isAddingPayment = true;
    this.paymentError = '';

    this.advertiserService.addPaymentMethod({
      type: this.newPaymentType,
      label: this.newPaymentLabel.trim()
    }).subscribe({
      next: (newMethod) => {
        this.paymentMethods.push(newMethod);
        // If this is the first method, it becomes default
        if (this.paymentMethods.length === 1) {
          this.paymentMethods[0].isDefault = true;
        }
        this.isAddingPayment = false;
        this.closeAddPaymentModal();
        this.paymentSuccess = 'Payment method added successfully!';
        setTimeout(() => this.paymentSuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error adding payment method:', err);
        this.paymentError = err.error?.message || 'Failed to add payment method.';
        this.isAddingPayment = false;
      }
    });
  }

  removePaymentMethod(method: PaymentMethod): void {
    if (method.isDefault && this.paymentMethods.length > 1) {
      this.paymentError = 'Cannot remove default payment method. Set another as default first.';
      setTimeout(() => this.paymentError = '', 3000);
      return;
    }

    if (!confirm(`Are you sure you want to remove "${method.label}"?`)) {
      return;
    }

    this.advertiserService.removePaymentMethod(method.id).subscribe({
      next: () => {
        this.paymentMethods = this.paymentMethods.filter(m => m.id !== method.id);
        this.paymentSuccess = 'Payment method removed successfully!';
        setTimeout(() => this.paymentSuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error removing payment method:', err);
        this.paymentError = err.error?.message || 'Failed to remove payment method.';
        setTimeout(() => this.paymentError = '', 3000);
      }
    });
  }

  setDefaultPaymentMethod(method: PaymentMethod): void {
    if (method.isDefault) return;

    this.advertiserService.setDefaultPaymentMethod(method.id).subscribe({
      next: (updatedMethod) => {
        // Update all methods - only one can be default
        this.paymentMethods.forEach(m => {
          m.isDefault = m.id === method.id;
        });
        this.paymentSuccess = `"${method.label}" is now your default payment method.`;
        setTimeout(() => this.paymentSuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error setting default payment method:', err);
        this.paymentError = err.error?.message || 'Failed to set default payment method.';
        setTimeout(() => this.paymentError = '', 3000);
      }
    });
  }

  getPaymentIcon(type: PaymentMethodType): string {
    switch (type) {
      case 'CARD': return '💳';
      case 'UPI': return '📱';
      case 'NET_BANKING': return '🏦';
      case 'WALLET': return '👛';
      default: return '💰';
    }
  }

  // Trigger file input click
  triggerLogoUpload(): void {
    const fileInput = document.getElementById('logoInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Handle logo file selection
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select a valid image file.';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Image size should be less than 5MB.';
      return;
    }

    this.uploadLogo(file);
  }

  // Upload logo to backend
  uploadLogo(file: File): void {
    this.isUploadingLogo = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Send current profile data along with the logo
    const currentProfileData = {
      fullName: this.profile.fullName,
      phone: this.profile.phone,
      companyName: this.profile.companyName || undefined,
      industry: this.profile.industry || undefined,
      website: this.profile.website || undefined
    };

    this.advertiserService.uploadLogo(file, currentProfileData).subscribe({
      next: (data) => {
        // Update profile with returned data
        this.profile = {
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          companyName: data.companyName || '',
          industry: data.industry || '',
          website: data.website || '',
          hasLogo: data.hasLogo || false
        };
        this.successMessage = 'Profile photo updated successfully!';
        this.isUploadingLogo = false;

        // Reload logo to show updated image
        if (data.hasLogo) {
          this.loadLogo();
        }

        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        console.error('Error uploading logo:', err);
        this.errorMessage = err.error?.message || 'Failed to upload image. Please try again.';
        this.isUploadingLogo = false;
      }
    });
  }

  // ==================== EMAIL UPDATE ====================

  openEmailUpdateModal(): void {
    this.showEmailUpdateModal = true;
    this.emailUpdateError = '';
    this.emailUpdateSuccess = '';
  }

  closeEmailUpdateModal(): void {
    this.showEmailUpdateModal = false;
  }

  onEmailUpdated(newEmail: string): void {
    this.profile.email = newEmail;
    this.emailUpdateSuccess = 'Email updated successfully! Please verify your new email address.';
    this.closeEmailUpdateModal();

    // Clear success message after 5 seconds
    setTimeout(() => {
      this.emailUpdateSuccess = '';
    }, 5000);
  }
}
