import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, DashboardStats, ChartPoint } from '../../../services/admin.service';
import { forkJoin } from 'rxjs';

// Display interface for analytics
export interface AnalyticsDisplay {
  totalBillboards: number;
  totalOwners: number;
  totalAdvertisers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
  activeBookings: number;
  topCities: { city: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  demandByType: { type: string; demand: number }[];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.css'
})
export class AnalyticsComponent implements OnInit {
  analytics = signal<AnalyticsDisplay>({
    totalBillboards: 0,
    totalOwners: 0,
    totalAdvertisers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    activeBookings: 0,
    topCities: [],
    monthlyRevenue: [],
    demandByType: []
  });

  loading = signal(false);
  error = signal<string | null>(null);

  performanceData = signal<{ label: string; value: string; change: string; isPositive: boolean }[]>([]);

  topAdvertisers = signal<{ name: string; bookings: number; spent: number }[]>([]);

  // Financial metrics from platform stats
  platformFinancials = signal<{
    totalRevenue: number;
    totalCommission: number;
    totalGst: number;
  }>({
    totalRevenue: 0,
    totalCommission: 0,
    totalGst: 0
  });

  // For chart scaling
  maxRevenue = signal(100000);

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    // Fetch all data in parallel from real backend APIs
    forkJoin({
      stats: this.adminService.getDashboardStats(),
      revenueChart: this.adminService.getRevenueChart(),
      topCities: this.adminService.getTopCities(),
      billboardTypes: this.adminService.getBillboardTypes(),
      topAdvertisers: this.adminService.getTopAdvertisers(),
      platformStats: this.adminService.getPlatformStats()
    }).subscribe({
      next: ({ stats, revenueChart, topCities, billboardTypes, topAdvertisers, platformStats }) => {
        console.log('[Analytics] Data loaded from backend:', {
          stats, revenueChart, topCities, billboardTypes, topAdvertisers, platformStats
        });

        // Map revenue chart data
        const monthlyRevenue = revenueChart.map(point => ({
          month: point.label,
          revenue: point.value
        }));

        // Calculate max revenue for chart scaling
        const maxRev = Math.max(...monthlyRevenue.map(m => m.revenue), 100000);
        this.maxRevenue.set(maxRev);

        // Map billboard types to demand format
        const demandByType = billboardTypes.map(bt => ({
          type: this.formatTypeName(bt.type),
          demand: bt.demand
        }));

        // Map dashboard stats to analytics display
        this.analytics.set({
          totalBillboards: stats.totalBillboards,
          totalOwners: stats.totalOwners,
          totalAdvertisers: stats.totalAdvertisers,
          totalBookings: stats.totalBookings,
          totalRevenue: stats.totalRevenue,
          pendingApprovals: stats.pendingBookings + stats.totalPendingKyc,
          activeBookings: stats.approvedBookings,
          topCities: topCities,
          monthlyRevenue: monthlyRevenue,
          demandByType: demandByType
        });

        // Update performance data with real stats
        this.performanceData.set([
          {
            label: 'Total Bookings',
            value: this.formatNumber(stats.totalBookings),
            change: stats.pendingBookings > 0 ? `+${stats.pendingBookings} pending` : 'No pending',
            isPositive: true
          },
          {
            label: 'Total Revenue',
            value: this.formatCompact(stats.totalRevenue),
            change: `${this.formatCompact(platformStats.totalCommission)} commission`,
            isPositive: true
          },
          {
            label: 'Approval Rate',
            value: this.calculateApprovalRate(stats) + '%',
            change: stats.rejectedBookings > 0 ? `${stats.rejectedBookings} rejected` : 'No rejections',
            isPositive: stats.approvedBookings > stats.rejectedBookings
          },
          {
            label: 'Active Rate',
            value: this.calculateActiveRate(stats) + '%',
            change: stats.cancelledBookings > 0 ? `${stats.cancelledBookings} cancelled` : 'No cancellations',
            isPositive: stats.cancelledBookings < stats.approvedBookings
          }
        ]);

        // Set top advertisers from real API
        this.topAdvertisers.set(topAdvertisers.map(a => ({
          name: a.name,
          bookings: a.bookings,
          spent: a.spent
        })));

        // Set platform financial metrics
        this.platformFinancials.set({
          totalRevenue: platformStats.totalRevenue || 0,
          totalCommission: platformStats.totalCommission || 0,
          totalGst: platformStats.totalGst || 0
        });

        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.error.set('Failed to load analytics. Please try again.');
        this.loading.set(false);

        // Set default performance data on error
        this.performanceData.set([
          { label: 'Total Bookings', value: '0', change: 'N/A', isPositive: true },
          { label: 'Total Revenue', value: '₹0', change: 'N/A', isPositive: true },
          { label: 'Approval Rate', value: '0%', change: 'N/A', isPositive: true },
          { label: 'Active Rate', value: '0%', change: 'N/A', isPositive: true }
        ]);
      }
    });
  }

  private formatTypeName(type: string): string {
    // Convert backend type names to display format
    const typeMap: Record<string, string> = {
      'DIGITAL': 'Digital',
      'STATIC': 'Hoarding',
      'LED': 'LED',
      'NEON': 'Neon',
      'Digital': 'Digital',
      'Static': 'Hoarding',
      'Hoarding': 'Hoarding',
      'Unipole': 'Unipole',
      'Poster': 'Poster'
    };
    return typeMap[type] || type;
  }

  private calculateApprovalRate(stats: DashboardStats): number {
    const total = stats.approvedBookings + stats.rejectedBookings;
    if (total === 0) return 0;
    return Math.round((stats.approvedBookings / total) * 100);
  }

  private calculateActiveRate(stats: DashboardStats): number {
    if (stats.totalBookings === 0) return 0;
    return Math.round((stats.approvedBookings / stats.totalBookings) * 100);
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('en-IN').format(num);
  }

  private formatCompact(num: number): string {
    if (num >= 10000000) {
      return '₹' + (num / 10000000).toFixed(1) + 'Cr';
    } else if (num >= 100000) {
      return '₹' + (num / 100000).toFixed(1) + 'L';
    } else if (num >= 1000) {
      return '₹' + (num / 1000).toFixed(1) + 'K';
    }
    return '₹' + Math.round(num);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Calculate bar height percentage for revenue chart
  getBarHeight(revenue: number): number {
    const max = this.maxRevenue();
    if (max === 0) return 0;
    return Math.min((revenue / max) * 100, 100);
  }

  // Get max count from top cities for progress bar scaling
  getMaxCityCount(): number {
    const cities = this.analytics().topCities;
    if (cities.length === 0) return 100;
    return Math.max(...cities.map(c => c.count), 1);
  }

  // Calculate city progress bar width
  getCityProgress(count: number): number {
    const max = this.getMaxCityCount();
    return (count / max) * 100;
  }
}
