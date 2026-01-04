import { Component, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService, PlatformSettings } from '../../../services/admin.service';
import { LoginHistoryComponent } from '../../../shared/components/login-history/login-history.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LoginHistoryComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit {
  @ViewChild('photoInput') photoInput!: ElementRef<HTMLInputElement>;

  activeTab = 'profile';
  currentUser;

  profile = {
    name: '',
    email: '',
    role: 'Administrator'
  };

  // Profile photo states
  selectedPhotoFile = signal<File | null>(null);
  photoPreviewUrl = signal<string | null>(null);
  isUploadingPhoto = signal(false);
  isSavingProfile = signal(false);
  profileMessage = signal('');
  profileError = signal('');

  platformSettings = signal<PlatformSettings>({
    platformName: 'BOABP',
    supportEmail: 'support@boabp.com',
    commissionPercent: null,
    gstPercent: null,
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });

  // Platform settings states
  isLoadingPlatformSettings = signal(false);
  isSavingPlatformSettings = signal(false);
  platformSettingsMessage = signal('');
  platformSettingsError = signal('');

  notifications = signal({
    email: true,
    push: true,
    newBookings: true,
    ownerApprovals: true,
    payments: true
  });

  // Security settings
  isForcing2FA = signal(false);
  force2FAEnabled = signal(false);
  securityMessage = signal('');
  securityError = signal('');
  isLoadingSecuritySettings = signal(false);

  // Password change modal
  showPasswordModal = signal(false);
  isChangingPassword = signal(false);
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  passwordMessage = signal('');
  passwordError = signal('');

  constructor(
    private authService: AuthService,
    private adminService: AdminService
  ) {
    this.currentUser = this.authService.currentUser;
    // Initialize profile from current user
    const user = this.currentUser();
    if (user) {
      this.profile.name = user.name || '';
      this.profile.email = user.email || '';
    }
  }

  ngOnInit(): void {
    this.loadSecuritySettings();
    this.loadPlatformSettings();
  }

  loadPlatformSettings(): void {
    this.isLoadingPlatformSettings.set(true);
    this.adminService.getPlatformSettings().subscribe({
      next: (settings) => {
        this.platformSettings.set(settings);
        this.isLoadingPlatformSettings.set(false);
      },
      error: (error) => {
        console.error('Failed to load platform settings:', error);
        this.isLoadingPlatformSettings.set(false);
        this.platformSettingsError.set('Failed to load platform settings');
        setTimeout(() => this.platformSettingsError.set(''), 5000);
      }
    });
  }

  loadSecuritySettings(): void {
    this.isLoadingSecuritySettings.set(true);
    this.adminService.getSecuritySettings().subscribe({
      next: (settings) => {
        this.force2FAEnabled.set(settings.force2FAEnabled);
        this.isLoadingSecuritySettings.set(false);
      },
      error: (error) => {
        console.error('Failed to load security settings:', error);
        this.isLoadingSecuritySettings.set(false);
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.securityMessage.set('');
    this.securityError.set('');
    this.platformSettingsMessage.set('');
    this.platformSettingsError.set('');
    this.profileMessage.set('');
    this.profileError.set('');
  }

  updateNotification(key: string, value: boolean): void {
    this.notifications.update(n => ({ ...n, [key]: value }));
  }

  // Trigger file input click
  triggerPhotoUpload(): void {
    this.photoInput.nativeElement.click();
  }

  // Handle file selection
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.profileError.set('Please select an image file');
        setTimeout(() => this.profileError.set(''), 5000);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.profileError.set('Image size must be less than 5MB');
        setTimeout(() => this.profileError.set(''), 5000);
        return;
      }

      this.selectedPhotoFile.set(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreviewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  // Cancel photo selection
  cancelPhotoSelection(): void {
    this.selectedPhotoFile.set(null);
    this.photoPreviewUrl.set(null);
    if (this.photoInput) {
      this.photoInput.nativeElement.value = '';
    }
  }

  // Upload photo only
  uploadPhoto(): void {
    const file = this.selectedPhotoFile();
    if (!file) return;

    this.isUploadingPhoto.set(true);
    this.profileMessage.set('');
    this.profileError.set('');

    this.adminService.uploadAdminPhoto(file).subscribe({
      next: (response) => {
        this.isUploadingPhoto.set(false);
        this.profileMessage.set('Photo uploaded successfully!');
        this.selectedPhotoFile.set(null);
        this.photoPreviewUrl.set(null);

        // Update current user avatar
        this.authService.updateCurrentUserAvatar(response.photoUrl);

        setTimeout(() => this.profileMessage.set(''), 5000);
      },
      error: (error) => {
        this.isUploadingPhoto.set(false);
        this.profileError.set(error.error?.message || 'Failed to upload photo');
        setTimeout(() => this.profileError.set(''), 5000);
      }
    });
  }

  // Save profile with optional photo
  saveProfile(): void {
    this.isSavingProfile.set(true);
    this.profileMessage.set('');
    this.profileError.set('');

    const photoFile = this.selectedPhotoFile() || undefined;

    this.adminService.updateAdminProfile(
      { name: this.profile.name, email: this.profile.email },
      photoFile
    ).subscribe({
      next: (response) => {
        this.isSavingProfile.set(false);
        this.profileMessage.set('Profile saved successfully!');
        this.selectedPhotoFile.set(null);
        this.photoPreviewUrl.set(null);

        // Update current user if avatar was returned
        if (response?.photoUrl || response?.avatar) {
          this.authService.updateCurrentUserAvatar(response.photoUrl || response.avatar);
        }

        setTimeout(() => this.profileMessage.set(''), 5000);
      },
      error: (error) => {
        this.isSavingProfile.set(false);
        this.profileError.set(error.error?.message || 'Failed to save profile');
        setTimeout(() => this.profileError.set(''), 5000);
      }
    });
  }

  // Get the display avatar URL
  getAvatarUrl(): string | null {
    // Show preview if a new photo is selected
    if (this.photoPreviewUrl()) {
      return this.photoPreviewUrl();
    }
    // Show current user avatar
    const user = this.currentUser();
    if (user?.avatar) {
      // If avatar is a relative path, prepend the API base URL
      if (user.avatar.startsWith('/')) {
        return `${environment.apiUrl.replace('/api', '')}${user.avatar}`;
      }
      return user.avatar;
    }
    return null;
  }

  savePlatformSettings(): void {
    this.isSavingPlatformSettings.set(true);
    this.platformSettingsMessage.set('');
    this.platformSettingsError.set('');

    this.adminService.updatePlatformSettings(this.platformSettings()).subscribe({
      next: (updatedSettings) => {
        this.platformSettings.set(updatedSettings);
        this.isSavingPlatformSettings.set(false);
        this.platformSettingsMessage.set('Platform settings saved successfully!');
        setTimeout(() => this.platformSettingsMessage.set(''), 5000);
      },
      error: (error) => {
        console.error('Failed to save platform settings:', error);
        this.isSavingPlatformSettings.set(false);
        this.platformSettingsError.set(error.error?.message || 'Failed to save platform settings');
        setTimeout(() => this.platformSettingsError.set(''), 5000);
      }
    });
  }

  updatePlatformSetting(key: keyof PlatformSettings, value: string | number): void {
    this.platformSettings.update(settings => ({ ...settings, [key]: value }));
  }

  saveNotifications(): void {
    alert('Notification preferences saved!');
  }

  openPasswordModal(): void {
    this.showPasswordModal.set(true);
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError.set('');
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError.set('');
  }

  changePassword(): void {
    // Validate
    if (!this.oldPassword || !this.newPassword || !this.confirmPassword) {
      this.passwordError.set('All fields are required');
      return;
    }

    if (this.newPassword.length < 8) {
      this.passwordError.set('New password must be at least 8 characters');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New passwords do not match');
      return;
    }

    this.isChangingPassword.set(true);
    this.passwordError.set('');

    this.adminService.changeAdminPassword(
      this.oldPassword,
      this.newPassword
    ).subscribe({
      next: (response) => {
        this.isChangingPassword.set(false);
        this.closePasswordModal();
        this.passwordMessage.set(response.message || 'Password changed successfully!');
        setTimeout(() => this.passwordMessage.set(''), 5000);
      },
      error: (error) => {
        this.isChangingPassword.set(false);
        this.passwordError.set(error.error?.message || 'Failed to change password');
      }
    });
  }

  // Force 2FA for all users
  force2FAForAllUsers(): void {
    if (!confirm('Are you sure you want to enforce 2FA for all users? They will be required to set up 2FA on their next login.')) {
      return;
    }

    this.isForcing2FA.set(true);
    this.securityMessage.set('');
    this.securityError.set('');

    this.adminService.force2FAForAllUsers().subscribe({
      next: (response) => {
        this.isForcing2FA.set(false);
        this.force2FAEnabled.set(true);
        this.securityMessage.set(response.message || '2FA enforced for all users');
        setTimeout(() => this.securityMessage.set(''), 5000);
      },
      error: (error) => {
        this.isForcing2FA.set(false);
        this.securityError.set(error.message || 'Failed to enforce 2FA');
        setTimeout(() => this.securityError.set(''), 5000);
      }
    });
  }

  // Disable forced 2FA
  disableForced2FA(): void {
    if (!confirm('Are you sure you want to disable forced 2FA? Users will be able to disable their 2FA settings.')) {
      return;
    }

    this.isForcing2FA.set(true);
    this.securityMessage.set('');
    this.securityError.set('');

    this.adminService.disableForced2FA().subscribe({
      next: (response) => {
        this.isForcing2FA.set(false);
        this.force2FAEnabled.set(false);
        this.securityMessage.set(response.message || 'Forced 2FA disabled');
        setTimeout(() => this.securityMessage.set(''), 5000);
      },
      error: (error) => {
        this.isForcing2FA.set(false);
        this.securityError.set(error.message || 'Failed to disable forced 2FA');
        setTimeout(() => this.securityError.set(''), 5000);
      }
    });
  }
}
