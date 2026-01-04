import { Component, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmailService } from '../../../services/email.service';
import { AuthService } from '../../../services/auth.service';
import { PlatformEmail } from '../../../models/email.model';

@Component({
  selector: 'app-email-inbox',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-inbox.component.html',
  styleUrls: ['./email-inbox.component.css']
})
export class EmailInboxComponent implements OnInit {
  @Input() theme: 'owner' | 'advertiser' = 'advertiser';

  emails = signal<PlatformEmail[]>([]);
  selectedEmail = signal<PlatformEmail | null>(null);
  isLoading = signal(true);
  errorMessage = signal('');
  successMessage = signal('');

  // View mode: 'list' or 'detail'
  viewMode = signal<'list' | 'detail'>('list');

  // Computed values
  unreadCount = computed(() => this.emails().filter(e => !e.isRead).length);
  hasEmails = computed(() => this.emails().length > 0);

  constructor(
    private emailService: EmailService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Determine theme based on user role
    const user = this.authService.currentUser();
    if (user?.role === 'billboard_owner') {
      this.theme = 'owner';
    } else {
      this.theme = 'advertiser';
    }

    this.loadEmails();
  }

  loadEmails(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.emailService.getEmails().subscribe({
      next: (emails) => {
        this.emails.set(emails);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Failed to load emails');
        this.isLoading.set(false);
      }
    });
  }

  selectEmail(email: PlatformEmail): void {
    this.selectedEmail.set(email);
    this.viewMode.set('detail');

    // Mark as read if unread
    if (!email.isRead) {
      this.emailService.markAsRead(email.id).subscribe({
        next: () => {
          // Update local state
          const updated = this.emails().map(e =>
            e.id === email.id ? { ...e, isRead: true, read: true } : e
          );
          this.emails.set(updated);
          this.selectedEmail.set({ ...email, isRead: true, read: true });
        },
        error: (error) => {
          console.error('Failed to mark email as read:', error);
        }
      });
    }
  }

  backToList(): void {
    this.viewMode.set('list');
    this.selectedEmail.set(null);
  }

  markAllAsRead(): void {
    this.emailService.markAllAsRead().subscribe({
      next: () => {
        const updated = this.emails().map(e => ({ ...e, isRead: true, read: true }));
        this.emails.set(updated);
        this.successMessage.set('All emails marked as read');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Failed to mark all as read');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  deleteEmail(email: PlatformEmail, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    this.emailService.deleteEmail(email.id).subscribe({
      next: () => {
        const updated = this.emails().filter(e => e.id !== email.id);
        this.emails.set(updated);

        // If viewing the deleted email, go back to list
        if (this.selectedEmail()?.id === email.id) {
          this.backToList();
        }

        this.successMessage.set('Email deleted');
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (error) => {
        this.errorMessage.set(error.message || 'Failed to delete email');
        setTimeout(() => this.errorMessage.set(''), 5000);
      }
    });
  }

  refresh(): void {
    this.loadEmails();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }

  formatFullDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getPreviewText(body: string): string {
    // Get first 100 chars of body for preview
    const preview = body.replace(/\n/g, ' ').trim();
    return preview.length > 100 ? preview.substring(0, 100) + '...' : preview;
  }

  // Theme-based styling
  getThemeClass(): string {
    return this.theme === 'owner' ? 'theme-owner' : 'theme-advertiser';
  }
}
