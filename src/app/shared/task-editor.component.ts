import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Listbox, Option } from '@angular/aria/listbox';
import { MaintenanceStore } from '../services/maintenance-store';
import { IconKey, Recurrence } from '../models/task.model';
import { TaskIconComponent } from './task-icon.component';

/**
 * Add / edit task dialog. Rendered by the shell only while
 * `store.editor()` is non-null.
 *
 * Aria notes:
 *  • @angular/aria does not (yet) ship a dialog primitive, so focus management
 *    uses CDK's `cdkTrapFocus` (with auto-capture) — the one place we step
 *    outside Aria. Escape + backdrop click close the dialog.
 *  • The Type picker and the Repeats segmented control are single-select
 *    Listboxes, so arrow-key navigation + aria-selected come from the directive.
 */
@Component({
  selector: 'app-task-editor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkTrapFocus, Listbox, Option, TaskIconComponent],
  templateUrl: './task-editor.component.html',
  styleUrl: './task-editor.component.css',
})
export class TaskEditorComponent {
  protected readonly store = inject(MaintenanceStore);

  readonly editor = this.store.editor;
  readonly isEdit = computed(() => this.editor()?.mode === 'edit');
  readonly title = computed(() => (this.isEdit() ? 'Edit task' : 'New task'));

  onName(value: string) {
    this.store.patchDraft({ name: value });
  }

  onDuration(value: string) {
    this.store.patchDraft({ durationMin: Number(value) });
  }

  onDue(value: string) {
    this.store.patchDraft({ dueInDays: Number(value) });
  }

  onIconChange(values: readonly string[]) {
    if (values[0]) this.store.pickIcon(values[0] as IconKey);
  }

  onRecurrenceChange(values: readonly string[]) {
    if (values[0]) this.store.patchDraft({ recurrence: values[0] as Recurrence });
  }
}
