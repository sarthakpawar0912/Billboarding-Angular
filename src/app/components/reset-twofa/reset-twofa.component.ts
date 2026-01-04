import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-twofa',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-twofa.component.html',
  styleUrl: './reset-twofa.component.css'
})
export class ResetTwofaComponent implements OnInit {
  tokenForm: FormGroup;
  isVerifying = signal(false);
  isSuccess = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  autoVerified = signal(false);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    this.tokenForm = this.fb.group({
      token: ['', [Validators.required, Validators.minLength(16)]]
    });
  }

  ngOnInit() {
    // Extract token from URL: /reset-2fa?token=abc123
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      if (token) {
        this.tokenForm.patchValue({ token: token });
        this.autoVerifyToken();
      }
    });
  }

  get tokenControl() {
    return this.tokenForm.get('token');
  }

  autoVerifyToken(): void {
    this.autoVerified.set(true);
    this.confirmReset();
  }

  confirmReset(): void {
    if (this.tokenForm.invalid) {
      this.tokenControl?.markAsTouched();
      return;
    }

    this.isVerifying.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { token } = this.tokenForm.value;

    this.authService.confirm2FAReset(token).subscribe({
      next: (response) => {
        this.isVerifying.set(false);
        this.isSuccess.set(true);
        // IMPORTANT: After 2FA reset, user must login WITHOUT OTP once
        // Google Authenticator must be explicitly re-enabled after reset
        this.successMessage.set(
          response.message ||
          'Your two-factor authentication has been reset successfully!'
        );

        // Redirect to login after 5 seconds
        setTimeout(() => {
          this.router.navigate(['/signin']);
        }, 5000);
      },
      error: (error) => {
        this.isVerifying.set(false);
        this.errorMessage.set(
          error.message ||
          'Invalid or expired reset token. Please request a new reset link.'
        );
      }
    });
  }

  hasError(errorType: string): boolean {
    const control = this.tokenControl;
    return !!(control && control.hasError(errorType) && control.touched);
  }
}
