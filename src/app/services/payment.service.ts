import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, throwError } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Razorpay order creation response (from /api/payments/create-order)
export interface RazorpayOrder {
  orderId: string;
  keyId: string;
  bookingId: number;
  amount: number;
  currency: string;
  receipt: string;
}

// Payment verification request
export interface PaymentVerificationRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

// Payment verification response (booking with updated payment status)
export interface PaymentVerificationResponse {
  id: number;
  advertiser: any;
  billboard: any;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  paymentStatus: 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  createdAt: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  currency: string;
  paymentDate: string;
}

// Razorpay checkout options
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

// Razorpay success response
export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Declare Razorpay global
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
      close: () => void;
    };
  }
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;
  private razorpayKeyId = environment.razorpayKeyId;

  private razorpayScriptLoaded = false;

  constructor(private http: HttpClient) {}

  // Load Razorpay checkout script dynamically
  loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.razorpayScriptLoaded) {
        resolve(true);
        return;
      }

      if (typeof window !== 'undefined' && window.Razorpay) {
        this.razorpayScriptLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.razorpayScriptLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        reject(new Error('Failed to load Razorpay SDK'));
      };
      document.body.appendChild(script);
    });
  }

  // Create Razorpay order for a booking
  createOrder(bookingId: number): Observable<RazorpayOrder> {
    // Pre-API validation
    if (!bookingId || bookingId <= 0) {
      return throwError(() => ({
        error: { message: 'Invalid booking ID. Please select a valid booking.' }
      }));
    }

    return this.http.post<RazorpayOrder>(`${this.apiUrl}/create-order`, { bookingId }).pipe(
      catchError((err) => {
        // Transform backend errors to user-friendly messages
        const message = this.extractErrorMessage(err);
        return throwError(() => ({ error: { message } }));
      })
    );
  }

  // Verify payment after Razorpay checkout
  verifyPayment(verification: PaymentVerificationRequest): Observable<PaymentVerificationResponse> {
    // Pre-API validation
    if (!verification.razorpayOrderId || !verification.razorpayPaymentId || !verification.razorpaySignature) {
      return throwError(() => ({
        error: { message: 'Payment verification failed. Missing required payment data.' }
      }));
    }

    return this.http.post<PaymentVerificationResponse>(`${this.apiUrl}/verify`, verification).pipe(
      catchError((err) => {
        const message = this.extractErrorMessage(err);
        return throwError(() => ({ error: { message } }));
      })
    );
  }

  // Extract user-friendly error message from backend response
  private extractErrorMessage(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (err?.error?.fieldErrors) {
      // Handle validation errors - show first field error
      const firstError = Object.values(err.error.fieldErrors)[0];
      return firstError as string;
    }
    if (err?.message) {
      return err.message;
    }
    return 'An unexpected error occurred. Please try again.';
  }

  // Open Razorpay checkout modal
  openCheckout(
    order: RazorpayOrder,
    userDetails: { name: string; email: string; phone: string },
    onSuccess: (response: RazorpayResponse) => void,
    onError: (error: any) => void,
    onDismiss?: () => void
  ): Observable<void> {
    return from(this.loadRazorpayScript()).pipe(
      switchMap(() => {
        return new Observable<void>((observer) => {
          // Amount from API is in rupees, Razorpay expects paise (smallest currency unit)
          const amountInPaise = Math.round(order.amount * 100);

          const options: RazorpayOptions = {
            key: order.keyId || this.razorpayKeyId,
            amount: amountInPaise,
            currency: order.currency || 'INR',
            name: 'Billboard Booking',
            description: `Payment for Booking #${order.bookingId}`,
            order_id: order.orderId,
            handler: (response: RazorpayResponse) => {
              onSuccess(response);
              observer.next();
              observer.complete();
            },
            prefill: {
              name: userDetails.name,
              email: userDetails.email,
              contact: userDetails.phone
            },
            theme: {
              color: '#3399cc'
            },
            modal: {
              ondismiss: () => {
                if (onDismiss) onDismiss();
                observer.complete();
              }
            }
          };

          try {
            const razorpay = new window.Razorpay(options);
            razorpay.open();
          } catch (err) {
            onError(err);
            observer.error(err);
          }
        });
      }),
      catchError((err) => {
        onError(err);
        return throwError(() => err);
      })
    );
  }

  // Set Razorpay key (can be called from environment config)
  setRazorpayKey(key: string): void {
    this.razorpayKeyId = key;
  }

  // Get payment history for current user
  getPaymentHistory(): Observable<PaymentVerificationResponse[]> {
    return this.http.get<PaymentVerificationResponse[]>(`${this.apiUrl}/history`);
  }
}
