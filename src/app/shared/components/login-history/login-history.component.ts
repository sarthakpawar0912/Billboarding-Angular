import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, LoginHistoryEntry } from '../../../services/auth.service';
import { DeviceParser } from '../../../utils/device-parser';
import { DeviceInfo } from '../../../models/security.model';

@Component({
  selector: 'app-login-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-history.component.html',
  styleUrls: ['./login-history.component.css']
})
export class LoginHistoryComponent implements OnInit {
  allLoginHistory = signal<LoginHistoryEntry[]>([]);
  loginHistory = signal<LoginHistoryEntry[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  // Pagination - show 2 initially, then 5 more each time
  initialCount = 2;
  loadMoreCount = 5;
  displayedCount = signal(2);

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.loadLoginHistory();
  }

  loadLoginHistory() {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.getLoginHistory().subscribe({
      next: (history) => {
        this.allLoginHistory.set(history);
        this.displayedCount.set(this.initialCount);
        this.updateDisplayedHistory();
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Failed to load login history');
        this.isLoading.set(false);
      }
    });
  }

  updateDisplayedHistory() {
    const all = this.allLoginHistory();
    const count = this.displayedCount();
    this.loginHistory.set(all.slice(0, count));
  }

  showMore() {
    const newCount = this.displayedCount() + this.loadMoreCount;
    this.displayedCount.set(newCount);
    this.updateDisplayedHistory();
  }

  hasMoreToShow(): boolean {
    return this.displayedCount() < this.allLoginHistory().length;
  }

  getRemainingCount(): number {
    return this.allLoginHistory().length - this.displayedCount();
  }

  parseUserAgent(userAgent: string): DeviceInfo {
    return DeviceParser.parse(userAgent);
  }

  getDeviceDisplay(userAgent: string): string {
    const deviceInfo = this.parseUserAgent(userAgent);
    return DeviceParser.getDeviceDisplay(deviceInfo);
  }

  getBrowserDisplay(userAgent: string): string {
    const deviceInfo = this.parseUserAgent(userAgent);
    return DeviceParser.getBrowserDisplay(deviceInfo);
  }

  getDeviceIcon(userAgent: string): string {
    const deviceInfo = this.parseUserAgent(userAgent);
    return DeviceParser.getDeviceIcon(deviceInfo.device);
  }

  getBrowserIcon(userAgent: string): string {
    const deviceInfo = this.parseUserAgent(userAgent);
    return DeviceParser.getBrowserIcon(deviceInfo.browser);
  }

  formatLoginTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  getStatusIcon(status: string): string {
    return status === 'SUCCESS' ? '✓' : '✗';
  }

  getStatusClass(status: string): string {
    return status === 'SUCCESS' ? 'status-success' : 'status-failed';
  }

  get2FABadge(twoFactorUsed?: boolean): string {
    return twoFactorUsed ? 'Yes' : 'No';
  }

  get2FAClass(twoFactorUsed?: boolean): string {
    return twoFactorUsed ? 'twofa-enabled' : 'twofa-disabled';
  }

  // Get IP address from either ipAddress or ip field
  getIpAddress(entry: LoginHistoryEntry): string {
    return entry.ipAddress || entry.ip || 'Unknown';
  }

  // Check if login was marked as risky
  isRiskyLogin(entry: LoginHistoryEntry): boolean {
    return entry.risky === true;
  }

  exportToCsv(): void {
    // Export ALL login history, not just displayed ones
    const headers = ['Date & Time', 'IP Address', 'Device', 'Browser', '2FA Used', 'Status', 'Risky'];
    const rows = this.allLoginHistory().map(entry => [
      new Date(entry.loginAt).toLocaleString(),
      this.getIpAddress(entry),
      this.getDeviceDisplay(entry.userAgent),
      this.getBrowserDisplay(entry.userAgent),
      this.get2FABadge(entry.twoFactorUsed),
      entry.status || 'SUCCESS',
      entry.risky ? 'Yes' : 'No'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `login-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  refresh(): void {
    this.displayedCount.set(this.initialCount);
    this.loadLoginHistory();
  }
}
