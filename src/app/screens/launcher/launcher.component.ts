import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface AppCard {
  name: string;
  tag: string;
  desc: string;
  route: string;
  iconBg: string;
  icon: 'rent' | 'maint' | 'bridge';
}

/**
 * Launcher — the Property Suite home screen (route `''`).
 *
 * The screen the user lands on after signing in. Lists the three apps; each
 * card links to a guarded route. Responsive via a CSS container query: full
 * description cards on wide viewports, a compact icon grid on phones.
 *
 * Auth-aware: shows the signed-in user's initials and a sign-out action,
 * sharing the single Firebase session through `AuthService`.
 */
@Component({
  selector: 'app-launcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="launch-root">
      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">P</span>
          <span class="brand-name">Property Suite</span>
        </div>
        <span class="spacer"></span>
        <button class="profile" (click)="signOut()" [attr.aria-label]="'Sign out ' + userName()">
          <span class="avatar" aria-hidden="true">{{ userInitials() }}</span>
        </button>
      </header>

      <div class="body">
        <div class="inner">
          <h1 class="title">Your apps</h1>
          <p class="subtitle">Manage rent, maintenance, and tenants from one place. Pick an app to get started.</p>

          <div class="grid">
            @for (app of apps; track app.route) {
              <a class="card" [routerLink]="app.route">
                <span class="card-icon" [style.background]="app.iconBg">
                  @switch (app.icon) {
                    @case ('rent') {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18" /><path d="M5 21V8l7-4 7 4v13" /><path d="M9.5 21v-5h5v5" /></svg>
                    }
                    @case ('maint') {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" /></svg>
                    }
                    @case ('bridge') {
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-4a3 3 0 0 1 6 0v4" /><path d="M3 13.5h3M18 13.5h3" /></svg>
                    }
                  }
                </span>
                <div class="card-head">
                  <span class="card-name">{{ app.name }}</span>
                  <span class="card-tag">{{ app.tag }}</span>
                </div>
                <p class="card-desc">{{ app.desc }}</p>
              </a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; }
    .launch-root {
      container-type: inline-size;
      container-name: launch;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #FAFBFC;
      color: #111827;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
    }
    .topbar {
      flex: none;
      display: flex;
      align-items: center;
      gap: 14px;
      height: 62px;
      padding: 0 16px;
      background: #fff;
      border-bottom: 1px solid #ECECF1;
    }
    .brand { display: flex; align-items: center; gap: 11px; }
    .brand-mark {
      width: 34px; height: 34px;
      border-radius: 10px;
      background: linear-gradient(145deg, #6366F1, #4F46E5);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800; color: #fff;
      box-shadow: 0 4px 12px rgba(79,70,229,.45);
    }
    .brand-name { font-size: 16.5px; font-weight: 700; letter-spacing: -.2px; }
    .spacer { flex: 1; }
    .profile { border: none; background: none; padding: 0; cursor: pointer; }
    .avatar {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: #111827; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12.5px; font-weight: 700; letter-spacing: .5px;
    }
    .body { flex: 1; overflow-y: auto; padding: 24px 16px; }
    .inner { max-width: 760px; margin: 0 auto; }
    .title { margin: 0 0 6px; font-size: 23px; font-weight: 800; letter-spacing: -.6px; }
    .subtitle { margin: 0 0 22px; font-size: 14.5px; color: #9CA3AF; text-wrap: pretty; }

    /* Phone: compact icon grid (no description) */
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px 8px; }
    .card {
      display: flex; flex-direction: column; align-items: center; gap: 9px;
      padding: 10px 4px; border-radius: 14px;
      text-decoration: none; color: inherit;
    }
    .card-icon {
      width: 62px; height: 62px;
      border-radius: 17px;
      display: flex; align-items: center; justify-content: center; color: #fff;
    }
    .card-icon svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
    .card-head { display: contents; }
    .card-name { font-size: 12px; font-weight: 600; text-align: center; line-height: 1.25; }
    .card-tag, .card-desc { display: none; }

    /* Wide (iPad+): full description cards */
    @container launch (min-width: 620px) {
      .body { padding: 44px 24px; }
      .title { font-size: 28px; }
      .subtitle { margin-bottom: 28px; }
      .grid { grid-template-columns: 1fr 1fr; gap: 18px; }
      .card {
        flex-direction: column; align-items: stretch; gap: 0;
        background: #fff; border: 1px solid #ECECF1; border-radius: 18px;
        padding: 24px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
      }
      .card-icon { width: 60px; height: 60px; border-radius: 16px; margin-bottom: 15px; }
      .card-head { display: block; margin-bottom: 0; }
      .card-name { font-size: 17px; font-weight: 700; letter-spacing: -.2px; text-align: left; display: block; }
      .card-tag { display: block; font-size: 12.5px; font-weight: 600; color: #9CA3AF; margin-top: 3px; }
      .card-desc { display: block; margin: 13px 0 0; font-size: 14px; line-height: 1.5; color: #6B7280; text-wrap: pretty; }
    }
  `],
})
export class LauncherComponent {
  private readonly auth = inject(AuthService);

  readonly apps: AppCard[] = [
    {
      name: 'Rent Tracker', tag: 'Income & expenses',
      desc: 'Track rent, log expenses, and see income at a glance across every unit.',
      route: '/rent', icon: 'rent', iconBg: 'linear-gradient(145deg,#6366F1,#4F46E5)',
    },
    {
      name: 'Maintenance Scheduler', tag: 'Tasks & turnovers',
      desc: 'Plan repairs, schedule turnovers, and keep prep checklists on track.',
      route: '/maintenance', icon: 'maint', iconBg: 'linear-gradient(145deg,#3C8B66,#2F6B4F)',
    },
    {
      name: 'TenantBridge', tag: 'Tenant communication',
      desc: 'Draft warm, context-aware messages and let AI nudge you to keep tenant relationships strong.',
      route: '/tenant-bridge', icon: 'bridge', iconBg: 'linear-gradient(150deg,#1E9CD7,#1577A5)',
    },
  ];

  readonly userName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    return (u.displayName && u.displayName.trim()) || u.email || '';
  });

  readonly userInitials = computed(() => {
    const n = this.userName();
    if (!n) return 'AM';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  signOut() {
    this.auth.signOut();
  }
}
