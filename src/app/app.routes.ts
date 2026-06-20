import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

/**
 * Property Suite routes.
 *
 * The launcher is the home screen (`''`) — where users land after signing in.
 * Each app is a lazy-loaded sibling route guarded by `authGuard`, so the whole
 * suite shares the one Firebase session. `/login` is the only public route.
 */
export const routes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./screens/launcher/launcher.component').then((m) => m.LauncherComponent),
  },
  {
    path: 'rent',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./apps/rent-tracker/rent-tracker.component').then((m) => m.RentTrackerComponent),
  },
  {
    path: 'maintenance',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./apps/maintenance/maintenance.component').then((m) => m.MaintenanceComponent),
  },
  {
    path: 'tenant-bridge',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./apps/tenant-bridge/tenant-bridge.component').then((m) => m.TenantBridgeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./screens/login/login.component').then((m) => m.LoginComponent),
  },
  {
    // Example protected route — demonstrates authGuard on a page route.
    path: 'secure',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./screens/secure/secure.component').then((m) => m.SecureComponent),
  },
  { path: '**', redirectTo: '' },
];
