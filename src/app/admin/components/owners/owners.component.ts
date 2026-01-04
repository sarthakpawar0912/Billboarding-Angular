import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, OwnerStats } from '../../../services/admin.service';

// Owner interface matching the UI requirements
export interface OwnerDisplay {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  totalBillboards: number;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  earnings: number;
  joinedAt: Date;
  kycStatus: string;
}

@Component({
  selector: 'app-owners',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './owners.component.html',
  styleUrl: './owners.component.css'
})
export class OwnersComponent implements OnInit {
  searchTerm = signal('');
  statusFilter = signal<string>('all');
  selectedOwner = signal<OwnerDisplay | null>(null);
  showModal = signal(false);
  owners = signal<OwnerDisplay[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  filteredOwners = computed(() => {
    let result = this.owners();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.email.toLowerCase().includes(term) ||
        (o.company && o.company.toLowerCase().includes(term))
      );
    }

    if (this.statusFilter() !== 'all') {
      result = result.filter(o => o.status === this.statusFilter());
    }

    return result;
  });

  stats = computed(() => ({
    total: this.owners().length,
    pending: this.owners().filter(o => o.status === 'pending').length,
    approved: this.owners().filter(o => o.status === 'approved').length,
    blocked: this.owners().filter(o => o.status === 'blocked').length
  }));

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadOwners();
  }

  loadOwners(): void {
    this.loading.set(true);
    this.error.set(null);

    // Use the new endpoint that returns aggregated stats
    this.adminService.getAllOwnersWithStats().subscribe({
      next: (owners) => {
        const ownerDisplays = owners.map(o => this.mapOwnerStatsToDisplay(o));
        this.owners.set(ownerDisplays);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading owners:', err);
        this.error.set('Failed to load owners. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Map OwnerStats (from API) to OwnerDisplay format
  private mapOwnerStatsToDisplay(owner: OwnerStats): OwnerDisplay {
    // Determine status based on blocked and kycStatus
    let status: 'pending' | 'approved' | 'rejected' | 'blocked';
    if (owner.blocked) {
      status = 'blocked';
    } else if (owner.kycStatus === 'APPROVED') {
      status = 'approved';
    } else if (owner.kycStatus === 'REJECTED') {
      status = 'rejected';
    } else {
      status = 'pending';
    }

    return {
      id: owner.id,
      name: owner.name,
      email: owner.email,
      phone: owner.phone || '',
      company: owner.company || '',
      totalBillboards: owner.billboardCount || 0, // From aggregated backend data
      status: status,
      earnings: owner.totalEarnings || 0, // From aggregated backend data
      joinedAt: new Date(owner.createdAt),
      kycStatus: owner.kycStatus
    };
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  viewOwner(owner: OwnerDisplay): void {
    this.selectedOwner.set(owner);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedOwner.set(null);
  }

  approveOwner(id: number): void {
    this.adminService.approveUserKyc(id).subscribe({
      next: () => {
        // Update local state
        this.owners.update(owners =>
          owners.map(o => o.id === id ? { ...o, status: 'approved' as const, kycStatus: 'APPROVED' } : o)
        );
        // Also update selectedOwner if it's the same user
        const selected = this.selectedOwner();
        if (selected && selected.id === id) {
          this.selectedOwner.set({ ...selected, status: 'approved' as const, kycStatus: 'APPROVED' });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error approving owner:', err);
        alert('Failed to approve owner. Please try again.');
      }
    });
  }

  rejectOwner(id: number): void {
    this.adminService.rejectUserKyc(id).subscribe({
      next: () => {
        // Update local state
        this.owners.update(owners =>
          owners.map(o => o.id === id ? { ...o, status: 'rejected' as const, kycStatus: 'REJECTED' } : o)
        );
        // Also update selectedOwner if it's the same user
        const selected = this.selectedOwner();
        if (selected && selected.id === id) {
          this.selectedOwner.set({ ...selected, status: 'rejected' as const, kycStatus: 'REJECTED' });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error rejecting owner:', err);
        alert('Failed to reject owner. Please try again.');
      }
    });
  }

  blockOwner(id: number): void {
    this.adminService.blockUser(id).subscribe({
      next: () => {
        // Update local state
        this.owners.update(owners =>
          owners.map(o => o.id === id ? { ...o, status: 'blocked' as const } : o)
        );
        // Also update selectedOwner if it's the same user (for modal consistency)
        const selected = this.selectedOwner();
        if (selected && selected.id === id) {
          this.selectedOwner.set({ ...selected, status: 'blocked' as const });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error blocking owner:', err);
        alert('Failed to block owner. Please try again.');
      }
    });
  }

  unblockOwner(id: number): void {
    this.adminService.unblockUser(id).subscribe({
      next: () => {
        // Update local state - restore status based on KYC status
        this.owners.update(owners =>
          owners.map(o => {
            if (o.id === id) {
              // Properly restore status based on KYC status
              let newStatus: 'pending' | 'approved' | 'rejected';
              if (o.kycStatus === 'APPROVED') {
                newStatus = 'approved';
              } else if (o.kycStatus === 'REJECTED') {
                newStatus = 'rejected';
              } else {
                newStatus = 'pending';
              }
              return { ...o, status: newStatus };
            }
            return o;
          })
        );
        // Also update selectedOwner if it's the same user (for modal consistency)
        const selected = this.selectedOwner();
        if (selected && selected.id === id) {
          let newStatus: 'pending' | 'approved' | 'rejected';
          if (selected.kycStatus === 'APPROVED') {
            newStatus = 'approved';
          } else if (selected.kycStatus === 'REJECTED') {
            newStatus = 'rejected';
          } else {
            newStatus = 'pending';
          }
          this.selectedOwner.set({ ...selected, status: newStatus });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error unblocking owner:', err);
        alert('Failed to unblock owner. Please try again.');
      }
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'blocked': 'status-blocked'
    };
    return classes[status] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: Date): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
