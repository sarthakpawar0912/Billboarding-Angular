import { Component, OnInit, OnDestroy, AfterViewInit, signal, computed, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OwnerService, OwnerBillboard, CreateBillboardRequest, BillboardType, BILLBOARD_TYPES, OwnerMapBillboard } from '../../../services/owner.service';
import { OwnerCalendarComponent } from '../../../shared/components/owner-calendar/owner-calendar.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-owner-billboards',
  standalone: true,
  imports: [CommonModule, FormsModule, OwnerCalendarComponent],
  templateUrl: './billboards.component.html',
  styleUrl: './billboards.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerBillboardsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('detailMapContainer') detailMapContainer!: ElementRef;

  // Signals for reactive state
  billboards = signal<OwnerBillboard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Search and filter
  searchTerm = signal('');
  availabilityFilter = signal('all');

  // Modal states
  showCreateModal = signal(false);
  showEditModal = signal(false);
  showDeleteModal = signal(false);
  showBookingsWarningModal = signal(false);
  bookingsCount = signal(0);
  showImageUploadModal = signal(false);
  showImageGalleryModal = signal(false);
  showMapDetailModal = signal(false);
  showCalendarModal = signal(false);
  selectedBillboard = signal<OwnerBillboard | null>(null);
  calendarBillboard = signal<OwnerBillboard | null>(null);
  mapDetailBillboard = signal<OwnerMapBillboard | null>(null);
  loadingMapDetail = signal(false);
  private detailMap: L.Map | null = null;

  // Map detail carousel
  mapDetailCarouselIndex = signal(0);
  private mapDetailCarouselInterval: any = null;

  // Image upload state
  selectedImages: File[] = [];
  imagePreviewUrls: string[] = [];
  currentGalleryIndex = signal(0);

  // Auto-sliding carousel state
  carouselIndices: Map<number, number> = new Map();
  private carouselIntervals: Map<number, any> = new Map();
  private readonly CAROUSEL_INTERVAL = 3000; // 3 seconds

  // Billboard types for dropdown
  billboardTypes = BILLBOARD_TYPES;

  // Form data
  formData = {
    title: '',
    location: '',
    latitude: 0,
    longitude: 0,
    type: 'STATIC' as BillboardType,
    size: '',
    pricePerDay: 0,
    available: true,
    imageUrl: ''
  };

  // Processing state
  processing = signal(false);

  // Success/Error messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Computed filtered billboards
  filteredBillboards = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const availability = this.availabilityFilter();
    const boards = this.billboards();

    return boards.filter(b => {
      const matchesSearch = !term ||
        b.title?.toLowerCase().includes(term) ||
        b.location?.toLowerCase().includes(term);

      const matchesAvailability = availability === 'all' ||
        (availability === 'available' && b.available) ||
        (availability === 'unavailable' && !b.available);

      return matchesSearch && matchesAvailability;
    });
  });

  // Stats computed
  stats = computed(() => {
    const boards = this.billboards();
    return {
      total: boards.length,
      available: boards.filter(b => b.available).length,
      unavailable: boards.filter(b => !b.available).length,
      totalRevenue: boards.reduce((sum, b) => sum + (b.pricePerDay || 0), 0)
    };
  });

  constructor(private ownerService: OwnerService) {}

  ngOnInit(): void {
    this.loadBillboards();
  }

  ngAfterViewInit(): void {
    // Map will be initialized when detail modal opens
  }

  ngOnDestroy(): void {
    // Clear all carousel intervals
    this.carouselIntervals.forEach(interval => clearInterval(interval));
    this.carouselIntervals.clear();
    this.stopMapDetailCarousel();
    this.destroyDetailMap();
  }

  // Start auto-sliding carousel for a billboard
  startCarousel(billboardId: number, imageCount: number): void {
    if (imageCount <= 1 || this.carouselIntervals.has(billboardId)) return;

    const interval = setInterval(() => {
      const currentIndex = this.carouselIndices.get(billboardId) || 0;
      const nextIndex = (currentIndex + 1) % imageCount;
      this.carouselIndices.set(billboardId, nextIndex);
    }, this.CAROUSEL_INTERVAL);

    this.carouselIntervals.set(billboardId, interval);
  }

  // Stop carousel on mouse leave
  stopCarousel(billboardId: number): void {
    const interval = this.carouselIntervals.get(billboardId);
    if (interval) {
      clearInterval(interval);
      this.carouselIntervals.delete(billboardId);
    }
  }

  // Get current carousel index for a billboard
  getCarouselIndex(billboardId: number): number {
    return this.carouselIndices.get(billboardId) || 0;
  }

  // Set carousel index manually (for dots)
  setCarouselIndex(billboardId: number, index: number): void {
    this.carouselIndices.set(billboardId, index);
  }

  // Navigate carousel
  nextCarouselImage(billboardId: number, imageCount: number, event: Event): void {
    event.stopPropagation();
    const currentIndex = this.carouselIndices.get(billboardId) || 0;
    this.carouselIndices.set(billboardId, (currentIndex + 1) % imageCount);
  }

  prevCarouselImage(billboardId: number, imageCount: number, event: Event): void {
    event.stopPropagation();
    const currentIndex = this.carouselIndices.get(billboardId) || 0;
    this.carouselIndices.set(billboardId, currentIndex === 0 ? imageCount - 1 : currentIndex - 1);
  }

  loadBillboards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.ownerService.getMyBillboards().subscribe({
      next: (billboards) => {
        this.billboards.set(billboards);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading billboards:', err);
        this.error.set('Failed to load billboards. Please try again.');
        this.loading.set(false);
      }
    });
  }

  // Open create modal
  openCreateModal(): void {
    this.resetForm();
    this.showCreateModal.set(true);
    this.clearMessages();
  }

  // Open edit modal
  openEditModal(billboard: OwnerBillboard): void {
    this.selectedBillboard.set(billboard);
    this.formData = {
      title: billboard.title || '',
      location: billboard.location || '',
      latitude: billboard.latitude || 0,
      longitude: billboard.longitude || 0,
      type: billboard.type || 'STATIC',
      size: billboard.size || '',
      pricePerDay: billboard.pricePerDay || 0,
      available: billboard.available ?? true,
      imageUrl: billboard.imageUrl || ''
    };
    this.showEditModal.set(true);
    this.clearMessages();
  }

  // Open delete modal
  openDeleteModal(billboard: OwnerBillboard): void {
    this.selectedBillboard.set(billboard);
    this.showDeleteModal.set(true);
    this.clearMessages();
  }

  // Close all modals
  closeModals(): void {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showDeleteModal.set(false);
    this.showBookingsWarningModal.set(false);
    this.bookingsCount.set(0);
    this.showImageUploadModal.set(false);
    this.showImageGalleryModal.set(false);
    this.selectedBillboard.set(null);
    this.resetForm();
    this.clearImageSelection();
  }

  // Reset form
  resetForm(): void {
    this.formData = {
      title: '',
      location: '',
      latitude: 0,
      longitude: 0,
      type: 'STATIC' as BillboardType,
      size: '',
      pricePerDay: 0,
      available: true,
      imageUrl: ''
    };
  }

  // Create billboard
  createBillboard(): void {
    if (!this.validateForm()) return;

    this.processing.set(true);

    const request: CreateBillboardRequest = {
      title: this.formData.title.trim(),
      location: this.formData.location.trim(),
      latitude: this.formData.latitude,
      longitude: this.formData.longitude,
      type: this.formData.type,
      size: this.formData.size.trim(),
      pricePerDay: this.formData.pricePerDay
    };

    this.ownerService.createBillboard(request).subscribe({
      next: (newBillboard) => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`Billboard "${newBillboard.title}" created successfully!`);
        this.billboards.update(boards => [newBillboard, ...boards]);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to create billboard. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Update billboard
  updateBillboard(): void {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.validateForm()) return;

    this.processing.set(true);

    this.ownerService.updateBillboard(billboard.id, {
      title: this.formData.title.trim(),
      location: this.formData.location.trim(),
      latitude: this.formData.latitude,
      longitude: this.formData.longitude,
      type: this.formData.type,
      size: this.formData.size.trim(),
      pricePerDay: this.formData.pricePerDay
    }).subscribe({
      next: (updatedBillboard) => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`Billboard "${updatedBillboard.title}" updated successfully!`);
        this.billboards.update(boards =>
          boards.map(b => b.id === updatedBillboard.id ? updatedBillboard : b)
        );
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to update billboard. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Delete billboard
  deleteBillboard(forceDelete: boolean = false): void {
    const billboard = this.selectedBillboard();
    if (!billboard) {
      this.errorMessage.set('No billboard selected for deletion');
      this.autoHideMessage();
      return;
    }

    this.processing.set(true);

    this.ownerService.deleteBillboard(billboard.id, forceDelete).subscribe({
      next: () => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`Billboard "${billboard.title}" deleted successfully!`);
        this.billboards.update(boards => boards.filter(b => b.id !== billboard.id));
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Delete billboard error:', err);
        this.processing.set(false);

        // Extract error message
        const errorMsg = err.error?.message || err.error?.error || err.message || '';

        // Check if it's a bookings exist error (multiple formats)
        // Format 1: 409 with code BOOKINGS_EXIST
        // Format 2: 400 with message containing "existing bookings"
        const bookingsMatch = errorMsg.match(/Found (\d+) booking/i);
        const hasBookingsError = err.status === 409 && err.error?.code === 'BOOKINGS_EXIST';
        const hasBookingsMessage = errorMsg.toLowerCase().includes('existing bookings') ||
                                   errorMsg.toLowerCase().includes('booking(s) associated');

        if (hasBookingsError || hasBookingsMessage) {
          // Close delete modal and show bookings warning modal
          this.showDeleteModal.set(false);
          const count = err.error?.bookingCount || (bookingsMatch ? parseInt(bookingsMatch[1]) : 1);
          this.bookingsCount.set(count);
          this.showBookingsWarningModal.set(true);
          return;
        }

        this.closeModals();
        this.errorMessage.set(errorMsg || 'Failed to delete billboard. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Force delete billboard (with bookings)
  forceDeleteBillboard(): void {
    this.deleteBillboard(true);
  }

  // Toggle availability
  toggleAvailability(billboard: OwnerBillboard): void {
    this.ownerService.toggleAvailability(billboard.id, !billboard.available).subscribe({
      next: (updated) => {
        this.billboards.update(boards =>
          boards.map(b => b.id === updated.id ? updated : b)
        );
        this.successMessage.set(`Billboard is now ${updated.available ? 'available' : 'unavailable'}`);
        this.autoHideMessage();
      },
      error: (err) => {
        this.errorMessage.set('Failed to update availability');
        this.autoHideMessage();
      }
    });
  }

  // Validate form
  validateForm(): boolean {
    if (!this.formData.title.trim()) {
      this.errorMessage.set('Please enter a title');
      return false;
    }
    if (!this.formData.location.trim()) {
      this.errorMessage.set('Please enter a location');
      return false;
    }
    if (!this.formData.latitude || !this.formData.longitude) {
      this.errorMessage.set('Please enter latitude and longitude coordinates');
      return false;
    }
    if (!this.formData.type) {
      this.errorMessage.set('Please select a billboard type');
      return false;
    }
    if (!this.formData.size.trim()) {
      this.errorMessage.set('Please enter a size');
      return false;
    }
    if (this.formData.pricePerDay <= 0) {
      this.errorMessage.set('Please enter a valid price');
      return false;
    }
    return true;
  }

  // Get billboard type info
  getBillboardTypeInfo(type: BillboardType | string): { label: string; icon: string } {
    const typeInfo = BILLBOARD_TYPES.find(t => t.value === type);
    return typeInfo ? { label: typeInfo.label, icon: typeInfo.icon } : { label: type || 'Unknown', icon: '📋' };
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

  // Update availability filter
  onFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.availabilityFilter.set(target.value);
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  // Format date
  formatDate(date: string | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  // Track by function
  trackByBillboardId(index: number, billboard: OwnerBillboard): number {
    return billboard.id;
  }

  // Image upload methods
  openImageUploadModal(billboard: OwnerBillboard): void {
    this.selectedBillboard.set(billboard);
    this.clearImageSelection();
    this.showImageUploadModal.set(true);
    this.clearMessages();
  }

  openImageGallery(billboard: OwnerBillboard, index: number = 0): void {
    this.selectedBillboard.set(billboard);
    this.currentGalleryIndex.set(index);
    this.showImageGalleryModal.set(true);
  }

  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const newFiles = Array.from(input.files);
      this.selectedImages = [...this.selectedImages, ...newFiles];

      // Generate preview URLs
      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (e.target?.result) {
            this.imagePreviewUrls.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input to allow selecting same file again
    input.value = '';
  }

  removeSelectedImage(index: number): void {
    this.selectedImages.splice(index, 1);
    this.imagePreviewUrls.splice(index, 1);
  }

  clearImageSelection(): void {
    this.selectedImages = [];
    this.imagePreviewUrls = [];
  }

  uploadImages(): void {
    const billboard = this.selectedBillboard();
    if (!billboard) return;

    if (this.selectedImages.length < 3) {
      this.errorMessage.set('Please select at least 3 images');
      this.autoHideMessage();
      return;
    }

    this.processing.set(true);

    this.ownerService.uploadImages(billboard.id, this.selectedImages).subscribe({
      next: (updatedBillboard) => {
        this.processing.set(false);
        this.closeModals();
        this.successMessage.set(`${this.selectedImages.length} images uploaded successfully!`);
        this.billboards.update(boards =>
          boards.map(b => b.id === updatedBillboard.id ? updatedBillboard : b)
        );
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to upload images. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  getImageUrl(imagePath: string): string {
    return this.ownerService.getImageUrl(imagePath);
  }

  nextGalleryImage(): void {
    const billboard = this.selectedBillboard();
    if (billboard?.imagePaths) {
      const maxIndex = billboard.imagePaths.length - 1;
      if (this.currentGalleryIndex() < maxIndex) {
        this.currentGalleryIndex.update(i => i + 1);
      }
    }
  }

  prevGalleryImage(): void {
    if (this.currentGalleryIndex() > 0) {
      this.currentGalleryIndex.update(i => i - 1);
    }
  }

  setGalleryIndex(index: number): void {
    this.currentGalleryIndex.set(index);
  }

  getImageCount(billboard: OwnerBillboard): number {
    return billboard.imagePaths?.length || 0;
  }

  // ==================== MAP DETAIL MODAL ====================

  openMapDetailModal(billboard: OwnerBillboard): void {
    this.loadingMapDetail.set(true);
    this.showMapDetailModal.set(true);
    this.mapDetailCarouselIndex.set(0);

    // Fetch full billboard details from map API
    this.ownerService.getMapBillboards().subscribe({
      next: (billboards) => {
        const found = billboards.find(b => b.id === billboard.id);
        if (found) {
          this.mapDetailBillboard.set(found);
          this.loadingMapDetail.set(false);
          this.startMapDetailCarousel();
          // Initialize map after a short delay to ensure DOM is ready
          setTimeout(() => {
            this.initializeDetailMap();
          }, 100);
        } else {
          this.loadingMapDetail.set(false);
          this.errorMessage.set('Billboard details not found');
          this.autoHideMessage();
        }
      },
      error: (err) => {
        console.error('Error loading billboard details:', err);
        this.loadingMapDetail.set(false);
        this.errorMessage.set('Failed to load billboard details');
        this.autoHideMessage();
      }
    });
  }

  closeMapDetailModal(): void {
    this.showMapDetailModal.set(false);
    this.mapDetailBillboard.set(null);
    this.stopMapDetailCarousel();
    this.destroyDetailMap();
  }

  private initializeDetailMap(): void {
    if (!this.detailMapContainer?.nativeElement) return;

    const billboard = this.mapDetailBillboard();
    if (!billboard || !billboard.latitude || !billboard.longitude) return;

    // Clean up existing map
    this.destroyDetailMap();

    const coords: L.LatLngExpression = [billboard.latitude, billboard.longitude];

    // Create map
    this.detailMap = L.map(this.detailMapContainer.nativeElement, {
      preferCanvas: true,
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(coords, 14);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(this.detailMap);

    // Add marker
    const marker = L.marker(coords).addTo(this.detailMap);
    marker.bindPopup(`
      <div style="min-width: 150px; font-family: system-ui, sans-serif;">
        <strong style="font-size: 14px;">${billboard.title}</strong><br>
        <small style="color: #64748b;">${billboard.location}</small><br>
        <div style="margin-top: 8px;">
          <span style="color: #22c55e; font-weight: 600; font-size: 16px;">₹${this.formatNumber(billboard.pricePerDay)}/day</span>
        </div>
      </div>
    `).openPopup();

    // Invalidate size after render
    setTimeout(() => {
      this.detailMap?.invalidateSize();
    }, 100);
  }

  private destroyDetailMap(): void {
    if (this.detailMap) {
      this.detailMap.remove();
      this.detailMap = null;
    }
  }

  // Map detail carousel methods
  private startMapDetailCarousel(): void {
    const billboard = this.mapDetailBillboard();
    if (!billboard || !billboard.imagePaths || billboard.imagePaths.length <= 1) return;

    this.stopMapDetailCarousel();
    this.mapDetailCarouselInterval = setInterval(() => {
      const current = this.mapDetailCarouselIndex();
      const next = (current + 1) % billboard.imagePaths.length;
      this.mapDetailCarouselIndex.set(next);
    }, 3000);
  }

  private stopMapDetailCarousel(): void {
    if (this.mapDetailCarouselInterval) {
      clearInterval(this.mapDetailCarouselInterval);
      this.mapDetailCarouselInterval = null;
    }
  }

  setMapDetailImageIndex(index: number): void {
    this.mapDetailCarouselIndex.set(index);
  }

  getMapDetailCarouselTransform(): string {
    return `translateX(-${this.mapDetailCarouselIndex() * 100}%)`;
  }

  formatNumber(num: number): string {
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + 'L';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('en-IN');
  }

  // Edit from map detail modal
  editFromMapDetail(): void {
    const billboard = this.mapDetailBillboard();
    if (!billboard) return;

    // Close map detail modal
    this.closeMapDetailModal();

    // Find the owner billboard and open edit modal
    const ownerBillboard = this.billboards().find(b => b.id === billboard.id);
    if (ownerBillboard) {
      this.openEditModal(ownerBillboard);
    }
  }

  // ==================== CALENDAR MODAL ====================

  openCalendarModal(billboard: OwnerBillboard): void {
    this.calendarBillboard.set(billboard);
    this.showCalendarModal.set(true);
  }

  closeCalendarModal(): void {
    this.showCalendarModal.set(false);
    this.calendarBillboard.set(null);
  }

  onCalendarMonthChanged(event: { month: number; year: number }): void {
    // Handle month change if needed (e.g., log or analytics)
    console.log('Calendar month changed:', event);
  }
}
