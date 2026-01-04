export interface PlatformEmail {
  id: number;
  userId: number;
  userRole: 'ADMIN' | 'OWNER' | 'ADVERTISER';
  userEmail: string;
  subject: string;
  body: string;
  isRead: boolean;
  read: boolean; // Backend might use either
  createdAt: string;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkReadResponse {
  message: string;
  email?: PlatformEmail;
}

export interface DeleteEmailResponse {
  message: string;
}
