import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard that checks if user is authenticated before allowing access to protected routes.
 * Redirects to login page if not authenticated.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Redirect to login page with a return URL
  return router.parseUrl(`/login?returnUrl=${encodeURIComponent(state.url)}`);
};

/**
 * Auth guard that checks if user's email is verified.
 * Redirects to email verification page if not verified.
 */
export const emailVerifiedGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isEmailVerified()) {
    return true;
  }
  
  // Redirect to email verification page
  return router.parseUrl(`/verify-email?email=${encodeURIComponent(authService.getCurrentUserEmail() || '')}`);
};

/**
 * Guard that prevents authenticated users from accessing login/register pages.
 * Redirects to home page if already authenticated.
 */
export const guestOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
    return true;
  }
  
  // Redirect to home page if already logged in
  return router.parseUrl('/');
};
