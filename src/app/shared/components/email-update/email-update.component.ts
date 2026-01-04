import { Component, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-email-update',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './email-update.component.html',
  styleUrls: ['./email-update.component.css']
})
export class EmailUpdateComponent {
  emailForm: FormGroup;
  currentEmail = signal('');
  isUpdating = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  showConfirmation = signal(false);

  @Output() emailUpdated = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    const user = this.authService.currentUser();
    this.currentEmail.set(user?.email || '');

    // Backend UpdateEmailRequest only requires newEmail (no password!)
    this.emailForm = this.fb.group({
      newEmail: ['', [Validators.required, Validators.email]],
      confirmEmail: ['', [Validators.required]]
    }, { validators: this.emailMatchValidator });
  }

  emailMatchValidator(group: FormGroup): ValidationErrors | null {
    const newEmail = group.get('newEmail')?.value;
    const confirmEmail = group.get('confirmEmail')?.value;

    if (newEmail && confirmEmail && newEmail !== confirmEmail) {
      return { emailMismatch: true };
    }

    return null;
  }

  get newEmailControl() {
    return this.emailForm.get('newEmail');
  }

  get confirmEmailControl() {
    return this.emailForm.get('confirmEmail');
  }

  onSubmit(): void {
    if (this.emailForm.invalid) {
      Object.keys(this.emailForm.controls).forEach(key => {
        this.emailForm.get(key)?.markAsTouched();
      });
      return;
    }

    const { newEmail, password } = this.emailForm.value;

    // Check if new email is same as current
    if (newEmail === this.currentEmail()) {
      this.errorMessage.set('New email must be different from current email');
      return;
    }

    this.showConfirmation.set(true);
  }

  confirmUpdate(): void {
    const { newEmail } = this.emailForm.value;

    this.isUpdating.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    // Backend only requires newEmail (no password)
    this.authService.updateUserEmail(newEmail).subscribe({
      next: (response) => {
        this.isUpdating.set(false);
        this.successMessage.set(
          response.emailVerificationRequired
            ? 'Verification email sent! Please check your inbox to verify your new email address.'
            : response.message || 'Email updated successfully!'
        );

        // Emit event to parent
        this.emailUpdated.emit(newEmail);

        // Auto-close after 3 seconds
        setTimeout(() => {
          this.cancel();
        }, 3000);
      },
      error: (error) => {
        this.isUpdating.set(false);
        this.showConfirmation.set(false);
        this.errorMessage.set(error.message || 'Failed to update email. Please try again.');
      }
    });
  }

  cancelConfirmation(): void {
    this.showConfirmation.set(false);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  hasError(controlName: string, errorType: string): boolean {
    const control = this.emailForm.get(controlName);
    return !!(control && control.hasError(errorType) && control.touched);
  }

  hasFormError(errorType: string): boolean {
    return !!(this.emailForm.hasError(errorType) &&
      (this.emailForm.get('confirmEmail')?.touched || this.emailForm.touched));
  }
}
