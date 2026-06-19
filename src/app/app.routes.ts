import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
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
];
