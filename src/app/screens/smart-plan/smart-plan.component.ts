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
 *  • Combobox → pick an alternate suggested slot. ngCombobox on the <input>
 *               exposes [(value)] and [(expanded)]; the popup is an ng-template
 *               with ngComboboxPopup containing a Listbox marked ngComboboxWidget
 *               so the Combobox can track aria-activedescendant.
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

  private readonly chosen = signal<Record<string, string>>({});
  private readonly queries = signal<Record<string, string>>({});
  private readonly expandeds = signal<Record<string, boolean>>({});
  private readonly groupExpandeds = signal<Record<string, boolean>>({ quick: true, long: true });

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

  filteredSlots(task: MaintenanceTask): Slot[] {
    const q = (this.queries()[task.id] ?? '').toLowerCase().trim();
    const all = this.store.slotsFor(task);
    return q ? all.filter((s) => s.label.toLowerCase().includes(q)) : all;
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

  getQuery(task: MaintenanceTask): string {
    const q = this.queries()[task.id];
    if (q !== undefined) return q;
    const slots = this.store.slotsFor(task);
    return slots.find((s) => s.value === this.chosenValue(task))?.label ?? '';
  }

  setQuery(task: MaintenanceTask, q: string): void {
    this.queries.update((m) => ({ ...m, [task.id]: q }));
  }

  isExpanded(task: MaintenanceTask): boolean {
    return this.expandeds()[task.id] ?? false;
  }

  setExpanded(task: MaintenanceTask, v: boolean): void {
    this.expandeds.update((m) => ({ ...m, [task.id]: v }));
  }

  getSelectedArray(task: MaintenanceTask): string[] {
    const v = this.chosenValue(task);
    return v ? [v] : [];
  }

  onCommit(task: MaintenanceTask, values: string[], combobox: Combobox): void {
    const value = values[0];
    if (value !== undefined) {
      this.chosen.update((m) => ({ ...m, [task.id]: value }));
      const label = this.store.slotsFor(task).find((s) => s.value === value)?.label ?? '';
      this.queries.update((m) => ({ ...m, [task.id]: label }));
    }
    this.expandeds.update((m) => ({ ...m, [task.id]: false }));
    combobox.element.focus();
  }

  isGroupExpanded(key: string): boolean {
    return this.groupExpandeds()[key] ?? true;
  }

  setGroupExpanded(key: string, v: boolean): void {
    this.groupExpandeds.update((m) => ({ ...m, [key]: v }));
  }

  isUnavailable(key: string): boolean {
    return this.store.unavailableDays().has(key);
  }

  metaLabel(task: MaintenanceTask): string {
    return `${this.store.durationLabel(task.durationMin)} · ${task.recurrence}`;
  }
}
