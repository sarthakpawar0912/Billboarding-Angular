import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PayoutRequest } from '../../../services/admin.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

@Component({
  selector: 'app-admin-payouts',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzSpinModule,
    NzEmptyModule,
    NzIconModule,
    NzModalModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzStatisticModule
  ],
  templateUrl: './payouts.component.html',
  styleUrl: './payouts.component.css'
})
export class AdminPayoutsComponent implements OnInit {
  payouts = signal<PayoutRequest[]>([]);
  loading = signal(true);
  processingId = signal<number | null>(null);

  // Modal states
  approveModalVisible = signal(false);
  rejectModalVisible = signal(false);
  selectedPayout = signal<PayoutRequest | null>(null);
  fundAccountId = '';
  rejectReason = '';

  // Filter
  statusFilter = signal<string>('ALL');

  constructor(
    private adminService: AdminService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadPayouts();
  }

  loadPayouts(): void {
    this.loading.set(true);
    this.adminService.getAllPayouts().subscribe({
      next: (payouts) => {
        this.payouts.set(payouts);
        this.loading.set(false);
      },
      error: (err) => {
        this.message.error('Failed to load payouts');
        this.loading.set(false);
        console.error('Payouts load error:', err);
      }
    });
  }

  get filteredPayouts(): PayoutRequest[] {
    const filter = this.statusFilter();
    if (filter === 'ALL') {
      return this.payouts();
    }
    return this.payouts().filter(p => p.status === filter);
  }

  get pendingCount(): number {
    return this.payouts().filter(p => p.status === 'REQUESTED').length;
  }

  get totalPending(): number {
    return this.payouts()
      .filter(p => p.status === 'REQUESTED')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  get totalPaid(): number {
    return this.payouts()
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
  }

  openApproveModal(payout: PayoutRequest): void {
    this.selectedPayout.set(payout);
    this.fundAccountId = 'fa_test_' + Math.random().toString(36).substring(7);
    this.approveModalVisible.set(true);
  }

  openRejectModal(payout: PayoutRequest): void {
    this.selectedPayout.set(payout);
    this.rejectReason = '';
    this.rejectModalVisible.set(true);
  }

  approvePayout(): void {
    const payout = this.selectedPayout();
    if (!payout || !this.fundAccountId) return;

    this.processingId.set(payout.id);
    this.adminService.approvePayout(payout.id, this.fundAccountId).subscribe({
      next: (updated) => {
        this.message.success('Payout approved and processed successfully');
        this.loadPayouts();
        this.approveModalVisible.set(false);
        this.processingId.set(null);
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to approve payout');
        this.processingId.set(null);
        console.error('Approve payout error:', err);
      }
    });
  }

  rejectPayout(): void {
    const payout = this.selectedPayout();
    if (!payout) return;

    this.processingId.set(payout.id);
    this.adminService.rejectPayout(payout.id, this.rejectReason).subscribe({
      next: (updated) => {
        this.message.success('Payout request rejected');
        this.loadPayouts();
        this.rejectModalVisible.set(false);
        this.processingId.set(null);
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to reject payout');
        this.processingId.set(null);
        console.error('Reject payout error:', err);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      'REQUESTED': 'orange',
      'APPROVED': 'blue',
      'PAID': 'green',
      'FAILED': 'red',
      'REJECTED': 'red'
    };
    return colors[status] || 'default';
  }
}
