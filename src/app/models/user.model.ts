export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'billboard_owner' | 'advertiser';
  avatar?: string;
  createdAt: Date;
}

export interface Billboard {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  location: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  };
  size: string;
  type: 'hoarding' | 'poster' | 'digital' | 'unipole';
  basePrice: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  availability: {
    startDate: Date;
    endDate: Date;
  };
  views: number;
  bookings: number;
  createdAt: Date;
}

export interface BillboardOwner {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  totalBillboards: number;
  status: 'pending' | 'approved' | 'rejected' | 'blocked';
  earnings: number;
  joinedAt: Date;
}

export interface Booking {
  id: string;
  billboardId: string;
  billboardTitle: string;
  advertiserId: string;
  advertiserName: string;
  ownerId: string;
  ownerName: string;
  startDate: Date;
  endDate: Date;
  bidAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  createdAt: Date;
}

export interface Analytics {
  totalBillboards: number;
  totalOwners: number;
  totalAdvertisers: number;
  totalBookings: number;
  totalRevenue: number;
  pendingApprovals: number;
  activeBookings: number;
  topCities: { city: string; count: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  demandByType: { type: string; demand: number }[];
}
