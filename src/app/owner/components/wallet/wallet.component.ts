import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { OwnerService, OwnerWallet, OwnerPayoutRequest, WalletTransaction, OwnerBankAccount } from '../../../services/owner.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { WithdrawModalComponent, WithdrawRequest, BankDetails } from '../../../shared/components/withdraw-modal/withdraw-modal.component';

@Component({
  selector: 'app-owner-wallet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzTableModule,
    NzTagModule,
    NzButtonModule,
    NzStatisticModule,
    NzSpinModule,
    NzEmptyModule,
    NzIconModule,
    NzDividerModule,
    NzTabsModule,
    NzAlertModule,
    WithdrawModalComponent
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class OwnerWalletComponent implements OnInit {
  @ViewChild('withdrawModal') withdrawModal!: WithdrawModalComponent;

  wallet = signal<OwnerWallet | null>(null);
  transactions = signal<WalletTransaction[]>([]);
  payouts = signal<OwnerPayoutRequest[]>([]);
  bankAccount = signal<OwnerBankAccount | null>(null);
  loading = signal(true);
  bankAccountLoading = signal(true);

  // Payout modal state
  isPayoutModalVisible = false;

  constructor(
    private ownerService: OwnerService,
    private message: NzMessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadBankAccount();
  }

  loadData(): void {
    this.loading.set(true);

    this.ownerService.getWallet().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.loadTransactions();
        this.loadPayouts();
      },
      error: (err) => {
        this.message.error('Failed to load wallet');
        this.loading.set(false);
        console.error('Wallet load error:', err);
      }
    });
  }

  loadBankAccount(): void {
    this.bankAccountLoading.set(true);
    this.ownerService.getBankAccount().subscribe({
      next: (account) => {
        this.bankAccount.set(account);
        this.bankAccountLoading.set(false);
      },
      error: (err) => {
        // 204 No Content means no bank account exists
        if (err.status === 204 || err.status === 0) {
          this.bankAccount.set(null);
        }
        this.bankAccountLoading.set(false);
      }
    });
  }

  goToSettings(): void {
    this.router.navigate(['/owner/settings'], { queryParams: { tab: 'bank' } });
  }

  hasBankAccount(): boolean {
    return this.bankAccount() !== null && this.bankAccount()?.readyForPayout === true;
  }

  loadTransactions(): void {
    this.ownerService.getWalletTransactions().subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
      },
      error: (err) => {
        console.error('Transactions load error:', err);
      }
    });
  }

  loadPayouts(): void {
    this.ownerService.getMyPayouts().subscribe({
      next: (payouts) => {
        this.payouts.set(payouts);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Payouts load error:', err);
        this.loading.set(false);
      }
    });
  }

  // ==================== PAYOUT MODAL METHODS ====================

  openPayoutModal(): void {
    this.isPayoutModalVisible = true;
  }

  onPayoutModalVisibleChange(visible: boolean): void {
    this.isPayoutModalVisible = visible;
    if (!visible) {
      // Refresh data when modal closes (in case of successful payout)
      this.loadData();
    }
  }

  getMaxPayoutAmount(): number {
    return this.wallet()?.balance || 0;
  }

  getBankDetails(): BankDetails | null {
    const account = this.bankAccount();
    if (!account) return null;
    return {
      bankName: account.bankName,
      maskedAccountNumber: account.maskedAccountNumber,
      accountHolderName: account.accountHolderName
    };
  }

  async onWithdraw(request: WithdrawRequest): Promise<void> {
    if (!this.withdrawModal) return;

    this.withdrawModal.startProcessing();

    try {
      // Step 1: Verifying Account (1.5 seconds)
      await this.withdrawModal.processStep(0, 1500);

      // Step 2: Initiating Transfer (2 seconds)
      await this.withdrawModal.processStep(1, 2000);

      // Step 3: Bank Processing - This is where we call the API
      this.withdrawModal.markStepProcessing(2);

      // Make the actual API call
      const response = await this.ownerService.requestPayout(request.amount).toPromise();

      // Complete step 3
      this.withdrawModal.markStepFinished(2, 75);

      // Small delay before final step
      await this.delay(800);

      // Step 4: Transfer Complete
      await this.withdrawModal.processStep(3, 1000);

      // Show success
      this.withdrawModal.showSuccess({
        amount: request.amount,
        utr: response?.utrNumber || 'UTR' + Date.now(),
        bankName: response?.bankName || 'Bank',
        accountNumber: response?.accountNumber || 'XXXX',
        razorpayPayoutId: response?.razorpayPayoutId || '',
        transferMode: response?.transferMode || 'IMPS',
        time: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      });

    } catch (err: any) {
      this.withdrawModal.showFailed();
      console.error('Payout error:', err);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== UTILITY METHODS ====================

  formatCurrency(amount: number | undefined | null): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
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
      'PROCESSING': 'orange',
      'PAID': 'green',
      'FAILED': 'red'
    };
    return colors[status] || 'default';
  }

  getTransactionTypeColor(type: string): string {
    return type === 'CREDIT' ? 'green' : 'red';
  }

  getTransactionIcon(type: string): string {
    return type === 'CREDIT' ? 'plus-circle' : 'minus-circle';
  }
}
