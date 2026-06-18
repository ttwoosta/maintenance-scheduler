import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Tabs, TabList, Tab, TabPanel, TabContent } from '@angular/aria/tabs';
import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
import { MaintenanceStore } from '../../services/maintenance-store';
import { MaintenanceTask, Recurrence } from '../../models/task.model';
import { TaskIconComponent } from '../../shared/task-icon.component';

type StatusKey = 'upcoming' | 'overdue' | 'history';

/**
 * SCREEN 2 — Scheduling & Status Notifications.
 *
 * Aria patterns:
 *  • Tabs    → switch between Upcoming / Overdue / History. ngTab manages
 *              aria-selected + roving focus (Arrow keys, Home/End).
 *  • Toolbar → per-task action strip. The recurrence picker is a
 *              ToolbarWidgetGroup of radios; the complete control is a
 *              ToolbarWidget toggle button exposing aria-pressed.
 */
@Component({
  selector: 'app-scheduling',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Tabs,
    TabList,
    Tab,
    TabPanel,
    TabContent,
    Toolbar,
    ToolbarWidget,
    ToolbarWidgetGroup,
    TaskIconComponent,
  ],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.css',
})
export class SchedulingComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly activeTab = signal<StatusKey>('upcoming');
  readonly recurrences: Recurrence[] = ['Weekly', 'Monthly', 'Quarterly'];

  private statusOf(task: MaintenanceTask): StatusKey {
    if (task.done) return 'history';
    return task.dueInDays < 0 ? 'overdue' : 'upcoming';
  }

  readonly upcoming = computed(() =>
    this.store.tasksForProperty().filter((t) => this.statusOf(t) === 'upcoming'),
  );
  readonly overdue = computed(() =>
    this.store.tasksForProperty().filter((t) => this.statusOf(t) === 'overdue'),
  );
  readonly history = computed(() =>
    this.store.tasksForProperty().filter((t) => this.statusOf(t) === 'history'),
  );

  tasksFor(tab: StatusKey): MaintenanceTask[] {
    return tab === 'upcoming' ? this.upcoming() : tab === 'overdue' ? this.overdue() : this.history();
  }

  dueLabel(task: MaintenanceTask): string {
    if (task.done) return 'Completed';
    if (task.dueInDays < 0) return `Overdue by ${-task.dueInDays} day${task.dueInDays === -1 ? '' : 's'}`;
    if (task.dueInDays === 0) return 'Due today';
    return `Due in ${task.dueInDays} day${task.dueInDays === 1 ? '' : 's'}`;
  }

  dueStatus(task: MaintenanceTask): 'done' | 'overdue' | 'today' | 'upcoming' {
    if (task.done) return 'done';
    if (task.dueInDays < 0) return 'overdue';
    if (task.dueInDays === 0) return 'today';
    return 'upcoming';
  }

  emptyText(tab: StatusKey): string {
    return tab === 'upcoming'
      ? 'No upcoming tasks — you’re all caught up.'
      : tab === 'overdue'
        ? 'Nothing overdue. Nice work.'
        : 'No completed tasks yet.';
  }
}
