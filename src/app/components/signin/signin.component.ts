import { Component, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css'
})
export class SigninComponent implements OnDestroy {
  signinForm: FormGroup;
  otpForm: FormGroup;
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  showPassword: boolean = false;

  // 2FA State
  show2FAForm = signal(false);
  showRecoveryInput = signal(false);
  twoFactorMethod = signal<'EMAIL_OTP' | 'MAGIC_LINK'>('EMAIL_OTP'); // Track which 2FA method to use
  magicLinkSent = signal(false); // Track if magic link has been sent
  pendingEmail = '';
  pendingPassword = '';
  isResendingOtp = signal(false);
  resendCooldown = signal(0);
  private resendTimer: any;

  // Additional info signals
  forceTwoFactor = signal(false);
  riskyLogin = signal(false);
  recoveryCode = signal('');

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signinForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6), Validators.pattern('^[0-9]*$')]]
    });
  }

  fillCredentials(email: string, password: string): void {
    this.signinForm.patchValue({ email, password });
  }

  onSubmit() {
    if (this.signinForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const { email, password } = this.signinForm.value;

      this.authService.login(email, password).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.twoFactorRequired) {
            // 2FA required - determine method and show appropriate form
            this.pendingEmail = email;
            this.pendingPassword = password;
            this.show2FAForm.set(true);

            // Store additional info
            this.forceTwoFactor.set(response.forceTwoFactor || false);
            this.riskyLogin.set(response.riskyLogin || false);

            // Determine 2FA method from response
            const method = response.twoFactorMethod || 'EMAIL_OTP';
            this.twoFactorMethod.set(method as 'EMAIL_OTP' | 'MAGIC_LINK');

            let message = response.message || 'OTP sent to your email';

            if (method === 'MAGIC_LINK') {
              this.magicLinkSent.set(true);
              message = response.message || 'Magic link sent to your email. Click the link to login.';
            } else {
              this.magicLinkSent.set(false);
              // Add context for forced or risky login
              if (response.forceTwoFactor) {
                message = '🔒 Admin-enforced 2FA: ' + message;
              } else if (response.riskyLogin) {
                message = '⚠️ Unusual activity detected: ' + message;
              }
              this.startResendCooldown();
            }

            this.successMessage.set(message);
          } else if (response.token) {
            // Login successful - redirect based on role
            this.router.navigate([this.authService.getRedirectUrl()]);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Login failed. Please try again.');
        }
      });
    }
  }

  onVerifyOtp() {
    if (this.otpForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const { otp } = this.otpForm.value;

      this.authService.verifyOtp(this.pendingEmail, otp).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.token) {
            // Login successful - redirect based on role
            this.router.navigate([this.authService.getRedirectUrl()]);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Invalid OTP. Please try again.');
        }
      });
    }
  }

  onVerifyRecoveryCode() {
    const code = this.recoveryCode().trim();
    if (!code || code.length === 0) {
      this.errorMessage.set('Please enter a recovery code');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    this.authService.verifyRecoveryCode(this.pendingEmail, code).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.token) {
          // Login successful - redirect based on role
          this.router.navigate([this.authService.getRedirectUrl()]);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Invalid recovery code. Please try again.');
      }
    });
  }

  toggleRecoveryInput() {
    this.showRecoveryInput.set(!this.showRecoveryInput());
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.showRecoveryInput()) {
      this.successMessage.set('Enter one of your backup recovery codes');
    }
  }

  resendOtp() {
    if (this.resendCooldown() > 0 || this.isResendingOtp()) return;

    this.isResendingOtp.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Use dedicated resend OTP endpoint
    this.authService.resendOtp(this.pendingEmail).subscribe({
      next: (response) => {
        this.isResendingOtp.set(false);
        this.successMessage.set(response.message || 'New OTP sent to your email');
        this.startResendCooldown();
        this.otpForm.reset();
      },
      error: (error) => {
        this.isResendingOtp.set(false);
        this.errorMessage.set(error.message || 'Failed to resend OTP.');
      }
    });
  }

  private startResendCooldown() {
    this.resendCooldown.set(60);
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
    this.resendTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current > 0) {
        this.resendCooldown.set(current - 1);
      } else {
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  resendMagicLink() {
    if (this.resendCooldown() > 0 || this.isResendingOtp()) return;

    this.isResendingOtp.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Request a new magic link
    this.authService.requestMagicLink(this.pendingEmail).subscribe({
      next: (response) => {
        this.isResendingOtp.set(false);
        this.successMessage.set(response.message || 'New magic link sent to your email');
        this.startResendCooldown();
      },
      error: (error) => {
        this.isResendingOtp.set(false);
        this.errorMessage.set(error.message || 'Failed to resend magic link.');
      }
    });
  }

  backToLogin() {
    this.show2FAForm.set(false);
    this.magicLinkSent.set(false);
    this.pendingEmail = '';
    this.pendingPassword = '';
    this.otpForm.reset();
    this.errorMessage.set('');
    this.successMessage.set('');
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  ngOnDestroy() {
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }
}
