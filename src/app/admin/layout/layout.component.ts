import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  currentUser;

  menuItems = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'view_billboard', label: 'Billboards', route: '/admin/billboards' },
    { icon: 'people', label: 'Owners', route: '/admin/owners' },
    { icon: 'book_online', label: 'Bookings', route: '/admin/bookings' },
    { icon: 'kyc', label: 'KYC Requests', route: '/admin/kyc' },
    { icon: 'wallet', label: 'Commission Wallet', route: '/admin/wallet' },
    { icon: 'payments', label: 'Payouts', route: '/admin/payouts' },
    { icon: 'analytics', label: 'Analytics', route: '/admin/analytics' },
    { icon: 'settings', label: 'Settings', route: '/admin/settings' }
  ];

  constructor(public authService: AuthService) {
    this.currentUser = this.authService.currentUser;
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  logout(): void {
    this.authService.logout();
  }
}
