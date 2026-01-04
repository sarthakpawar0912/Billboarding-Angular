import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzResultModule } from 'ng-zorro-antd/result';

export interface ProcessingStep {
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
}

export interface BankDetails {
  bankName: string;
  maskedAccountNumber: string;
  accountHolderName?: string;
}

export interface WithdrawSuccessData {
  amount: number;
  utr: string;
  bankName: string;
  accountNumber: string;
  time: string;
  razorpayPayoutId?: string;
  transferMode?: string;
}

export interface WithdrawRequest {
  amount: number;
}

@Component({
  selector: 'app-withdraw-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzInputNumberModule,
    NzButtonModule,
    NzIconModule,
    NzStepsModule,
    NzProgressModule,
    NzResultModule
  ],
  templateUrl: './withdraw-modal.component.html',
  styleUrl: './withdraw-modal.component.css'
})
export class WithdrawModalComponent implements OnChanges {
  @Input() isVisible = false;
  @Input() title = 'Withdraw Funds';
  @Input() availableBalance = 0;
  @Input() minAmount = 1;
  @Input() bankDetails: BankDetails | null = null;
  @Input() showPayoutId = false;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() withdraw = new EventEmitter<WithdrawRequest>();

  // Internal state
  withdrawAmount = 0;
  withdrawalStep: 'input' | 'processing' | 'success' | 'failed' = 'input';
  currentProcessingStep = 0;
  processingProgress = 0;
  successData: WithdrawSuccessData | null = null;

  processingSteps: ProcessingStep[] = [
    { title: 'Verifying Account', description: 'Validating bank account details...', status: 'wait' },
    { title: 'Initiating Transfer', description: 'Creating IMPS transfer request...', status: 'wait' },
    { title: 'Bank Processing', description: 'Processing with beneficiary bank...', status: 'wait' },
    { title: 'Transfer Complete', description: 'Funds transferred successfully', status: 'wait' }
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isVisible'] && changes['isVisible'].currentValue === true) {
      this.resetModal();
    }
  }

  resetModal(): void {
    this.withdrawAmount = 0;
    this.withdrawalStep = 'input';
    this.currentProcessingStep = 0;
    this.processingProgress = 0;
    this.successData = null;
    this.resetProcessingSteps();
  }

  resetProcessingSteps(): void {
    this.processingSteps = [
      { title: 'Verifying Account', description: 'Validating bank account details...', status: 'wait' },
      { title: 'Initiating Transfer', description: 'Creating IMPS transfer request...', status: 'wait' },
      { title: 'Bank Processing', description: 'Processing with beneficiary bank...', status: 'wait' },
      { title: 'Transfer Complete', description: 'Funds transferred successfully', status: 'wait' }
    ];
  }

  closeModal(): void {
    if (this.withdrawalStep === 'processing') {
      return;
    }
    this.visibleChange.emit(false);
  }

  getModalTitle(): string {
    switch (this.withdrawalStep) {
      case 'input': return this.title;
      case 'processing': return 'Processing Transfer';
      case 'success': return 'Transfer Successful';
      case 'failed': return 'Transfer Failed';
      default: return this.title;
    }
  }

  setMaxAmount(): void {
    this.withdrawAmount = this.availableBalance;
  }

  setPercentage(percent: number): void {
    this.withdrawAmount = Math.floor(this.availableBalance * percent * 100) / 100;
  }

  isWithdrawValid(): boolean {
    return this.withdrawAmount >= this.minAmount && this.withdrawAmount <= this.availableBalance;
  }

  startWithdrawal(): void {
    if (!this.isWithdrawValid()) {
      return;
    }
    this.withdraw.emit({ amount: this.withdrawAmount });
  }

  // Called by parent to start processing animation
  startProcessing(): void {
    this.withdrawalStep = 'processing';
  }

  // Called by parent to update processing step
  async processStep(stepIndex: number, duration: number): Promise<void> {
    this.processingSteps[stepIndex].status = 'process';
    this.currentProcessingStep = stepIndex;

    const startProgress = stepIndex * 25;
    const endProgress = (stepIndex + 1) * 25;
    const steps = 10;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      this.processingProgress = startProgress + ((endProgress - startProgress) * i / steps);
      await this.delay(stepDuration);
    }

    this.processingSteps[stepIndex].status = 'finish';
  }

  // Called by parent to mark step as processing (for API call step)
  markStepProcessing(stepIndex: number): void {
    this.processingSteps[stepIndex].status = 'process';
    this.currentProcessingStep = stepIndex;
  }

  // Called by parent to mark step as finished
  markStepFinished(stepIndex: number, progress: number): void {
    this.processingSteps[stepIndex].status = 'finish';
    this.processingProgress = progress;
  }

  // Called by parent to show success
  showSuccess(data: WithdrawSuccessData): void {
    this.successData = data;
    this.withdrawalStep = 'success';
  }

  // Called by parent to show failure
  showFailed(): void {
    if (this.currentProcessingStep < this.processingSteps.length) {
      this.processingSteps[this.currentProcessingStep].status = 'error';
    }
    this.withdrawalStep = 'failed';
  }

  retryWithdrawal(): void {
    this.withdrawalStep = 'input';
    this.resetProcessingSteps();
    this.currentProcessingStep = 0;
    this.processingProgress = 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  }
}
