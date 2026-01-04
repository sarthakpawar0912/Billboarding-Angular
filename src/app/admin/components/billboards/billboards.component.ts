import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminBillboard } from '../../../services/admin.service';
import { environment } from '../../../../environments/environment';

// Display interface matching the template requirements
export interface BillboardDisplay {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  location: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  size: string;
  type: 'hoarding' | 'poster' | 'digital' | 'unipole';
  basePrice: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'blocked' | 'admin-blocked';
  adminBlocked: boolean; // True if blocked by admin
  views: number;
  bookings: number;
  createdAt: Date;
}

@Component({
  selector: 'app-billboards',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billboards.component.html',
  styleUrl: './billboards.component.css'
})
export class BillboardsComponent implements OnInit {
  searchTerm = signal('');
  statusFilter = signal<string>('all');
  typeFilter = signal<string>('all');
  viewMode = signal<'grid' | 'table'>('table');
  selectedBillboard = signal<BillboardDisplay | null>(null);
  showModal = signal(false);
  editingPrice = signal<string | null>(null);
  newPrice = signal(0);
  billboards = signal<BillboardDisplay[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  filteredBillboards = computed(() => {
    let result = this.billboards();

    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      result = result.filter(b =>
        (b.title || '').toLowerCase().includes(term) ||
        (b.ownerName || '').toLowerCase().includes(term) ||
        (b.location?.city || '').toLowerCase().includes(term)
      );
    }

    if (this.statusFilter() !== 'all') {
      result = result.filter(b => b.status === this.statusFilter());
    }

    if (this.typeFilter() !== 'all') {
      result = result.filter(b => b.type === this.typeFilter());
    }

    return result;
  });

  stats = computed(() => ({
    total: this.billboards().length,
    pending: this.billboards().filter(b => b.status === 'pending').length,
    approved: this.billboards().filter(b => b.status === 'approved').length,
    rejected: this.billboards().filter(b => b.status === 'rejected').length
  }));

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadBillboards();
  }

  loadBillboards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getAllBillboards().subscribe({
      next: (billboards) => {
        const displayBillboards = billboards.map(b => this.mapToDisplay(b));
        this.billboards.set(displayBillboards);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading billboards:', err);
        this.error.set('Failed to load billboards. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Map AdminBillboard to BillboardDisplay format
  private mapToDisplay(b: AdminBillboard): BillboardDisplay {
    // Parse location string (format: "Address, City" or just "City")
    const locationParts = (b.location || '').split(',').map(s => s.trim());
    const city = locationParts.length > 1 ? locationParts[locationParts.length - 1] : locationParts[0] || 'Unknown';
    const address = locationParts.length > 1 ? locationParts.slice(0, -1).join(', ') : b.location || 'Unknown';

    // Map type from backend format to display format
    const typeMap: Record<string, 'hoarding' | 'poster' | 'digital' | 'unipole'> = {
      'STATIC': 'hoarding',
      'LED': 'digital',
      'DIGITAL': 'digital',
      'NEON': 'unipole'
    };

    // Determine status based on adminBlocked and available flags
    let status: 'pending' | 'approved' | 'rejected' | 'blocked' | 'admin-blocked';
    if (b.adminBlocked) {
      status = 'admin-blocked'; // Admin has blocked this billboard
    } else if (b.available) {
      status = 'approved';
    } else {
      status = 'blocked'; // Owner has made it unavailable
    }

    // Map image paths to full URLs
    const images = (b.imagePaths || []).map(path =>
      path.startsWith('http') ? path : `${environment.apiUrl.replace('/api', '')}${path}`
    );

    return {
      id: String(b.id),
      title: b.title || 'Untitled Billboard',
      ownerId: String(b.owner?.id || 0),
      ownerName: b.owner?.name || 'Unknown Owner',
      location: {
        address: address,
        city: city,
        lat: b.latitude || 0,
        lng: b.longitude || 0
      },
      size: b.size || 'N/A',
      type: typeMap[b.type] || 'hoarding',
      basePrice: b.pricePerDay || 0,
      images: images.length > 0 ? images : ['/assets/placeholder-billboard.jpg'],
      status: status,
      adminBlocked: b.adminBlocked || false,
      views: 0, // Not tracked in backend
      bookings: 0, // Could be fetched separately if needed
      createdAt: new Date(b.createdAt)
    };
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onStatusFilter(status: string): void {
    this.statusFilter.set(status);
  }

  onTypeFilter(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.typeFilter.set(value);
  }

  toggleViewMode(): void {
    this.viewMode.update(v => v === 'grid' ? 'table' : 'grid');
  }

  viewBillboard(billboard: BillboardDisplay): void {
    this.selectedBillboard.set(billboard);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedBillboard.set(null);
  }

  approveBillboard(id: string): void {
    const numericId = parseInt(id, 10);
    this.adminService.enableBillboard(numericId).subscribe({
      next: () => {
        this.billboards.update(billboards =>
          billboards.map(b => b.id === id ? { ...b, status: 'approved' as const } : b)
        );
        this.closeModal();
      },
      error: (err) => {
        console.error('Error approving billboard:', err);
        alert('Failed to approve billboard. Please try again.');
      }
    });
  }

  rejectBillboard(id: string): void {
    const numericId = parseInt(id, 10);
    this.adminService.disableBillboard(numericId).subscribe({
      next: () => {
        this.billboards.update(billboards =>
          billboards.map(b => b.id === id ? { ...b, status: 'rejected' as const } : b)
        );
        this.closeModal();
      },
      error: (err) => {
        console.error('Error rejecting billboard:', err);
        alert('Failed to reject billboard. Please try again.');
      }
    });
  }

  blockBillboard(id: string): void {
    const numericId = parseInt(id, 10);
    this.adminService.blockBillboard(numericId).subscribe({
      next: () => {
        this.billboards.update(billboards =>
          billboards.map(b => b.id === id ? { ...b, status: 'admin-blocked' as const, adminBlocked: true } : b)
        );
        // Update selectedBillboard if open
        const selected = this.selectedBillboard();
        if (selected && selected.id === id) {
          this.selectedBillboard.set({ ...selected, status: 'admin-blocked' as const, adminBlocked: true });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error blocking billboard:', err);
        alert('Failed to block billboard. Please try again.');
      }
    });
  }

  unblockBillboard(id: string): void {
    const numericId = parseInt(id, 10);
    this.adminService.unblockBillboard(numericId).subscribe({
      next: () => {
        this.billboards.update(billboards =>
          billboards.map(b => b.id === id ? { ...b, status: 'blocked' as const, adminBlocked: false } : b)
        );
        // Update selectedBillboard if open
        const selected = this.selectedBillboard();
        if (selected && selected.id === id) {
          this.selectedBillboard.set({ ...selected, status: 'blocked' as const, adminBlocked: false });
        }
        this.closeModal();
      },
      error: (err) => {
        console.error('Error unblocking billboard:', err);
        alert('Failed to unblock billboard. Please try again.');
      }
    });
  }

  deleteBillboard(id: string): void {
    if (confirm('Are you sure you want to delete this billboard?')) {
      const numericId = parseInt(id, 10);
      this.adminService.deleteBillboard(numericId).subscribe({
        next: () => {
          this.billboards.update(billboards =>
            billboards.filter(b => b.id !== id)
          );
          this.closeModal();
        },
        error: (err) => {
          console.error('Error deleting billboard:', err);
          alert('Failed to delete billboard. Please try again.');
        }
      });
    }
  }

  startEditPrice(id: string, currentPrice: number): void {
    this.editingPrice.set(id);
    this.newPrice.set(currentPrice);
  }

  savePrice(id: string): void {
    const numericId = parseInt(id, 10);
    this.adminService.updateBillboardPrice(numericId, this.newPrice()).subscribe({
      next: (updated) => {
        this.billboards.update(billboards =>
          billboards.map(b => b.id === id ? { ...b, basePrice: updated.pricePerDay } : b)
        );
        this.editingPrice.set(null);
      },
      error: (err) => {
        console.error('Error updating billboard price:', err);
        alert('Failed to update price. Please try again.');
        this.editingPrice.set(null);
      }
    });
  }

  cancelEditPrice(): void {
    this.editingPrice.set(null);
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'rejected': 'status-rejected',
      'blocked': 'status-blocked',
      'admin-blocked': 'status-admin-blocked'
    };
    return classes[status] || '';
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
