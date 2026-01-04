# Billboard Advertising Platform - Frontend

A comprehensive **Angular 18** frontend application for the Billboard Advertising Platform. This application provides role-based dashboards for Admins, Billboard Owners, and Advertisers to manage outdoor advertising campaigns.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Module Structure](#3-module-structure)
4. [Authentication System](#4-authentication-system)
5. [Role-Based Access Control](#5-role-based-access-control)
6. [Admin Module](#6-admin-module)
7. [Owner Module](#7-owner-module)
8. [Advertiser Module](#8-advertiser-module)
9. [Shared Components](#9-shared-components)
10. [Services Layer](#10-services-layer)
11. [State Management](#11-state-management)
12. [Payment Integration](#12-payment-integration)
13. [Maps & Geolocation](#13-maps--geolocation)
14. [Charts & Analytics](#14-charts--analytics)
15. [Security Features](#15-security-features)
16. [API Integration](#16-api-integration)
17. [Styling & UI](#17-styling--ui)
18. [Performance Optimizations](#18-performance-optimizations)
19. [Setup & Installation](#19-setup--installation)
20. [Environment Configuration](#20-environment-configuration)
21. [Build & Deployment](#21-build--deployment)

---

## 1. System Overview

### What is the Billboard Advertising Platform?

The Billboard Advertising Platform is a **B2B marketplace** that connects:
- **Billboard Owners** - Who own physical advertising spaces (hoardings, LED screens, digital displays)
- **Advertisers** - Businesses looking to run outdoor advertising campaigns
- **Platform Admins** - Who manage the platform, approve KYC, and oversee transactions

### Business Flow

```
                                    BILLBOARD ADVERTISING PLATFORM
                                    ==============================

    +-----------------+         +-----------------+         +-----------------+
    |                 |         |                 |         |                 |
    |   BILLBOARD     |  Lists  |    PLATFORM     | Browse  |   ADVERTISER    |
    |     OWNER       | ------> |                 | <------ |                 |
    |                 |         |   - Admins      |         |                 |
    +-----------------+         |   - Listings    |         +-----------------+
          |                     |   - Payments    |                |
          |                     |   - Analytics   |                |
          v                     |                 |                v
    +-------------+             +-----------------+          +-------------+
    | Billboards  |                    |                     |  Bookings   |
    | Management  |                    |                     |  Campaigns  |
    | Earnings    |                    v                     |  Payments   |
    | Wallet      |             +-------------+              |  Invoices   |
    +-------------+             |   Payment   |              +-------------+
                                |   Gateway   |
                                |  (Razorpay) |
                                +-------------+
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Role Dashboard** | Separate dashboards for Admin, Owner, and Advertiser |
| **Billboard Listings** | Create, manage, and search billboards with images and maps |
| **Smart Booking** | Availability calendar, price preview, date range selection |
| **Payment Gateway** | Razorpay integration for secure online payments |
| **Two-Factor Auth** | Email OTP and Magic Link authentication methods |
| **Analytics** | Revenue charts, booking trends, performance metrics |
| **Wallet System** | Owner wallet with withdrawal requests |
| **Campaign Management** | Create and track advertising campaigns |
| **Invoice Generation** | GST-compliant invoice download |
| **KYC Management** | Document verification for owners |

---

## 2. Architecture

### Technology Stack

```
+------------------------------------------------------------------+
|                        ANGULAR 18 FRONTEND                        |
+------------------------------------------------------------------+
|                                                                    |
|   +------------------+  +------------------+  +------------------+ |
|   |    Components    |  |     Services     |  |      Guards      | |
|   |  - Admin         |  |  - AuthService   |  |  - adminGuard    | |
|   |  - Owner         |  |  - AdminService  |  |  - ownerGuard    | |
|   |  - Advertiser    |  |  - OwnerService  |  |  - advertiserGrd | |
|   |  - Shared        |  |  - AdvertiserSvc |  |  - guestGuard    | |
|   +------------------+  +------------------+  +------------------+ |
|                                                                    |
|   +------------------+  +------------------+  +------------------+ |
|   |   Interceptors   |  |      Models      |  |    Animations    | |
|   |  - Auth Token    |  |  - User          |  |  - Page Trans.   | |
|   |  - Error Handler |  |  - Billboard     |  |  - Fade In/Out   | |
|   +------------------+  +------------------+  +------------------+ |
|                                                                    |
+------------------------------------------------------------------+
|                        EXTERNAL LIBRARIES                          |
+------------------------------------------------------------------+
|  Bootstrap 5  |  ng-zorro-antd  |  ECharts  |  Leaflet  | QRCode |
+------------------------------------------------------------------+
|                         BACKEND API                                |
+------------------------------------------------------------------+
|                   Spring Boot REST API                             |
|              http://localhost:8080/api/*                           |
+------------------------------------------------------------------+
```

### Angular Configuration

| Configuration | Value |
|---------------|-------|
| **Angular Version** | 18.2.x |
| **Standalone Components** | Yes (No NgModules) |
| **Routing Strategy** | Lazy Loading |
| **State Management** | RxJS BehaviorSubject |
| **HTTP Client** | Angular HttpClient |
| **Authentication** | JWT Bearer Token |

---

## 3. Module Structure

### Directory Layout

```
src/
├── app/
│   ├── admin/                      # Admin module
│   │   ├── components/
│   │   │   ├── analytics/          # Platform analytics
│   │   │   ├── bank-settings/      # Admin bank account
│   │   │   ├── billboards/         # Billboard management
│   │   │   ├── bookings/           # Booking oversight
│   │   │   ├── dashboard/          # Admin dashboard
│   │   │   ├── kyc/                # KYC approvals
│   │   │   ├── owners/             # Owner management
│   │   │   ├── payouts/            # Payout processing
│   │   │   ├── settings/           # Platform settings
│   │   │   └── wallet/             # Admin wallet
│   │   └── layout/                 # Admin layout with sidebar
│   │
│   ├── owner/                      # Owner module
│   │   ├── components/
│   │   │   ├── billboards/         # My billboards
│   │   │   ├── bookings/           # Booking requests
│   │   │   ├── dashboard/          # Owner dashboard
│   │   │   ├── earnings/           # Revenue analytics
│   │   │   ├── settings/           # Profile & security
│   │   │   └── wallet/             # Wallet & withdrawals
│   │   └── layout/                 # Owner layout
│   │
│   ├── advertiser/                 # Advertiser module
│   │   ├── components/
│   │   │   ├── bookings/           # My bookings
│   │   │   ├── browse/             # Browse billboards
│   │   │   ├── campaign/           # Campaign management
│   │   │   ├── campaigns/          # Campaign list
│   │   │   ├── dashboard/          # Advertiser dashboard
│   │   │   ├── favorites/          # Saved billboards
│   │   │   └── settings/           # Profile & security
│   │   └── layout/                 # Advertiser layout
│   │
│   ├── components/                 # Auth components
│   │   ├── signin/                 # Login page
│   │   ├── signup/                 # Registration
│   │   ├── magic-link/             # Magic link handler
│   │   └── reset-twofa/            # 2FA reset
│   │
│   ├── shared/                     # Shared components
│   │   ├── animations/             # Page transitions
│   │   └── components/
│   │       ├── availability-calendar/
│   │       ├── breadcrumb/
│   │       ├── email-inbox/
│   │       ├── email-update/
│   │       ├── invoice/
│   │       ├── login-history/
│   │       ├── owner-calendar/
│   │       ├── recovery-codes/
│   │       ├── twofa-reset-request/
│   │       ├── twofa-settings/
│   │       └── withdraw-modal/
│   │
│   ├── services/                   # API services
│   │   ├── auth.service.ts
│   │   ├── admin.service.ts
│   │   ├── owner.service.ts
│   │   ├── advertiser.service.ts
│   │   ├── payment.service.ts
│   │   ├── billboard.service.ts
│   │   ├── campaign.service.ts
│   │   ├── email.service.ts
│   │   └── kyc.service.ts
│   │
│   ├── guards/                     # Route guards
│   │   └── auth.guard.ts
│   │
│   ├── interceptors/               # HTTP interceptors
│   │   └── auth.interceptor.ts
│   │
│   ├── models/                     # TypeScript interfaces
│   │   ├── user.model.ts
│   │   ├── campaign.model.ts
│   │   ├── email.model.ts
│   │   └── security.model.ts
│   │
│   ├── utils/                      # Utilities
│   │   └── device-parser.ts
│   │
│   ├── app.component.ts            # Root component
│   ├── app.config.ts               # App configuration
│   └── app.routes.ts               # Route definitions
│
├── environments/
│   └── environment.ts              # Environment config
│
├── assets/                         # Static assets
└── styles.css                      # Global styles
```

---

## 4. Authentication System

### Authentication Flow

```
                        AUTHENTICATION FLOW
                        ===================

    +--------+          +--------+          +--------+          +--------+
    |  USER  |          | LOGIN  |          | BACKEND|          |  JWT   |
    |        |          | FORM   |          |  API   |          | TOKEN  |
    +--------+          +--------+          +--------+          +--------+
         |                   |                   |                   |
         | Enter Email/Pass  |                   |                   |
         |------------------>|                   |                   |
         |                   |                   |                   |
         |                   | POST /auth/login  |                   |
         |                   |------------------>|                   |
         |                   |                   |                   |
         |                   |   2FA Required?   |                   |
         |                   |<------------------|                   |
         |                   |                   |                   |
         |   [IF 2FA]        |                   |                   |
         |   Show OTP Input  |                   |                   |
         |<------------------|                   |                   |
         |                   |                   |                   |
         | Enter OTP         |                   |                   |
         |------------------>|                   |                   |
         |                   |                   |                   |
         |                   | POST /auth/verify-email-otp           |
         |                   |------------------>|                   |
         |                   |                   |                   |
         |                   |   JWT Token       |                   |
         |                   |<------------------|                   |
         |                   |                   |                   |
         |                   |                   |  Store in         |
         |                   |                   |  localStorage     |
         |                   |                   |------------------>|
         |                   |                   |                   |
         |   Redirect to     |                   |                   |
         |   Dashboard       |                   |                   |
         |<------------------|                   |                   |
         |                   |                   |                   |
```

### Two-Factor Authentication Methods

| Method | Description | Flow |
|--------|-------------|------|
| **Email OTP** | 6-digit code sent to email | Enter email/password -> Receive OTP -> Verify OTP -> Login |
| **Magic Link** | Clickable link sent to email | Enter email/password -> Click link in email -> Auto-login |
| **Recovery Codes** | One-time backup codes | Lost 2FA access -> Use recovery code -> Login |

### AuthService Methods

```typescript
// Core Authentication
login(email, password): Observable<LoginResponse>
register(data): Observable<AuthResponse>
logout(): void
verifyOtp(email, otp): Observable<VerifyOtpResponse>

// Magic Link
requestMagicLink(email): Observable<MagicLinkResponse>
verifyMagicLink(token): Observable<MagicLinkVerifyResponse>

// 2FA Management
update2FAMethod(method): Observable<TwoFactorMethodResponse>
disable2FA(): Observable<TwoFactorMethodResponse>
getSecuritySettings(): Observable<SecuritySettings>

// Recovery Codes
generateRecoveryCodes(): Observable<string[]>
verifyRecoveryCode(email, code): Observable<VerifyRecoveryResponse>

// 2FA Reset
request2FAReset(email): Observable<ResetRequestResponse>
confirm2FAReset(token): Observable<ResetConfirmResponse>
```

### Token Storage

```typescript
// Tokens stored in localStorage
localStorage.setItem('boabp_token', jwtToken);
localStorage.setItem('boabp_user', JSON.stringify(user));

// Token structure
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'billboard_owner' | 'advertiser';
  avatar?: string;
  createdAt: Date;
}
```

---

## 5. Role-Based Access Control

### Route Guards

The application uses **functional guards** (Angular 16+) to protect routes:

```typescript
// auth.guard.ts

// General auth guard - requires login
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/signin']);
  return false;
};

// Admin-only guard
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  // Redirect to appropriate dashboard or login
  if (authService.isLoggedIn()) {
    router.navigate([authService.getRedirectUrl()]);
  } else {
    router.navigate(['/signin']);
  }
  return false;
};

// Owner-only guard
export const ownerGuard: CanActivateFn = ...

// Advertiser-only guard
export const advertiserGuard: CanActivateFn = ...

// Guest-only guard (for login/signup pages)
export const guestGuard: CanActivateFn = ...
```

### Role-Based Redirects

```typescript
getRedirectUrl(): string {
  const user = this.currentUserSignal();
  if (!user) return '/signin';

  switch (user.role) {
    case 'admin':
      return '/admin/dashboard';
    case 'billboard_owner':
      return '/owner/dashboard';
    case 'advertiser':
      return '/advertiser/dashboard';
    default:
      return '/signin';
  }
}
```

### Route Configuration

```typescript
// app.routes.ts

export const routes: Routes = [
  // Public routes
  { path: 'signin', component: SigninComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },

  // Admin routes - LAZY LOADED
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/layout.component')
      .then(m => m.LayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./admin/components/dashboard/dashboard.component') },
      { path: 'billboards', loadComponent: () => ... },
      { path: 'owners', loadComponent: () => ... },
      { path: 'bookings', loadComponent: () => ... },
      { path: 'analytics', loadComponent: () => ... },
      { path: 'wallet', loadComponent: () => ... },
      { path: 'settings', loadComponent: () => ... },
      { path: 'kyc', loadComponent: () => ... },
    ]
  },

  // Owner routes - LAZY LOADED
  {
    path: 'owner',
    loadComponent: () => import('./owner/layout/layout.component'),
    canActivate: [ownerGuard],
    children: [
      { path: 'dashboard', loadComponent: () => ... },
      { path: 'billboards', loadComponent: () => ... },
      { path: 'bookings', loadComponent: () => ... },
      { path: 'earnings', loadComponent: () => ... },
      { path: 'wallet', loadComponent: () => ... },
      { path: 'settings', loadComponent: () => ... },
    ]
  },

  // Advertiser routes - LAZY LOADED
  {
    path: 'advertiser',
    loadComponent: () => import('./advertiser/layout/layout.component'),
    canActivate: [advertiserGuard],
    children: [
      { path: 'dashboard', loadComponent: () => ... },
      { path: 'browse', loadComponent: () => ... },
      { path: 'favorites', loadComponent: () => ... },
      { path: 'bookings', loadComponent: () => ... },
      { path: 'campaigns', loadComponent: () => ... },
      { path: 'settings', loadComponent: () => ... },
    ]
  },

  { path: '**', redirectTo: '/signin' }
];
```

---

## 6. Admin Module

### Dashboard Overview

The Admin Dashboard provides a comprehensive view of platform metrics:

```
+------------------------------------------------------------------+
|                      ADMIN DASHBOARD                              |
+------------------------------------------------------------------+
|                                                                    |
|   +------------+   +------------+   +------------+   +------------+|
|   | Total Users|   |Total Owners|   |Advertisers |   |Pending KYC ||
|   |    150     |   |     45     |   |    105     |   |     8      ||
|   +------------+   +------------+   +------------+   +------------+|
|                                                                    |
|   +------------+   +------------+   +------------+   +------------+|
|   | Billboards |   |  Bookings  |   |  Revenue   |   |  Active    ||
|   |    230     |   |    512     |   | Rs.2.5M    |   |    28      ||
|   +------------+   +------------+   +------------+   +------------+|
|                                                                    |
|   +---------------------------+   +------------------------------+ |
|   |    REVENUE CHART          |   |   BOOKINGS BY STATUS         | |
|   |    (ECharts)              |   |   (Pie Chart)                | |
|   +---------------------------+   +------------------------------+ |
|                                                                    |
|   +---------------------------+   +------------------------------+ |
|   |   TOP ADVERTISERS         |   |   BILLBOARD TYPE DEMAND      | |
|   |   (Table)                 |   |   (Bar Chart)                | |
|   +---------------------------+   +------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

### Admin Features

| Feature | Path | Description |
|---------|------|-------------|
| **Dashboard** | `/admin/dashboard` | Platform overview with KPIs |
| **Billboards** | `/admin/billboards` | View, block/unblock billboards |
| **Owners** | `/admin/owners` | Manage billboard owners |
| **Bookings** | `/admin/bookings` | View all bookings, audit trail |
| **Analytics** | `/admin/analytics` | Revenue charts, top cities, cancellations |
| **Wallet** | `/admin/wallet` | Commission earnings and withdrawals |
| **Bank Settings** | `/admin/bank-settings` | Admin bank account for withdrawals |
| **Settings** | `/admin/settings` | Platform settings (commission %, GST %) |
| **KYC** | `/admin/kyc` | Approve/reject owner KYC documents |

### AdminService API

```typescript
// User Management
getAllUsers(): Observable<AdminUser[]>
getAllOwnersWithStats(): Observable<OwnerStats[]>
getPendingKycUsers(): Observable<AdminUser[]>
blockUser(userId): Observable<any>
unblockUser(userId): Observable<any>
approveUserKyc(userId): Observable<any>
rejectUserKyc(userId): Observable<any>

// Booking Management
getAllBookings(status?): Observable<AdminBooking[]>
approveBooking(bookingId): Observable<any>
rejectBooking(bookingId): Observable<any>
getBookingAudit(bookingId): Observable<BookingAudit>

// Analytics
getDashboardStats(): Observable<DashboardStats>
getAnalytics(): Observable<AdminAnalytics>
getCancellationAnalytics(): Observable<CancellationAnalytics>
getRevenueChart(): Observable<ChartPoint[]>
getBookingsChart(): Observable<ChartPoint[]>
getTopCities(): Observable<{city: string; count: number}[]>
getBillboardTypes(): Observable<{type: string; demand: number}[]>
getTopAdvertisers(): Observable<{...}[]>

// Platform Settings
getPlatformSettings(): Observable<PlatformSettings>
updatePlatformSettings(settings): Observable<PlatformSettings>

// Wallet & Payouts
getAdminWallet(): Observable<AdminWallet>
getAdminWalletTransactions(): Observable<AdminWalletTransaction[]>
withdrawCommission(amount, notes?): Observable<AdminWithdrawalResponse>
getAllPayouts(): Observable<PayoutRequest[]>
approvePayout(payoutId, fundAccountId): Observable<PayoutRequest>
rejectPayout(payoutId, reason?): Observable<PayoutRequest>

// Billboard Management
getAllBillboards(): Observable<AdminBillboard[]>
blockBillboard(id): Observable<AdminBillboard>
unblockBillboard(id): Observable<AdminBillboard>

// Security
force2FAForAllUsers(): Observable<...>
disableForced2FA(): Observable<...>
getUserTwoFactorStatus(userId): Observable<...>
enforceTwoFactorForUser(userId): Observable<...>

// Reports
downloadUsersReportCsv(): void
downloadUsersReportPdf(): void
downloadBookingsReportCsv(): void
downloadBookingsReportPdf(): void
downloadRevenueReportCsv(): void
downloadRevenueReportPdf(): void
```

---

## 7. Owner Module

### Owner Dashboard

```
+------------------------------------------------------------------+
|                      OWNER DASHBOARD                              |
+------------------------------------------------------------------+
|                                                                    |
|   +------------+   +------------+   +------------+   +------------+|
|   | Earnings   |   | Billboards |   |  Bookings  |   |  Pending   ||
|   | Rs.45,000  |   |     8      |   |    25      |   |     3      ||
|   +------------+   +------------+   +------------+   +------------+|
|                                                                    |
|   +----------------------------------+                             |
|   |        MY BILLBOARDS             |                             |
|   |  +-------+  +-------+  +-------+ |                             |
|   |  |LED    |  |Static |  |Digital| |                             |
|   |  |Pune   |  |Mumbai |  |Delhi  | |                             |
|   |  +-------+  +-------+  +-------+ |                             |
|   +----------------------------------+                             |
|                                                                    |
|   +----------------------------------+                             |
|   |      PENDING REQUESTS            |                             |
|   | [Booking #123] Mumbai LED        |                             |
|   | Dates: Jan 15-20 | Rs.5,000      |                             |
|   | [APPROVE] [REJECT] [DISCOUNT]    |                             |
|   +----------------------------------+                             |
|                                                                    |
+------------------------------------------------------------------+
```

### Owner Features

| Feature | Path | Description |
|---------|------|-------------|
| **Dashboard** | `/owner/dashboard` | Earnings, stats, pending requests |
| **Billboards** | `/owner/billboards` | Add/edit/delete billboards, upload images |
| **Bookings** | `/owner/bookings` | View requests, approve/reject, apply discounts |
| **Earnings** | `/owner/earnings` | Revenue charts, billboard performance |
| **Wallet** | `/owner/wallet` | Balance, transactions, withdrawal requests |
| **Inbox** | `/owner/inbox` | System notifications |
| **Settings** | `/owner/settings` | Profile, bank account, security |

### Billboard Management

```typescript
// Billboard Types
type BillboardType = 'STATIC' | 'LED' | 'DIGITAL' | 'NEON';

// Create Billboard
interface CreateBillboardRequest {
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  type: BillboardType;
  size: string;
  pricePerDay: number;
}

// OwnerService Methods
getMyBillboards(): Observable<OwnerBillboard[]>
createBillboard(billboard): Observable<OwnerBillboard>
updateBillboard(id, billboard): Observable<OwnerBillboard>
deleteBillboard(id, force?): Observable<any>
toggleAvailability(id, available): Observable<OwnerBillboard>
uploadImages(billboardId, images: File[]): Observable<OwnerBillboard>
```

### Discount System

Owners can apply discounts (0-50%) to pending bookings:

```typescript
// Apply discount to booking
applyDiscount(bookingId, discountPercent): Observable<OwnerBooking>

// Remove discount
removeDiscount(bookingId): Observable<OwnerBooking>

// Get discount limits
getDiscountLimits(bookingId): Observable<DiscountLimits>

interface DiscountLimits {
  bookingId: number;
  isWeekend: boolean;
  maxDiscountPercent: number;       // Max 50% on weekends, 30% otherwise
  currentDiscountPercent: number;
  currentDiscountAmount: number;
  originalBaseAmount: number;
  currentTotal: number;
  commissionPercent: number;        // From platform settings
  gstPercent: number;
}
```

### Wallet & Payouts

```typescript
// Wallet
getWallet(): Observable<OwnerWallet>
getWalletTransactions(): Observable<WalletTransaction[]>

interface OwnerWallet {
  id: number;
  owner: { id, name, email };
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  updatedAt: string;
}

interface WalletTransaction {
  id: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reference: string;
  time: string;
}

// Payouts
requestPayout(amount): Observable<OwnerPayoutRequest>
getMyPayouts(): Observable<OwnerPayoutRequest[]>

// Bank Account
getBankAccount(): Observable<OwnerBankAccount>
saveBankAccount(request): Observable<OwnerBankAccount>
lookupIFSC(ifsc): Observable<IFSCLookupResponse>
```

---

## 8. Advertiser Module

### Advertiser Dashboard

```
+------------------------------------------------------------------+
|                    ADVERTISER DASHBOARD                           |
+------------------------------------------------------------------+
|                                                                    |
|   +------------+   +------------+   +------------+   +------------+|
|   | Bookings   |   |  Active    |   |  Pending   |   |   Spent    ||
|   |    15      |   |     5      |   |     2      |   | Rs.25,000  ||
|   +------------+   +------------+   +------------+   +------------+|
|                                                                    |
|   +----------------------------------+                             |
|   |    RECOMMENDED BILLBOARDS        |                             |
|   |  [Image] LED Screen, Pune        |                             |
|   |  Rs.1,500/day | [BOOK NOW]       |                             |
|   +----------------------------------+                             |
|                                                                    |
|   +----------------------------------+                             |
|   |      RECENT BOOKINGS             |                             |
|   | #123 | Mumbai LED | APPROVED     |                             |
|   | #122 | Delhi Static | PENDING    |                             |
|   | [VIEW] [PAY NOW] [CANCEL]        |                             |
|   +----------------------------------+                             |
|                                                                    |
+------------------------------------------------------------------+
```

### Advertiser Features

| Feature | Path | Description |
|---------|------|-------------|
| **Dashboard** | `/advertiser/dashboard` | Stats, recommendations, recent bookings |
| **Browse** | `/advertiser/browse` | Search billboards with filters and map |
| **Favorites** | `/advertiser/favorites` | Saved billboards |
| **Bookings** | `/advertiser/bookings` | My bookings with payment/cancellation |
| **Campaigns** | `/advertiser/campaigns` | Create and manage campaigns |
| **Inbox** | `/advertiser/inbox` | System notifications |
| **Settings** | `/advertiser/settings` | Profile, security, payment methods |

### Booking Flow

```
                            BOOKING FLOW
                            ============

    +--------+     +----------+     +----------+     +----------+
    | BROWSE |---->| SELECT   |---->| CHOOSE   |---->| PRICE    |
    | BOARDS |     | BILLBOARD|     | DATES    |     | PREVIEW  |
    +--------+     +----------+     +----------+     +----------+
                                                          |
                                                          v
    +--------+     +----------+     +----------+     +----------+
    |DOWNLOAD|<----| PAYMENT  |<----| RAZORPAY |<----| CONFIRM  |
    | INVOICE|     | SUCCESS  |     | CHECKOUT |     | BOOKING  |
    +--------+     +----------+     +----------+     +----------+
```

### Availability Calendar

```typescript
// Get day-wise availability
getAvailabilityCalendar(billboardId, startDate, endDate): Observable<DayAvailability[]>

interface DayAvailability {
  date: string;           // YYYY-MM-DD
  status: 'AVAILABLE' | 'BOOKED' | 'PENDING';
  price: number;          // Dynamic price (includes surge pricing)
}

// Calendar Color Coding
// GREEN  = AVAILABLE
// RED    = BOOKED
// YELLOW = PENDING (awaiting payment)
```

### Price Preview (Single Source of Truth)

**IMPORTANT**: All prices must come from the backend. Never calculate prices on the frontend.

```typescript
// Get complete price breakdown
getPricePreview(billboardId, startDate, endDate): Observable<PricePreviewResponse>

interface PricePreviewResponse {
  // Billboard info
  billboardId: number;
  billboardTitle: string;
  pricePerDay: number;

  // Booking dates
  startDate: string;
  endDate: string;
  totalDays: number;

  // Price breakdown
  originalBaseAmount: number;     // Before smart pricing
  baseAmount: number;             // After smart pricing
  demandSurgeApplied: boolean;    // High demand period
  weekendSurgeApplied: boolean;   // Weekend pricing

  // Commission
  commissionPercent: number;
  commissionAmount: number;

  // GST (split into CGST + SGST)
  gstPercent: number;
  gstAmount: number;
  cgstPercent: number;
  cgstAmount: number;
  sgstPercent: number;
  sgstAmount: number;
  taxableValue: number;

  // Total
  totalAmount: number;
  currency: string;

  // Discount (if owner applied)
  discountPercent: number;
  discountAmount: number;
  discountedBaseAmount: number;
  maxDiscountPercent: number;

  // Owner contact
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
}
```

### Favorites

```typescript
// Add to favorites
addToFavorites(billboardId): Observable<any>

// Remove from favorites
removeFromFavorites(billboardId): Observable<any>

// Get all favorites
getFavorites(): Observable<FavoriteBillboard[]>

// Check if billboard is favorited
isFavorite(billboardId): boolean
```

### Campaigns

```typescript
// Create campaign
createCampaign(campaign): Observable<Campaign>

interface CreateCampaignRequest {
  name: string;
  billboards: number;
  budget: number;
  startDate: string;
  endDate: string;
  cities: string[];
}

// Campaign management
getCampaigns(): Observable<Campaign[]>
pauseCampaign(id): Observable<Campaign>
resumeCampaign(id): Observable<Campaign>
getCampaignAnalytics(id): Observable<CampaignAnalytics>

interface CampaignAnalytics {
  campaignId: number;
  campaignName: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'DRAFT';
  budget: number;
  spent: number;
  impressions: number;
  cpm: number;                    // Cost per thousand impressions
  budgetUtilization: number;      // Percentage of budget used
  startDate: string;
  endDate: string;
}
```

---

## 9. Shared Components

### Reusable Components

| Component | Location | Description |
|-----------|----------|-------------|
| **AvailabilityCalendar** | `/shared/components/availability-calendar/` | Interactive calendar for date selection |
| **Breadcrumb** | `/shared/components/breadcrumb/` | Navigation breadcrumb |
| **EmailInbox** | `/shared/components/email-inbox/` | System notifications view |
| **EmailUpdate** | `/shared/components/email-update/` | Email change modal |
| **Invoice** | `/shared/components/invoice/` | Invoice preview modal |
| **LoginHistory** | `/shared/components/login-history/` | Login audit trail |
| **OwnerCalendar** | `/shared/components/owner-calendar/` | Revenue calendar for owners |
| **RecoveryCodes** | `/shared/components/recovery-codes/` | 2FA backup codes modal |
| **TwofaResetRequest** | `/shared/components/twofa-reset-request/` | 2FA reset request form |
| **TwofaSettings** | `/shared/components/twofa-settings/` | 2FA configuration |
| **WithdrawModal** | `/shared/components/withdraw-modal/` | Wallet withdrawal modal |

### Page Transitions

```typescript
// shared/animations/animations.ts

export const fadeAnimation = trigger('fadeAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('300ms ease-in', style({ opacity: 0 }))
  ])
]);

export const slideInAnimation = trigger('slideInAnimation', [
  transition(':enter', [
    style({ transform: 'translateX(-100%)' }),
    animate('300ms ease-out', style({ transform: 'translateX(0)' }))
  ])
]);
```

---

## 10. Services Layer

### Service Architecture

```
                        SERVICE LAYER
                        =============

    +------------------------------------------------------------------+
    |                         APP COMPONENT                             |
    +------------------------------------------------------------------+
                                   |
                                   v
    +------------------------------------------------------------------+
    |                         HTTP INTERCEPTOR                          |
    |   - Add Authorization header                                      |
    |   - Handle 401/403 errors                                         |
    |   - Format validation errors                                      |
    +------------------------------------------------------------------+
                                   |
            +----------------------+----------------------+
            |                      |                      |
            v                      v                      v
    +---------------+     +---------------+     +---------------+
    | AuthService   |     | AdminService  |     | OwnerService  |
    |               |     |               |     |               |
    | - login()     |     | - getUsers()  |     | - getBillbds()|
    | - register()  |     | - getStats()  |     | - getBookings()|
    | - verify2FA() |     | - blockUser() |     | - getWallet() |
    +---------------+     +---------------+     +---------------+
            |                      |                      |
            v                      v                      v
    +------------------------------------------------------------------+
    |                      HTTP CLIENT                                  |
    |                 (Angular HttpClient)                              |
    +------------------------------------------------------------------+
                                   |
                                   v
    +------------------------------------------------------------------+
    |                     BACKEND API                                   |
    |                 http://localhost:8080/api/*                       |
    +------------------------------------------------------------------+
```

### HTTP Interceptor

```typescript
// interceptors/auth.interceptor.ts

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('boabp_token');
  const router = inject(Router);

  // Add Authorization header
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 - Session expired
      if (error.status === 401) {
        localStorage.removeItem('boabp_token');
        localStorage.removeItem('boabp_user');
        router.navigate(['/signin'], { queryParams: { expired: 'true' } });
      }

      // Handle 403 - Forbidden
      if (error.status === 403) {
        return throwError(() => ({
          error: { message: 'You do not have permission to perform this action.' }
        }));
      }

      // Handle 400 - Validation errors
      if (error.status === 400) {
        const message = extractValidationErrors(error);
        return throwError(() => ({ error: { message, fieldErrors: error.error?.fieldErrors } }));
      }

      // Handle 500 - Server error
      if (error.status === 500) {
        return throwError(() => ({
          error: { message: 'An unexpected error occurred. Please try again later.' }
        }));
      }

      // Handle network error
      if (error.status === 0) {
        return throwError(() => ({
          error: { message: 'Unable to connect to server. Check your connection.' }
        }));
      }

      return throwError(() => error);
    })
  );
};
```

---

## 11. State Management

### BehaviorSubject Pattern

The application uses **RxJS BehaviorSubjects** for local state management:

```typescript
// owner.service.ts

@Injectable({ providedIn: 'root' })
export class OwnerService {
  // Billboards state
  private billboardsSubject = new BehaviorSubject<OwnerBillboard[]>([]);
  billboards$ = this.billboardsSubject.asObservable();

  // Bookings state
  private bookingsSubject = new BehaviorSubject<OwnerBooking[]>([]);
  bookings$ = this.bookingsSubject.asObservable();

  // Loading state
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  // Fetch and update state
  getMyBillboards(): Observable<OwnerBillboard[]> {
    this.loadingSubject.next(true);
    return this.http.get<OwnerBillboard[]>(`${this.apiUrl}/billboards`).pipe(
      tap(billboards => {
        this.billboardsSubject.next(billboards);  // Update state
        this.loadingSubject.next(false);
      })
    );
  }

  // Optimistic update on create
  createBillboard(billboard): Observable<OwnerBillboard> {
    return this.http.post<OwnerBillboard>(`${this.apiUrl}/billboards`, billboard).pipe(
      tap(newBillboard => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next([newBillboard, ...current]);  // Add to state
      })
    );
  }

  // Optimistic update on delete
  deleteBillboard(id): Observable<any> {
    return this.http.delete(`${this.apiUrl}/billboards/${id}`).pipe(
      tap(() => {
        const current = this.billboardsSubject.value;
        this.billboardsSubject.next(current.filter(b => b.id !== id));  // Remove from state
      })
    );
  }
}
```

### Signals (Angular 16+)

The `AuthService` uses Angular Signals for reactive state:

```typescript
// auth.service.ts

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Signal for current user
  private currentUserSignal = signal<User | null>(null);

  // Computed signals
  currentUser = computed(() => this.currentUserSignal());
  isLoggedIn = computed(() => this.currentUserSignal() !== null);
  isAdmin = computed(() => this.currentUserSignal()?.role === 'admin');

  // Update user
  setUser(user: User): void {
    this.currentUserSignal.set(user);
    localStorage.setItem('boabp_user', JSON.stringify(user));
  }

  // Logout
  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem('boabp_user');
    localStorage.removeItem('boabp_token');
  }
}
```

---

## 12. Payment Integration

### Razorpay Integration

The application integrates **Razorpay** for payment processing:

```
                        PAYMENT FLOW
                        ============

    +----------+     +----------+     +----------+     +----------+
    |  CREATE  |---->|  CREATE  |---->| RAZORPAY |---->|  VERIFY  |
    | BOOKING  |     |   ORDER  |     | CHECKOUT |     | PAYMENT  |
    +----------+     +----------+     +----------+     +----------+
         |                |                |                |
         v                v                v                v
    [Frontend]      [Backend API]    [Razorpay SDK]   [Backend API]
    POST /bookings  POST /payments/  window.Razorpay  POST /payments/
                    create-order     .open()          verify
```

### PaymentService

```typescript
// services/payment.service.ts

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;
  private razorpayKeyId = environment.razorpayKeyId;

  // Step 1: Create Razorpay order
  createOrder(bookingId: number): Observable<RazorpayOrder> {
    return this.http.post<RazorpayOrder>(`${this.apiUrl}/create-order`, { bookingId });
  }

  // Step 2: Open Razorpay checkout
  openCheckout(
    order: RazorpayOrder,
    userDetails: { name, email, phone },
    onSuccess: (response) => void,
    onError: (error) => void,
    onDismiss?: () => void
  ): Observable<void> {
    return from(this.loadRazorpayScript()).pipe(
      switchMap(() => {
        return new Observable<void>((observer) => {
          const options: RazorpayOptions = {
            key: order.keyId || this.razorpayKeyId,
            amount: Math.round(order.amount * 100),  // Paise
            currency: order.currency || 'INR',
            name: 'Billboard Booking',
            description: `Payment for Booking #${order.bookingId}`,
            order_id: order.orderId,
            handler: (response) => {
              onSuccess(response);
              observer.complete();
            },
            prefill: userDetails,
            theme: { color: '#3399cc' },
            modal: { ondismiss: () => { onDismiss?.(); observer.complete(); } }
          };

          const razorpay = new window.Razorpay(options);
          razorpay.open();
        });
      })
    );
  }

  // Step 3: Verify payment
  verifyPayment(verification: PaymentVerificationRequest): Observable<PaymentVerificationResponse> {
    return this.http.post<PaymentVerificationResponse>(`${this.apiUrl}/verify`, verification);
  }

  // Dynamically load Razorpay script
  private loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
      document.body.appendChild(script);
    });
  }
}
```

### Interfaces

```typescript
interface RazorpayOrder {
  orderId: string;
  keyId: string;
  bookingId: number;
  amount: number;           // In rupees
  currency: string;
  receipt: string;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentVerificationRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface PaymentVerificationResponse {
  id: number;
  paymentStatus: 'NOT_PAID' | 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  razorpayPaymentId: string;
  paymentDate: string;
  // ... booking details
}
```

---

## 13. Maps & Geolocation

### Leaflet Integration

The application uses **Leaflet** for interactive maps:

```typescript
// Billboard location selection
import * as L from 'leaflet';

// Initialize map
const map = L.map('map').setView([18.5204, 73.8567], 12);  // Pune coordinates

// Add tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Add billboard markers
billboards.forEach(billboard => {
  const marker = L.marker([billboard.latitude, billboard.longitude])
    .addTo(map)
    .bindPopup(`
      <b>${billboard.title}</b><br>
      ${billboard.location}<br>
      Rs.${billboard.pricePerDay}/day
    `);
});
```

### Heatmap for Revenue Analytics

```typescript
import 'leaflet.heat';

// Revenue heatmap points
interface HeatmapPoint {
  latitude: number;
  longitude: number;
  intensity: number;  // Revenue-based intensity
}

// Add heatmap layer
const heatData = heatmapPoints.map(p => [p.latitude, p.longitude, p.intensity]);
L.heatLayer(heatData, { radius: 25 }).addTo(map);
```

### Nearby Billboards Search

```typescript
// Get billboards within radius
getNearbyBillboards(lat: number, lng: number, radius: number): Observable<MapBillboard[]> {
  return this.http.get<MapBillboard[]>(`${this.apiUrl}/map/nearby`, {
    params: { lat: lat.toString(), lng: lng.toString(), radius: radius.toString() }
  });
}
```

---

## 14. Charts & Analytics

### ECharts Integration

The application uses **ngx-echarts** for data visualization:

```typescript
// Import in component
import { NgxEchartsModule } from 'ngx-echarts';
import * as echarts from 'echarts';

// Revenue chart options
revenueChartOptions: EChartsOption = {
  title: { text: 'Monthly Revenue', left: 'center' },
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  },
  yAxis: { type: 'value' },
  series: [{
    data: [12000, 18000, 22000, 35000, 28000, 45000],
    type: 'line',
    smooth: true,
    areaStyle: {}
  }]
};

// Booking status pie chart
bookingsPieOptions: EChartsOption = {
  title: { text: 'Bookings by Status', left: 'center' },
  tooltip: { trigger: 'item' },
  series: [{
    type: 'pie',
    radius: '50%',
    data: [
      { value: 45, name: 'Approved' },
      { value: 25, name: 'Pending' },
      { value: 15, name: 'Completed' },
      { value: 10, name: 'Cancelled' },
      { value: 5, name: 'Rejected' }
    ]
  }]
};

// Billboard type demand bar chart
demandChartOptions: EChartsOption = {
  xAxis: { type: 'category', data: ['LED', 'Static', 'Digital', 'Neon'] },
  yAxis: { type: 'value' },
  series: [{
    data: [120, 90, 75, 30],
    type: 'bar',
    itemStyle: { color: '#5470c6' }
  }]
};
```

### Template Usage

```html
<div echarts [options]="revenueChartOptions" class="chart"></div>
```

---

## 15. Security Features

### Security Components

| Component | Description |
|-----------|-------------|
| **TwofaSettings** | Enable/disable 2FA, choose method (Email OTP / Magic Link) |
| **RecoveryCodes** | Generate and view backup recovery codes |
| **LoginHistory** | View login audit trail with device/location info |
| **PasswordChange** | Change password with old password verification |

### Login History Tracking

```typescript
interface LoginHistoryEntry {
  id: number;
  email: string;
  ipAddress: string | null;
  loginAt: string;
  userAgent: string;
  twoFactorUsed?: boolean;
  status?: 'SUCCESS' | 'FAILED';
  city?: string;
  country?: string;
  risky?: boolean;         // Flagged as suspicious
}

// Get login history
getLoginHistory(): Observable<LoginHistoryEntry[]>
```

### Device Parsing

```typescript
// utils/device-parser.ts

export function parseUserAgent(userAgent: string): DeviceInfo {
  // Parse browser
  const browser = detectBrowser(userAgent);

  // Parse OS
  const os = detectOS(userAgent);

  // Parse device type
  const deviceType = detectDeviceType(userAgent);

  return { browser, os, deviceType };
}

// Display in login history
// "Chrome 120 on Windows 11"
// "Safari on iPhone iOS 17"
```

### Admin Security Controls

```typescript
// Force 2FA for all users
force2FAForAllUsers(): Observable<...>

// Disable forced 2FA
disableForced2FA(): Observable<...>

// Per-user 2FA management
getUserTwoFactorStatus(userId): Observable<...>
enforceTwoFactorForUser(userId): Observable<...>
disableTwoFactorForUser(userId): Observable<...>
resetTwoFactorForUser(userId): Observable<...>
```

---

## 16. API Integration

### Base URL Configuration

```typescript
// environments/environment.ts

export const environment = {
  production: false,
  apiUrl: '/api',                           // Proxied to backend
  razorpayKeyId: 'rzp_test_xxxxx'
};

// environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://api.billboard-platform.com/api',
  razorpayKeyId: 'rzp_live_xxxxx'
};
```

### Proxy Configuration (Development)

```json
// proxy.conf.json
{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

### API Endpoints by Module

```
Authentication:
  POST /api/auth/register
  POST /api/auth/login
  POST /api/auth/verify-email-otp
  POST /api/auth/magic-link/request
  POST /api/auth/magic-link/verify
  POST /api/auth/verify-recovery
  POST /api/auth/resend-otp

Admin:
  GET  /api/admin/dashboard/stats
  GET  /api/admin/users
  GET  /api/admin/owners
  GET  /api/admin/bookings
  GET  /api/admin/billboards
  GET  /api/admin/analytics/*
  GET  /api/admin/wallet
  GET  /api/admin/platform-settings
  POST /api/admin/users/:id/block
  POST /api/admin/users/:id/kyc-approve

Owner:
  GET  /api/owner/dashboard
  GET  /api/owner/billboards
  POST /api/owner/billboards
  GET  /api/owner/bookings
  POST /api/owner/bookings/:id/approve
  GET  /api/owner/wallet
  POST /api/owner/payouts/request

Advertiser:
  GET  /api/advertiser/dashboard
  GET  /api/advertiser/billboards
  GET  /api/advertiser/bookings
  POST /api/advertiser/bookings
  GET  /api/advertiser/bookings/price-preview
  GET  /api/advertiser/favourites
  POST /api/advertiser/favourites/:id
  GET  /api/advertiser/campaigns

Payments:
  POST /api/payments/create-order
  POST /api/payments/verify

Invoices:
  GET  /api/invoices/:bookingId
  GET  /api/invoices/:bookingId/pdf
```

---

## 17. Styling & UI

### UI Libraries

| Library | Purpose |
|---------|---------|
| **Bootstrap 5** | Grid system, utilities, base components |
| **ng-zorro-antd** | Advanced UI components (tables, modals, forms) |
| **Custom CSS** | Brand-specific styling |

### Global Styles

```css
/* styles.css */

:root {
  --primary-color: #3399cc;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
  --background-color: #f8f9fa;
}

/* Dashboard cards */
.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* Table styling */
.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--primary-color);
  color: white;
  padding: 12px;
}
```

### Responsive Design

```css
/* Mobile-first breakpoints */
@media (max-width: 576px) {
  .sidebar { display: none; }
  .main-content { margin-left: 0; }
}

@media (min-width: 768px) {
  .sidebar { width: 250px; }
  .main-content { margin-left: 250px; }
}

@media (min-width: 1200px) {
  .container { max-width: 1400px; }
}
```

---

## 18. Performance Optimizations

### Lazy Loading

All role-based modules are lazy-loaded:

```typescript
// Routes use loadComponent for lazy loading
{
  path: 'admin',
  loadComponent: () => import('./admin/layout/layout.component')
    .then(m => m.LayoutComponent),
  children: [
    {
      path: 'dashboard',
      loadComponent: () => import('./admin/components/dashboard/dashboard.component')
        .then(m => m.DashboardComponent)
    }
  ]
}
```

### Change Detection Optimization

```typescript
// Use OnPush change detection for performance
@Component({
  selector: 'app-billboard-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`
})
export class BillboardCardComponent {
  @Input() billboard!: Billboard;
}
```

### TrackBy for Lists

```html
<!-- Use trackBy for ngFor loops -->
<div *ngFor="let billboard of billboards; trackBy: trackById">
  {{ billboard.title }}
</div>
```

```typescript
trackById(index: number, item: Billboard): number {
  return item.id;
}
```

### Image Optimization

```typescript
// Use image paths from backend with proper sizing
getImageUrl(imagePath: string): string {
  return `${environment.apiUrl.replace('/api', '')}/${imagePath}`;
}

// Lazy load images
<img [src]="getImageUrl(billboard.imagePaths[0])" loading="lazy" />
```

---

## 19. Setup & Installation

### Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Angular CLI** >= 18.x

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/sarthakpawar0912/Billboarding-Angular.git
cd Billboarding-Angular/auth-app

# 2. Install dependencies
npm install

# 3. Start development server
npm start
# or
ng serve

# 4. Open browser
# Navigate to http://localhost:4200
```

### Backend Connection

Ensure the Spring Boot backend is running on `http://localhost:8080`:

```bash
# In the backend directory
./mvnw spring-boot:run
```

---

## 20. Environment Configuration

### Development Environment

```typescript
// src/environments/environment.ts

export const environment = {
  production: false,
  apiUrl: '/api',                           // Uses proxy
  razorpayKeyId: 'rzp_test_Rn2mKcXkCspKQh'  // Test key
};
```

### Production Environment

```typescript
// src/environments/environment.prod.ts

export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com/api',
  razorpayKeyId: 'rzp_live_xxxxxxxxxxxxx'   // Live key
};
```

### Proxy Configuration

```json
// proxy.conf.json (development only)

{
  "/api": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

### Angular.json Updates

```json
// angular.json

{
  "projects": {
    "auth-app": {
      "architect": {
        "serve": {
          "options": {
            "proxyConfig": "proxy.conf.json"
          }
        }
      }
    }
  }
}
```

---

## 21. Build & Deployment

### Development Build

```bash
# Start development server with proxy
ng serve --proxy-config proxy.conf.json

# Or using npm
npm start
```

### Production Build

```bash
# Build for production
ng build --configuration production

# Output will be in dist/auth-app/
```

### Docker Deployment

```dockerfile
# Dockerfile

# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist/auth-app/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Nginx Configuration

```nginx
# nginx.conf

server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
}
```

### Docker Compose

```yaml
# docker-compose.yml

version: '3.8'
services:
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - billboard-network

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - SPRING_DATASOURCE_URL=jdbc:mysql://db:3306/billboard
    depends_on:
      - db
    networks:
      - billboard-network

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: billboard
    volumes:
      - mysql-data:/var/lib/mysql
    networks:
      - billboard-network

networks:
  billboard-network:

volumes:
  mysql-data:
```

---

## Summary

The Billboard Advertising Platform frontend is a comprehensive Angular 18 application that provides:

- **Role-based dashboards** for Admin, Owner, and Advertiser
- **Secure authentication** with 2FA support (Email OTP, Magic Link)
- **Billboard management** with image upload and map integration
- **Smart booking system** with availability calendar and price preview
- **Payment integration** with Razorpay
- **Analytics dashboards** with ECharts visualizations
- **Wallet system** for owner earnings and withdrawals
- **Campaign management** for advertisers

The application follows Angular best practices including:
- Standalone components (no NgModules)
- Lazy loading for performance
- Functional route guards
- RxJS for state management
- HTTP interceptors for auth and error handling
- Responsive design with Bootstrap 5

---

## License

MIT License

## Author

Sarthak Pawar

## Links

- **Backend Repository**: [BillBoard-Application](https://github.com/sarthakpawar0912/BillBoard-Application-)
- **Frontend Repository**: [Billboarding-Angular](https://github.com/sarthakpawar0912/Billboarding-Angular)
