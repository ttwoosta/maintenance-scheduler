import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
  AccordionContent,
} from '@angular/aria/accordion';
import { Listbox, Option } from '@angular/aria/listbox';
import { MaintenanceStore } from '../../services/maintenance-store';
import { MaintenanceTask } from '../../models/task.model';
import { TaskIconComponent } from '../../shared/task-icon.component';

/**
 * SCREEN 1 — Task Prep & Resource Reminders.
 *
 * Aria patterns:
 *  • Accordion  → each task's prep list expands/collapses, fully keyboard
 *                 navigable. ngAccordionPanel applies role="region" and
 *                 hides collapsed content from assistive tech via `inert`.
 *  • Listbox    → the checklist itself. selectionMode multi means Space/Enter
 *                 toggles an item; `aria-selected` is driven by the directive.
 */
@Component({
  selector: 'app-task-prep',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccordionGroup,
    AccordionPanel,
    AccordionTrigger,
    AccordionContent,
    Listbox,
    Option,
    TaskIconComponent,
  ],
  templateUrl: './task-prep.component.html',
  styleUrl: './task-prep.component.css',
})
export class TaskPrepComponent {
  protected readonly store = inject(MaintenanceStore);

  /** Indexes of gathered prep items — drives the Listbox `values` model. */
  selectedPrep(task: MaintenanceTask): number[] {
    return task.prep
      .map((_, i) => i)
      .filter((i) => this.store.isGathered(task.id, i));
  }

  onPrepChange(task: MaintenanceTask, values: readonly number[]) {
    this.store.setGatheredFor(task, values);
  }

  remaining(task: MaintenanceTask): number {
    return task.prep.length - this.store.gatheredCount(task);
  }

  metaLabel(task: MaintenanceTask): string {
    return `${task.recurrence} · ${this.store.durationLabel(task.durationMin)} · ${task.prep.length} items`;
  }
}
