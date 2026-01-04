import { Component, OnInit, OnDestroy, AfterViewInit, signal, computed, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdvertiserService, AdvertiserBillboard, CreateBookingRequest, MapBillboard, AvailabilityResponse, DayAvailability, PricePreviewResponse } from '../../../services/advertiser.service';
import { AvailabilityCalendarComponent } from '../../../shared/components/availability-calendar/availability-calendar.component';
import * as L from 'leaflet';

@Component({
  selector: 'app-advertiser-browse',
  standalone: true,
  imports: [CommonModule, FormsModule, AvailabilityCalendarComponent],
  templateUrl: './browse.component.html',
  styleUrl: './browse.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdvertiserBrowseComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('detailMapContainer') detailMapContainer!: ElementRef;
  @ViewChild('nearbyMapContainer') nearbyMapContainer!: ElementRef;

  // State signals
  billboards = signal<AdvertiserBillboard[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  searchTerm = signal('');
  cityFilter = signal('all');
  typeFilter = signal('all');
  priceRange = signal('all');
  sortBy = signal('popular');

  // Booking modal
  showBookingModal = signal(false);
  selectedBillboard = signal<AdvertiserBillboard | null>(null);
  bookingStartDate = '';
  bookingEndDate = '';
  processing = signal(false);

  // ================= PRICE PREVIEW (FROM BACKEND - AUTHORITATIVE) =================
  // CRITICAL: Never calculate prices locally. Always fetch from backend.
  pricePreview = signal<PricePreviewResponse | null>(null);
  pricePreviewLoading = signal(false);
  pricePreviewError = signal<string | null>(null);

  // Price breakdown signals (populated from backend)
  calculatedDays = signal(0);
  calculatedBaseAmount = signal(0);
  calculatedCommission = signal(0);
  calculatedGst = signal(0);
  calculatedTotal = signal(0);
  originalBaseAmount = signal(0);
  calculatedDiscountPercent = signal(0);
  calculatedDiscount = signal(0);

  // Availability check
  checkingAvailability = signal(false);
  availabilityStatus = signal<'unchecked' | 'available' | 'unavailable' | 'error'>('unchecked');
  availabilityResponse = signal<AvailabilityResponse | null>(null);
  private availabilityCheckTimeout: any = null;

  // Availability calendar
  showCalendar = signal(true);
  calendarAvailability = signal<DayAvailability[]>([]);

  // Detail modal with map
  showDetailModal = signal(false);
  detailBillboard = signal<MapBillboard | null>(null);
  loadingDetail = signal(false);
  private detailMap: L.Map | null = null;

  // Detail image carousel
  detailCarouselIndex = signal(0);
  private detailCarouselInterval: any = null;

  // Nearby search
  showNearbyModal = signal(false);
  nearbyBillboards = signal<MapBillboard[]>([]);
  loadingNearby = signal(false);
  nearbySearchLat = signal<number | null>(null);
  nearbySearchLng = signal<number | null>(null);
  nearbySearchRadius = signal(10);
  gettingLocation = signal(false);
  private nearbyMap: L.Map | null = null;

  // Nearby search form values
  nearbyLatInput = '';
  nearbyLngInput = '';
  nearbyRadiusInput = 10;

  // Success/error messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Favorites
  favoriteIds = signal<Set<number>>(new Set());
  togglingFavorite = signal<number | null>(null);

  // Image carousel state
  carouselIndices = signal<Map<number, number>>(new Map());
  private carouselIntervals: Map<number, any> = new Map();

  // Image Lightbox state
  showLightbox = signal(false);
  lightboxImages = signal<string[]>([]);
  lightboxCurrentIndex = signal(0);
  lightboxTitle = signal('');
  lightboxAutoSlide = signal(true);
  private lightboxAutoSlideInterval: any = null;
  private readonly LIGHTBOX_SLIDE_INTERVAL = 4000; // 4 seconds

  // Cities list (populated from data)
  cities = computed(() => {
    const citySet = new Set<string>();
    this.billboards().forEach(b => {
      const city = this.extractCity(b.location);
      if (city) citySet.add(city);
    });
    return Array.from(citySet).sort();
  });

  // Computed filtered billboards
  filteredBillboards = computed(() => {
    let result = this.billboards();
    const term = this.searchTerm().toLowerCase();
    const city = this.cityFilter();
    const type = this.typeFilter();
    const price = this.priceRange();
    const sort = this.sortBy();

    // Search filter
    if (term) {
      result = result.filter(b =>
        b.title?.toLowerCase().includes(term) ||
        b.location?.toLowerCase().includes(term) ||
        b.owner?.name?.toLowerCase().includes(term)
      );
    }

    // City filter
    if (city !== 'all') {
      result = result.filter(b => this.extractCity(b.location) === city);
    }

    // Type filter
    if (type !== 'all') {
      result = result.filter(b => b.billboardType?.toLowerCase() === type.toLowerCase());
    }

    // Price filter
    if (price !== 'all') {
      result = result.filter(b => {
        const dailyPrice = b.pricePerDay || 0;
        if (price === 'low') return dailyPrice < 2000;
        if (price === 'medium') return dailyPrice >= 2000 && dailyPrice < 5000;
        if (price === 'high') return dailyPrice >= 5000;
        return true;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case 'price-low':
          return (a.pricePerDay || 0) - (b.pricePerDay || 0);
        case 'price-high':
          return (b.pricePerDay || 0) - (a.pricePerDay || 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default: // popular
          return 0;
      }
    });

    return result;
  });

  constructor(public advertiserService: AdvertiserService) {}

  ngOnInit(): void {
    this.loadBillboards();
    this.loadFavorites();
  }

  ngAfterViewInit(): void {
    // Map will be initialized when detail modal opens
  }

  loadBillboards(): void {
    this.loading.set(true);
    this.error.set(null);

    this.advertiserService.getAvailableBillboards().subscribe({
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

  loadFavorites(): void {
    this.advertiserService.getFavorites().subscribe({
      next: (favorites) => {
        // Service now handles the mapping internally
        const ids = new Set(favorites.map(f => f.billboard.id));
        this.favoriteIds.set(ids);
      },
      error: (err) => {
        console.error('Error loading favorites:', err);
      }
    });
  }

  isFavorite(billboardId: number): boolean {
    return this.favoriteIds().has(billboardId);
  }

  toggleFavorite(billboard: AdvertiserBillboard, event: Event): void {
    event.stopPropagation();

    if (this.togglingFavorite() === billboard.id) return;

    this.togglingFavorite.set(billboard.id);
    const isFav = this.isFavorite(billboard.id);

    if (isFav) {
      // Remove from favorites
      this.advertiserService.removeFromFavorites(billboard.id).subscribe({
        next: () => {
          // Update local state immediately for smooth UI
          this.favoriteIds.update(ids => {
            const newIds = new Set(ids);
            newIds.delete(billboard.id);
            return newIds;
          });
          this.togglingFavorite.set(null);
          this.successMessage.set('Removed from favorites');
          this.autoHideMessage();
        },
        error: (err) => {
          console.error('Error removing from favorites:', err);
          this.togglingFavorite.set(null);
          this.errorMessage.set(err.message || 'Failed to remove from favorites');
          this.autoHideMessage();
        }
      });
    } else {
      // Add to favorites
      this.advertiserService.addToFavorites(billboard.id).subscribe({
        next: (favorite) => {
          // Update local state immediately for smooth UI
          this.favoriteIds.update(ids => {
            const newIds = new Set(ids);
            newIds.add(billboard.id);
            return newIds;
          });
          this.togglingFavorite.set(null);
          this.successMessage.set('Added to favorites');
          this.autoHideMessage();
        },
        error: (err) => {
          console.error('Error adding to favorites:', err);
          this.togglingFavorite.set(null);
          this.errorMessage.set(err.error?.message || 'Failed to add to favorites');
          this.autoHideMessage();
        }
      });
    }
  }

  private extractCity(location: string): string {
    if (!location) return '';
    const parts = location.split(',');
    return parts[parts.length - 1]?.trim() || parts[0]?.trim() || '';
  }

  onSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  onCityFilter(event: Event): void {
    this.cityFilter.set((event.target as HTMLSelectElement).value);
  }

  onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }

  onPriceFilter(event: Event): void {
    this.priceRange.set((event.target as HTMLSelectElement).value);
  }

  onSort(event: Event): void {
    this.sortBy.set((event.target as HTMLSelectElement).value);
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.cityFilter.set('all');
    this.typeFilter.set('all');
    this.priceRange.set('all');
  }

  // Open booking modal
  openBookingModal(billboard: AdvertiserBillboard): void {
    this.selectedBillboard.set(billboard);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.availabilityStatus.set('unchecked');
    this.availabilityResponse.set(null);
    this.showBookingModal.set(true);
    this.clearMessages();
  }

  closeBookingModal(): void {
    this.showBookingModal.set(false);
    this.selectedBillboard.set(null);
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.availabilityStatus.set('unchecked');
    this.availabilityResponse.set(null);
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
      this.availabilityCheckTimeout = null;
    }
  }

  // ==================== DETAIL MODAL WITH MAP ====================

  openDetailModal(billboard: AdvertiserBillboard): void {
    this.loadingDetail.set(true);
    this.showDetailModal.set(true);
    this.detailCarouselIndex.set(0);

    // Fetch full billboard details from map API
    this.advertiserService.getMapBillboards().subscribe({
      next: (billboards) => {
        const found = billboards.find(b => b.id === billboard.id);
        if (found) {
          this.detailBillboard.set(found);
          this.loadingDetail.set(false);
          // Start detail image carousel
          this.startDetailCarousel();
          // Initialize map after a short delay to ensure DOM is ready
          setTimeout(() => {
            this.initializeDetailMap();
          }, 100);
        } else {
          this.loadingDetail.set(false);
          this.errorMessage.set('Billboard details not found');
          this.autoHideMessage();
        }
      },
      error: (err) => {
        console.error('Error loading billboard details:', err);
        this.loadingDetail.set(false);
        this.errorMessage.set('Failed to load billboard details');
        this.autoHideMessage();
      }
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.detailBillboard.set(null);
    this.stopDetailCarousel();
    this.destroyDetailMap();
  }

  private initializeDetailMap(): void {
    if (!this.detailMapContainer?.nativeElement) return;

    const billboard = this.detailBillboard();
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
          <span style="color: #7c3aed; font-weight: 600; font-size: 16px;">₹${this.formatNumber(billboard.pricePerDay)}/day</span>
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

  // Detail carousel methods
  private startDetailCarousel(): void {
    const billboard = this.detailBillboard();
    if (!billboard || !billboard.imagePaths || billboard.imagePaths.length <= 1) return;

    this.stopDetailCarousel();
    this.detailCarouselInterval = setInterval(() => {
      const current = this.detailCarouselIndex();
      const next = (current + 1) % billboard.imagePaths.length;
      this.detailCarouselIndex.set(next);
    }, 3000);
  }

  private stopDetailCarousel(): void {
    if (this.detailCarouselInterval) {
      clearInterval(this.detailCarouselInterval);
      this.detailCarouselInterval = null;
    }
  }

  setDetailImageIndex(index: number): void {
    this.detailCarouselIndex.set(index);
  }

  getDetailCarouselTransform(): string {
    return `translateX(-${this.detailCarouselIndex() * 100}%)`;
  }

  formatNumber(num: number): string {
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + 'L';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('en-IN');
  }

  // Book from detail modal
  bookFromDetail(): void {
    const billboard = this.detailBillboard();
    if (!billboard) return;

    // Close detail modal and open booking modal with the billboard info
    this.closeDetailModal();

    // Create a compatible AdvertiserBillboard object for booking
    const advertiserBillboard: AdvertiserBillboard = {
      id: billboard.id,
      title: billboard.title,
      location: billboard.location,
      latitude: billboard.latitude,
      longitude: billboard.longitude,
      billboardType: billboard.type,
      size: billboard.size,
      pricePerDay: billboard.pricePerDay,
      available: billboard.available,
      owner: {
        id: billboard.owner.id,
        name: billboard.owner.name,
        email: billboard.owner.email
      },
      createdAt: billboard.createdAt,
      imagePaths: billboard.imagePaths
    };

    this.openBookingModal(advertiserBillboard);
  }

  // ==================== NEARBY SEARCH ====================

  openNearbyModal(): void {
    this.showNearbyModal.set(true);
    this.nearbyBillboards.set([]);
    this.nearbyLatInput = '';
    this.nearbyLngInput = '';
    this.nearbyRadiusInput = 10;
    this.nearbySearchLat.set(null);
    this.nearbySearchLng.set(null);
  }

  closeNearbyModal(): void {
    this.showNearbyModal.set(false);
    this.nearbyBillboards.set([]);
    this.destroyNearbyMap();
  }

  // Use geolocation to get current position
  useMyLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage.set('Geolocation is not supported by your browser');
      this.autoHideMessage();
      return;
    }

    this.gettingLocation.set(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.nearbyLatInput = position.coords.latitude.toFixed(4);
        this.nearbyLngInput = position.coords.longitude.toFixed(4);
        this.nearbySearchLat.set(position.coords.latitude);
        this.nearbySearchLng.set(position.coords.longitude);
        this.gettingLocation.set(false);
        this.successMessage.set('Location detected successfully!');
        this.autoHideMessage();
      },
      (error) => {
        this.gettingLocation.set(false);
        let message = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out.';
            break;
        }
        this.errorMessage.set(message);
        this.autoHideMessage();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // Search for nearby billboards
  searchNearby(): void {
    const lat = parseFloat(this.nearbyLatInput);
    const lng = parseFloat(this.nearbyLngInput);
    const radius = this.nearbyRadiusInput;

    if (isNaN(lat) || isNaN(lng)) {
      this.errorMessage.set('Please enter valid latitude and longitude');
      this.autoHideMessage();
      return;
    }

    if (lat < -90 || lat > 90) {
      this.errorMessage.set('Latitude must be between -90 and 90');
      this.autoHideMessage();
      return;
    }

    if (lng < -180 || lng > 180) {
      this.errorMessage.set('Longitude must be between -180 and 180');
      this.autoHideMessage();
      return;
    }

    if (radius <= 0 || radius > 100) {
      this.errorMessage.set('Radius must be between 1 and 100 km');
      this.autoHideMessage();
      return;
    }

    this.loadingNearby.set(true);
    this.nearbySearchLat.set(lat);
    this.nearbySearchLng.set(lng);
    this.nearbySearchRadius.set(radius);

    this.advertiserService.getNearbyBillboards(lat, lng, radius).subscribe({
      next: (billboards) => {
        this.nearbyBillboards.set(billboards);
        this.loadingNearby.set(false);
        // Initialize map after a short delay
        setTimeout(() => {
          this.initializeNearbyMap();
        }, 100);
      },
      error: (err) => {
        console.error('Error searching nearby billboards:', err);
        this.loadingNearby.set(false);
        this.errorMessage.set('Failed to search nearby billboards');
        this.autoHideMessage();
      }
    });
  }

  private initializeNearbyMap(): void {
    if (!this.nearbyMapContainer?.nativeElement) return;

    const lat = this.nearbySearchLat();
    const lng = this.nearbySearchLng();
    if (!lat || !lng) return;

    // Clean up existing map
    this.destroyNearbyMap();

    const searchCoords: L.LatLngExpression = [lat, lng];

    // Create map
    this.nearbyMap = L.map(this.nearbyMapContainer.nativeElement, {
      preferCanvas: true,
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(searchCoords, 12);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(this.nearbyMap);

    // Add search center marker (different color)
    const searchMarker = L.circleMarker(searchCoords, {
      radius: 10,
      fillColor: '#3b82f6',
      color: '#1d4ed8',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8
    }).addTo(this.nearbyMap);
    searchMarker.bindPopup('<strong>Your Search Location</strong>');

    // Add search radius circle
    const radiusMeters = this.nearbySearchRadius() * 1000;
    L.circle(searchCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.1,
      radius: radiusMeters
    }).addTo(this.nearbyMap);

    // Add billboard markers
    this.nearbyBillboards().forEach(billboard => {
      if (!billboard.latitude || !billboard.longitude) return;

      const coords: L.LatLngExpression = [billboard.latitude, billboard.longitude];
      const marker = L.marker(coords).addTo(this.nearbyMap!);
      marker.bindPopup(`
        <div style="min-width: 180px; font-family: system-ui, sans-serif;">
          <strong style="font-size: 14px;">${billboard.title}</strong><br>
          <small style="color: #64748b;">${billboard.location}</small><br>
          <div style="margin-top: 8px;">
            <span style="color: #7c3aed; font-weight: 600; font-size: 16px;">₹${this.formatNumber(billboard.pricePerDay)}/day</span>
          </div>
          <div style="margin-top: 6px;">
            <span style="padding: 2px 8px; background: ${billboard.available ? '#dcfce7' : '#fee2e2'}; color: ${billboard.available ? '#16a34a' : '#dc2626'}; border-radius: 4px; font-size: 11px;">
              ${billboard.available ? 'Available' : 'Unavailable'}
            </span>
          </div>
        </div>
      `);
    });

    // Fit bounds to show all markers
    if (this.nearbyBillboards().length > 0) {
      const allCoords: L.LatLngExpression[] = [searchCoords];
      this.nearbyBillboards().forEach(b => {
        if (b.latitude && b.longitude) {
          allCoords.push([b.latitude, b.longitude]);
        }
      });
      const bounds = L.latLngBounds(allCoords);
      this.nearbyMap.fitBounds(bounds, { padding: [50, 50] });
    }

    setTimeout(() => {
      this.nearbyMap?.invalidateSize();
    }, 100);
  }

  private destroyNearbyMap(): void {
    if (this.nearbyMap) {
      this.nearbyMap.remove();
      this.nearbyMap = null;
    }
  }

  // View details of a nearby billboard
  viewNearbyBillboardDetail(billboard: MapBillboard): void {
    this.detailBillboard.set(billboard);
    this.showDetailModal.set(true);
    this.detailCarouselIndex.set(0);
    this.startDetailCarousel();
    setTimeout(() => {
      this.initializeDetailMap();
    }, 100);
  }

  /**
   * Fetch price preview from backend.
   * CRITICAL: This is the SINGLE SOURCE OF TRUTH for prices.
   * Never calculate prices locally - always fetch from backend.
   */
  calculateTotal(): void {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.bookingStartDate || !this.bookingEndDate) {
      this.resetPriceBreakdown();
      return;
    }

    // Validate dates before calling API
    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);
    if (end < start) {
      this.resetPriceBreakdown();
      return;
    }

    // Fetch price preview from backend (AUTHORITATIVE)
    this.pricePreviewLoading.set(true);
    this.pricePreviewError.set(null);

    this.advertiserService.getPricePreview(
      billboard.id,
      this.bookingStartDate,
      this.bookingEndDate
    ).subscribe({
      next: (preview) => {
        this.pricePreview.set(preview);
        this.pricePreviewLoading.set(false);

        // Update signals from backend response
        this.calculatedDays.set(preview.totalDays);
        this.calculatedBaseAmount.set(preview.baseAmount);
        this.calculatedCommission.set(preview.commissionAmount);
        this.calculatedGst.set(preview.gstAmount);
        this.calculatedTotal.set(preview.totalAmount);

        // Discount signals
        this.originalBaseAmount.set(preview.originalBaseAmount);
        this.calculatedDiscountPercent.set(preview.discountPercent || 0);
        this.calculatedDiscount.set(preview.discountAmount || 0);
      },
      error: (err) => {
        console.error('Error fetching price preview:', err);
        this.pricePreviewError.set('Failed to calculate price. Please try again.');
        this.pricePreviewLoading.set(false);
        this.resetPriceBreakdown();
      }
    });
  }

  // Reset price breakdown signals
  private resetPriceBreakdown(): void {
    this.pricePreview.set(null);
    this.calculatedDays.set(0);
    this.calculatedBaseAmount.set(0);
    this.calculatedCommission.set(0);
    this.calculatedGst.set(0);
    this.calculatedTotal.set(0);
    this.originalBaseAmount.set(0);
    this.calculatedDiscountPercent.set(0);
    this.calculatedDiscount.set(0);
  }

  // Calculate number of days
  calculateDays(): number {
    if (!this.bookingStartDate || !this.bookingEndDate) return 0;
    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  // Submit booking
  submitBooking(): void {
    const billboard = this.selectedBillboard();
    if (!billboard) return;

    if (!this.bookingStartDate || !this.bookingEndDate) {
      this.errorMessage.set('Please select start and end dates');
      this.autoHideMessage();
      return;
    }

    if (new Date(this.bookingEndDate) < new Date(this.bookingStartDate)) {
      this.errorMessage.set('End date must be after start date');
      this.autoHideMessage();
      return;
    }

    this.processing.set(true);

    const request: CreateBookingRequest = {
      billboardId: billboard.id,
      startDate: this.bookingStartDate,
      endDate: this.bookingEndDate
    };

    this.advertiserService.createBooking(request).subscribe({
      next: (booking) => {
        this.processing.set(false);
        this.closeBookingModal();
        this.successMessage.set(`Booking request submitted successfully! Your booking ID is #${booking.id}`);
        this.autoHideMessage();
      },
      error: (err) => {
        this.processing.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to submit booking request. Please try again.');
        this.autoHideMessage();
      }
    });
  }

  // Get billboard type info
  getBillboardTypeInfo(type: string): { label: string; icon: string } {
    const types: Record<string, { label: string; icon: string }> = {
      'STATIC': { label: 'Static', icon: '📋' },
      'LED': { label: 'LED', icon: '📺' },
      'DIGITAL': { label: 'Digital', icon: '💻' },
      'NEON': { label: 'Neon', icon: '✨' }
    };
    return types[type?.toUpperCase()] || { label: type || 'Unknown', icon: '📋' };
  }

  clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  autoHideMessage(): void {
    setTimeout(() => {
      this.clearMessages();
    }, 5000);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  getImageUrl(billboard: AdvertiserBillboard): string {
    if (billboard.imagePaths && billboard.imagePaths.length > 0) {
      return this.advertiserService.getImageUrl(billboard.imagePaths[0]);
    }
    if (billboard.imageUrl) {
      return billboard.imageUrl;
    }
    return 'assets/placeholder-billboard.jpg';
  }

  // Get minimum date for booking (tomorrow)
  getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Date change handler - triggers availability check and price calculation
  onDateChange(): void {
    // Clear previous timeout
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
    }

    // Reset status if dates are incomplete
    if (!this.bookingStartDate || !this.bookingEndDate) {
      this.availabilityStatus.set('unchecked');
      this.availabilityResponse.set(null);
      this.resetPriceBreakdown();
      return;
    }

    // Validate dates
    if (new Date(this.bookingEndDate) < new Date(this.bookingStartDate)) {
      this.availabilityStatus.set('unchecked');
      this.availabilityResponse.set(null);
      this.resetPriceBreakdown();
      return;
    }

    // Calculate price breakdown
    this.calculateTotal();

    // Debounce the availability check (wait 500ms after user stops typing)
    this.availabilityCheckTimeout = setTimeout(() => {
      this.checkAvailability();
    }, 500);
  }

  // Check availability for selected dates
  checkAvailability(): void {
    const billboard = this.selectedBillboard();
    if (!billboard || !this.bookingStartDate || !this.bookingEndDate) return;

    this.checkingAvailability.set(true);
    this.availabilityStatus.set('unchecked');

    this.advertiserService.checkAvailability(
      billboard.id,
      this.bookingStartDate,
      this.bookingEndDate
    ).subscribe({
      next: (response) => {
        this.availabilityResponse.set(response);
        this.availabilityStatus.set(response.available ? 'available' : 'unavailable');
        this.checkingAvailability.set(false);
      },
      error: (err) => {
        console.error('Error checking availability:', err);
        this.checkingAvailability.set(false);
        // If API returns 409 or similar conflict error, it means dates are unavailable
        if (err.status === 409 || err.error?.message?.toLowerCase().includes('not available')) {
          this.availabilityStatus.set('unavailable');
          this.availabilityResponse.set({
            available: false,
            billboardId: billboard.id,
            startDate: this.bookingStartDate,
            endDate: this.bookingEndDate,
            message: err.error?.message || 'Billboard is not available for selected dates'
          });
        } else {
          this.availabilityStatus.set('error');
          this.availabilityResponse.set(null);
        }
      }
    });
  }

  // Get availability status message
  getAvailabilityMessage(): string {
    const response = this.availabilityResponse();
    if (!response) return '';

    if (response.available) {
      return 'Billboard is available for selected dates!';
    }

    if (response.message) {
      return response.message;
    }

    if (response.conflictingBookings && response.conflictingBookings.length > 0) {
      return `Billboard is booked during this period (${response.conflictingBookings.length} conflicting booking(s))`;
    }

    return 'Billboard is not available for selected dates';
  }

  // ==================== AVAILABILITY CALENDAR ====================

  // Handle date selection from calendar
  onCalendarDateSelected(event: { startDate: string; endDate: string; totalPrice: number; days: number }): void {
    this.bookingStartDate = event.startDate;
    this.bookingEndDate = event.endDate;
    // Note: We ignore event.totalPrice because it's just base amount without commission/GST
    // The calculateTotal() method will fetch the correct total from backend
    this.onDateChange();
  }

  // Get the total - ALWAYS use backend calculated total (includes commission + GST)
  getBookingTotal(): number {
    return this.calculatedTotal();
  }

  // Handle availability data loaded from calendar
  onCalendarAvailabilityLoaded(availability: DayAvailability[]): void {
    this.calendarAvailability.set(availability);
  }

  // Toggle calendar visibility
  toggleCalendar(): void {
    this.showCalendar.update(v => !v);
  }

  // Cleanup on destroy
  ngOnDestroy(): void {
    this.clearAllCarouselIntervals();
    this.stopDetailCarousel();
    this.stopLightboxAutoSlide();
    this.destroyDetailMap();
    this.destroyNearbyMap();
  }

  // ==================== IMAGE CAROUSEL ====================

  // Start auto-sliding for a billboard
  startCarousel(billboardId: number, imageCount: number): void {
    if (imageCount <= 1) return;

    // Clear existing interval if any
    this.stopCarousel(billboardId);

    const interval = setInterval(() => {
      this.carouselIndices.update(indices => {
        const newIndices = new Map(indices);
        const currentIndex = newIndices.get(billboardId) || 0;
        const nextIndex = (currentIndex + 1) % imageCount;
        newIndices.set(billboardId, nextIndex);
        return newIndices;
      });
    }, 3000); // Slide every 3 seconds

    this.carouselIntervals.set(billboardId, interval);
  }

  // Stop auto-sliding for a billboard
  stopCarousel(billboardId: number): void {
    const interval = this.carouselIntervals.get(billboardId);
    if (interval) {
      clearInterval(interval);
      this.carouselIntervals.delete(billboardId);
    }
  }

  // Clear all carousel intervals
  private clearAllCarouselIntervals(): void {
    this.carouselIntervals.forEach((interval, id) => {
      clearInterval(interval);
    });
    this.carouselIntervals.clear();
  }

  // Get current image index for a billboard
  getCurrentImageIndex(billboardId: number): number {
    return this.carouselIndices().get(billboardId) || 0;
  }

  // Set specific image index (for dot navigation)
  setImageIndex(billboardId: number, index: number): void {
    this.carouselIndices.update(indices => {
      const newIndices = new Map(indices);
      newIndices.set(billboardId, index);
      return newIndices;
    });
  }

  // Get carousel transform style
  getCarouselTransform(billboardId: number): string {
    const index = this.getCurrentImageIndex(billboardId);
    return `translateX(-${index * 100}%)`;
  }

  // ==================== IMAGE LIGHTBOX ====================

  // Open lightbox with billboard images
  openLightbox(billboard: AdvertiserBillboard, startIndex: number = 0, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const images: string[] = [];

    // Collect all image URLs
    if (billboard.imagePaths && billboard.imagePaths.length > 0) {
      billboard.imagePaths.forEach(path => {
        images.push(this.advertiserService.getImageUrl(path));
      });
    } else if (billboard.imageUrl) {
      images.push(billboard.imageUrl);
    }

    if (images.length === 0) return;

    this.lightboxImages.set(images);
    this.lightboxCurrentIndex.set(startIndex);
    this.lightboxTitle.set(billboard.title);
    this.showLightbox.set(true);
    this.lightboxAutoSlide.set(true);

    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    // Start auto-sliding if multiple images
    if (images.length > 1) {
      this.startLightboxAutoSlide();
    }
  }

  // Close lightbox
  closeLightbox(): void {
    this.stopLightboxAutoSlide();
    this.showLightbox.set(false);
    this.lightboxImages.set([]);
    this.lightboxCurrentIndex.set(0);
    this.lightboxTitle.set('');

    // Restore body scroll
    document.body.style.overflow = '';
  }

  // Start auto-sliding in lightbox
  private startLightboxAutoSlide(): void {
    this.stopLightboxAutoSlide();

    if (!this.lightboxAutoSlide()) return;

    this.lightboxAutoSlideInterval = setInterval(() => {
      if (this.lightboxAutoSlide()) {
        this.lightboxNext();
      }
    }, this.LIGHTBOX_SLIDE_INTERVAL);
  }

  // Stop auto-sliding in lightbox
  private stopLightboxAutoSlide(): void {
    if (this.lightboxAutoSlideInterval) {
      clearInterval(this.lightboxAutoSlideInterval);
      this.lightboxAutoSlideInterval = null;
    }
  }

  // Toggle auto-slide pause/play
  toggleLightboxAutoSlide(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.lightboxAutoSlide.update(v => !v);

    if (this.lightboxAutoSlide()) {
      this.startLightboxAutoSlide();
    } else {
      this.stopLightboxAutoSlide();
    }
  }

  // Navigate to next image
  lightboxNext(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const images = this.lightboxImages();
    if (images.length === 0) return;

    const nextIndex = (this.lightboxCurrentIndex() + 1) % images.length;
    this.lightboxCurrentIndex.set(nextIndex);
  }

  // Navigate to previous image
  lightboxPrev(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    const images = this.lightboxImages();
    if (images.length === 0) return;

    const prevIndex = (this.lightboxCurrentIndex() - 1 + images.length) % images.length;
    this.lightboxCurrentIndex.set(prevIndex);
  }

  // Go to specific image
  lightboxGoTo(index: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.lightboxCurrentIndex.set(index);
  }

  // Handle keyboard navigation
  onLightboxKeydown(event: KeyboardEvent): void {
    if (!this.showLightbox()) return;

    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowRight':
        this.lightboxNext();
        // Reset auto-slide timer when manually navigating
        if (this.lightboxAutoSlide()) {
          this.startLightboxAutoSlide();
        }
        break;
      case 'ArrowLeft':
        this.lightboxPrev();
        // Reset auto-slide timer when manually navigating
        if (this.lightboxAutoSlide()) {
          this.startLightboxAutoSlide();
        }
        break;
      case ' ': // Spacebar to pause/play
        event.preventDefault();
        this.toggleLightboxAutoSlide();
        break;
    }
  }
}
