import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OwnerService, OwnerCalendarDay } from '../../../services/owner.service';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'PENDING' | 'LOADING' | 'UNKNOWN';
  revenue: number;
}

interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: 'app-owner-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './owner-calendar.component.html',
  styleUrl: './owner-calendar.component.css'
})
export class OwnerCalendarComponent implements OnInit, OnChanges {
  @Input() billboardId!: number;
  @Output() monthChanged = new EventEmitter<{ month: number; year: number }>();

  // Calendar state
  currentMonth = signal(new Date());
  weeks = signal<CalendarWeek[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Availability data cache (status + revenue)
  private calendarMap = new Map<string, { status: 'AVAILABLE' | 'BOOKED' | 'PENDING'; revenue: number }>();

  // Stats for current month
  monthStats = signal({ totalRevenue: 0, bookedDays: 0, pendingDays: 0, availableDays: 0 });

  // Day names
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private ownerService: OwnerService) {}

  ngOnInit(): void {
    this.generateCalendar();
    this.loadCalendarData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['billboardId'] && !changes['billboardId'].firstChange) {
      this.calendarMap.clear();
      this.loadCalendarData();
    }
  }

  generateCalendar(): void {
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);

    // Start from the Sunday before the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on the Saturday after the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const weeks: CalendarWeek[] = [];
    let currentDate = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const week: CalendarWeek = { days: [] };

      for (let i = 0; i < 7; i++) {
        const dateStr = this.formatDate(currentDate);
        const dayData = this.calendarMap.get(dateStr);
        const status = dayData?.status || 'UNKNOWN';
        const revenue = dayData?.revenue || 0;
        const isPast = currentDate < today;

        week.days.push({
          date: new Date(currentDate),
          dayOfMonth: currentDate.getDate(),
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.getTime() === today.getTime(),
          isPast,
          status: status,
          revenue
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push(week);
    }

    this.weeks.set(weeks);
    this.calculateMonthStats();
  }

  loadCalendarData(): void {
    if (!this.billboardId) return;

    this.loading.set(true);
    this.error.set(null);

    // Load 3 months of data (current month + 2 months ahead)
    const current = this.currentMonth();
    const fromDate = new Date(current.getFullYear(), current.getMonth(), 1);
    const toDate = new Date(current.getFullYear(), current.getMonth() + 3, 0);

    this.ownerService.getBillboardCalendar(
      this.billboardId,
      this.formatDate(fromDate),
      this.formatDate(toDate)
    ).subscribe({
      next: (calendarData) => {
        // Store in cache with status and revenue
        calendarData.forEach(day => {
          this.calendarMap.set(day.date, {
            status: day.status,
            revenue: day.revenue || 0
          });
        });
        this.loading.set(false);
        this.generateCalendar(); // Regenerate with calendar data
      },
      error: (err) => {
        console.error('Error loading calendar:', err);
        this.loading.set(false);
        this.error.set('Failed to load calendar data');
      }
    });
  }

  private calculateMonthStats(): void {
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();

    let totalRevenue = 0;
    let bookedDays = 0;
    let pendingDays = 0;
    let availableDays = 0;

    this.calendarMap.forEach((value, dateStr) => {
      const date = new Date(dateStr);
      if (date.getFullYear() === year && date.getMonth() === month) {
        totalRevenue += value.revenue;
        if (value.status === 'BOOKED') bookedDays++;
        else if (value.status === 'PENDING') pendingDays++;
        else if (value.status === 'AVAILABLE') availableDays++;
      }
    });

    this.monthStats.set({ totalRevenue, bookedDays, pendingDays, availableDays });
  }

  // Navigation
  previousMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.generateCalendar();
    this.loadCalendarData();
    this.emitMonthChange();
  }

  nextMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.generateCalendar();
    this.loadCalendarData();
    this.emitMonthChange();
  }

  goToToday(): void {
    this.currentMonth.set(new Date());
    this.generateCalendar();
    this.loadCalendarData();
    this.emitMonthChange();
  }

  private emitMonthChange(): void {
    const current = this.currentMonth();
    this.monthChanged.emit({ month: current.getMonth() + 1, year: current.getFullYear() });
  }

  // Formatting
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMonthYearDisplay(): string {
    const current = this.currentMonth();
    return current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  // CSS class helpers
  getDayClasses(day: CalendarDay): string {
    const classes = ['calendar-day'];

    if (!day.isCurrentMonth) classes.push('other-month');
    if (day.isToday) classes.push('today');
    if (day.isPast) classes.push('past');

    // Status classes
    switch (day.status) {
      case 'AVAILABLE':
        classes.push('status-available');
        break;
      case 'BOOKED':
        classes.push('status-booked');
        break;
      case 'PENDING':
        classes.push('status-pending');
        break;
    }

    return classes.join(' ');
  }

  // Get tooltip for a day
  getTooltip(day: CalendarDay): string {
    if (day.isPast && day.revenue > 0) {
      return `Earned: ${this.formatCurrency(day.revenue)}`;
    }
    const revenueStr = day.revenue > 0 ? ` - Earned: ${this.formatCurrency(day.revenue)}` : '';
    switch (day.status) {
      case 'AVAILABLE':
        return 'Available for booking';
      case 'BOOKED':
        return `Booked${revenueStr}`;
      case 'PENDING':
        return 'Pending approval';
      default:
        return '';
    }
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  }

  // Get revenue for a day (for display)
  getDayRevenue(day: CalendarDay): string {
    if (day.revenue <= 0) return '';
    // Show abbreviated revenue (e.g., 8K, 9.6K)
    if (day.revenue >= 1000) {
      const k = day.revenue / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return `${day.revenue}`;
  }
}
