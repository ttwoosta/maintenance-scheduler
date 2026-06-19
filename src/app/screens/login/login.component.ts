import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="login-wrap">
      <div class="login-card">
        <h1 class="login-title">Maintenance<br>Scheduler</h1>

        @if (error()) {
          <p class="login-error" role="alert">{{ error() }}</p>
        }

        <form class="login-form" (ngSubmit)="submit()">
          <label class="login-field">
            <span>Email</span>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              autocomplete="email"
              required
              [attr.aria-describedby]="error() ? 'login-err' : null"
            />
          </label>

          <label class="login-field">
            <span>Password</span>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              autocomplete="current-password"
              required
            />
          </label>

          <div class="login-actions">
            <button type="submit" class="btn-primary" [disabled]="busy()">
              {{ busy() ? 'Signing in…' : 'Sign in' }}
            </button>
            <button type="button" class="btn-ghost" [disabled]="busy()" (click)="register()">
              Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100dvh;
      background: var(--surface, #f5f5f5);
    }
    .login-card {
      background: var(--card, #fff);
      border-radius: 16px;
      padding: 40px 32px;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .login-title {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.2;
      margin: 0 0 24px;
      color: var(--primary, #2F6B4F);
    }
    .login-error {
      background: #fef2f2;
      color: #b91c1c;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: .875rem;
      margin-bottom: 16px;
    }
    .login-form { display: flex; flex-direction: column; gap: 16px; }
    .login-field { display: flex; flex-direction: column; gap: 6px; font-size: .875rem; }
    .login-field input {
      border: 1px solid var(--border, #d1d5db);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 1rem;
      outline: none;
      transition: border-color .15s;
    }
    .login-field input:focus { border-color: var(--primary, #2F6B4F); }
    .login-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .btn-primary {
      background: var(--primary, #2F6B4F);
      color: #fff;
      border: none;
      border-radius: 8px;
      padding: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-ghost {
      background: transparent;
      color: var(--primary, #2F6B4F);
      border: 1px solid var(--primary, #2F6B4F);
      border-radius: 8px;
      padding: 12px;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
    }
    .btn-ghost:disabled { opacity: .6; cursor: not-allowed; }
  `],
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  readonly error = signal<string | null>(null);
  readonly busy = signal(false);

  async submit() {
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate(['/']);
    } catch (e: unknown) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }

  async register() {
    this.error.set(null);
    this.busy.set(true);
    try {
      await this.authService.signUp(this.email, this.password);
      this.router.navigate(['/']);
    } catch (e: unknown) {
      this.error.set(this.friendlyError(e));
    } finally {
      this.busy.set(false);
    }
  }

  private friendlyError(e: unknown): string {
    if (e && typeof e === 'object' && 'code' in e) {
      const code = (e as { code: string }).code;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Incorrect email or password.';
      if (code === 'auth/user-not-found') return 'No account found with that email.';
      if (code === 'auth/email-already-in-use') return 'An account with that email already exists.';
      if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
      if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
    }
    return 'Something went wrong. Please try again.';
  }
}
