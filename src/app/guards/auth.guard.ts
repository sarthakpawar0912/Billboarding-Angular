import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/signin']);
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn() && authService.isAdmin()) {
    return true;
  }

  if (authService.isLoggedIn()) {
    router.navigate([authService.getRedirectUrl()]);
  } else {
    router.navigate(['/signin']);
  }
  return false;
};

export const ownerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (authService.isLoggedIn() && user?.role === 'billboard_owner') {
    return true;
  }

  if (authService.isLoggedIn()) {
    router.navigate([authService.getRedirectUrl()]);
  } else {
    router.navigate(['/signin']);
  }
  return false;
};

export const advertiserGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  if (authService.isLoggedIn() && user?.role === 'advertiser') {
    return true;
  }

  if (authService.isLoggedIn()) {
    router.navigate([authService.getRedirectUrl()]);
  } else {
    router.navigate(['/signin']);
  }
  return false;
};

export const guestGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return true;
  }

  router.navigate([authService.getRedirectUrl()]);
  return false;
};
