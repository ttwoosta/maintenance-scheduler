/**
 * Shared domain types for the Maintenance Scheduler.
 * These models are reused across all three apps in the platform
 * (Maintenance Scheduler, Expense Tracker, Communication Hub).
 */

export type Recurrence = 'Weekly' | 'Monthly' | 'Quarterly';

/** Duration bucket used by the Smart Plan view. */
export type Bucket = 'quick' | 'long';

export interface Property {
  id: string;
  name: string;
  /** Accent dot color shown in the property switcher. */
  dot: string;
}

export interface MaintenanceTask {
  id: string;
  propertyId: string;
  name: string;
  /** Maps to a glyph in <app-task-icon>. */
  iconKey: 'lawn' | 'boiler' | 'gutter' | 'alarm' | 'filter' | 'radiator' | 'wrench';
  /** Icon tile tint. */
  tint: string;
  /** Estimated minutes to complete. */
  durationMin: number;
  bucket: Bucket;
  recurrence: Recurrence;
  /** Days until due. Negative = overdue. */
  dueInDays: number;
  done: boolean;
  /** Prep checklist — tools / supplies to gather before starting. */
  prep: string[];
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
