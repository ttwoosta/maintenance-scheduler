import { Injectable, computed, signal } from '@angular/core';
import {
  Bucket,
  DayOption,
  IconKey,
  IconOption,
  MaintenanceTask,
  PrepItem,
  Property,
  Recurrence,
  Slot,
  TaskDraft,
} from '../models/task.model';

/** Demo photos cycled through by the "take photo" prep flow. */
const DEMO_PHOTOS = [
  'demo-photos/01.png',
  'demo-photos/02.png',
  'demo-photos/03.png',
  'demo-photos/04.png',
  'demo-photos/05.png',
  'demo-photos/06.png',
];

/**
 * Central signal store for the Maintenance Scheduler.
 *
 * Everything the screens read is derived from signals here, so a single root
 * provider keeps the Home, Prep, Schedule and Smart Plan views in sync. The
 * same store shape can back the sibling apps by swapping the seed data.
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

  /** Task types offered by the editor's Type picker. */
  readonly iconOptions: IconOption[] = [
    { key: 'lawn', tint: '#4CA57C', label: 'Lawn / garden' },
    { key: 'boiler', tint: '#E08A3C', label: 'Boiler / heating' },
    { key: 'gutter', tint: '#3E8FD0', label: 'Gutters / water' },
    { key: 'alarm', tint: '#D9544D', label: 'Alarm / safety' },
    { key: 'filter', tint: '#7C6BC4', label: 'Filter / air' },
    { key: 'radiator', tint: '#C99A2E', label: 'Radiator' },
    { key: 'wrench', tint: '#5FA855', label: 'General / other' },
  ];

  readonly recurrences: Recurrence[] = ['Weekly', 'Monthly', 'Quarterly'];

  // ---- writable state ----
  readonly activePropertyId = signal('p1');
  readonly unavailableDays = signal<ReadonlySet<string>>(new Set(['d4']));

  /**
   * Platform accent. Swapping this re-tints --primary across every screen
   * (see AppComponent, which writes it to the host as a CSS custom property).
   */
  readonly accent = signal('#2F6B4F');

  /**
   * Add / edit task dialog state. Lives in the store so any screen can open it
   * while the shell owns the single modal instance. `null` = closed.
   */
  readonly editor = signal<{ mode: 'add' | 'edit'; id: string | null; draft: TaskDraft } | null>(null);

  private readonly tasks = signal<MaintenanceTask[]>([
    { id: 'mc-lawn', propertyId: 'p1', name: 'Mow the lawn', iconKey: 'lawn', tint: '#4CA57C', durationMin: 25, bucket: 'quick', recurrence: 'Weekly', dueInDays: 2, done: false },
    { id: 'mc-boiler', propertyId: 'p1', name: 'Service the boiler', iconKey: 'boiler', tint: '#E08A3C', durationMin: 180, bucket: 'long', recurrence: 'Quarterly', dueInDays: -3, done: false },
    { id: 'mc-gutter', propertyId: 'p1', name: 'Clean the gutters', iconKey: 'gutter', tint: '#3E8FD0', durationMin: 150, bucket: 'long', recurrence: 'Quarterly', dueInDays: 9, done: false },
    { id: 'mc-alarm', propertyId: 'p1', name: 'Test smoke alarms', iconKey: 'alarm', tint: '#D9544D', durationMin: 15, bucket: 'quick', recurrence: 'Monthly', dueInDays: -1, done: false },
    { id: 'mc-filter', propertyId: 'p1', name: 'Replace AC filter', iconKey: 'filter', tint: '#7C6BC4', durationMin: 10, bucket: 'quick', recurrence: 'Monthly', dueInDays: 5, done: false },
    { id: 'mc-rad', propertyId: 'p1', name: 'Bleed the radiators', iconKey: 'radiator', tint: '#C99A2E', durationMin: 20, bucket: 'quick', recurrence: 'Quarterly', dueInDays: -10, done: true },
    { id: 'bl-lawn', propertyId: 'p2', name: 'Mow the lawn', iconKey: 'lawn', tint: '#4CA57C', durationMin: 30, bucket: 'quick', recurrence: 'Weekly', dueInDays: 1, done: false },
    { id: 'bl-hedge', propertyId: 'p2', name: 'Trim the hedges', iconKey: 'wrench', tint: '#5FA855', durationMin: 90, bucket: 'long', recurrence: 'Monthly', dueInDays: 4, done: false },
    { id: 'bl-boiler', propertyId: 'p2', name: 'Service the boiler', iconKey: 'boiler', tint: '#E08A3C', durationMin: 180, bucket: 'long', recurrence: 'Quarterly', dueInDays: -2, done: false },
    { id: 'hv-gutter', propertyId: 'p3', name: 'Clean the gutters', iconKey: 'gutter', tint: '#3E8FD0', durationMin: 120, bucket: 'long', recurrence: 'Quarterly', dueInDays: 6, done: false },
    { id: 'hv-alarm', propertyId: 'p3', name: 'Test smoke alarms', iconKey: 'alarm', tint: '#D9544D', durationMin: 15, bucket: 'quick', recurrence: 'Monthly', dueInDays: 3, done: false },
    { id: 'hv-paint', propertyId: 'p3', name: 'Touch up window paint', iconKey: 'wrench', tint: '#9A8B6B', durationMin: 240, bucket: 'long', recurrence: 'Quarterly', dueInDays: -5, done: false },
  ]);

  /** Seed prep labels, expanded into PrepItem rows in the constructor. */
  private readonly prepSeed: Record<string, string[]> = {
    'mc-lawn': ['Petrol can filled', 'Engine oil level', 'Tyre pressure ~22 psi', 'Safety goggles', 'Grass collection bags'],
    'mc-boiler': ['Boiler service kit', 'CO test meter', 'Replacement seals & gaskets', 'Service log book'],
    'mc-gutter': ['Extension ladder', 'Gutter scoop', 'Heavy-duty gloves', 'Bucket & hose', 'Spotter on site'],
    'mc-alarm': ['9V batteries ×4', 'Step stool', 'Alarm test tool'],
    'mc-filter': ['16×25×1 filter', 'Vacuum / soft brush'],
    'mc-rad': ['Radiator key', 'Cloth & drip tray'],
    'bl-lawn': ['Petrol can filled', 'Tyre pressure ~22 psi', 'Grass bags'],
    'bl-hedge': ['Hedge trimmer charged', 'Extension lead', 'Tarp & rake', 'Goggles & gloves'],
    'bl-boiler': ['Boiler service kit', 'CO test meter', 'Service log book'],
    'hv-gutter': ['Extension ladder', 'Gutter scoop', 'Gloves', 'Bucket'],
    'hv-alarm': ['9V batteries ×3', 'Step stool'],
    'hv-paint': ['Exterior paint', 'Sandpaper & filler', 'Brushes & tape', 'Dust sheets'],
  };

  /** Per-task prep checklist. Each item owns its checked + photo state. */
  private readonly prep = signal<Record<string, PrepItem[]>>({});

  private uid = 0;
  private newTaskCount = 0;

  constructor() {
    const seeded: Record<string, PrepItem[]> = {};
    for (const t of this.tasks()) {
      seeded[t.id] = (this.prepSeed[t.id] ?? []).map((label) => ({
        id: `it${++this.uid}`,
        label,
        checked: false,
        photo: null,
      }));
    }
    // Demo: a couple of Maple Court lawn items already gathered, one with a photo.
    if (seeded['mc-lawn']) {
      seeded['mc-lawn'][0].checked = true;
      seeded['mc-lawn'][3].checked = true;
      seeded['mc-lawn'][1].photo = 'demo-photos/02.png';
    }
    this.prep.set(seeded);
  }

  // ---- derived ----
  readonly tasksForProperty = computed(() =>
    this.tasks().filter((t) => t.propertyId === this.activePropertyId()),
  );

  // ---- selectors ----
  prepItems(taskId: string): PrepItem[] {
    return this.prep()[taskId] ?? [];
  }

  gatheredCount(taskId: string): number {
    return this.prepItems(taskId).filter((i) => i.checked).length;
  }

  prepTotal(taskId: string): number {
    return this.prepItems(taskId).length;
  }

  /** Format a duration for display, e.g. `25 min`, `~3 hr`. */
  durationLabel(min: number): string {
    if (min < 60) return `${min} min`;
    const h = min / 60;
    return `~${min % 60 ? h.toFixed(1) : h.toFixed(0)} hr`;
  }

  bucketFor(min: number): Bucket {
    return min < 30 ? 'quick' : 'long';
  }

  /** Human due label, e.g. "Overdue by 3 days", "Due today", "Completed". */
  dueLabel(task: MaintenanceTask): string {
    if (task.done) return 'Completed';
    if (task.dueInDays < 0) return `Overdue by ${-task.dueInDays} day${task.dueInDays === -1 ? '' : 's'}`;
    if (task.dueInDays === 0) return 'Due today';
    return `Due in ${task.dueInDays} day${task.dueInDays === 1 ? '' : 's'}`;
  }

  /** Status token used to color the due pill. */
  dueStatus(task: MaintenanceTask): 'done' | 'overdue' | 'today' | 'upcoming' {
    if (task.done) return 'done';
    if (task.dueInDays < 0) return 'overdue';
    if (task.dueInDays === 0) return 'today';
    return 'upcoming';
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
      .map((d, i) => ({
        value: String(i),
        label: `${d.dow[0]}${d.dow.slice(1).toLowerCase()} ${d.short} · ${time}`,
        weekend: d.weekend,
      }));
  }

  // ---- property + availability mutations ----
  setProperty(id: string) {
    this.activePropertyId.set(id);
  }

  setAccent(color: string) {
    this.accent.set(color);
  }

  toggleDayUnavailable(key: string) {
    this.unavailableDays.update((set) => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ---- prep checklist mutations ----
  private patchPrep(taskId: string, fn: (items: PrepItem[]) => PrepItem[]) {
    this.prep.update((map) => ({ ...map, [taskId]: fn((map[taskId] ?? []).map((i) => ({ ...i }))) }));
  }

  togglePrepItem(taskId: string, itemId: string) {
    this.patchPrep(taskId, (items) =>
      items.map((i) => (i.id === itemId ? { ...i, checked: !i.checked } : i)),
    );
  }

  addPrepItem(taskId: string, label: string) {
    const text = label.trim();
    if (!text) return;
    this.patchPrep(taskId, (items) => [
      ...items,
      { id: `it${++this.uid}`, label: text, checked: false, photo: null },
    ]);
  }

  removePrepItem(taskId: string, itemId: string) {
    this.patchPrep(taskId, (items) => items.filter((i) => i.id !== itemId));
  }

  /** Capture a photo for a prep item (demo: assigns a stock image + checks it). */
  takePhoto(taskId: string, itemId: string) {
    const photo = DEMO_PHOTOS[Math.floor(Math.random() * DEMO_PHOTOS.length)];
    this.patchPrep(taskId, (items) =>
      items.map((i) => (i.id === itemId ? { ...i, photo, checked: true } : i)),
    );
  }

  removePhoto(taskId: string, itemId: string) {
    this.patchPrep(taskId, (items) =>
      items.map((i) => (i.id === itemId ? { ...i, photo: null } : i)),
    );
  }

  // ---- task mutations ----
  toggleDone(taskId: string) {
    this.tasks.update((list) => list.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
  }

  setRecurrence(taskId: string, recurrence: Recurrence) {
    this.tasks.update((list) => list.map((t) => (t.id === taskId ? { ...t, recurrence } : t)));
  }

  /** Create a task on the active property and return its id. */
  addTask(draft: TaskDraft): string {
    const id = `new-${++this.newTaskCount}`;
    const task: MaintenanceTask = {
      id,
      propertyId: this.activePropertyId(),
      name: draft.name.trim() || 'Untitled task',
      iconKey: draft.iconKey,
      tint: draft.tint,
      durationMin: Math.max(5, Math.round(draft.durationMin || 0)),
      bucket: this.bucketFor(Math.max(5, Math.round(draft.durationMin || 0))),
      recurrence: draft.recurrence,
      dueInDays: Math.round(draft.dueInDays || 0),
      done: false,
    };
    this.tasks.update((list) => [...list, task]);
    this.prep.update((map) => ({ ...map, [id]: [] }));
    return id;
  }

  updateTask(id: string, draft: TaskDraft) {
    const min = Math.max(5, Math.round(draft.durationMin || 0));
    this.tasks.update((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              name: draft.name.trim() || 'Untitled task',
              iconKey: draft.iconKey,
              tint: draft.tint,
              durationMin: min,
              bucket: this.bucketFor(min),
              recurrence: draft.recurrence,
              dueInDays: Math.round(draft.dueInDays || 0),
            }
          : t,
      ),
    );
  }

  deleteTask(id: string) {
    this.tasks.update((list) => list.filter((t) => t.id !== id));
    this.prep.update((map) => {
      const next = { ...map };
      delete next[id];
      return next;
    });
  }

  iconOption(key: IconKey): IconOption {
    return this.iconOptions.find((o) => o.key === key) ?? this.iconOptions[0];
  }

  // ---- task editor (add / edit dialog) ----
  openAdd() {
    const ic = this.iconOptions[0];
    this.editor.set({
      mode: 'add',
      id: null,
      draft: { name: '', iconKey: ic.key, tint: ic.tint, durationMin: 30, dueInDays: 7, recurrence: 'Weekly' },
    });
  }

  openEdit(id: string) {
    const t = this.tasks().find((x) => x.id === id);
    if (!t) return;
    this.editor.set({
      mode: 'edit',
      id,
      draft: {
        name: t.name,
        iconKey: t.iconKey,
        tint: t.tint,
        durationMin: t.durationMin,
        dueInDays: t.dueInDays,
        recurrence: t.recurrence,
      },
    });
  }

  closeEditor() {
    this.editor.set(null);
  }

  patchDraft(patch: Partial<TaskDraft>) {
    this.editor.update((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
  }

  /** Apply the icon-type choice (sets both key + its default tint). */
  pickIcon(key: IconKey) {
    const ic = this.iconOption(key);
    this.patchDraft({ iconKey: ic.key, tint: ic.tint });
  }

  /** Persist the open editor. Returns the saved task id (new or existing). */
  saveEditor(): string | null {
    const e = this.editor();
    if (!e) return null;
    const id = e.mode === 'add' ? this.addTask(e.draft) : (this.updateTask(e.id!, e.draft), e.id!);
    this.editor.set(null);
    return id;
  }

  deleteFromEditor() {
    const e = this.editor();
    if (e?.id) this.deleteTask(e.id);
    this.editor.set(null);
  }
}
