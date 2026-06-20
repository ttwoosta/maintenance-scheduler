import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Listbox, Option } from '@angular/aria/listbox';
import { MaintenanceStore } from '../../services/maintenance-store';
import { AuthService } from '../../services/auth.service';
import { HomeComponent } from '../../screens/home/home.component';
import { TaskPrepComponent } from '../../screens/task-prep/task-prep.component';
import { SchedulingComponent } from '../../screens/scheduling/scheduling.component';
import { SmartPlanComponent } from '../../screens/smart-plan/smart-plan.component';
import { TaskEditorComponent } from '../../shared/task-editor.component';

type Screen = 'home' | 'prep' | 'schedule' | 'smart';

const DEFAULT_ACCENT = '#2F6B4F';

/**
 * Maintenance Scheduler app shell.
 *
 * One of the three apps in the Property Suite. Reached from the launcher home
 * at route `/maintenance` (guarded by `authGuard`). The brand mark links back to
 * the launcher (`routerLink="/"`).
 *
 * Responsive: a vertical side menu on wide viewports (iPad) collapses to a
 * bottom tab bar + header property chips on narrow ones (phone). Owns
 * navigation, theme, the property switcher (a horizontal/vertical Listbox) and
 * the single task-editor modal instance.
 *
 * The four screen components are self-contained and read shared state from the
 * MaintenanceStore (Firestore-backed) — the shell only routes between them.
 */
@Component({
  selector: 'app-maintenance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    Listbox,
    Option,
    HomeComponent,
    TaskPrepComponent,
    SchedulingComponent,
    SmartPlanComponent,
    TaskEditorComponent,
  ],
  templateUrl: './maintenance.component.html',
  styleUrl: './maintenance.component.css',
  host: {
    '[attr.data-theme]': 'theme()',
    // Accent override: only when non-default, so dark mode keeps its own tuned
    // primary. Mirrors the prototype's accentStyle behavior.
    '[style.--primary]': 'accentColor()',
    '[style.--primary-soft]': 'accentSoft()',
    '[style.--focus-ring]': 'accentColor()',
  },
})
export class MaintenanceComponent {
  protected readonly store = inject(MaintenanceStore);
  protected readonly auth = inject(AuthService);

  readonly screen = signal<Screen>('home');
  readonly theme = signal<'light' | 'dark'>('light');

  /** App-level config: show the "Get ready" prep section on Home. */
  readonly homeShowsPrep = signal(true);

  readonly accentColor = computed(() => {
    const a = this.store.accent();
    return a.toLowerCase() === DEFAULT_ACCENT.toLowerCase() ? null : a;
  });
  readonly accentSoft = computed(() => {
    const a = this.accentColor();
    return a ? `${a}24` : null;
  });

  readonly title = computed(
    () => ({ home: 'Home', prep: 'Task Prep', schedule: 'Schedule', smart: 'Smart Plan' })[this.screen()],
  );
  readonly subtitle = computed(
    () =>
      ({
        home: 'Your week at a glance',
        prep: 'Gather what you need before you start',
        schedule: 'Recurrence, upcoming & overdue work',
        smart: 'Plan around the time you actually have',
      })[this.screen()],
  );

  readonly nav: { key: Screen; label: string }[] = [
    { key: 'home', label: 'Home' },
    { key: 'prep', label: 'Prep' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'smart', label: 'Smart Plan' },
  ];

  onPropertyChange(values: readonly string[]) {
    if (values[0]) this.store.setProperty(values[0]);
  }

  toggleTheme() {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  readonly userName = computed(() => {
    const u = this.auth.user();
    if (!u) return '';
    return (u.displayName && u.displayName.trim()) || u.email || '';
  });

  readonly userInitials = computed(() => {
    const n = this.userName();
    if (!n) return '';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  });

  signOut() {
    this.auth.signOut();
  }
}
