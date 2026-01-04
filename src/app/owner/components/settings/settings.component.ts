import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { OwnerService, OwnerBankAccount, BankAccountRequest } from '../../../services/owner.service';
import { TwofaSettingsComponent } from '../../../shared/components/twofa-settings/twofa-settings.component';
import { LoginHistoryComponent } from '../../../shared/components/login-history/login-history.component';

@Component({
  selector: 'app-owner-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, TwofaSettingsComponent, LoginHistoryComponent],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class OwnerSettingsComponent implements OnInit {
  activeTab = 'profile';
  currentUser;

  // Profile Image
  profileImageUrl: string = '';
  isUploadingImage = false;
  imageError = '';
  imageSuccess = '';

  // Password change
  showChangePasswordModal = false;
  isChangingPassword = false;
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  securityError = '';
  securitySuccess = '';

  profile = {
    name: 'John Owner',
    email: 'owner@boabp.com',
    phone: '+91 9876543210',
    company: 'Outdoor Media Pvt Ltd',
    gst: '27AAACB1234P1ZB',
    address: '123, Business Park, Mumbai'
  };

  // Bank Account - using signals
  bankAccount = signal<OwnerBankAccount | null>(null);
  isBankLoading = signal(false);
  isBankSaving = signal(false);
  bankError = signal('');
  bankSuccess = signal('');

  // Bank form fields
  bankForm = {
    accountHolderName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    accountType: 'SAVINGS' as 'SAVINGS' | 'CURRENT'
  };

  // IFSC lookup
  isLookingUpIFSC = false;

  notifications = {
    emailBookings: true,
    emailPayments: true,
    emailMarketing: false,
    smsBookings: true,
    smsPayments: true
  };

  constructor(
    private authService: AuthService,
    private ownerService: OwnerService,
    private route: ActivatedRoute
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    // Load profile from current user
    const user = this.currentUser();
    if (user) {
      this.profile.name = user.name || this.profile.name;
      this.profile.email = user.email || this.profile.email;
    }

    // Check for tab query param
    this.route.queryParams.subscribe(params => {
      if (params['tab']) {
        this.activeTab = params['tab'];
      }
    });

    // Load bank account
    this.loadBankAccount();

    // Load profile image
    this.loadProfileImage();
  }

  // ==================== PROFILE IMAGE ====================

  loadProfileImage(): void {
    this.ownerService.getProfileImage().subscribe({
      next: (url) => {
        if (url) {
          // Revoke old URL to free memory
          if (this.profileImageUrl) {
            URL.revokeObjectURL(this.profileImageUrl);
          }
          this.profileImageUrl = url;
        }
      },
      error: (err) => {
        console.error('Error loading profile image:', err);
      }
    });
  }

  triggerImageUpload(): void {
    const fileInput = document.getElementById('profileImageInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image file.';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image size should be less than 5MB.';
      return;
    }

    this.uploadProfileImage(file);
  }

  uploadProfileImage(file: File): void {
    this.isUploadingImage = true;
    this.imageError = '';
    this.imageSuccess = '';

    this.ownerService.uploadProfileImage(file).subscribe({
      next: () => {
        this.imageSuccess = 'Profile photo updated successfully!';
        this.isUploadingImage = false;

        // Reload profile image
        this.loadProfileImage();

        // Clear success message after 3 seconds
        setTimeout(() => this.imageSuccess = '', 3000);
      },
      error: (err) => {
        console.error('Error uploading image:', err);
        this.imageError = err.error?.message || 'Failed to upload image. Please try again.';
        this.isUploadingImage = false;
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'bank') {
      this.loadBankAccount();
    }
  }

  saveProfile(): void {
    alert('Profile saved successfully!');
  }

  saveNotifications(): void {
    alert('Notification preferences saved!');
  }

  // ==================== BANK ACCOUNT ====================

  loadBankAccount(): void {
    this.isBankLoading.set(true);
    this.bankError.set('');

    this.ownerService.getBankAccount().subscribe({
      next: (account) => {
        this.bankAccount.set(account);
        this.isBankLoading.set(false);
      },
      error: (err) => {
        // 204 No Content means no bank account exists
        if (err.status === 204 || err.status === 0) {
          this.bankAccount.set(null);
        } else {
          console.error('Error loading bank account:', err);
        }
        this.isBankLoading.set(false);
      }
    });
  }

  // Known bank IFSC prefixes (local lookup - instant)
  private readonly BANK_IFSC_MAP: { [key: string]: string } = {
    'HDFC': 'HDFC Bank',
    'ICIC': 'ICICI Bank',
    'SBIN': 'State Bank of India',
    'UTIB': 'Axis Bank',
    'KKBK': 'Kotak Mahindra Bank',
    'PUNB': 'Punjab National Bank',
    'BARB': 'Bank of Baroda',
    'CNRB': 'Canara Bank',
    'UBIN': 'Union Bank of India',
    'IOBA': 'Indian Overseas Bank',
    'BKID': 'Bank of India',
    'CBIN': 'Central Bank of India',
    'IDIB': 'Indian Bank',
    'YESB': 'Yes Bank',
    'INDB': 'IndusInd Bank',
    'FDRL': 'Federal Bank',
    'RATN': 'RBL Bank',
    'KARB': 'Karnataka Bank',
    'SIBL': 'South Indian Bank',
    'KVBL': 'Karur Vysya Bank'
  };

  onIFSCInput(): void {
    const ifsc = this.bankForm.ifscCode.toUpperCase().trim();

    // Auto-detect bank name from first 4 characters (instant, no API call)
    if (ifsc.length >= 4) {
      const prefix = ifsc.substring(0, 4);
      const bankName = this.BANK_IFSC_MAP[prefix];
      if (bankName) {
        this.bankForm.bankName = bankName;
      }
    }

    // Validate full IFSC when complete
    if (ifsc.length === 11) {
      this.lookupIFSC();
    }
  }

  lookupIFSC(): void {
    const ifsc = this.bankForm.ifscCode.toUpperCase().trim();
    if (ifsc.length !== 11) {
      return;
    }

    // First try local lookup (instant)
    const prefix = ifsc.substring(0, 4);
    const localBankName = this.BANK_IFSC_MAP[prefix];
    if (localBankName) {
      this.bankForm.bankName = localBankName;
    }

    // Then validate via API
    this.isLookingUpIFSC = true;
    this.ownerService.lookupIFSC(ifsc).subscribe({
      next: (result) => {
        if (result.valid) {
          this.bankForm.bankName = result.bankName;
        } else {
          this.bankError.set('Invalid IFSC code format');
        }
        this.isLookingUpIFSC = false;
      },
      error: (err) => {
        console.error('IFSC lookup error:', err);
        // Keep local lookup result even if API fails
        this.isLookingUpIFSC = false;
      }
    });
  }

  validateBankForm(): string | null {
    if (!this.bankForm.accountHolderName.trim()) {
      return 'Account holder name is required';
    }
    if (!this.bankForm.accountNumber.trim()) {
      return 'Account number is required';
    }
    if (!/^[0-9]{9,18}$/.test(this.bankForm.accountNumber.trim())) {
      return 'Account number must be 9-18 digits';
    }
    if (this.bankForm.accountNumber !== this.bankForm.confirmAccountNumber) {
      return 'Account numbers do not match';
    }
    if (!this.bankForm.ifscCode.trim()) {
      return 'IFSC code is required';
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(this.bankForm.ifscCode.trim())) {
      return 'Invalid IFSC code format (e.g., HDFC0001234)';
    }
    if (!this.bankForm.bankName.trim()) {
      return 'Bank name is required';
    }
    return null;
  }

  saveBankDetails(): void {
    const error = this.validateBankForm();
    if (error) {
      this.bankError.set(error);
      return;
    }

    this.isBankSaving.set(true);
    this.bankError.set('');
    this.bankSuccess.set('');

    const request: BankAccountRequest = {
      accountHolderName: this.bankForm.accountHolderName.trim(),
      accountNumber: this.bankForm.accountNumber.trim(),
      confirmAccountNumber: this.bankForm.confirmAccountNumber.trim(),
      ifscCode: this.bankForm.ifscCode.toUpperCase().trim(),
      bankName: this.bankForm.bankName.trim(),
      branchName: this.bankForm.branchName.trim() || undefined,
      accountType: this.bankForm.accountType
    };

    this.ownerService.saveBankAccount(request).subscribe({
      next: (account) => {
        this.bankAccount.set(account);
        this.bankSuccess.set('Bank account saved successfully!');
        this.clearBankForm();
        this.isBankSaving.set(false);
        setTimeout(() => this.bankSuccess.set(''), 3000);
      },
      error: (err) => {
        console.error('Error saving bank account:', err);
        this.bankError.set(err.error?.error || 'Failed to save bank account');
        this.isBankSaving.set(false);
      }
    });
  }

  editBankAccount(): void {
    const account = this.bankAccount();
    if (account) {
      this.bankForm.accountHolderName = account.accountHolderName;
      this.bankForm.ifscCode = account.ifscCode;
      this.bankForm.bankName = account.bankName;
      this.bankForm.branchName = account.branchName || '';
      this.bankForm.accountType = account.accountType;
      // Clear account numbers since they need to be re-entered for security
      this.bankForm.accountNumber = '';
      this.bankForm.confirmAccountNumber = '';
    }
    this.bankAccount.set(null);
  }

  deleteBankAccount(): void {
    if (!confirm('Are you sure you want to delete your bank account? You will not be able to receive payouts until you add a new one.')) {
      return;
    }

    this.isBankSaving.set(true);
    this.ownerService.deleteBankAccount().subscribe({
      next: () => {
        this.bankAccount.set(null);
        this.bankSuccess.set('Bank account deleted successfully');
        this.isBankSaving.set(false);
        setTimeout(() => this.bankSuccess.set(''), 3000);
      },
      error: (err) => {
        console.error('Error deleting bank account:', err);
        this.bankError.set(err.error?.error || 'Failed to delete bank account');
        this.isBankSaving.set(false);
      }
    });
  }

  clearBankForm(): void {
    this.bankForm = {
      accountHolderName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
      bankName: '',
      branchName: '',
      accountType: 'SAVINGS'
    };
  }

  getVerificationStatusColor(status: string): string {
    switch (status) {
      case 'VERIFIED': return '#52c41a';
      case 'PENDING': return '#faad14';
      case 'FAILED': return '#ff4d4f';
      default: return '#999';
    }
  }

  getVerificationStatusIcon(status: string): string {
    switch (status) {
      case 'VERIFIED': return '✓';
      case 'PENDING': return '⏳';
      case 'FAILED': return '✕';
      default: return '?';
    }
  }

  // ==================== PASSWORD CHANGE ====================

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

    this.ownerService.changePassword({
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
}
