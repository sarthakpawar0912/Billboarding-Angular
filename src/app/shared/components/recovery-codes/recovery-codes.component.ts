import { Component, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-recovery-codes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recovery-codes.component.html',
  styleUrl: './recovery-codes.component.css'
})
export class RecoveryCodesComponent implements OnInit {
  @Output() closeModal = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  recoveryCodes = signal<string[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  hasDownloaded = signal(false);

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.generateCodes();
  }

  generateCodes(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.generateRecoveryCodes().subscribe({
      next: (response) => {
        this.isLoading.set(false);
        // API returns array of strings directly
        if (Array.isArray(response)) {
          this.recoveryCodes.set(response);
          this.successMessage.set('Recovery codes generated successfully');
        } else {
          // Handle legacy response format
          this.recoveryCodes.set((response as any).recoveryCodes || []);
          this.successMessage.set((response as any).message || 'Recovery codes generated successfully');
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.message || 'Failed to generate recovery codes');
      }
    });
  }

  downloadCodes(): void {
    const codes = this.recoveryCodes().join('\n');
    const blob = new Blob([
      'BOABP RECOVERY CODES\n',
      '====================\n\n',
      'IMPORTANT: Save these codes in a secure location.\n',
      'Each code can only be used once.\n\n',
      codes,
      '\n\nGenerated on: ' + new Date().toLocaleString()
    ], { type: 'text/plain' });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `boabp-recovery-codes-${Date.now()}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);

    this.hasDownloaded.set(true);
    this.successMessage.set('Recovery codes downloaded successfully');
  }

  copyCodes(): void {
    const codes = this.recoveryCodes().join('\n');
    navigator.clipboard.writeText(codes).then(() => {
      this.successMessage.set('Recovery codes copied to clipboard');
      setTimeout(() => this.successMessage.set(''), 2000);
    });
  }

  printCodes(): void {
    const codes = this.recoveryCodes().join('\n');
    const printWindow = window.open('', '', 'width=600,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>BOABP Recovery Codes</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                padding: 40px;
                max-width: 600px;
                margin: 0 auto;
              }
              h1 {
                font-size: 24px;
                margin-bottom: 10px;
              }
              .warning {
                background: #fef3c7;
                border: 2px solid #fbbf24;
                padding: 16px;
                margin: 20px 0;
                border-radius: 8px;
              }
              .codes {
                background: #f3f4f6;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
                white-space: pre-wrap;
                line-height: 1.8;
                font-size: 14px;
              }
              .footer {
                margin-top: 40px;
                font-size: 12px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <h1>🔑 BOABP Recovery Codes</h1>
            <div class="warning">
              <strong>⚠️ IMPORTANT:</strong>
              <ul>
                <li>Save these codes in a secure location</li>
                <li>Each code can only be used once</li>
                <li>Use these codes if you lose access to your 2FA device</li>
              </ul>
            </div>
            <div class="codes">${codes}</div>
            <div class="footer">
              Generated on: ${new Date().toLocaleString()}<br>
              BOABP - Billboard Owner & Advertiser Bidding Platform
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  close(): void {
    if (!this.hasDownloaded() && this.recoveryCodes().length > 0) {
      const confirmed = confirm(
        'Warning: You have not downloaded your recovery codes. ' +
        'If you lose access to your 2FA device, you will not be able to recover your account. ' +
        'Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    this.closeModal.emit();
    this.closed.emit();
  }
}
