import { Routes } from '@angular/router';
// Only import auth components eagerly (needed for initial load)
import { SigninComponent } from './components/signin/signin.component';
import { SignupComponent } from './components/signup/signup.component';
import { ResetTwofaComponent } from './components/reset-twofa/reset-twofa.component';
import { MagicLinkComponent } from './components/magic-link/magic-link.component';
// Guards
import { adminGuard, ownerGuard, advertiserGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/signin', pathMatch: 'full' },
  { path: 'signin', component: SigninComponent, canActivate: [guestGuard] },
  { path: 'signup', component: SignupComponent, canActivate: [guestGuard] },
  { path: 'reset-2fa', component: ResetTwofaComponent, canActivate: [guestGuard] },
  { path: 'auth/magic-link', component: MagicLinkComponent, canActivate: [guestGuard] },
  // Admin routes - LAZY LOADED
  {
    path: 'admin',
    loadComponent: () => import('./admin/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./admin/components/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'billboards',
        loadComponent: () => import('./admin/components/billboards/billboards.component').then(m => m.BillboardsComponent)
      },
      {
        path: 'owners',
        loadComponent: () => import('./admin/components/owners/owners.component').then(m => m.OwnersComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./admin/components/bookings/bookings.component').then(m => m.BookingsComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./admin/components/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      {
        path: 'wallet',
        loadComponent: () => import('./admin/components/wallet/wallet.component').then(m => m.AdminWalletComponent)
      },
      {
        path: 'bank-settings',
        loadComponent: () => import('./admin/components/bank-settings/bank-settings.component').then(m => m.AdminBankSettingsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./admin/components/settings/settings.component').then(m => m.SettingsComponent)
      },
      {
        path: 'kyc',
        loadComponent: () => import('./admin/components/kyc/kyc.component').then(m => m.KycComponent)
      }
    ]
  },
  // Owner routes - LAZY LOADED
  {
    path: 'owner',
    loadComponent: () => import('./owner/layout/layout.component').then(m => m.OwnerLayoutComponent),
    canActivate: [ownerGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./owner/components/dashboard/dashboard.component').then(m => m.OwnerDashboardComponent)
      },
      {
        path: 'billboards',
        loadComponent: () => import('./owner/components/billboards/billboards.component').then(m => m.OwnerBillboardsComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./owner/components/bookings/bookings.component').then(m => m.OwnerBookingsComponent)
      },
      {
        path: 'earnings',
        loadComponent: () => import('./owner/components/earnings/earnings.component').then(m => m.OwnerEarningsComponent)
      },
      {
        path: 'wallet',
        loadComponent: () => import('./owner/components/wallet/wallet.component').then(m => m.OwnerWalletComponent)
      },
      {
        path: 'inbox',
        loadComponent: () => import('./shared/components/email-inbox/email-inbox.component').then(m => m.EmailInboxComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./owner/components/settings/settings.component').then(m => m.OwnerSettingsComponent)
      }
    ]
  },
  // Advertiser routes - LAZY LOADED
  {
    path: 'advertiser',
    loadComponent: () => import('./advertiser/layout/layout.component').then(m => m.AdvertiserLayoutComponent),
    canActivate: [advertiserGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./advertiser/components/dashboard/dashboard.component').then(m => m.AdvertiserDashboardComponent)
      },
      {
        path: 'browse',
        loadComponent: () => import('./advertiser/components/browse/browse.component').then(m => m.AdvertiserBrowseComponent)
      },
      {
        path: 'favorites',
        loadComponent: () => import('./advertiser/components/favorites/favorites.component').then(m => m.AdvertiserFavoritesComponent)
      },
      {
        path: 'bookings',
        loadComponent: () => import('./advertiser/components/bookings/bookings.component').then(m => m.AdvertiserBookingsComponent)
      },
      {
        path: 'campaigns',
        loadComponent: () => import('./advertiser/components/campaign/campaign-list.component').then(m => m.CampaignListComponent)
      },
      {
        path: 'campaigns/create',
        loadComponent: () => import('./advertiser/components/campaign/campaign-create.component').then(m => m.CampaignCreateComponent)
      },
      {
        path: 'campaigns/:id/analytics',
        loadComponent: () => import('./advertiser/components/campaign/campaign-analytics.component').then(m => m.CampaignAnalyticsComponent)
      },
      {
        path: 'inbox',
        loadComponent: () => import('./shared/components/email-inbox/email-inbox.component').then(m => m.EmailInboxComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./advertiser/components/settings/settings.component').then(m => m.AdvertiserSettingsComponent)
      }
    ]
  },
  { path: '**', redirectTo: '/signin' }
];
