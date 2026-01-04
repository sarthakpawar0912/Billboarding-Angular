import { Injectable, signal } from '@angular/core';
import { Billboard, BillboardOwner, Booking, Analytics } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Dummy Billboards
  private billboardsSignal = signal<Billboard[]>([
    {
      id: '1',
      title: 'Premium Highway Billboard - Mumbai',
      ownerId: '2',
      ownerName: 'John Owner',
      location: { address: 'Western Express Highway', city: 'Mumbai', lat: 19.076, lng: 72.8777 },
      size: '40x20 ft',
      type: 'hoarding',
      basePrice: 150000,
      images: ['https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400'],
      status: 'approved',
      availability: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
      views: 15420,
      bookings: 12,
      createdAt: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Digital Display - Connaught Place',
      ownerId: '2',
      ownerName: 'John Owner',
      location: { address: 'Connaught Place', city: 'Delhi', lat: 28.6315, lng: 77.2167 },
      size: '20x15 ft',
      type: 'digital',
      basePrice: 200000,
      images: ['https://images.unsplash.com/photo-1567967455389-e696c1a95d21?w=400'],
      status: 'approved',
      availability: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
      views: 22340,
      bookings: 18,
      createdAt: new Date('2024-02-01')
    },
    {
      id: '3',
      title: 'Bus Stop Poster - Bangalore',
      ownerId: '4',
      ownerName: 'Mike Wilson',
      location: { address: 'MG Road', city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
      size: '6x4 ft',
      type: 'poster',
      basePrice: 25000,
      images: ['https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=400'],
      status: 'pending',
      availability: { startDate: new Date('2024-03-01'), endDate: new Date('2024-12-31') },
      views: 8920,
      bookings: 5,
      createdAt: new Date('2024-02-20')
    },
    {
      id: '4',
      title: 'Unipole - Chennai Highway',
      ownerId: '5',
      ownerName: 'Raj Kumar',
      location: { address: 'OMR Road', city: 'Chennai', lat: 13.0827, lng: 80.2707 },
      size: '30x15 ft',
      type: 'unipole',
      basePrice: 85000,
      images: ['https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400'],
      status: 'approved',
      availability: { startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31') },
      views: 11200,
      bookings: 8,
      createdAt: new Date('2024-01-25')
    },
    {
      id: '5',
      title: 'Mall Entrance Digital Board',
      ownerId: '4',
      ownerName: 'Mike Wilson',
      location: { address: 'Phoenix Mall', city: 'Pune', lat: 18.5204, lng: 73.8567 },
      size: '15x10 ft',
      type: 'digital',
      basePrice: 120000,
      images: ['https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400'],
      status: 'rejected',
      availability: { startDate: new Date('2024-04-01'), endDate: new Date('2024-12-31') },
      views: 5600,
      bookings: 0,
      createdAt: new Date('2024-03-01')
    },
    {
      id: '6',
      title: 'Railway Station Hoarding',
      ownerId: '2',
      ownerName: 'John Owner',
      location: { address: 'CST Station', city: 'Mumbai', lat: 18.94, lng: 72.835 },
      size: '25x12 ft',
      type: 'hoarding',
      basePrice: 95000,
      images: ['https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400'],
      status: 'pending',
      availability: { startDate: new Date('2024-05-01'), endDate: new Date('2024-12-31') },
      views: 3200,
      bookings: 0,
      createdAt: new Date('2024-03-10')
    }
  ]);

  // Dummy Billboard Owners
  private ownersSignal = signal<BillboardOwner[]>([
    {
      id: '2',
      name: 'John Owner',
      email: 'john@outdoor.com',
      phone: '+91 9876543210',
      company: 'Outdoor Media Pvt Ltd',
      totalBillboards: 15,
      status: 'approved',
      earnings: 2450000,
      joinedAt: new Date('2023-06-15')
    },
    {
      id: '4',
      name: 'Mike Wilson',
      email: 'mike@adspace.com',
      phone: '+91 9876543211',
      company: 'AdSpace Solutions',
      totalBillboards: 8,
      status: 'approved',
      earnings: 1280000,
      joinedAt: new Date('2023-08-20')
    },
    {
      id: '5',
      name: 'Raj Kumar',
      email: 'raj@billboards.com',
      phone: '+91 9876543212',
      company: 'Billboard Kings',
      totalBillboards: 22,
      status: 'pending',
      earnings: 0,
      joinedAt: new Date('2024-02-28')
    },
    {
      id: '6',
      name: 'Priya Sharma',
      email: 'priya@mediaads.com',
      phone: '+91 9876543213',
      company: 'Media Ads India',
      totalBillboards: 5,
      status: 'blocked',
      earnings: 450000,
      joinedAt: new Date('2023-11-10')
    }
  ]);

  // Dummy Bookings
  private bookingsSignal = signal<Booking[]>([
    {
      id: '1',
      billboardId: '1',
      billboardTitle: 'Premium Highway Billboard - Mumbai',
      advertiserId: '3',
      advertiserName: 'Sarah Advertiser',
      ownerId: '2',
      ownerName: 'John Owner',
      startDate: new Date('2024-04-01'),
      endDate: new Date('2024-04-30'),
      bidAmount: 175000,
      status: 'approved',
      paymentStatus: 'paid',
      createdAt: new Date('2024-03-15')
    },
    {
      id: '2',
      billboardId: '2',
      billboardTitle: 'Digital Display - Connaught Place',
      advertiserId: '7',
      advertiserName: 'Tech Corp India',
      ownerId: '2',
      ownerName: 'John Owner',
      startDate: new Date('2024-04-15'),
      endDate: new Date('2024-05-15'),
      bidAmount: 250000,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date('2024-03-20')
    },
    {
      id: '3',
      billboardId: '4',
      billboardTitle: 'Unipole - Chennai Highway',
      advertiserId: '3',
      advertiserName: 'Sarah Advertiser',
      ownerId: '5',
      ownerName: 'Raj Kumar',
      startDate: new Date('2024-05-01'),
      endDate: new Date('2024-05-31'),
      bidAmount: 95000,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: new Date('2024-03-25')
    },
    {
      id: '4',
      billboardId: '1',
      billboardTitle: 'Premium Highway Billboard - Mumbai',
      advertiserId: '8',
      advertiserName: 'Fashion Hub',
      ownerId: '2',
      ownerName: 'John Owner',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-31'),
      bidAmount: 165000,
      status: 'completed',
      paymentStatus: 'paid',
      createdAt: new Date('2024-02-15')
    },
    {
      id: '5',
      billboardId: '2',
      billboardTitle: 'Digital Display - Connaught Place',
      advertiserId: '9',
      advertiserName: 'Auto World',
      ownerId: '2',
      ownerName: 'John Owner',
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-04-14'),
      bidAmount: 220000,
      status: 'approved',
      paymentStatus: 'paid',
      createdAt: new Date('2024-03-01')
    }
  ]);

  billboards = this.billboardsSignal.asReadonly();
  owners = this.ownersSignal.asReadonly();
  bookings = this.bookingsSignal.asReadonly();

  getAnalytics(): Analytics {
    const billboards = this.billboardsSignal();
    const owners = this.ownersSignal();
    const bookings = this.bookingsSignal();

    return {
      totalBillboards: billboards.length,
      totalOwners: owners.length,
      totalAdvertisers: 15,
      totalBookings: bookings.length,
      totalRevenue: bookings.filter(b => b.paymentStatus === 'paid').reduce((sum, b) => sum + b.bidAmount, 0),
      pendingApprovals: billboards.filter(b => b.status === 'pending').length + owners.filter(o => o.status === 'pending').length,
      activeBookings: bookings.filter(b => b.status === 'approved').length,
      topCities: [
        { city: 'Mumbai', count: 245 },
        { city: 'Delhi', count: 198 },
        { city: 'Bangalore', count: 156 },
        { city: 'Chennai', count: 134 },
        { city: 'Pune', count: 98 }
      ],
      monthlyRevenue: [
        { month: 'Jan', revenue: 450000 },
        { month: 'Feb', revenue: 520000 },
        { month: 'Mar', revenue: 680000 },
        { month: 'Apr', revenue: 590000 },
        { month: 'May', revenue: 720000 },
        { month: 'Jun', revenue: 810000 }
      ],
      demandByType: [
        { type: 'Digital', demand: 35 },
        { type: 'Hoarding', demand: 30 },
        { type: 'Unipole', demand: 20 },
        { type: 'Poster', demand: 15 }
      ]
    };
  }

  // Billboard CRUD operations
  updateBillboardStatus(id: string, status: Billboard['status']): void {
    this.billboardsSignal.update(billboards =>
      billboards.map(b => b.id === id ? { ...b, status } : b)
    );
  }

  deleteBillboard(id: string): void {
    this.billboardsSignal.update(billboards =>
      billboards.filter(b => b.id !== id)
    );
  }

  updateBillboardPrice(id: string, price: number): void {
    this.billboardsSignal.update(billboards =>
      billboards.map(b => b.id === id ? { ...b, basePrice: price } : b)
    );
  }

  // Owner CRUD operations
  updateOwnerStatus(id: string, status: BillboardOwner['status']): void {
    this.ownersSignal.update(owners =>
      owners.map(o => o.id === id ? { ...o, status } : o)
    );
  }

  // Booking CRUD operations
  updateBookingStatus(id: string, status: Booking['status']): void {
    this.bookingsSignal.update(bookings =>
      bookings.map(b => b.id === id ? { ...b, status } : b)
    );
  }
}
