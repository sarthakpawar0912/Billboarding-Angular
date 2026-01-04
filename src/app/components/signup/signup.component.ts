import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, RegisterRequest } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  signupForm: FormGroup;
  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      role: ['ADVERTISER', [Validators.required]]
    });
  }

  selectRole(role: string): void {
    this.signupForm.patchValue({ role });
  }

  onSubmit() {
    if (this.signupForm.valid) {
      if (this.signupForm.value.password !== this.signupForm.value.confirmPassword) {
        this.errorMessage.set('Passwords do not match!');
        return;
      }

      this.isLoading.set(true);
      this.errorMessage.set('');
      this.successMessage.set('');

      const registerData: RegisterRequest = {
        name: this.signupForm.value.name,
        email: this.signupForm.value.email,
        password: this.signupForm.value.password,
        phone: this.signupForm.value.phone,
        role: this.signupForm.value.role
      };

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          if (response.success === false) {
            this.errorMessage.set(response.message || 'Registration failed');
          } else {
            this.successMessage.set('Registration successful! Redirecting to sign in...');
            setTimeout(() => {
              this.router.navigate(['/signin']);
            }, 2000);
          }
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(error.message || 'Registration failed. Please try again.');
        }
      });
    }
  }
}
