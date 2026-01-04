import { Component, Input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InvoiceData {
  invoiceNo: string;
  invoiceDate: string;
  // Seller
  sellerName: string;
  sellerGstin: string;
  sellerAddress: string;
  sellerState?: string;
  sellerStateCode?: string;
  // Buyer
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  buyerAddress?: string;
  buyerGstin?: string;
  buyerState?: string;
  buyerStateCode?: string;
  // Service details
  billboardName: string;
  fromDate: string;
  toDate: string;
  days: number;
  ratePerDay: number;
  // ================= DISCOUNT (if any) =================
  originalAmount?: number;   // Original base before discount
  discountPercent?: number;  // Discount % applied (0-50)
  discountAmount?: number;   // Discount amount
  amount: number;            // Base rental amount AFTER discount
  // Platform Commission
  commissionAmount?: number;
  commissionPercent?: number;
  // Tax
  subtotal: number;  // Taxable value (base + commission)
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate?: number;
  igstAmount?: number;
  totalGst?: number;
  totalAmount: number;
  // Payment
  paymentId?: string;
  orderId?: string;
  // SAC Code
  sacCode?: string;
}

@Component({
  selector: 'app-invoice',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.css'
})
export class InvoiceComponent implements OnInit {
  @Input() invoiceData!: InvoiceData;
  @Input() showActions = true;

  isPrinting = signal(false);

  ngOnInit(): void {
    // Component initialization
  }

  printInvoice(): void {
    this.isPrinting.set(true);
    setTimeout(() => {
      window.print();
      this.isPrinting.set(false);
    }, 100);
  }

  downloadAsPdf(): void {
    // Trigger print dialog which allows saving as PDF
    this.printInvoice();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}
