import { Injectable, computed, signal } from '@angular/core';
import { DayOption, MaintenanceTask, Property, Recurrence, Slot } from '../models/task.model';

/**
 * Central signal store for the Maintenance Scheduler.
 *
 * Everything the three screens read is derived from signals here, so a single
 * `provideMaintenanceStore()` (or the default root provider below) keeps the
 * Prep, Schedule and Smart Plan views in sync. The same store shape can back
 * the sibling apps by swapping the seed data.
 */
@Injectable({ providedIn: 'root' })
export class MaintenanceStore {
  // ---- reference data ----
  readonly properties: Property[] = [
    { id: 'p1', name: 'Maple Court', dot: '#2F6B4F' },
    { id: 'p2', name: '12 Birch Lane', dot: '#3E8FD0' },
    { id: 'p3', name: 'Harbour View', dot: '#E08A3C' },
  ];

  readonly days: DayOption[] = [
    { key: 'd0', dow: 'TUE', num: '17', short: '17 Jun', weekend: false },
    { key: 'd1', dow: 'WED', num: '18', short: '18 Jun', weekend: false },
    { key: 'd2', dow: 'THU', num: '19', short: '19 Jun', weekend: false },
    { key: 'd3', dow: 'FRI', num: '20', short: '20 Jun', weekend: false },
    { key: 'd4', dow: 'SAT', num: '21', short: '21 Jun', weekend: true },
    { key: 'd5', dow: 'SUN', num: '22', short: '22 Jun', weekend: true },
    { key: 'd6', dow: 'MON', num: '23', short: '23 Jun', weekend: false },
  ];

  // ---- writable state ----
  readonly activePropertyId = signal('p1');
  readonly unavailableDays = signal<ReadonlySet<string>>(new Set(['d4']));

  private readonly tasks = signal<MaintenanceTask[]>([
    { id: 'mc-lawn', propertyId: 'p1', name: 'Mow the lawn', iconKey: 'lawn', tint: '#4CA57C', durationMin: 25, bucket: 'quick', recurrence: 'Weekly', dueInDays: 2, done: false, prep: ['Petrol can filled', 'Engine oil level', 'Tyre pressure ~22 psi', 'Safety goggles', 'Grass collection bags'] },
    { id: 'mc-boiler', propertyId: 'p1', name: 'Service the boiler', iconKey: 'boiler', tint: '#E08A3C', durationMin: 180, bucket: 'long', recurrence: 'Quarterly', dueInDays: -3, done: false, prep: ['Boiler service kit', 'CO test meter', 'Replacement seals & gaskets', 'Service log book'] },
    { id: 'mc-gutter', propertyId: 'p1', name: 'Clean the gutters', iconKey: 'gutter', tint: '#3E8FD0', durationMin: 150, bucket: 'long', recurrence: 'Quarterly', dueInDays: 9, done: false, prep: ['Extension ladder', 'Gutter scoop', 'Heavy-duty gloves', 'Bucket & hose', 'Spotter on site'] },
    { id: 'mc-alarm', propertyId: 'p1', name: 'Test smoke alarms', iconKey: 'alarm', tint: '#D9544D', durationMin: 15, bucket: 'quick', recurrence: 'Monthly', dueInDays: -1, done: false, prep: ['9V batteries ×4', 'Step stool', 'Alarm test tool'] },
    { id: 'mc-filter', propertyId: 'p1', name: 'Replace AC filter', iconKey: 'filter', tint: '#7C6BC4', durationMin: 10, bucket: 'quick', recurrence: 'Monthly', dueInDays: 5, done: false, prep: ['16×25×1 filter', 'Vacuum / soft brush'] },
    { id: 'mc-rad', propertyId: 'p1', name: 'Bleed the radiators', iconKey: 'radiator', tint: '#C99A2E', durationMin: 20, bucket: 'quick', recurrence: 'Quarterly', dueInDays: -10, done: true, prep: ['Radiator key', 'Cloth & drip tray'] },
    { id: 'bl-lawn', propertyId: 'p2', name: 'Mow the lawn', iconKey: 'lawn', tint: '#4CA57C', durationMin: 30, bucket: 'quick', recurrence: 'Weekly', dueInDays: 1, done: false, prep: ['Petrol can filled', 'Tyre pressure ~22 psi', 'Grass bags'] },
    { id: 'bl-hedge', propertyId: 'p2', name: 'Trim the hedges', iconKey: 'wrench', tint: '#5FA855', durationMin: 90, bucket: 'long', recurrence: 'Monthly', dueInDays: 4, done: false, prep: ['Hedge trimmer charged', 'Extension lead', 'Tarp & rake', 'Goggles & gloves'] },
    { id: 'bl-boiler', propertyId: 'p2', name: 'Service the boiler', iconKey: 'boiler', tint: '#E08A3C', durationMin: 180, bucket: 'long', recurrence: 'Quarterly', dueInDays: -2, done: false, prep: ['Boiler service kit', 'CO test meter', 'Service log book'] },
    { id: 'hv-gutter', propertyId: 'p3', name: 'Clean the gutters', iconKey: 'gutter', tint: '#3E8FD0', durationMin: 120, bucket: 'long', recurrence: 'Quarterly', dueInDays: 6, done: false, prep: ['Extension ladder', 'Gutter scoop', 'Gloves', 'Bucket'] },
    { id: 'hv-alarm', propertyId: 'p3', name: 'Test smoke alarms', iconKey: 'alarm', tint: '#D9544D', durationMin: 15, bucket: 'quick', recurrence: 'Monthly', dueInDays: 3, done: false, prep: ['9V batteries ×3', 'Step stool'] },
    { id: 'hv-paint', propertyId: 'p3', name: 'Touch up window paint', iconKey: 'wrench', tint: '#9A8B6B', durationMin: 240, bucket: 'long', recurrence: 'Quarterly', dueInDays: -5, done: false, prep: ['Exterior paint', 'Sandpaper & filler', 'Brushes & tape', 'Dust sheets'] },
  ]);

  /** Per-task set of gathered prep items (`taskId:index`). */
  private readonly gathered = signal<ReadonlySet<string>>(new Set(['mc-lawn:0', 'mc-lawn:3']));

  // ---- derived ----
  readonly tasksForProperty = computed(() =>
    this.tasks().filter((t) => t.propertyId === this.activePropertyId()),
  );

  // ---- selectors ----
  isGathered(taskId: string, index: number): boolean {
    return this.gathered().has(`${taskId}:${index}`);
  }

  gatheredCount(task: MaintenanceTask): number {
    return task.prep.reduce((n, _, i) => n + (this.isGathered(task.id, i) ? 1 : 0), 0);
  }

  /** Format a duration for display, e.g. `25 min`, `~3 hr`. */
  durationLabel(min: number): string {
    if (min < 60) return `${min} min`;
    const h = min / 60;
    return `~${min % 60 ? h.toFixed(1) : h.toFixed(0)} hr`;
  }

  /** Candidate slots, ordered + filtered by the user's unavailable days. */
  slotsFor(task: MaintenanceTask): Slot[] {
    const unavailable = this.unavailableDays();
    const time = task.bucket === 'long' ? 'AM · half-day block' : '8:30 AM';
    return this.days
      .filter((d) => !unavailable.has(d.key))
      .sort((a, b) => {
        const aw = a.weekend ? 1 : 0;
        const bw = b.weekend ? 1 : 0;
        return task.bucket === 'long' ? bw - aw : aw - bw;
      })
      .slice(0, 5)
      .map((d) => ({
        value: d.key,
        label: `${d.dow[0]}${d.dow.slice(1).toLowerCase()} ${d.short} · ${time}`,
        weekend: d.weekend,
      }));
  }

  // ---- mutations ----
  setProperty(id: string) {
    this.activePropertyId.set(id);
  }

  togglePrep(taskId: string, index: number) {
    const key = `${taskId}:${index}`;
    this.gathered.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /** Sync the gathered set from a Listbox `values` model (selected = gathered). */
  setGatheredFor(task: MaintenanceTask, selectedIndexes: readonly number[]) {
    this.gathered.update((set) => {
      const next = new Set(set);
      task.prep.forEach((_, i) => next.delete(`${task.id}:${i}`));
      selectedIndexes.forEach((i) => next.add(`${task.id}:${i}`));
      return next;
    });
  }

  toggleDone(taskId: string) {
    this.tasks.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
    );
  }

  setRecurrence(taskId: string, recurrence: Recurrence) {
    this.tasks.update((list) =>
      list.map((t) => (t.id === taskId ? { ...t, recurrence } : t)),
    );
  }

  toggleDayUnavailable(key: string) {
    this.unavailableDays.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
}
