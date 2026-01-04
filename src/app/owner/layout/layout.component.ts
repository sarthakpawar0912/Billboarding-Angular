import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { OwnerService } from '../../services/owner.service';
import { EmailService } from '../../services/email.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-owner-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class OwnerLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = signal(false);
  currentUser;
  profileImageUrl = signal<string>('');
  private profileImageSub?: Subscription;

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/owner/dashboard' },
    { icon: 'view_billboard', label: 'My Billboards', route: '/owner/billboards' },
    { icon: 'book_online', label: 'Bookings', route: '/owner/bookings' },
    { icon: 'analytics', label: 'Earnings', route: '/owner/earnings' },
    { icon: 'wallet', label: 'Wallet', route: '/owner/wallet' },
    { icon: 'settings', label: 'Settings', route: '/owner/settings' }
  ];

  constructor(
    public authService: AuthService,
    private ownerService: OwnerService,
    public emailService: EmailService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadProfileImage();
    this.loadUnreadEmailCount();

    // Subscribe to profile image changes
    this.profileImageSub = this.ownerService.profileImageChanged$.subscribe(() => {
      this.loadProfileImage();
    });
  }

  loadUnreadEmailCount(): void {
    this.emailService.getUnreadCount().subscribe();
  }

  navigateToInbox(): void {
    this.router.navigate(['/owner/inbox']);
  }

  ngOnDestroy(): void {
    this.profileImageSub?.unsubscribe();
  }

  loadProfileImage(): void {
    this.ownerService.getProfileImage().subscribe({
      next: (url) => {
        if (url) {
          // Revoke old URL to prevent memory leaks
          const oldUrl = this.profileImageUrl();
          if (oldUrl) {
            URL.revokeObjectURL(oldUrl);
          }
          this.profileImageUrl.set(url);
        }
      },
      error: (err) => {
        console.error('Error loading profile image:', err);
      }
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
