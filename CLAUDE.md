# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server → http://localhost:4200 (auto-reload on save)
npm run build      # production build → dist/
npm test           # Vitest unit tests
```

To run a single test file:
```bash
npx vitest run src/app/path/to/file.spec.ts
```

## Architecture

Angular v22 SPA. All components are standalone (no NgModules). The app uses `@angular/aria` primitives (Listbox, Combobox, Accordion, Tabs, Toolbar, Tree) for accessible interactive widgets.

### Navigation

Navigation is **not** Angular Router — `AppComponent` owns a `screen` signal (`'home' | 'prep' | 'schedule' | 'smart'`) and renders the active screen with `@switch` in the template. The `app.routes.ts` file exists but is currently empty.

### State management

A single `MaintenanceStore` (`src/app/services/maintenance-store.ts`, `providedIn: 'root'`) holds all writable state as Angular signals. Screens inject this store directly — there is no inter-component `@Input`/`@Output` passing of task data.

Key signals in the store:
- `tasks` (private) — local mirror of the Firestore `tasks` collection, kept in sync via `onSnapshot`
- `loading` — true until the first Firestore snapshot arrives
- `activePropertyId` — which of the three demo properties is selected
- `prep` — per-task prep checklist (`PrepItem[]`), keyed by task id (in-memory only)
- `editor` — open/closed state of the add/edit task dialog (`null` = closed)
- `accent` / `unavailableDays` — theme and scheduling preferences

Derived state uses `computed()`. Task mutations (`toggleDone`, `addTask`, `updateTask`, `deleteTask`, `setRecurrence`) write to Firestore; `onSnapshot` updates the local signal automatically.

### Firestore

Firebase config lives in `src/app/firebase.ts` — fill in the placeholder values from the Firebase console before running the app.

Data model: flat `tasks` collection. Each document ID is the task ID (Firestore auto-generated). Fields match `MaintenanceTask` minus `id`. Prep checklists are intentionally in-memory and are not persisted.

### Screen components (`src/app/screens/`)

| Screen | Component | Purpose |
|---|---|---|
| Home | `HomeComponent` | Weekly glance — tasks due this week, optional prep section |
| Task Prep | `TaskPrepComponent` | Per-task prep checklist with photo capture |
| Schedule | `SchedulingComponent` | Recurrence view, overdue/upcoming task list |
| Smart Plan | `SmartPlanComponent` | Slot-based scheduling around availability |

### Shared components (`src/app/shared/`)

- `TaskIconComponent` — SVG icon tile for a task type (`IconKey`)
- `PrepListComponent` — reusable prep checklist (used on both Home and Task Prep screens)
- `TaskEditorComponent` — add/edit modal owned by `AppComponent`; opened via `store.openAdd()` / `store.openEdit(id)`

### Domain model (`src/app/models/task.model.ts`)

Core types: `MaintenanceTask`, `PrepItem`, `TaskDraft`, `Property`, `Slot`, `DayOption`.  
Enums: `Recurrence` (`'Weekly' | 'Monthly' | 'Quarterly'`), `Bucket` (`'quick' | 'long'`), `IconKey`.

### Coding conventions

See `.claude/CLAUDE.md` for the full set of TypeScript/Angular/accessibility rules enforced in this project. Key highlights:
- `ChangeDetectionStrategy.OnPush` on every component
- `input()` / `output()` functions, not decorators
- `host: {}` object for host bindings, not `@HostListener`/`@HostBinding`
- Native control flow (`@if`, `@for`, `@switch`), not structural directives
- `class` / `style` bindings, not `ngClass` / `ngStyle`
