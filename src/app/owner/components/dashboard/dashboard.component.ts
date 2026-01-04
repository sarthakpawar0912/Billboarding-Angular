import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OwnerService, RevenueDashboard, RevenueBillboard, MonthlyRevenue, HeatmapPoint, OwnerBooking, MapAnalyticsPoint } from '../../../services/owner.service';
import * as L from 'leaflet';

interface FilterOption {
  id: number;
  title: string;
}

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OwnerDashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  // Signals for reactive state
  dashboardData = signal<RevenueDashboard | null>(null);
  recentBookings = signal<OwnerBooking[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filter signals
  allBillboards = signal<FilterOption[]>([]);
  selectedBillboardId = signal<number | null>(null);
  startDate = signal<string>('');
  endDate = signal<string>('');

  // Export loading states
  exportingCSV = signal(false);
  exportingPDF = signal(false);

  // Analytics map data
  analyticsData = signal<MapAnalyticsPoint[]>([]);
  showAnalyticsHeatmap = signal(false);
  loadingAnalytics = signal(false);

  // Live location tracking
  ownerLocation = signal<{ lat: number; lng: number } | null>(null);
  showMyLocation = signal(false);
  gettingLocation = signal(false);
  locationError = signal<string | null>(null);
  private locationWatchId: number | null = null;
  private ownerMarker: L.Marker | null = null;
  private ownerAccuracyCircle: L.Circle | null = null;

  // Map instance
  private map: L.Map | null = null;

  // Computed values
  stats = computed(() => {
    const data = this.dashboardData();
    if (!data) return null;
    return {
      totalEarnings: data.totalEarnings,
      totalBillboards: data.totalBillboards,
      totalBookings: data.totalBookings,
      pendingRequests: data.pendingRequests
    };
  });

  billboards = computed(() => this.dashboardData()?.billboards || []);
  monthlyRevenue = computed(() => this.dashboardData()?.monthlyRevenue || []);
  heatmapPoints = computed(() => this.dashboardData()?.heatmapPoints || []);

  // Date helpers
  today = new Date().toISOString().split('T')[0];
  yearStart = `${new Date().getFullYear()}-01-01`;

  constructor(private ownerService: OwnerService) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.dashboardData()) {
        this.initializeMap();
        this.drawChart();
      }
    }, 500);
  }

  ngOnDestroy(): void {
    // Stop location tracking
    this.stopLocationWatch();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // Start watching owner's live location
  toggleMyLocation(): void {
    if (this.showMyLocation()) {
      this.stopLocationWatch();
      this.showMyLocation.set(false);
      this.ownerLocation.set(null);
      this.removeOwnerMarker();
    } else {
      this.startLocationWatch();
    }
  }

  private startLocationWatch(): void {
    if (!navigator.geolocation) {
      this.locationError.set('Geolocation is not supported by your browser');
      return;
    }

    this.gettingLocation.set(true);
    this.locationError.set(null);

    // First get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.handleLocationUpdate(position);
        this.gettingLocation.set(false);
        this.showMyLocation.set(true);

        // Then start watching for updates
        this.locationWatchId = navigator.geolocation.watchPosition(
          (pos) => this.handleLocationUpdate(pos),
          (err) => this.handleLocationError(err),
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 5000
          }
        );
      },
      (error) => {
        this.handleLocationError(error);
        this.gettingLocation.set(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  private stopLocationWatch(): void {
    if (this.locationWatchId !== null) {
      navigator.geolocation.clearWatch(this.locationWatchId);
      this.locationWatchId = null;
    }
  }

  private handleLocationUpdate(position: GeolocationPosition): void {
    const { latitude, longitude, accuracy } = position.coords;
    this.ownerLocation.set({ lat: latitude, lng: longitude });
    this.locationError.set(null);
    this.updateOwnerMarkerOnMap(latitude, longitude, accuracy);
  }

  private handleLocationError(error: GeolocationPositionError): void {
    let message: string;
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied. Please enable location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location unavailable. Please try again.';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out. Please try again.';
        break;
      default:
        message = 'Failed to get location. Please try again.';
    }
    this.locationError.set(message);
  }

  private updateOwnerMarkerOnMap(lat: number, lng: number, accuracy: number): void {
    if (!this.map) return;

    const coords: L.LatLngExpression = [lat, lng];

    // Create custom icon for owner location
    const ownerIcon = L.divIcon({
      className: 'owner-location-marker',
      html: `
        <div class="owner-marker-container">
          <div class="owner-marker-pulse"></div>
          <div class="owner-marker-dot"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    // Update or create marker
    if (this.ownerMarker) {
      this.ownerMarker.setLatLng(coords);
    } else {
      this.ownerMarker = L.marker(coords, { icon: ownerIcon, zIndexOffset: 1000 })
        .addTo(this.map)
        .bindPopup(`
          <div style="min-width: 150px; font-family: system-ui, sans-serif;">
            <strong style="font-size: 14px; color: #2563eb;">📍 Your Location</strong><br>
            <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
              Lat: ${lat.toFixed(6)}<br>
              Lng: ${lng.toFixed(6)}<br>
              Accuracy: ±${Math.round(accuracy)}m
            </div>
          </div>
        `);
    }

    // Update or create accuracy circle
    if (this.ownerAccuracyCircle) {
      this.ownerAccuracyCircle.setLatLng(coords);
      this.ownerAccuracyCircle.setRadius(accuracy);
    } else {
      this.ownerAccuracyCircle = L.circle(coords, {
        radius: accuracy,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2
      }).addTo(this.map);
    }

    // Center map on owner location if this is the first location update
    if (!this.ownerLocation()) {
      this.map.setView(coords, 15);
    }
  }

  private removeOwnerMarker(): void {
    if (this.ownerMarker && this.map) {
      this.map.removeLayer(this.ownerMarker);
      this.ownerMarker = null;
    }
    if (this.ownerAccuracyCircle && this.map) {
      this.map.removeLayer(this.ownerAccuracyCircle);
      this.ownerAccuracyCircle = null;
    }
  }

  // Center map on owner's location
  centerOnMyLocation(): void {
    const location = this.ownerLocation();
    if (location && this.map) {
      this.map.setView([location.lat, location.lng], 15);
      if (this.ownerMarker) {
        this.ownerMarker.openPopup();
      }
    }
  }

  loadInitialData(): void {
    // First load all data without filters to get billboard list
    this.loading.set(true);
    this.error.set(null);

    this.ownerService.getRevenueDashboard().subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        // Populate billboard filter options
        const options: FilterOption[] = data.billboards.map(b => ({
          id: b.billboardId,
          title: b.title || `Billboard #${b.billboardId}`
        }));
        this.allBillboards.set(options);
        this.loading.set(false);
        setTimeout(() => {
          this.initializeMap();
          this.drawChart();
        }, 100);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.loading.set(false);
        this.error.set('Failed to load dashboard data. Please try again.');
      }
    });

    // Load recent bookings
    this.ownerService.getMyBookings().subscribe({
      next: (bookings) => {
        const sorted = bookings.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        this.recentBookings.set(sorted.slice(0, 5));
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
      }
    });
  }

  // Load map analytics data
  loadAnalyticsData(): void {
    this.loadingAnalytics.set(true);
    this.ownerService.getMapAnalytics().subscribe({
      next: (data) => {
        this.analyticsData.set(data);
        this.loadingAnalytics.set(false);
        if (this.showAnalyticsHeatmap()) {
          this.initializeAnalyticsMap();
        }
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.loadingAnalytics.set(false);
      }
    });
  }

  // Toggle analytics heatmap view
  toggleAnalyticsHeatmap(): void {
    this.showAnalyticsHeatmap.update(v => !v);
    if (this.showAnalyticsHeatmap()) {
      if (this.analyticsData().length === 0) {
        this.loadAnalyticsData();
      } else {
        this.initializeAnalyticsMap();
      }
    } else {
      this.initializeMap();
    }
  }

  // Initialize analytics heatmap
  private initializeAnalyticsMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Clean up existing map
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const analyticsPoints = this.analyticsData();

    // Default center (India)
    let center: L.LatLngExpression = [20.5937, 78.9629];
    let zoom = 5;

    // If we have valid points, center on them
    if (analyticsPoints.length > 0) {
      const avgLat = analyticsPoints.reduce((sum, p) => sum + p.latitude, 0) / analyticsPoints.length;
      const avgLng = analyticsPoints.reduce((sum, p) => sum + p.longitude, 0) / analyticsPoints.length;
      center = [avgLat, avgLng];
      zoom = analyticsPoints.length === 1 ? 12 : 10;
    }

    // Create map
    this.map = L.map(this.mapContainer.nativeElement, {
      preferCanvas: true,
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(center, zoom);

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(this.map);

    // Calculate max revenue for scaling
    const maxRevenue = Math.max(...analyticsPoints.map(p => p.revenue), 1);

    // Add heatmap circles and markers
    analyticsPoints.forEach(point => {
      const coords: L.LatLngExpression = [point.latitude, point.longitude];

      // Intensity based on revenue
      const intensity = Math.min(point.revenue / maxRevenue, 1);
      const radius = 500 + (intensity * 2000);

      // Heatmap circle with gradient coloring based on revenue
      const color = this.getHeatmapColor(intensity);

      L.circle(coords, {
        color: 'transparent',
        fillColor: color,
        fillOpacity: 0.4 + (intensity * 0.3),
        radius: radius,
        interactive: false
      }).addTo(this.map!);

      // Add marker
      const marker = L.marker(coords).addTo(this.map!);
      marker.bindPopup(`
        <div style="min-width: 150px; font-family: system-ui, sans-serif;">
          <strong style="font-size: 14px;">Revenue Analytics</strong><br>
          <div style="margin-top: 8px;">
            <span style="color: #16a34a; font-weight: 700; font-size: 18px;">₹${this.formatNumber(point.revenue)}</span>
          </div>
          <div style="margin-top: 6px; font-size: 12px; color: #64748b;">
            Lat: ${point.latitude.toFixed(4)}<br>
            Lng: ${point.longitude.toFixed(4)}
          </div>
        </div>
      `);
    });

    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  // Get heatmap color based on intensity (green to red gradient)
  private getHeatmapColor(intensity: number): string {
    if (intensity < 0.33) {
      return '#22c55e'; // Green - low revenue
    } else if (intensity < 0.66) {
      return '#eab308'; // Yellow - medium revenue
    } else {
      return '#ef4444'; // Red - high revenue
    }
  }

  loadDashboardData(): void {
    this.loading.set(true);
    this.error.set(null);

    const filters: { billboardId?: number; start?: string; end?: string } = {};

    if (this.selectedBillboardId()) {
      filters.billboardId = this.selectedBillboardId()!;
    }
    if (this.startDate()) {
      filters.start = this.startDate();
    }
    if (this.endDate()) {
      filters.end = this.endDate();
    }

    this.ownerService.getRevenueDashboard(Object.keys(filters).length > 0 ? filters : undefined).subscribe({
      next: (data) => {
        this.dashboardData.set(data);
        this.loading.set(false);
        // Reinitialize map and chart after data is set
        setTimeout(() => {
          this.initializeMap();
          this.drawChart();
        }, 50);
      },
      error: (err) => {
        console.error('Error loading dashboard:', err);
        this.loading.set(false);
        this.error.set('Failed to load dashboard data. Please try again.');
      }
    });
  }

  // Filter handlers
  onBillboardFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedBillboardId.set(value ? parseInt(value) : null);
    this.loadDashboardData();
  }

  onStartDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.startDate.set(value);
    if (this.endDate() || value) {
      this.loadDashboardData();
    }
  }

  onEndDateChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.endDate.set(value);
    if (this.startDate() || value) {
      this.loadDashboardData();
    }
  }

  clearFilters(): void {
    this.selectedBillboardId.set(null);
    this.startDate.set('');
    this.endDate.set('');
    this.loadDashboardData();
  }

  setDateRange(range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all'): void {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (range) {
      case 'today':
        start = now;
        break;
      case 'week':
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start = new Date(now);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
        this.startDate.set('');
        this.endDate.set('');
        this.loadDashboardData();
        return;
      default:
        return;
    }

    this.startDate.set(this.formatDateForInput(start));
    this.endDate.set(this.formatDateForInput(end));
    this.loadDashboardData();
  }

  private formatDateForInput(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Initialize Leaflet map with heatmap
  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Clean up existing map properly
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const billboards = this.billboards().filter(b => b.latitude && b.longitude);

    // Default center (India)
    let center: L.LatLngExpression = [20.5937, 78.9629];
    let zoom = 5;

    // If we have valid billboard locations, center on them
    if (billboards.length > 0) {
      const avgLat = billboards.reduce((sum, b) => sum + (b.latitude || 0), 0) / billboards.length;
      const avgLng = billboards.reduce((sum, b) => sum + (b.longitude || 0), 0) / billboards.length;
      center = [avgLat, avgLng];
      zoom = billboards.length === 1 ? 12 : 10;
    }

    // Create map with performance optimizations
    this.map = L.map(this.mapContainer.nativeElement, {
      preferCanvas: true,  // Use canvas for better performance
      zoomControl: true,
      scrollWheelZoom: true
    }).setView(center, zoom);

    // Add tile layer with caching
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
      updateWhenIdle: true,
      updateWhenZooming: false
    }).addTo(this.map);

    // Calculate max revenue for scaling
    const maxRevenue = Math.max(...billboards.map(b => b.totalRevenue), 1);

    // Add markers and heatmap circles in a single pass
    billboards.forEach(billboard => {
      if (!billboard.latitude || !billboard.longitude) return;

      const coords: L.LatLngExpression = [billboard.latitude, billboard.longitude];

      // Add heatmap circle first (behind marker)
      const intensity = Math.min(billboard.totalRevenue / maxRevenue, 1);
      const radius = 300 + (intensity * 1500);

      L.circle(coords, {
        color: 'transparent',
        fillColor: '#22c55e',
        fillOpacity: 0.15 + (intensity * 0.35),
        radius: radius,
        interactive: false  // Disable interaction for better performance
      }).addTo(this.map!);

      // Add marker on top
      const marker = L.marker(coords).addTo(this.map!);

      // Lazy load popup content
      marker.bindPopup(() => `
        <div style="min-width: 150px; font-family: system-ui, sans-serif;">
          <strong style="font-size: 14px;">${billboard.title || 'Billboard #' + billboard.billboardId}</strong><br>
          <small style="color: #64748b;">${billboard.location || 'Location N/A'}</small><br>
          <div style="margin-top: 8px;">
            <span style="color: #16a34a; font-weight: 600; font-size: 16px;">₹${this.formatNumber(billboard.totalRevenue)}</span><br>
            <span style="color: #64748b; font-size: 12px;">${billboard.totalBookings} bookings</span>
          </div>
        </div>
      `);
    });

    // Invalidate size after render to fix any display issues
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 100);
  }

  // Draw revenue chart
  private drawChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    const canvas = this.chartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.monthlyRevenue();
    if (data.length === 0) {
      // Clear canvas and show message
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No revenue data for selected period', canvas.width / 2, canvas.height / 2);
      return;
    }

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, width, height);

    const maxRevenue = Math.max(...data.map(d => d.totalRevenue), 1);

    // Draw axes
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Draw grid lines and Y axis labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'right';

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + (chartHeight * i / ySteps);
      const value = maxRevenue * (1 - i / ySteps);

      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillText('₹' + this.formatNumber(value), padding.left - 8, y + 4);
    }

    // Calculate bar width
    const barWidth = Math.min(40, chartWidth / data.length - 10);
    const gap = (chartWidth - barWidth * data.length) / (data.length + 1);

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.totalRevenue / maxRevenue) * chartHeight;
      const x = padding.left + gap + index * (barWidth + gap);
      const y = height - padding.bottom - barHeight;

      const gradient = ctx.createLinearGradient(x, y, x, height - padding.bottom);
      gradient.addColorStop(0, '#22c55e');
      gradient.addColorStop(1, '#16a34a');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.font = '10px system-ui';
      const monthName = this.getMonthName(item.month);
      ctx.fillText(monthName, x + barWidth / 2, height - padding.bottom + 15);

      if (item.month === 1 || index === 0) {
        ctx.font = '9px system-ui';
        ctx.fillText(String(item.year), x + barWidth / 2, height - padding.bottom + 28);
      }
    });
  }

  // Approve booking
  approveBooking(bookingId: number): void {
    this.ownerService.approveBooking(bookingId).subscribe({
      next: () => {
        this.recentBookings.update(bookings =>
          bookings.map(b => b.id === bookingId ? { ...b, status: 'APPROVED' as const } : b)
        );
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Error approving booking:', err);
        alert('Failed to approve booking. Please try again.');
      }
    });
  }

  // Reject booking
  rejectBooking(bookingId: number): void {
    this.ownerService.rejectBooking(bookingId).subscribe({
      next: () => {
        this.recentBookings.update(bookings =>
          bookings.map(b => b.id === bookingId ? { ...b, status: 'REJECTED' as const } : b)
        );
        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Error rejecting booking:', err);
        alert('Failed to reject booking. Please try again.');
      }
    });
  }

  // Get top performing billboards
  getTopBillboards(): RevenueBillboard[] {
    return [...this.billboards()]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }

  // Get max revenue for chart scaling
  getMaxRevenue(): number {
    const revenues = this.billboards().map(b => b.totalRevenue);
    return Math.max(...revenues, 1);
  }

  // Helper methods
  getBillboardTitle(billboard: RevenueBillboard): string {
    return billboard.title || `Billboard #${billboard.billboardId}`;
  }

  getBillboardLocation(billboard: RevenueBillboard): string {
    if (billboard.location) return billboard.location;
    if (billboard.latitude && billboard.longitude) {
      return `${billboard.latitude.toFixed(4)}, ${billboard.longitude.toFixed(4)}`;
    }
    return 'Location N/A';
  }

  getBookingBillboardTitle(booking: OwnerBooking): string {
    return booking.billboard?.title || `Billboard #${booking.billboard?.id || 'N/A'}`;
  }

  getAdvertiserDisplay(booking: OwnerBooking): string {
    return booking.advertiser?.name || booking.advertiser?.email || 'Unknown';
  }

  getTypeClass(type: string): string {
    const classes: Record<string, string> = {
      'DIGITAL': 'type-digital',
      'STATIC': 'type-static',
      'LED': 'type-led',
      'NEON': 'type-neon'
    };
    return classes[type] || 'type-digital';
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'APPROVED': 'status-approved',
      'REJECTED': 'status-rejected',
      'CANCELLED': 'status-cancelled',
      'COMPLETED': 'status-completed'
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

  formatNumber(num: number): string {
    if (num >= 100000) {
      return (num / 100000).toFixed(1) + 'L';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(0);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedBillboardId() || this.startDate() || this.endDate());
  }

  // Get selected billboard title for filter display
  getSelectedBillboardTitle(): string {
    const id = this.selectedBillboardId();
    if (!id) return '';
    const billboard = this.allBillboards().find(b => b.id === id);
    return billboard?.title || `Billboard #${id}`;
  }

  // Clear individual filters
  clearBillboardFilter(): void {
    this.selectedBillboardId.set(null);
    this.loadDashboardData();
  }

  clearStartDateFilter(): void {
    this.startDate.set('');
    this.loadDashboardData();
  }

  clearEndDateFilter(): void {
    this.endDate.set('');
    this.loadDashboardData();
  }

  // Get average earnings per booking
  getAveragePerBooking(): number {
    const totalEarnings = this.stats()?.totalEarnings || 0;
    const totalBookings = this.stats()?.totalBookings || 1;
    return totalEarnings / Math.max(totalBookings, 1);
  }

  // Get current filters for export
  private getExportFilters(): { billboardId?: number; start?: string; end?: string } | undefined {
    const filters: { billboardId?: number; start?: string; end?: string } = {};
    if (this.selectedBillboardId()) {
      filters.billboardId = this.selectedBillboardId()!;
    }
    if (this.startDate()) {
      filters.start = this.startDate();
    }
    if (this.endDate()) {
      filters.end = this.endDate();
    }
    return Object.keys(filters).length > 0 ? filters : undefined;
  }

  // Export to CSV
  exportCSV(): void {
    this.exportingCSV.set(true);
    const filters = this.getExportFilters();

    this.ownerService.exportRevenueCSV(filters).subscribe({
      next: (blob) => {
        console.log('CSV blob received:', blob, 'size:', blob.size);
        if (blob.size > 0) {
          this.downloadFile(blob, 'revenue-report.csv', 'text/csv');
        } else {
          alert('No data to export.');
        }
        this.exportingCSV.set(false);
      },
      error: (err) => {
        console.error('Error exporting CSV:', err);
        alert('Failed to export CSV. Please try again.');
        this.exportingCSV.set(false);
      }
    });
  }

  // Export to PDF
  exportPDF(): void {
    this.exportingPDF.set(true);
    const filters = this.getExportFilters();

    this.ownerService.exportRevenuePDF(filters).subscribe({
      next: (blob) => {
        console.log('PDF blob received:', blob, 'size:', blob.size);
        if (blob.size > 0) {
          this.downloadFile(blob, 'revenue-report.pdf', 'application/pdf');
        } else {
          alert('No data to export.');
        }
        this.exportingPDF.set(false);
      },
      error: (err) => {
        console.error('Error exporting PDF:', err);
        alert('Failed to export PDF. Please try again.');
        this.exportingPDF.set(false);
      }
    });
  }

  // Helper to download file
  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    // Create blob with correct mime type
    const file = new Blob([blob], { type: mimeType });
    const url = window.URL.createObjectURL(file);

    // Create link element
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();

    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // Math helper for template
  Math = Math;
}
