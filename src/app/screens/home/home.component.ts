import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MaintenanceStore } from '../../services/maintenance-store';
import { MaintenanceTask } from '../../models/task.model';
import { TaskIconComponent } from '../../shared/task-icon.component';
import { PrepListComponent } from '../../shared/prep-list.component';

type HomeState = 'empty' | 'normal' | 'overdue';

/**
 * SCREEN 0 — Home / "at a glance".
 *
 * Surfaces the week's work in one of three states (empty / normal / overdue),
 * with a quick complete-toggle per task and an optional "Get ready" prep
 * section (reusing <app-prep-list>). Tapping a task opens the editor.
 *
 * Pure layout + the shared store — no new Aria primitives here.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TaskIconComponent, PrepListComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent {
  protected readonly store = inject(MaintenanceStore);

  /** Whether to show the "Get ready" prep section (app-level config). */
  readonly showPrep = input(true);

  /** This week's open work, soonest first. */
  private readonly thisWeek = computed(() =>
    this.store
      .tasksForProperty()
      .filter((t) => !t.done && t.dueInDays < 7)
      .sort((a, b) => a.dueInDays - b.dueInDays),
  );

  private readonly overdue = computed(() => this.thisWeek().filter((t) => t.dueInDays < 0));

  readonly state = computed<HomeState>(() =>
    this.overdue().length > 0 ? 'overdue' : this.thisWeek().length > 0 ? 'normal' : 'empty',
  );

  /** When overdue, the list narrows to just the overdue tasks. */
  readonly list = computed<MaintenanceTask[]>(() =>
    this.state() === 'overdue' ? this.overdue() : this.thisWeek(),
  );

  readonly heading = computed(() => (this.state() === 'overdue' ? 'Overdue' : 'This week'));

  readonly summary = computed(() => {
    if (this.state() === 'overdue') {
      const n = this.overdue().length;
      return `${n} task${n === 1 ? '' : 's'} need attention`;
    }
    const n = this.thisWeek().length;
    return `${n} task${n === 1 ? '' : 's'} this week`;
  });
}
