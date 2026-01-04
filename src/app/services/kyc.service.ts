import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface KycRequest {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  documentType: string;
  documentNumber: string;
  documentUrl?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: Date;
  reviewedAt?: Date;
  rejectionReason?: string;
}

export interface KycResponse {
  message: string;
  success?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class KycService {
  private apiUrl = `${environment.apiUrl}/admin/kyc`;

  private pendingRequestsSubject = new BehaviorSubject<KycRequest[]>([]);
  pendingRequests$ = this.pendingRequestsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get all pending KYC requests
  getPendingRequests(): Observable<KycRequest[]> {
    this.loadingSubject.next(true);
    return this.http.get<KycRequest[]>(`${this.apiUrl}/pending`).pipe(
      tap(requests => {
        this.pendingRequestsSubject.next(requests);
        this.loadingSubject.next(false);
      })
    );
  }

  // Approve a KYC request
  approveKyc(kycId: number): Observable<KycResponse> {
    return this.http.post<KycResponse>(`${this.apiUrl}/approve/${kycId}`, {}).pipe(
      tap(() => {
        // Remove from pending list after approval
        const current = this.pendingRequestsSubject.value;
        this.pendingRequestsSubject.next(current.filter(r => r.id !== kycId));
      })
    );
  }

  // Reject a KYC request with reason
  rejectKyc(kycId: number, reason: string): Observable<KycResponse> {
    return this.http.post<KycResponse>(`${this.apiUrl}/reject/${kycId}`, null, {
      params: { reason }
    }).pipe(
      tap(() => {
        // Remove from pending list after rejection
        const current = this.pendingRequestsSubject.value;
        this.pendingRequestsSubject.next(current.filter(r => r.id !== kycId));
      })
    );
  }

  // Get all KYC requests (including approved/rejected)
  getAllRequests(): Observable<KycRequest[]> {
    return this.http.get<KycRequest[]>(`${this.apiUrl}/all`);
  }

  // Get KYC request by ID
  getKycById(kycId: number): Observable<KycRequest> {
    return this.http.get<KycRequest>(`${this.apiUrl}/${kycId}`);
  }
}
