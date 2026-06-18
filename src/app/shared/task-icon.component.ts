import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaintenanceTask } from '../models/task.model';

/**
 * Small composable icon tile, reused across all three screens (and shareable
 * with the sibling apps). Pure presentation — no Aria behavior needed.
 */
@Component({
  selector: 'app-task-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-icon.component.html',
  styleUrl: './task-icon.component.css',
})
export class TaskIconComponent {
  readonly iconKey = input.required<MaintenanceTask['iconKey']>();
  readonly tint = input<string>('#6b7280');
}
