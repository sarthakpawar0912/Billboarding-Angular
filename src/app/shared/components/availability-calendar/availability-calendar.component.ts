import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdvertiserService, DayAvailability } from '../../../services/advertiser.service';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  status: 'AVAILABLE' | 'BOOKED' | 'PENDING' | 'LOADING' | 'UNKNOWN';
  price: number;
  isSelected: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
}

interface CalendarWeek {
  days: CalendarDay[];
}

@Component({
  selector: 'app-availability-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './availability-calendar.component.html',
  styleUrl: './availability-calendar.component.css'
})
export class AvailabilityCalendarComponent implements OnInit, OnChanges {
  @Input() billboardId!: number;
  @Input() startDate: string = '';
  @Input() endDate: string = '';

  @Output() dateSelected = new EventEmitter<{ startDate: string; endDate: string; totalPrice: number; days: number }>();
  @Output() availabilityLoaded = new EventEmitter<DayAvailability[]>();

  // Calendar state
  currentMonth = signal(new Date());
  weeks = signal<CalendarWeek[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  // Availability data cache (status + price)
  private availabilityMap = new Map<string, { status: 'AVAILABLE' | 'BOOKED' | 'PENDING'; price: number }>();

  // Selection state
  selectionStart = signal<Date | null>(null);
  selectionEnd = signal<Date | null>(null);
  isSelectingRange = signal(false);

  // Day names
  dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private advertiserService: AdvertiserService) {}

  ngOnInit(): void {
    this.initializeFromInputs();
    this.generateCalendar();
    this.loadAvailability();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['billboardId'] && !changes['billboardId'].firstChange) {
      this.availabilityMap.clear();
      this.loadAvailability();
    }
    if (changes['startDate'] || changes['endDate']) {
      this.initializeFromInputs();
      this.generateCalendar();
    }
  }

  private initializeFromInputs(): void {
    if (this.startDate) {
      this.selectionStart.set(new Date(this.startDate));
    }
    if (this.endDate) {
      this.selectionEnd.set(new Date(this.endDate));
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
        const dayData = this.availabilityMap.get(dateStr);
        const status = dayData?.status || 'UNKNOWN';
        const price = dayData?.price || 0;
        const isPast = currentDate < today;

        week.days.push({
          date: new Date(currentDate),
          dayOfMonth: currentDate.getDate(),
          isCurrentMonth: currentDate.getMonth() === month,
          isToday: currentDate.getTime() === today.getTime(),
          isPast,
          status: isPast ? 'UNKNOWN' : status,
          price,
          isSelected: this.isDateSelected(currentDate),
          isInRange: this.isDateInRange(currentDate),
          isRangeStart: this.isRangeStart(currentDate),
          isRangeEnd: this.isRangeEnd(currentDate)
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      weeks.push(week);
    }

    this.weeks.set(weeks);
  }

  loadAvailability(): void {
    if (!this.billboardId) return;

    this.loading.set(true);
    this.error.set(null);

    // Load 3 months of data (current month + 2 months ahead)
    const current = this.currentMonth();
    const fromDate = new Date(current.getFullYear(), current.getMonth(), 1);
    const toDate = new Date(current.getFullYear(), current.getMonth() + 3, 0);

    this.advertiserService.getAvailabilityCalendar(
      this.billboardId,
      this.formatDate(fromDate),
      this.formatDate(toDate)
    ).subscribe({
      next: (availability) => {
        // Store in cache with status and price
        availability.forEach(day => {
          this.availabilityMap.set(day.date, {
            status: day.status,
            price: day.price || 0
          });
        });
        this.loading.set(false);
        this.generateCalendar(); // Regenerate with availability data
        this.availabilityLoaded.emit(availability);
      },
      error: (err) => {
        console.error('Error loading availability:', err);
        this.loading.set(false);
        this.error.set('Failed to load availability');
      }
    });
  }

  // Navigation
  previousMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.generateCalendar();
    this.loadAvailability();
  }

  nextMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.generateCalendar();
    this.loadAvailability();
  }

  goToToday(): void {
    this.currentMonth.set(new Date());
    this.generateCalendar();
    this.loadAvailability();
  }

  // Date selection
  onDayClick(day: CalendarDay): void {
    if (day.isPast || day.status === 'BOOKED') {
      return; // Can't select past dates or booked dates
    }

    const clickedDate = day.date;

    if (!this.selectionStart() || (this.selectionStart() && this.selectionEnd())) {
      // Start a new selection
      this.selectionStart.set(clickedDate);
      this.selectionEnd.set(null);
      this.isSelectingRange.set(true);
    } else {
      // Complete the selection
      const start = this.selectionStart()!;

      if (clickedDate < start) {
        // Clicked before start, swap
        this.selectionEnd.set(start);
        this.selectionStart.set(clickedDate);
      } else {
        this.selectionEnd.set(clickedDate);
      }

      this.isSelectingRange.set(false);

      // Check if range contains any booked dates
      if (this.rangeContainsBookedDates()) {
        this.error.set('Selected range contains booked dates');
        setTimeout(() => this.error.set(null), 3000);
        this.selectionStart.set(null);
        this.selectionEnd.set(null);
        this.generateCalendar();
        return;
      }

      // Emit the selection
      this.emitSelection();
    }

    this.generateCalendar();
  }

  private rangeContainsBookedDates(): boolean {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return false;

    const current = new Date(start);
    while (current <= end) {
      const dateStr = this.formatDate(current);
      const dayData = this.availabilityMap.get(dateStr);
      if (dayData?.status === 'BOOKED') {
        return true;
      }
      current.setDate(current.getDate() + 1);
    }
    return false;
  }

  // Calculate total price for selected range
  private calculateRangeTotal(): { totalPrice: number; days: number } {
    const start = this.selectionStart();
    const end = this.selectionEnd();
    if (!start || !end) return { totalPrice: 0, days: 0 };

    let totalPrice = 0;
    let days = 0;
    const current = new Date(start);

    while (current <= end) {
      const dateStr = this.formatDate(current);
      const dayData = this.availabilityMap.get(dateStr);
      if (dayData?.price) {
        totalPrice += dayData.price;
      }
      days++;
      current.setDate(current.getDate() + 1);
    }

    return { totalPrice, days };
  }

  private emitSelection(): void {
    const start = this.selectionStart();
    const end = this.selectionEnd();

    if (start && end) {
      const { totalPrice, days } = this.calculateRangeTotal();
      this.dateSelected.emit({
        startDate: this.formatDate(start),
        endDate: this.formatDate(end),
        totalPrice,
        days
      });
    }
  }

  // Selection helpers
  private isDateSelected(date: Date): boolean {
    const start = this.selectionStart();
    const end = this.selectionEnd();

    if (start && this.isSameDay(date, start)) return true;
    if (end && this.isSameDay(date, end)) return true;

    return false;
  }

  private isDateInRange(date: Date): boolean {
    const start = this.selectionStart();
    const end = this.selectionEnd();

    if (!start || !end) return false;

    return date > start && date < end;
  }

  private isRangeStart(date: Date): boolean {
    const start = this.selectionStart();
    return start ? this.isSameDay(date, start) : false;
  }

  private isRangeEnd(date: Date): boolean {
    const end = this.selectionEnd();
    return end ? this.isSameDay(date, end) : false;
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
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
    if (day.isSelected) classes.push('selected');
    if (day.isInRange) classes.push('in-range');
    if (day.isRangeStart) classes.push('range-start');
    if (day.isRangeEnd) classes.push('range-end');

    // Status classes
    if (!day.isPast) {
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
        case 'LOADING':
          classes.push('status-loading');
          break;
      }
    }

    return classes.join(' ');
  }

  // Clear selection
  clearSelection(): void {
    this.selectionStart.set(null);
    this.selectionEnd.set(null);
    this.isSelectingRange.set(false);
    this.generateCalendar();
  }

  // Get tooltip for a day
  getTooltip(day: CalendarDay): string {
    if (day.isPast) return 'Past date';
    const priceStr = day.price > 0 ? ` - ${this.formatCurrency(day.price)}` : '';
    switch (day.status) {
      case 'AVAILABLE':
        return `Available${priceStr}`;
      case 'BOOKED':
        return 'Already booked (Approved)';
      case 'PENDING':
        return `Pending approval${priceStr}`;
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

  // Get price for a day (for display)
  getDayPrice(day: CalendarDay): string {
    if (day.isPast || day.price <= 0) return '';
    // Show abbreviated price (e.g., 8K, 9.6K)
    if (day.price >= 1000) {
      const k = day.price / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return `${day.price}`;
  }
}
