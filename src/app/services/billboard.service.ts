import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Billboard Type Enum
export type BillboardType = 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';

export const BILLBOARD_TYPES: { value: BillboardType; label: string; icon: string; description: string }[] = [
  { value: 'STATIC', label: 'Static', icon: '📋', description: 'Traditional static billboard' },
  { value: 'LED', label: 'LED', icon: '📺', description: 'LED display screen' },
  { value: 'DIGITAL', label: 'Digital', icon: '💻', description: 'Digital display board' },
  { value: 'NEON', label: 'Neon', icon: '✨', description: 'Neon light signage' }
];

export interface BillboardOwner {
  id: number;
  name: string;
  email: string;
}

export interface BillboardResponse {
  id: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  pricePerDay: number;
  size: string;
  available: boolean;
  type: BillboardType;
  owner: BillboardOwner;
  createdAt: string;
  imageUrl?: string;
  imagePaths?: string[];
}

export interface CreateBillboardRequest {
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  type: BillboardType;
  size: string;
  pricePerDay: number;
  available: boolean;
  imageUrl?: string;
}

export interface UpdateBillboardRequest {
  title?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  type?: BillboardType;
  size?: string;
  pricePerDay?: number;
  available?: boolean;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BillboardService {
  private apiUrl = `${environment.apiUrl}/owner/billboards`;

  private billboardsSubject = new BehaviorSubject<BillboardResponse[]>([]);
  billboards$ = this.billboardsSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {}

  // Get all billboards for the current owner
  getMyBillboards(): Observable<BillboardResponse[]> {
    this.loadingSubject.next(true);
    return this.http.get<BillboardResponse[]>(this.apiUrl).pipe(
      tap(billboards => {
        this.billboardsSubject.next(billboards);
        this.loadingSubject.next(false);
      })
    );
  }

  // Create a new billboard
  createBillboard(billboard: CreateBillboardRequest): Observable<BillboardResponse> {
    return this.http.post<BillboardResponse>(this.apiUrl, billboard).pipe(
      tap(newBillboard => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next([newBillboard, ...current]);
      })
    );
  }

  // Update an existing billboard
  updateBillboard(id: number, billboard: UpdateBillboardRequest): Observable<BillboardResponse> {
    return this.http.put<BillboardResponse>(`${this.apiUrl}/${id}`, billboard).pipe(
      tap(updatedBillboard => {
        const current = this.billboardsSubject.value;
        const index = current.findIndex(b => b.id === id);
        if (index !== -1) {
          current[index] = updatedBillboard;
          this.billboardsSubject.next([...current]);
        }
      })
    );
  }

  // Delete a billboard
  deleteBillboard(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next(current.filter(b => b.id !== id));
      })
    );
  }

  // Get a single billboard by ID
  getBillboardById(id: number): Observable<BillboardResponse> {
    return this.http.get<BillboardResponse>(`${this.apiUrl}/${id}`);
  }

  // Toggle billboard availability
  toggleAvailability(id: number, available: boolean): Observable<BillboardResponse> {
    return this.updateBillboard(id, { available });
  }

  // Upload images for a billboard
  uploadImages(billboardId: number, images: File[]): Observable<BillboardResponse> {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });
    return this.http.post<BillboardResponse>(`${this.apiUrl}/${billboardId}/upload-images`, formData).pipe(
      tap(updatedBillboard => {
        const current = this.billboardsSubject.value;
        const index = current.findIndex(b => b.id === billboardId);
        if (index !== -1) {
          current[index] = updatedBillboard;
          this.billboardsSubject.next([...current]);
        }
      })
    );
  }

  // Get full image URL
  getImageUrl(imagePath: string): string {
    return `${environment.apiUrl.replace('/api', '')}/${imagePath}`;
  }
}
