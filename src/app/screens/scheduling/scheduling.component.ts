import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Tabs, TabList, Tab, TabPanel, TabContent } from '@angular/aria/tabs';
import { Toolbar, ToolbarWidget, ToolbarWidgetGroup } from '@angular/aria/toolbar';
import { MaintenanceStore } from '../../services/maintenance-store';
import { MaintenanceTask } from '../../models/task.model';
import { TaskIconComponent } from '../../shared/task-icon.component';

type StatusKey = 'thisweek' | 'nextweek' | 'history';

/**
 * SCREEN 2 — Scheduling & Status Notifications.
 *
 * Aria patterns:
 *  • Tabs    → switch between This Week / Next Week / History. ngTab manages
 *              aria-selected + roving focus (Arrow keys, Home/End).
 *  • Toolbar → per-task action strip. The recurrence picker is a
 *              ToolbarWidgetGroup of radios; the complete control is a
 *              ToolbarWidget toggle button exposing aria-pressed.
 *
 * Open work is split by due window: This Week = due in <7 days (incl. overdue),
 * Next Week = 7+ days out, History = completed.
 */
@Component({
  selector: 'app-scheduling',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tabs, TabList, Tab, TabPanel, TabContent, Toolbar, ToolbarWidget, ToolbarWidgetGroup, TaskIconComponent],
  templateUrl: './scheduling.component.html',
  styleUrl: './scheduling.component.css',
})
export class SchedulingComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly activeTab = signal<StatusKey>('thisweek');

  private readonly open = computed(() => this.store.tasksForProperty().filter((t) => !t.done));

  readonly thisWeek = computed(() =>
    this.open()
      .filter((t) => t.dueInDays < 7)
      .sort((a, b) => a.dueInDays - b.dueInDays),
  );
  readonly nextWeek = computed(() =>
    this.open()
      .filter((t) => t.dueInDays >= 7)
      .sort((a, b) => a.dueInDays - b.dueInDays),
  );
  readonly history = computed(() => this.store.tasksForProperty().filter((t) => t.done));

  /** This Week count turns danger-colored when anything is overdue. */
  readonly hasOverdue = computed(() => this.open().some((t) => t.dueInDays < 0));

  tasksFor(tab: StatusKey): MaintenanceTask[] {
    return tab === 'thisweek' ? this.thisWeek() : tab === 'nextweek' ? this.nextWeek() : this.history();
  }

  setActiveTab(tab: string | undefined): void {
    this.activeTab.set((tab ?? this.activeTab()) as StatusKey);
  }

  emptyText(tab: StatusKey): string {
    return tab === 'thisweek'
      ? 'Nothing due this week — you’re all caught up.'
      : tab === 'nextweek'
        ? 'Nothing scheduled for next week yet.'
        : 'No completed tasks yet.';
  }
}
