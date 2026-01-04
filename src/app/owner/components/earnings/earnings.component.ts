import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { OwnerService, OwnerAnalytics, BillboardRevenue, MonthlyRevenueItem } from '../../../services/owner.service';

@Component({
  selector: 'app-owner-earnings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './earnings.component.html',
  styleUrl: './earnings.component.css'
})
export class OwnerEarningsComponent implements OnInit {
  // State signals
  analytics = signal<OwnerAnalytics | null>(null);
  monthlyRevenueData = signal<MonthlyRevenueItem[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Export states
  exportingCSV = signal(false);
  exportingPDF = signal(false);
  showExportMenu = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // View mode
  selectedPeriod = signal<'all' | '6months' | 'year'>('all');
  chartView = signal<'bar' | 'line'>('bar');

  // Computed values
  totalRevenue = computed(() => this.analytics()?.totalRevenue || 0);

  billboardRevenues = computed(() => {
    const revenues = this.analytics()?.billboardRevenues || [];
    return revenues.sort((a, b) => b.revenue - a.revenue);
  });

  topPerformer = computed(() => this.analytics()?.topPerformingBillboard);

  monthlyData = computed(() => {
    // Prefer data from dedicated monthly revenue API
    const monthlyItems = this.monthlyRevenueData();
    if (monthlyItems.length > 0) {
      return monthlyItems
        .map(item => ({
          month: this.formatMonthLabel(item.month),
          fullMonth: item.month,
          revenue: item.revenue
        }))
        .sort((a, b) => a.fullMonth.localeCompare(b.fullMonth));
    }

    // Fallback to analytics monthlyRevenues
    const monthlyRevenues = this.analytics()?.monthlyRevenues || {};
    return Object.entries(monthlyRevenues)
      .map(([month, revenue]) => ({
        month: this.formatMonthLabel(month),
        fullMonth: month,
        revenue
      }))
      .sort((a, b) => a.fullMonth.localeCompare(b.fullMonth));
  });

  maxMonthlyRevenue = computed(() => {
    const data = this.monthlyData();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.revenue), 1);
  });

  totalBookings = computed(() => {
    const revenues = this.analytics()?.billboardRevenues || [];
    return revenues.reduce((sum, b) => sum + b.totalBookings, 0);
  });

  activeBillboards = computed(() => {
    const revenues = this.analytics()?.billboardRevenues || [];
    return revenues.filter(b => b.totalBookings > 0).length;
  });

  averageRevenue = computed(() => {
    const revenues = this.analytics()?.billboardRevenues || [];
    const activeBillboards = revenues.filter(b => b.revenue > 0);
    if (activeBillboards.length === 0) return 0;
    return this.totalRevenue() / activeBillboards.length;
  });

  // Performance metrics
  revenueGrowth = computed(() => {
    const data = this.monthlyData();
    if (data.length < 2) return 0;
    const current = data[data.length - 1]?.revenue || 0;
    const previous = data[data.length - 2]?.revenue || 1;
    return ((current - previous) / previous) * 100;
  });

  constructor(private ownerService: OwnerService) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    // Fetch both analytics and monthly revenue data in parallel
    forkJoin({
      analytics: this.ownerService.getAnalytics(),
      monthlyRevenue: this.ownerService.getMonthlyRevenue()
    }).subscribe({
      next: ({ analytics, monthlyRevenue }) => {
        this.analytics.set(analytics);
        this.monthlyRevenueData.set(monthlyRevenue);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        // Try to load analytics alone if monthly revenue fails
        this.loadAnalyticsOnly();
      }
    });
  }

  // Fallback: load analytics only if monthly revenue API fails
  private loadAnalyticsOnly(): void {
    this.ownerService.getAnalytics().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.error.set('Failed to load analytics data. Please try again.');
        this.loading.set(false);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatCompactCurrency(amount: number): string {
    if (amount >= 100000) {
      return '₹' + (amount / 100000).toFixed(1) + 'L';
    } else if (amount >= 1000) {
      return '₹' + (amount / 1000).toFixed(1) + 'K';
    }
    return this.formatCurrency(amount);
  }

  formatMonthLabel(monthStr: string): string {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }

  getBarHeight(revenue: number): number {
    const max = this.maxMonthlyRevenue();
    return (revenue / max) * 100;
  }

  getRevenuePercentage(revenue: number): number {
    const total = this.totalRevenue();
    if (total === 0) return 0;
    return (revenue / total) * 100;
  }

  getBillboardInitial(title: string | null): string {
    if (!title) return 'B';
    return title.charAt(0).toUpperCase();
  }

  getPerformanceColor(percentage: number): string {
    if (percentage >= 30) return '#22c55e';
    if (percentage >= 15) return '#3b82f6';
    if (percentage >= 5) return '#f59e0b';
    return '#94a3b8';
  }

  getGrowthClass(): string {
    const growth = this.revenueGrowth();
    if (growth > 0) return 'positive';
    if (growth < 0) return 'negative';
    return 'neutral';
  }

  setPeriod(period: 'all' | '6months' | 'year'): void {
    this.selectedPeriod.set(period);
  }

  setChartView(view: 'bar' | 'line'): void {
    this.chartView.set(view);
  }

  getSegmentRotation(index: number): number {
    const billboards = this.billboardRevenues().slice(0, 5);
    let rotation = 0;
    for (let i = 0; i < index; i++) {
      rotation += (this.getRevenuePercentage(billboards[i].revenue) / 100) * 360;
    }
    return rotation;
  }

  getOthersPercentage(): number {
    const topFive = this.billboardRevenues().slice(0, 5);
    const topFiveTotal = topFive.reduce((sum, b) => sum + b.revenue, 0);
    const total = this.totalRevenue();
    if (total === 0) return 0;
    return ((total - topFiveTotal) / total) * 100;
  }

  // Toggle export menu
  toggleExportMenu(): void {
    this.showExportMenu.update(v => !v);
  }

  closeExportMenu(): void {
    this.showExportMenu.set(false);
  }

  // Export to CSV
  exportCSV(): void {
    this.exportingCSV.set(true);
    this.showExportMenu.set(false);

    this.ownerService.exportRevenueCSV().subscribe({
      next: (blob) => {
        if (blob.size > 0) {
          this.downloadFile(blob, 'earnings-report.csv', 'text/csv');
          this.successMessage.set('CSV report downloaded successfully!');
        } else {
          this.errorMessage.set('No data to export.');
        }
        this.exportingCSV.set(false);
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Error exporting CSV:', err);
        this.errorMessage.set('Failed to export CSV. Please try again.');
        this.exportingCSV.set(false);
        this.autoHideMessage();
      }
    });
  }

  // Export to PDF
  exportPDF(): void {
    this.exportingPDF.set(true);
    this.showExportMenu.set(false);

    this.ownerService.exportRevenuePDF().subscribe({
      next: (blob) => {
        if (blob.size > 0) {
          this.downloadFile(blob, 'earnings-report.pdf', 'application/pdf');
          this.successMessage.set('PDF report downloaded successfully!');
        } else {
          this.errorMessage.set('No data to export.');
        }
        this.exportingPDF.set(false);
        this.autoHideMessage();
      },
      error: (err) => {
        console.error('Error exporting PDF:', err);
        this.errorMessage.set('Failed to export PDF. Please try again.');
        this.exportingPDF.set(false);
        this.autoHideMessage();
      }
    });
  }

  // Helper to download file
  private downloadFile(blob: Blob, filename: string, mimeType: string): void {
    const file = new Blob([blob], { type: mimeType });
    const url = window.URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  // Auto-hide messages
  private autoHideMessage(): void {
    setTimeout(() => {
      this.successMessage.set(null);
      this.errorMessage.set(null);
    }, 5000);
  }
}
