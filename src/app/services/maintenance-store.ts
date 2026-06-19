import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
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

const TASKS = collection(db, 'tasks');

/**
 * Central signal store for the Maintenance Scheduler.
 *
 * Tasks are persisted in Firestore (`tasks` collection). All other state
 * (prep checklists, scheduling preferences, UI state) is kept in-memory.
 * The `onSnapshot` listener keeps the local `tasks` signal in sync with
 * Firestore in real time.
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

  /** True while the first Firestore snapshot is in flight. */
  readonly loading = signal(true);

  private readonly tasks = signal<MaintenanceTask[]>([]);

  /** Per-task prep checklist, kept in sync with `tasks/{id}/prep` subcollections. */
  private readonly prep = signal<Record<string, PrepItem[]>>({});

  constructor() {
    const destroyRef = inject(DestroyRef);

    // --- tasks ---
    const unsubTasks = onSnapshot(
      TASKS,
      (snapshot) => {
        this.tasks.set(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MaintenanceTask));
        this.loading.set(false);
      },
      (err) => {
        console.error('Firestore tasks snapshot error', err);
        this.loading.set(false);
      },
    );

    // --- prep: one listener per task in the active property ---
    const prepUnsubscribers = new Map<string, () => void>();

    effect(() => {
      const tasks = this.tasksForProperty();
      const taskIds = new Set(tasks.map((t) => t.id));

      // Drop listeners for tasks no longer visible.
      for (const [id, unsub] of prepUnsubscribers) {
        if (!taskIds.has(id)) {
          unsub();
          prepUnsubscribers.delete(id);
        }
      }

      // Open listeners for newly visible tasks.
      for (const task of tasks) {
        if (!prepUnsubscribers.has(task.id)) {
          const unsub = onSnapshot(
            collection(db, 'tasks', task.id, 'prep'),
            (snap) => {
              const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PrepItem);
              this.prep.update((map) => ({ ...map, [task.id]: items }));
            },
            console.error,
          );
          prepUnsubscribers.set(task.id, unsub);
        }
      }
    });

    destroyRef.onDestroy(() => {
      unsubTasks();
      for (const unsub of prepUnsubscribers.values()) unsub();
    });
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

  // ---- prep checklist mutations (Firestore: tasks/{taskId}/prep/{itemId}) ----
  togglePrepItem(taskId: string, itemId: string) {
    const item = this.prep()[taskId]?.find((i) => i.id === itemId);
    if (item) {
      updateDoc(doc(db, 'tasks', taskId, 'prep', itemId), { checked: !item.checked }).catch(console.error);
    }
  }

  addPrepItem(taskId: string, label: string) {
    const text = label.trim();
    if (!text) return;
    addDoc(collection(db, 'tasks', taskId, 'prep'), { label: text, checked: false, photo: null }).catch(console.error);
  }

  removePrepItem(taskId: string, itemId: string) {
    deleteDoc(doc(db, 'tasks', taskId, 'prep', itemId)).catch(console.error);
  }

  /** Capture a photo for a prep item (demo: assigns a stock image + checks it). */
  takePhoto(taskId: string, itemId: string) {
    const photo = DEMO_PHOTOS[Math.floor(Math.random() * DEMO_PHOTOS.length)];
    updateDoc(doc(db, 'tasks', taskId, 'prep', itemId), { photo, checked: true }).catch(console.error);
  }

  removePhoto(taskId: string, itemId: string) {
    updateDoc(doc(db, 'tasks', taskId, 'prep', itemId), { photo: null }).catch(console.error);
  }

  // ---- task mutations (Firestore) ----
  toggleDone(taskId: string) {
    const task = this.tasks().find((t) => t.id === taskId);
    if (task) updateDoc(doc(TASKS, taskId), { done: !task.done }).catch(console.error);
  }

  setRecurrence(taskId: string, recurrence: Recurrence) {
    updateDoc(doc(TASKS, taskId), { recurrence }).catch(console.error);
  }

  /** Create a task on the active property and return its Firestore-generated id. */
  addTask(draft: TaskDraft): string {
    const ref = doc(TASKS);
    const id = ref.id;
    const min = Math.max(5, Math.round(draft.durationMin || 0));
    const task: Omit<MaintenanceTask, 'id'> = {
      propertyId: this.activePropertyId(),
      name: draft.name.trim() || 'Untitled task',
      iconKey: draft.iconKey,
      tint: draft.tint,
      durationMin: min,
      bucket: this.bucketFor(min),
      recurrence: draft.recurrence,
      dueInDays: Math.round(draft.dueInDays || 0),
      done: false,
    };
    setDoc(ref, task).catch(console.error);
    return id;
  }

  updateTask(id: string, draft: TaskDraft) {
    const min = Math.max(5, Math.round(draft.durationMin || 0));
    updateDoc(doc(TASKS, id), {
      name: draft.name.trim() || 'Untitled task',
      iconKey: draft.iconKey,
      tint: draft.tint,
      durationMin: min,
      bucket: this.bucketFor(min),
      recurrence: draft.recurrence,
      dueInDays: Math.round(draft.dueInDays || 0),
    }).catch(console.error);
  }

  deleteTask(id: string) {
    // Delete prep items first (Firestore doesn't cascade-delete subcollections).
    for (const item of this.prep()[id] ?? []) {
      deleteDoc(doc(db, 'tasks', id, 'prep', item.id)).catch(console.error);
    }
    deleteDoc(doc(TASKS, id)).catch(console.error);
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
