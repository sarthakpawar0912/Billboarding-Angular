import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-twofa-reset-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './twofa-reset-request.component.html',
  styleUrls: ['./twofa-reset-request.component.css']
})
export class TwofaResetRequestComponent implements OnInit {
  resetForm: FormGroup;
  isSubmitting = signal(false);
  isSuccess = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  @Input() userEmail: string = '';
  @Output() closed = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.resetForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit() {
    if (this.userEmail) {
      this.resetForm.patchValue({ email: this.userEmail });
    }
  }

  get emailControl() {
    return this.resetForm.get('email');
  }

  onSubmit(): void {
    if (this.resetForm.invalid) {
      this.emailControl?.markAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const { email } = this.resetForm.value;

    this.authService.request2FAReset(email).subscribe({
      next: (response) => {
        this.isSubmitting.set(false);
        this.isSuccess.set(true);
        this.successMessage.set(
          response.message ||
          'Reset instructions sent! Check your email for a verification link to reset your 2FA settings.'
        );

        // Auto-close after 5 seconds
        setTimeout(() => this.close(), 5000);
      },
      error: (error) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          error.message ||
          'Failed to send reset email. Please try again or contact support if the problem persists.'
        );
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  hasError(errorType: string): boolean {
    const control = this.emailControl;
    return !!(control && control.hasError(errorType) && control.touched);
  }
}
