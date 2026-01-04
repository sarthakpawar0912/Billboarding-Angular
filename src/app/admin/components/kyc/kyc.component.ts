import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminUser } from '../../../services/admin.service';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kyc.component.html',
  styleUrl: './kyc.component.css'
})
export class KycComponent implements OnInit {
  // Signals for reactive state
  pendingUsers = signal<AdminUser[]>([]);
  allUsers = signal<AdminUser[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // View mode: 'pending' or 'all'
  viewMode = signal<'pending' | 'all'>('pending');

  // Modal states
  showApproveModal = signal(false);
  showRejectModal = signal(false);
  showBlockModal = signal(false);
  showUnblockModal = signal(false);
  showUserDetailModal = signal(false);
  show2FAModal = signal(false);
  selectedUser = signal<AdminUser | null>(null);

  // 2FA Status for selected user
  userTwoFactorStatus = signal<{
    userId: number;
    email: string;
    name: string;
    twoFactorEnabled: boolean;
    twoFactorMethod: string;
    forceTwoFactor: boolean;
  } | null>(null);
  loading2FAStatus = signal(false);

  // Reject reason
  rejectReason = '';

  // Processing state
  processing = signal(false);

  // Success/Error messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Search and filter
  searchTerm = signal('');
  statusFilter = signal<'all' | 'PENDING' | 'APPROVED' | 'REJECTED'>('all');
  roleFilter = signal<'all' | 'OWNER' | 'ADVERTISER'>('all');

  // Computed filtered users
  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const users = this.viewMode() === 'pending' ? this.pendingUsers() : this.allUsers();
    const status = this.statusFilter();
    const role = this.roleFilter();

    return users.filter(u => {
      const matchesSearch = !term ||
        u.name?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.phone?.toLowerCase().includes(term) ||
        u.role?.toLowerCase().includes(term);

      const matchesStatus = status === 'all' || u.kycStatus === status;
      const matchesRole = role === 'all' || u.role === role;

      return matchesSearch && matchesStatus && matchesRole;
    });
  });

  // Computed stats
  stats = computed(() => {
    const users = this.allUsers();
    return {
      total: users.filter(u => u.role !== 'ADMIN').length,
      pending: users.filter(u => u.kycStatus === 'PENDING' && u.role !== 'ADMIN').length,
      approved: users.filter(u => u.kycStatus === 'APPROVED').length,
      rejected: users.filter(u => u.kycStatus === 'REJECTED').length,
      blocked: users.filter(u => u.blocked).length,
      owners: users.filter(u => u.role === 'OWNER').length,
      advertisers: users.filter(u => u.role === 'ADVERTISER').length
    };
  });

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load both pending and all users
    this.adminService.getPendingKycUsers().subscribe({
      next: (users) => {
        // Filter out ADMIN users from pending
        this.pendingUsers.set(users.filter(u => u.role !== 'ADMIN'));
      },
      error: (err) => {
        console.error('Error loading pending KYC users:', err);
      }
    });

    this.adminService.getAllUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.error.set('Failed to load users. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Switch view mode
  switchView(mode: 'pending' | 'all'): void {
    this.viewMode.set(mode);
    this.searchTerm.set('');
    if (mode === 'pending') {
      this.statusFilter.set('all');
    }
  }

  // Open approve confirmation modal
  openApproveModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showApproveModal.set(true);
    this.clearMessages();
  }

  // Open reject modal
  openRejectModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.rejectReason = '';
    this.showRejectModal.set(true);
    this.clearMessages();
  }

  // Open block modal
  openBlockModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showBlockModal.set(true);
    this.clearMessages();
  }

  // Open unblock modal
  openUnblockModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showUnblockModal.set(true);
    this.clearMessages();
  }

  // Open user detail modal
  openUserDetailModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.showUserDetailModal.set(true);
  }

  // Close all modals
  closeModals(): void {
    this.showApproveModal.set(false);
    this.showRejectModal.set(false);
    this.showBlockModal.set(false);
    this.showUnblockModal.set(false);
    this.showUserDetailModal.set(false);
    this.show2FAModal.set(false);
    this.selectedUser.set(null);
    this.userTwoFactorStatus.set(null);
    this.rejectReason = '';
  }

  // Open 2FA management modal
  open2FAModal(user: AdminUser): void {
    this.selectedUser.set(user);
    this.show2FAModal.set(true);
    this.clearMessages();
    this.load2FAStatus(user.id);
  }

  // Load user's 2FA status
  load2FAStatus(userId: number): void {
    this.loading2FAStatus.set(true);
    this.adminService.getUserTwoFactorStatus(userId).subscribe({
      next: (status) => {
        this.userTwoFactorStatus.set(status);
        this.loading2FAStatus.set(false);
      },
      error: (err) => {
        console.error('Error loading 2FA status:', err);
        this.loading2FAStatus.set(false);
        this.errorMessage.set('Failed to load 2FA status');
        this.autoHideMessage();
      }
    });
  }

  // Enforce 2FA for user
  enforce2FA(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);
    this.adminService.enforceTwoFactorForUser(user.id).subscribe({
      next: (response) => {
        this.processing.set(false);
        this.successMessage.set(response.message || '2FA enforcement enabled for user');
        this.load2FAStatus(user.id);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to enforce 2FA');
        this.autoHideMessage();
      }
    });
  }

  // Remove 2FA enforcement for user
  removeForce2FA(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);
    this.adminService.removeForceTwoFactor(user.id).subscribe({
      next: (response) => {
        this.processing.set(false);
        this.successMessage.set(response.message || '2FA enforcement removed for user');
        this.load2FAStatus(user.id);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to remove 2FA enforcement');
        this.autoHideMessage();
      }
    });
  }

  // Disable 2FA completely for user
  disable2FA(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);
    this.adminService.disableTwoFactorForUser(user.id).subscribe({
      next: (response) => {
        this.processing.set(false);
        this.successMessage.set(response.message || '2FA disabled for user');
        this.load2FAStatus(user.id);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to disable 2FA');
        this.autoHideMessage();
      }
    });
  }

  // Reset 2FA for user
  reset2FA(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);
    this.adminService.resetTwoFactorForUser(user.id).subscribe({
      next: (response) => {
        this.processing.set(false);
        this.successMessage.set(response.message || '2FA reset for user');
        this.load2FAStatus(user.id);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reset 2FA');
        this.autoHideMessage();
      }
    });
  }

  // Approve KYC
  confirmApprove(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);

    this.adminService.approveUserKyc(user.id).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`KYC for ${user.name} has been approved successfully!`);

        // Update local lists
        this.pendingUsers.update(users => users.filter(u => u.id !== user.id));
        this.allUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, kycStatus: 'APPROVED' as const } : u)
        );

        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to approve KYC. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Reject KYC
  confirmReject(): void {
    const user = this.selectedUser();
    if (!user) {
      this.errorMessage.set('No user selected.');
      return;
    }

    this.processing.set(true);

    this.adminService.rejectUserKyc(user.id).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`KYC for ${user.name} has been rejected.`);

        // Update local lists
        this.pendingUsers.update(users => users.filter(u => u.id !== user.id));
        this.allUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, kycStatus: 'REJECTED' as const } : u)
        );

        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to reject KYC. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Block user
  confirmBlock(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);

    this.adminService.blockUser(user.id).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`${user.name} has been blocked successfully.`);

        // Update local lists
        this.allUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, blocked: true } : u)
        );
        this.pendingUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, blocked: true } : u)
        );

        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to block user. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Unblock user
  confirmUnblock(): void {
    const user = this.selectedUser();
    if (!user) return;

    this.processing.set(true);

    this.adminService.unblockUser(user.id).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`${user.name} has been unblocked successfully.`);

        // Update local lists
        this.allUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, blocked: false } : u)
        );
        this.pendingUsers.update(users =>
          users.map(u => u.id === user.id ? { ...u, blocked: false } : u)
        );

        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to unblock user. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Clear messages
  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  // Auto hide message after 5 seconds
  autoHideMessage(): void {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }

  // Update search term
  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  // Format date
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Get initials for avatar
  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  // Get role display name
  getRoleDisplay(role: string): string {
    switch (role) {
      case 'OWNER': return 'Billboard Owner';
      case 'ADVERTISER': return 'Advertiser';
      case 'ADMIN': return 'Administrator';
      default: return role;
    }
  }

  // Get role icon
  getRoleIcon(role: string): string {
    switch (role) {
      case 'OWNER': return '🏢';
      case 'ADVERTISER': return '📢';
      case 'ADMIN': return '👑';
      default: return '👤';
    }
  }

  // Handle image load error - show initials fallback
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Find sibling initials element and show it
    const parent = img.parentElement;
    if (parent) {
      const initialsDiv = parent.querySelector('.user-avatar');
      if (initialsDiv) {
        (initialsDiv as HTMLElement).style.display = 'flex';
      }
    }
  }

  // Track by function for ngFor
  trackByUserId(index: number, user: AdminUser): number {
    return user.id;
  }
}
