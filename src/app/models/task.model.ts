/**
 * Shared domain types for the Maintenance Scheduler.
 * These models are reused across all three apps in the platform
 * (Maintenance Scheduler, Expense Tracker, Communication Hub).
 */

export type Recurrence = 'Weekly' | 'Monthly' | 'Quarterly';

/** Duration bucket used by the Smart Plan view. */
export type Bucket = 'quick' | 'long';

/** The fixed set of task glyphs rendered by <app-task-icon>. */
export type IconKey =
  | 'lawn'
  | 'boiler'
  | 'gutter'
  | 'alarm'
  | 'filter'
  | 'radiator'
  | 'wrench';

export interface Property {
  id: string;
  name: string;
  /** Accent dot color shown in the property switcher. */
  dot: string;
}

export interface MaintenanceTask {
  id: string;
  /** UID of the user who created / owns this task. */
  ownerId: string;
  propertyId: string;
  name: string;
  iconKey: IconKey;
  /** Icon tile tint. */
  tint: string;
  /** Estimated minutes to complete. */
  durationMin: number;
  bucket: Bucket;
  recurrence: Recurrence;
  /** Days until due. Negative = overdue. */
  dueInDays: number;
  done: boolean;
}

/**
 * A single line in a task's prep checklist. Unlike the earlier boolean-only
 * model, an item now carries its own gathered state and an optional photo
 * (the "proof of prep" capture flow).
 */
export interface PrepItem {
  id: string;
  label: string;
  checked: boolean;
  /** Captured photo URL, or null. */
  photo: string | null;
}

/** Picker entry used by the task editor's Type field. */
export interface IconOption {
  key: IconKey;
  tint: string;
  label: string;
}

/** Editable shape used by the add / edit task dialog. */
export interface TaskDraft {
  name: string;
  iconKey: IconKey;
  tint: string;
  durationMin: number;
  dueInDays: number;
  recurrence: Recurrence;
}

/** A suggested time slot produced by the Smart Plan engine. */
export interface Slot {
  /** Stable value used by the combobox model. */
  value: string;
  label: string;
  weekend: boolean;
}

export interface DayOption {
  key: string;
  dow: string;
  num: string;
  short: string;
  weekend: boolean;
}
