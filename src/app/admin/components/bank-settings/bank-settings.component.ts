import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminService, AdminBankAccount, AdminBankAccountRequest, AdminPayout } from '../../../services/admin.service';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzAlertModule } from 'ng-zorro-antd/alert';

@Component({
  selector: 'app-admin-bank-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzCardModule,
    NzTableModule,
    NzTagModule,
    NzSpinModule,
    NzEmptyModule,
    NzIconModule,
    NzModalModule,
    NzInputModule,
    NzButtonModule,
    NzPopconfirmModule,
    NzFormModule,
    NzSelectModule,
    NzDividerModule,
    NzBadgeModule,
    NzAlertModule
  ],
  templateUrl: './bank-settings.component.html',
  styleUrl: './bank-settings.component.css'
})
export class AdminBankSettingsComponent implements OnInit {
  bankAccounts = signal<AdminBankAccount[]>([]);
  payouts = signal<AdminPayout[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Modal state
  isModalVisible = false;
  isEditMode = false;
  editingAccountId: number | null = null;
  isSaving = false;

  // Form
  bankForm: FormGroup;

  constructor(
    private adminService: AdminService,
    private message: NzMessageService,
    private fb: FormBuilder
  ) {
    this.bankForm = this.fb.group({
      accountHolderName: ['', [Validators.required, Validators.minLength(3)]],
      accountNumber: ['', [Validators.required, Validators.pattern(/^\d{9,18}$/)]],
      confirmAccountNumber: ['', [Validators.required]],
      ifscCode: ['', [Validators.required, Validators.pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)]],
      bankName: ['', [Validators.required]],
      branchName: [''],
      accountType: ['SAVINGS', [Validators.required]]
    }, {
      validators: this.accountNumbersMatch
    });
  }

  accountNumbersMatch(group: FormGroup) {
    const accountNumber = group.get('accountNumber')?.value;
    const confirmAccountNumber = group.get('confirmAccountNumber')?.value;
    if (accountNumber !== confirmAccountNumber) {
      group.get('confirmAccountNumber')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    this.adminService.getAdminBankAccounts().subscribe({
      next: (accounts) => {
        this.bankAccounts.set(accounts);
        this.loadPayouts();
      },
      error: (err) => {
        console.error('Error loading bank accounts:', err);
        this.error.set('Failed to load bank accounts');
        this.loading.set(false);
      }
    });
  }

  loadPayouts(): void {
    this.adminService.getAdminPayouts().subscribe({
      next: (payouts) => {
        this.payouts.set(payouts);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading payouts:', err);
        this.loading.set(false);
      }
    });
  }

  // Modal methods
  openAddModal(): void {
    this.isEditMode = false;
    this.editingAccountId = null;
    this.bankForm.reset({ accountType: 'SAVINGS' });
    this.isModalVisible = true;
  }

  openEditModal(account: AdminBankAccount): void {
    this.isEditMode = true;
    this.editingAccountId = account.id;
    // For edit, we can't show the full account number (it's masked)
    // User needs to re-enter if they want to change it
    this.bankForm.patchValue({
      accountHolderName: account.accountHolderName,
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: account.ifscCode,
      bankName: account.bankName,
      branchName: account.branchName,
      accountType: account.accountType
    });
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.bankForm.reset({ accountType: 'SAVINGS' });
    this.editingAccountId = null;
  }

  saveAccount(): void {
    if (this.bankForm.invalid) {
      Object.keys(this.bankForm.controls).forEach(key => {
        this.bankForm.get(key)?.markAsDirty();
        this.bankForm.get(key)?.updateValueAndValidity();
      });
      return;
    }

    this.isSaving = true;
    const request: AdminBankAccountRequest = this.bankForm.value;

    if (this.isEditMode && this.editingAccountId) {
      this.adminService.updateBankAccount(this.editingAccountId, request).subscribe({
        next: () => {
          this.message.success('Bank account updated successfully');
          this.closeModal();
          this.loadData();
          this.isSaving = false;
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Failed to update bank account');
          this.isSaving = false;
        }
      });
    } else {
      this.adminService.addBankAccount(request).subscribe({
        next: () => {
          this.message.success('Bank account added successfully');
          this.closeModal();
          this.loadData();
          this.isSaving = false;
        },
        error: (err) => {
          this.message.error(err.error?.message || 'Failed to add bank account');
          this.isSaving = false;
        }
      });
    }
  }

  deleteAccount(id: number): void {
    this.adminService.deleteBankAccount(id).subscribe({
      next: () => {
        this.message.success('Bank account deleted successfully');
        this.loadData();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to delete bank account');
      }
    });
  }

  setPrimary(id: number): void {
    this.adminService.setBankAccountPrimary(id).subscribe({
      next: () => {
        this.message.success('Bank account set as primary');
        this.loadData();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to set primary account');
      }
    });
  }

  verifyAccount(id: number): void {
    this.adminService.verifyBankAccount(id).subscribe({
      next: () => {
        this.message.success('Bank account verified successfully');
        this.loadData();
      },
      error: (err) => {
        this.message.error(err.error?.message || 'Failed to verify bank account');
      }
    });
  }

  // Utility methods
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }

  getPayoutStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'green';
      case 'PROCESSING': return 'blue';
      case 'PENDING': return 'orange';
      case 'FAILED': return 'red';
      default: return 'default';
    }
  }

  getPayoutStatusIcon(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'check-circle';
      case 'PROCESSING': return 'loading';
      case 'PENDING': return 'clock-circle';
      case 'FAILED': return 'close-circle';
      default: return 'question-circle';
    }
  }
}
