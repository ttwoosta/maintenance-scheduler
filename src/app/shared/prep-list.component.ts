import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import {
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
  AccordionContent,
} from '@angular/aria/accordion';
import { MaintenanceStore } from '../services/maintenance-store';
import { MaintenanceTask } from '../models/task.model';
import { TaskIconComponent } from './task-icon.component';

/**
 * Shared prep checklist — a keyboard-navigable Accordion of task cards, each
 * expanding to its gatherable items. Used by both the Home ("Get ready"
 * section) and the dedicated Task Prep screen.
 *
 * Aria pattern:
 *  • Accordion → ngAccordionTrigger/Panel/Content wire aria-expanded + region
 *                roles and inert collapsed content. We bind [(value)] so the
 *                set of open panels is shared signal state.
 *
 * The checklist rows are plain role="checkbox" buttons rather than a Listbox:
 * each row now hosts nested actions (capture / remove photo, delete item) that
 * a single listbox option cannot contain.
 */
@Component({
  selector: 'app-prep-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AccordionGroup, AccordionPanel, AccordionTrigger, AccordionContent, TaskIconComponent],
  templateUrl: './prep-list.component.html',
  styleUrl: './prep-list.component.css',
})
export class PrepListComponent {
  protected readonly store = inject(MaintenanceStore);

  /** Tasks to show prep for (Home passes its week subset; Prep passes all). */
  readonly tasks = input.required<MaintenanceTask[]>();

  /** Per-task draft text for the "add an item" field. */
  private readonly drafts = signal<Record<string, string>>({});

  draft(taskId: string): string {
    return this.drafts()[taskId] ?? '';
  }

  setDraft(taskId: string, text: string) {
    this.drafts.update((m) => ({ ...m, [taskId]: text }));
  }

  add(taskId: string) {
    this.store.addPrepItem(taskId, this.draft(taskId));
    this.setDraft(taskId, '');
  }

  onDraftKey(event: KeyboardEvent, taskId: string) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.add(taskId);
    }
  }

  allReady(task: MaintenanceTask): boolean {
    const total = this.store.prepTotal(task.id);
    return total > 0 && this.store.gatheredCount(task.id) === total;
  }

  badge(task: MaintenanceTask): string {
    const total = this.store.prepTotal(task.id);
    if (total === 0) return 'Add items';
    return this.allReady(task) ? 'Ready' : `${this.store.gatheredCount(task.id)}/${total}`;
  }

  metaLabel(task: MaintenanceTask): string {
    const total = this.store.prepTotal(task.id);
    return `${task.recurrence} · ${this.store.durationLabel(task.durationMin)} · ${total} item${total === 1 ? '' : 's'}`;
  }

  readyText(task: MaintenanceTask): string {
    const total = this.store.prepTotal(task.id);
    if (total === 0) return 'No items yet — add what you need below';
    if (this.allReady(task)) return 'All set — you’re ready to start';
    const remaining = total - this.store.gatheredCount(task.id);
    return `${remaining} item${remaining === 1 ? '' : 's'} still to gather`;
  }

  onFileSelected(event: Event, taskId: string, itemId: string) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.store.uploadPhoto(taskId, itemId, dataUrl);
      if (input) input.value = '';
    };
    reader.readAsDataURL(file);
  }
}
