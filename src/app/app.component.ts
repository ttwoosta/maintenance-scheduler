import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';
import { LoginComponent } from './screens/login/login.component';

/**
 * Root shell for the Property Suite.
 *
 * Thin auth gate + router host. The three apps (Rent Tracker, Maintenance
 * Scheduler, TenantBridge) and the launcher all render through the single
 * `<router-outlet>` and share one Firebase session via `AuthService`:
 *
 *   - while auth is resolving → a spinner (never flicker to /login on refresh)
 *   - signed out             → `<app-login>` (plus the outlet for /login URLs)
 *   - signed in              → `<router-outlet>` renders the active route
 *
 * The launcher (`LauncherComponent`) is the home route (`''`) — i.e. the home
 * screen the user lands on after signing in. Each app is a guarded sibling
 * route (`/rent`, `/maintenance`, `/tenant-bridge`) and links back here.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, LoginComponent],
  template: `
    @if (!auth.initialized()) {
      <div class="auth-loading" role="status" aria-label="Loading…">
        <div class="auth-spinner"></div>
      </div>
    } @else if (!auth.isAuthenticated()) {
      <!-- Not signed in — render login inline (router-outlet handles /login URL) -->
      <app-login />
      <router-outlet />
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    :host { display: block; height: 100dvh; }
    .auth-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100dvh;
      background: var(--page-background, #f5f5f5);
    }
    .auth-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid var(--border, #e5e7eb);
      border-top-color: var(--primary, #2F6B4F);
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AppComponent {
  protected readonly auth = inject(AuthService);
}
