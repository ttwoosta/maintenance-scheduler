import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional auth guard.
 *
 * Waits for the first Firebase `onAuthStateChanged` tick so a page-refresh
 * never incorrectly redirects an already-authenticated user to /login.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If auth has already resolved (common on soft navigations), decide instantly.
  if (authService.initialized()) {
    if (authService.isAuthenticated()) return true;
    return router.createUrlTree(['/login']);
  }

  // Otherwise wait for the first auth-state emission.
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (authService.initialized()) {
        clearInterval(interval);
        if (authService.isAuthenticated()) {
          resolve(true);
        } else {
          resolve(router.createUrlTree(['/login']));
        }
      }
    }, 10);
  });
};
