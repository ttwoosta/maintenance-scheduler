import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Listbox, Option } from '@angular/aria/listbox';
import { MaintenanceStore } from './services/maintenance-store';
import { TaskPrepComponent } from './screens/task-prep/task-prep.component';
import { SchedulingComponent } from './screens/scheduling/scheduling.component';
import { SmartPlanComponent } from './screens/smart-plan/smart-plan.component';

type Screen = 'prep' | 'schedule' | 'smart';

/**
 * App shell: large-title header, property switcher (horizontal Listbox),
 * theme toggle, and a bottom tab bar that swaps the three screens.
 *
 * The three screen components are fully self-contained and reusable — the
 * shell only owns navigation + theme.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Listbox, Option, TaskPrepComponent, SchedulingComponent, SmartPlanComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  host: { '[attr.data-theme]': 'theme()' },
})
export class AppComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly screen = signal<Screen>('prep');
  readonly theme = signal<'light' | 'dark'>('light');

  readonly title = computed(
    () => ({ prep: 'Task Prep', schedule: 'Schedule', smart: 'Smart Plan' })[this.screen()],
  );
  readonly subtitle = computed(
    () =>
      ({
        prep: 'Gather what you need before you start',
        schedule: 'Recurrence, upcoming & overdue work',
        smart: 'Plan around the time you actually have',
      })[this.screen()],
  );

  readonly nav: { key: Screen; label: string }[] = [
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
}
