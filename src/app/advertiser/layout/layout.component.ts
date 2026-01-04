import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdvertiserService } from '../../services/advertiser.service';
import { EmailService } from '../../services/email.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-advertiser-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class AdvertiserLayoutComponent implements OnInit, OnDestroy {
  sidebarCollapsed = signal(false);
  currentUser;
  profileImageUrl = signal<string>('');
  private profileImageSub?: Subscription;

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/advertiser/dashboard' },
    { icon: 'search', label: 'Browse Billboards', route: '/advertiser/browse' },
    { icon: 'favorite', label: 'My Favorites', route: '/advertiser/favorites' },
    { icon: 'book_online', label: 'My Bookings', route: '/advertiser/bookings' },
    { icon: 'campaign', label: 'Campaigns', route: '/advertiser/campaigns' },
    { icon: 'settings', label: 'Settings', route: '/advertiser/settings' }
  ];

  constructor(
    public authService: AuthService,
    private advertiserService: AdvertiserService,
    public emailService: EmailService,
    private router: Router
  ) {
    this.currentUser = this.authService.currentUser;
  }

  ngOnInit(): void {
    this.loadProfileImage();
    this.loadUnreadEmailCount();

    // Subscribe to profile image changes
    this.profileImageSub = this.advertiserService.profileImageChanged$.subscribe(() => {
      this.loadProfileImage();
    });
  }

  loadUnreadEmailCount(): void {
    this.emailService.getUnreadCount().subscribe();
  }

  navigateToInbox(): void {
    this.router.navigate(['/advertiser/inbox']);
  }

  ngOnDestroy(): void {
    this.profileImageSub?.unsubscribe();
  }

  loadProfileImage(): void {
    this.advertiserService.getProfileLogo().subscribe({
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
