import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// ECharts
import { NgxEchartsDirective } from 'ngx-echarts';
import { EChartsOption } from 'echarts';

import { CampaignService } from '../../../services/campaign.service';
import {
  Campaign,
  CampaignAnalytics,
  DailyAnalytics
} from '../../../models/campaign.model';

@Component({
  selector: 'app-campaign-analytics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgxEchartsDirective
  ],
  templateUrl: './campaign-analytics.component.html',
  styleUrl: './campaign-analytics.component.css'
})
export class CampaignAnalyticsComponent implements OnInit {
  // State
  campaignId: number | null = null;
  campaign = signal<Campaign | null>(null);
  analytics = signal<CampaignAnalytics | null>(null);
  dailyAnalytics = signal<DailyAnalytics[]>([]);

  isLoading = signal(false);
  errorMessage = signal('');

  // Chart options
  chartOption: EChartsOption = {};
  chartType: 'bar' | 'line' = 'bar';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private campaignService: CampaignService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.campaignId = parseInt(idParam, 10);
      this.loadData();
    } else {
      this.router.navigate(['/advertiser/campaigns']);
    }
  }

  loadData(): void {
    if (!this.campaignId) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    // Load analytics directly (which includes campaign info)
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    if (!this.campaignId) return;

    // Load campaign analytics summary - this endpoint returns campaign info
    this.campaignService.getCampaignAnalytics(this.campaignId).subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);

        // Create a campaign object from analytics data for display
        const campaignFromAnalytics: Campaign = {
          id: analytics.campaignId,
          name: analytics.campaignName,
          status: analytics.status,
          budget: analytics.budget,
          spent: analytics.spent,
          startDate: analytics.startDate,
          endDate: analytics.endDate,
          cities: [],
          impressions: analytics.impressions,
          billboards: 0,
          createdAt: '',
          advertiser: { id: 0, name: '', email: '' }
        };
        this.campaign.set(campaignFromAnalytics);

        this.loadDailyAnalytics();
      },
      error: (err) => {
        console.error('Error loading analytics:', err);
        this.errorMessage.set(err.message || 'Failed to load analytics');
        // Still try to load daily analytics
        this.loadDailyAnalytics();
      }
    });
  }

  loadDailyAnalytics(): void {
    if (!this.campaignId) return;

    this.campaignService.getDailyAnalytics(this.campaignId).subscribe({
      next: (dailyData) => {
        this.dailyAnalytics.set(dailyData);
        this.updateChart();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading daily analytics:', err);
        this.isLoading.set(false);
      }
    });
  }

  updateChart(): void {
    const data = this.dailyAnalytics();
    if (data.length === 0) return;

    const dates = data.map(d => this.formatDateShort(d.date));
    const spendData = data.map(d => d.spend);
    const impressionsData = data.map(d => d.impressions);

    const isLine = this.chartType === 'line';

    // Build series based on chart type
    const spendSeries: any = {
      name: 'Spend',
      type: this.chartType,
      data: spendData,
      itemStyle: {
        color: '#14b8a6'
      }
    };

    const impressionsSeries: any = {
      name: 'Impressions',
      type: this.chartType,
      yAxisIndex: 1,
      data: impressionsData,
      itemStyle: {
        color: '#3b82f6'
      }
    };

    if (isLine) {
      // Line chart specific settings
      spendSeries.smooth = true;
      spendSeries.symbol = 'circle';
      spendSeries.symbolSize = 8;
      spendSeries.lineStyle = {
        width: 3,
        color: '#14b8a6'
      };
      spendSeries.areaStyle = {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(20, 184, 166, 0.4)' },
            { offset: 1, color: 'rgba(20, 184, 166, 0.05)' }
          ]
        }
      };

      impressionsSeries.smooth = true;
      impressionsSeries.symbol = 'circle';
      impressionsSeries.symbolSize = 8;
      impressionsSeries.lineStyle = {
        width: 3,
        color: '#3b82f6'
      };
      impressionsSeries.areaStyle = {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
          ]
        }
      };
    } else {
      // Bar chart specific settings
      spendSeries.barWidth = '35%';
      spendSeries.itemStyle = {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#14b8a6' },
            { offset: 1, color: '#0d9488' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      };

      impressionsSeries.barWidth = '35%';
      impressionsSeries.itemStyle = {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#2563eb' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      };
    }

    this.chartOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: isLine ? 'cross' : 'shadow',
          crossStyle: {
            color: '#999'
          }
        },
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: {
          color: '#1e293b'
        },
        formatter: (params: any) => {
          if (!params || !params.length) return '';
          const date = params[0]?.axisValue || '';
          let html = `<strong style="color:#1e293b">${date}</strong><br/>`;
          params.forEach((param: any) => {
            if (param && param.value !== undefined && param.value !== null) {
              const value = param.seriesName === 'Spend'
                ? `₹${Number(param.value).toLocaleString('en-IN')}`
                : Number(param.value).toLocaleString('en-IN');
              html += `${param.marker || ''} ${param.seriesName || ''}: <strong>${value}</strong><br/>`;
            }
          });
          return html;
        }
      },
      legend: {
        data: ['Spend', 'Impressions'],
        bottom: 0,
        textStyle: {
          color: '#64748b'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '12%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: dates,
        boundaryGap: !isLine,
        axisLabel: {
          rotate: dates.length > 7 ? 45 : 0,
          color: '#64748b',
          fontSize: 12
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: '#e2e8f0',
            width: 1
          }
        },
        axisTick: {
          show: true,
          lineStyle: {
            color: '#e2e8f0'
          }
        }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Spend (INR)',
          position: 'left',
          nameTextStyle: {
            color: '#64748b',
            fontSize: 12,
            padding: [0, 0, 0, 50]
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 11,
            formatter: (value: number) => {
              if (value >= 1000) {
                return `₹${(value / 1000).toFixed(0)}K`;
              }
              return `₹${value}`;
            }
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#14b8a6',
              width: 2
            }
          },
          splitLine: {
            show: true,
            lineStyle: {
              color: '#f1f5f9',
              type: 'dashed'
            }
          }
        },
        {
          type: 'value',
          name: 'Impressions',
          position: 'right',
          nameTextStyle: {
            color: '#64748b',
            fontSize: 12,
            padding: [0, 50, 0, 0]
          },
          axisLabel: {
            color: '#64748b',
            fontSize: 11,
            formatter: (value: number) => {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
              }
              return value.toString();
            }
          },
          axisLine: {
            show: true,
            lineStyle: {
              color: '#3b82f6',
              width: 2
            }
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [spendSeries, impressionsSeries]
    };
  }

  onChartTypeChange(type: 'bar' | 'line'): void {
    this.chartType = type;
    this.updateChart();
  }

  goBack(): void {
    this.router.navigate(['/advertiser/campaigns']);
  }

  clearError(): void {
    this.errorMessage.set('');
  }

  // Helper methods
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'ACTIVE': '🟢',
      'PAUSED': '⏸️',
      'SCHEDULED': '📅',
      'COMPLETED': '✅',
      'CANCELLED': '❌'
    };
    return icons[status] || '⚪';
  }

  formatCurrency(amount: number): string {
    return this.campaignService.formatCurrency(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatDateShort(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString('en-IN');
  }

  getBudgetUtilization(): number {
    const a = this.analytics();
    if (!a || a.budget <= 0) return 0;
    return Math.min(Math.round((a.spent / a.budget) * 100), 100);
  }

  getProgressBarClass(): string {
    const util = this.getBudgetUtilization();
    if (util >= 100) return 'danger';
    if (util >= 80) return 'warning';
    return '';
  }

  getCitiesString(cities: string[]): string {
    if (!cities || cities.length === 0) return 'All Cities';
    if (cities.length <= 3) return cities.join(', ');
    return `${cities.slice(0, 3).join(', ')} +${cities.length - 3}`;
  }

  getDaysDiff(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
}
