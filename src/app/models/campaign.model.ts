export interface Campaign {
  id: number;
  name: string;
  advertiser: {
    id: number;
    name: string;
    email: string;
  };
  status: CampaignStatus;
  budget: number;
  spent: number;
  billboards: number;
  impressions: number;
  startDate: string;
  endDate: string;
  cities: string[];
  createdAt: string;
  bookings?: Booking[];
}

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface CampaignCreateRequest {
  name: string;
  budget: number;
  billboards: number;
  startDate: string;
  endDate: string;
  cities: string[];
}

export interface CampaignAnalytics {
  campaignId: number;
  campaignName: string;
  status: CampaignStatus;
  budget: number;
  spent: number;
  impressions: number;
  cpm: number;
  budgetUtilization: number;
  startDate: string;
  endDate: string;
}

export interface DailyAnalytics {
  date: string;
  spend: number;
  impressions: number;
}

export interface Booking {
  id: number;
  billboardTitle: string;
  billboardId: number;
  startDate: string;
  endDate: string;
  bidAmount: number;
  status: string;
  paymentStatus: string;
}

export interface CampaignStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  totalImpressions: number;
  avgCPM: number;
}

export interface AvailableBooking {
  id: number;
  billboardId: number;
  billboardTitle: string;
  billboardLocation: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}
