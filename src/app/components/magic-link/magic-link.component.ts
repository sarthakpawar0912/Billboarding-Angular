import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-magic-link',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './magic-link.component.html',
  styleUrl: './magic-link.component.css'
})
export class MagicLinkComponent implements OnInit {
  isVerifying = signal(true);
  isSuccess = signal(false);
  errorMessage = signal('');
  countdown = signal(3);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.isVerifying.set(false);
      this.errorMessage.set('Invalid magic link. No token provided.');
      return;
    }

    this.verifyToken(token);
  }

  private verifyToken(token: string): void {
    this.authService.verifyMagicLink(token).subscribe({
      next: (response) => {
        this.isVerifying.set(false);
        this.isSuccess.set(true);

        // Start countdown and redirect
        this.startCountdown(response.role);
      },
      error: (error) => {
        this.isVerifying.set(false);
        this.isSuccess.set(false);
        this.errorMessage.set(error.message || 'Invalid or expired magic link');
      }
    });
  }

  private startCountdown(role: string): void {
    const interval = setInterval(() => {
      const current = this.countdown();
      if (current <= 1) {
        clearInterval(interval);
        this.redirectToDashboard(role);
      } else {
        this.countdown.set(current - 1);
      }
    }, 1000);
  }

  private redirectToDashboard(role: string): void {
    let dashboardRoute = '/signin';

    switch (role.toUpperCase()) {
      case 'ADMIN':
        dashboardRoute = '/admin/dashboard';
        break;
      case 'OWNER':
        dashboardRoute = '/owner/dashboard';
        break;
      case 'ADVERTISER':
        dashboardRoute = '/advertiser/dashboard';
        break;
    }

    this.router.navigate([dashboardRoute]);
  }

  goToSignIn(): void {
    this.router.navigate(['/signin']);
  }

  requestNewLink(): void {
    this.router.navigate(['/signin'], { queryParams: { mode: 'magic-link' } });
  }
}
