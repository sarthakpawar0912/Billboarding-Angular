import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { PlatformEmail, UnreadCountResponse, MarkReadResponse, DeleteEmailResponse } from '../models/email.model';

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = `${environment.apiUrl}/emails`;

  // Signals for reactive state
  private unreadCountSignal = signal<number>(0);
  private emailsSignal = signal<PlatformEmail[]>([]);
  private loadingSignal = signal<boolean>(false);

  // Public computed values
  unreadCount = computed(() => this.unreadCountSignal());
  emails = computed(() => this.emailsSignal());
  isLoading = computed(() => this.loadingSignal());
  hasUnread = computed(() => this.unreadCountSignal() > 0);

  constructor(private http: HttpClient) {}

  /**
   * Get all emails for the current user
   */
  getEmails(): Observable<PlatformEmail[]> {
    this.loadingSignal.set(true);
    return this.http.get<PlatformEmail[]>(this.apiUrl).pipe(
      map(emails => this.normalizeEmails(emails)),
      tap(emails => {
        this.emailsSignal.set(emails);
        this.loadingSignal.set(false);
        // Update unread count
        const unread = emails.filter(e => !e.isRead).length;
        this.unreadCountSignal.set(unread);
      }),
      catchError(error => {
        console.error('Failed to get emails:', error);
        this.loadingSignal.set(false);
        return of([]);
      })
    );
  }

  /**
   * Get unread emails only
   */
  getUnreadEmails(): Observable<PlatformEmail[]> {
    return this.http.get<PlatformEmail[]>(`${this.apiUrl}/unread`).pipe(
      map(emails => this.normalizeEmails(emails)),
      catchError(error => {
        console.error('Failed to get unread emails:', error);
        return of([]);
      })
    );
  }

  /**
   * Get unread email count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`).pipe(
      tap(response => {
        this.unreadCountSignal.set(response.count);
      }),
      map(response => response.count),
      catchError(error => {
        console.error('Failed to get unread count:', error);
        return of(0);
      })
    );
  }

  /**
   * Refresh unread count (useful for navbar badge)
   */
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  /**
   * Get single email by ID
   */
  getEmailById(id: number): Observable<PlatformEmail | null> {
    return this.http.get<PlatformEmail>(`${this.apiUrl}/${id}`).pipe(
      map(email => this.normalizeEmail(email)),
      catchError(error => {
        console.error('Failed to get email:', error);
        return of(null);
      })
    );
  }

  /**
   * Mark email as read
   */
  markAsRead(id: number): Observable<MarkReadResponse> {
    return this.http.patch<MarkReadResponse>(`${this.apiUrl}/${id}/read`, {}).pipe(
      tap(() => {
        // Update local state
        const emails = this.emailsSignal();
        const updated = emails.map(e =>
          e.id === id ? { ...e, isRead: true, read: true } : e
        );
        this.emailsSignal.set(updated);
        // Decrease unread count
        this.unreadCountSignal.update(count => Math.max(0, count - 1));
      }),
      catchError(error => {
        console.error('Failed to mark email as read:', error);
        throw { message: error.error?.message || 'Failed to mark email as read' };
      })
    );
  }

  /**
   * Mark all emails as read
   */
  markAllAsRead(): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.apiUrl}/mark-all-read`, {}).pipe(
      tap(() => {
        // Update local state
        const emails = this.emailsSignal();
        const updated = emails.map(e => ({ ...e, isRead: true, read: true }));
        this.emailsSignal.set(updated);
        this.unreadCountSignal.set(0);
      }),
      catchError(error => {
        console.error('Failed to mark all emails as read:', error);
        throw { message: error.error?.message || 'Failed to mark all emails as read' };
      })
    );
  }

  /**
   * Delete email
   */
  deleteEmail(id: number): Observable<DeleteEmailResponse> {
    return this.http.delete<DeleteEmailResponse>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        // Update local state
        const emails = this.emailsSignal();
        const emailToDelete = emails.find(e => e.id === id);
        const updated = emails.filter(e => e.id !== id);
        this.emailsSignal.set(updated);
        // Update unread count if deleted email was unread
        if (emailToDelete && !emailToDelete.isRead) {
          this.unreadCountSignal.update(count => Math.max(0, count - 1));
        }
      }),
      catchError(error => {
        console.error('Failed to delete email:', error);
        throw { message: error.error?.message || 'Failed to delete email' };
      })
    );
  }

  /**
   * Normalize email response (handle isRead vs read)
   */
  private normalizeEmail(email: PlatformEmail): PlatformEmail {
    return {
      ...email,
      isRead: email.isRead || email.read || false,
      read: email.isRead || email.read || false
    };
  }

  /**
   * Normalize array of emails
   */
  private normalizeEmails(emails: PlatformEmail[]): PlatformEmail[] {
    return emails.map(e => this.normalizeEmail(e));
  }
}
