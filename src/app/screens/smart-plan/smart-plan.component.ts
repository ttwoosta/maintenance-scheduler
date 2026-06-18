import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Tree, TreeItem, TreeItemGroup } from '@angular/aria/tree';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { MaintenanceStore } from '../../services/maintenance-store';
import { Bucket, MaintenanceTask, Slot } from '../../models/task.model';
import { TaskIconComponent } from '../../shared/task-icon.component';

interface Group {
  key: Bucket;
  title: string;
  tasks: MaintenanceTask[];
}

/**
 * SCREEN 3 — Smart Prioritized Scheduling.
 *
 * NOT a month calendar — tasks are grouped by the time they need.
 *
 * Aria patterns:
 *  • Tree     → structured, navigable list. Group nodes (Quick / Long) are
 *               ngTreeItem with an ngTreeGroup of child task nodes; the
 *               directive wires aria-expanded, aria-level and Arrow-key nav.
 *  • Combobox → pick an alternate suggested slot. The popup is a Listbox of
 *               candidate slots filtered by the user's unavailable days.
 */
@Component({
  selector: 'app-smart-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Tree,
    TreeItem,
    TreeItemGroup,
    Combobox,
    ComboboxPopup,
    ComboboxWidget,
    Listbox,
    Option,
    TaskIconComponent,
  ],
  templateUrl: './smart-plan.component.html',
  styleUrl: './smart-plan.component.css',
})
export class SmartPlanComponent {
  protected readonly store = inject(MaintenanceStore);

  /** Per-task chosen slot value; defaults to the top suggestion. */
  private readonly chosen = signal<Record<string, string>>({});

  readonly groups = computed<Group[]>(() => {
    const active = this.store.tasksForProperty().filter((t) => !t.done);
    return [
      { key: 'quick', title: 'Quick — under 30 min', tasks: active.filter((t) => t.bucket === 'quick') },
      { key: 'long', title: 'Long — needs a block', tasks: active.filter((t) => t.bucket === 'long') },
    ];
  });

  slots(task: MaintenanceTask): Slot[] {
    return this.store.slotsFor(task);
  }

  chosenValue(task: MaintenanceTask): string {
    const slots = this.slots(task);
    const picked = this.chosen()[task.id];
    return picked && slots.some((s) => s.value === picked) ? picked : (slots[0]?.value ?? '');
  }

  suggestion(task: MaintenanceTask): string {
    const slots = this.slots(task);
    const sel = slots.find((s) => s.value === this.chosenValue(task));
    return sel ? `Suggested: ${sel.label}` : 'No free slot — adjust your days';
  }

  onPick(task: MaintenanceTask, value: string) {
    this.chosen.update((m) => ({ ...m, [task.id]: value }));
  }

  isUnavailable(key: string): boolean {
    return this.store.unavailableDays().has(key);
  }

  metaLabel(task: MaintenanceTask): string {
    return `${this.store.durationLabel(task.durationMin)} · ${task.recurrence}`;
  }
}
