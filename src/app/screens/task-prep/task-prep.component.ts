import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MaintenanceStore } from '../../services/maintenance-store';
import { PrepListComponent } from '../../shared/prep-list.component';

/**
 * SCREEN 1 — Task Prep & Resource Reminders.
 *
 * A thin wrapper: a "New task" action plus the shared <app-prep-list>
 * Accordion showing every task on the active property. The checklist behavior
 * (gather, capture photo, add / remove items) lives in PrepListComponent so
 * the Home screen can reuse it.
 */
@Component({
  selector: 'app-task-prep',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PrepListComponent],
  templateUrl: './task-prep.component.html',
  styleUrl: './task-prep.component.css',
})
export class TaskPrepComponent {
  protected readonly store = inject(MaintenanceStore);
}
