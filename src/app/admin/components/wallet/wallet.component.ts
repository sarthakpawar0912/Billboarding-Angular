import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService, AdminWallet, AdminWalletTransaction, AdminBankAccount } from '../../../services/admin.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { WithdrawModalComponent, WithdrawRequest, BankDetails } from '../../../shared/components/withdraw-modal/withdraw-modal.component';

@Component({
  selector: 'app-admin-wallet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NzCardModule,
    NzTableModule,
    NzTagModule,
    NzStatisticModule,
    NzSpinModule,
    NzEmptyModule,
    NzIconModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzAlertModule,
    WithdrawModalComponent
  ],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.css'
})
export class AdminWalletComponent implements OnInit {
  @ViewChild('withdrawModal') withdrawModal!: WithdrawModalComponent;

  wallet = signal<AdminWallet | null>(null);
  transactions = signal<AdminWalletTransaction[]>([]);
  primaryBankAccount = signal<AdminBankAccount | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Withdrawal modal state
  isWithdrawModalVisible = false;

  // Check if bank account is configured
  hasBankAccount = signal(false);

  constructor(
    private adminService: AdminService,
    private message: NzMessageService
  ) {}

  ngOnInit(): void {
    this.loadWalletData();
  }

  loadWalletData(): void {
    this.loading.set(true);
    this.error.set(null);

    // Load wallet
    this.adminService.getAdminWallet().subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
        this.loadTransactions();
        this.loadBankAccountStatus();
      },
      error: (err) => {
        this.error.set('Failed to load wallet data');
        this.loading.set(false);
        console.error('Wallet load error:', err);
      }
    });
  }

  loadBankAccountStatus(): void {
    this.adminService.getPrimaryBankAccount().subscribe({
      next: (account) => {
        this.primaryBankAccount.set(account);
        this.hasBankAccount.set(true);
      },
      error: () => {
        this.primaryBankAccount.set(null);
        this.hasBankAccount.set(false);
      }
    });
  }

  loadTransactions(): void {
    this.adminService.getAdminWalletTransactions().subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Transactions load error:', err);
        this.loading.set(false);
      }
    });
  }

  // ==================== WITHDRAWAL METHODS ====================

  openWithdrawModal(): void {
    this.isWithdrawModalVisible = true;
  }

  onWithdrawModalVisibleChange(visible: boolean): void {
    this.isWithdrawModalVisible = visible;
    if (!visible) {
      // Refresh data when modal closes (in case of successful withdrawal)
      this.loadWalletData();
    }
  }

  getMaxWithdrawAmount(): number {
    return this.wallet()?.availableForWithdrawal || 0;
  }

  getBankDetails(): BankDetails | null {
    const account = this.primaryBankAccount();
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

      // Make the actual API call with default internal note
      const response = await this.adminService.withdrawCommission(request.amount, 'Admin commission withdrawal').toPromise();

      // Complete step 3
      this.withdrawModal.markStepFinished(2, 75);

      // Small delay before final step
      await this.delay(800);

      // Step 4: Transfer Complete
      await this.withdrawModal.processStep(3, 1000);

      // Show success
      this.withdrawModal.showSuccess({
        amount: request.amount,
        utr: response?.payout?.utrNumber || 'UTR' + Date.now(),
        bankName: this.primaryBankAccount()?.bankName || 'Bank',
        accountNumber: this.primaryBankAccount()?.maskedAccountNumber || 'XXXX',
        time: new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        transferMode: 'IMPS'
      });

    } catch (err: any) {
      this.withdrawModal.showFailed();
      console.error('Withdrawal error:', err);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== UTILITY METHODS ====================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
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

  getTransactionTypeColor(type: string): string {
    return type === 'CREDIT' ? 'green' : 'red';
  }

  getTransactionIcon(type: string): string {
    return type === 'CREDIT' ? 'plus-circle' : 'minus-circle';
  }
}
