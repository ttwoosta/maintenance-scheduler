# Property Suite — Angular handoff

Standalone, signal-based Angular (v22) translation of the **Property Suite**: a
launcher home plus three apps — **Rent Tracker**, **Maintenance Scheduler**, and
**TenantBridge** — that share one Firebase session. Interactive widgets use
**`@angular/aria`** headless directives; everything visual is plain CSS driven by
ARIA/signal state and theme tokens.

> The polished prototypes live at the project root (`App Launcher.dc.html`,
> `Rent Tracker.dc.html`, `Maintenance Scheduler.dc.html`, `TenantBridge.dc.html`).
> This folder is the production Angular translation, tracking the live repo
> [`ttwoosta/maintenance-scheduler`](https://github.com/ttwoosta/maintenance-scheduler)
> for the Firebase/auth implementation.

## Architecture

A single shell gates the whole suite on Firebase auth, then routes to the
launcher and apps:

```
AppComponent (auth gate + <router-outlet>)
  └─ signed in →
       ''               LauncherComponent     ← home screen (Property Suite grid)
       /rent            RentTrackerComponent   ← Rent Tracker app
       /maintenance     MaintenanceComponent   ← Maintenance Scheduler app
       /tenant-bridge   TenantBridgeComponent  ← TenantBridge app
       /secure          SecureComponent        ← example guarded page
     signed out →
       <app-login> (+ /login route)
```

- **`AppComponent`** (`app.component.ts`) is a thin auth gate: a spinner until
  `auth.initialized()`, `<app-login>` when signed out, otherwise `<router-outlet>`.
- **The launcher is the home screen** (`LauncherComponent`, route `''`) — the
  Property Suite app grid the user lands on after signing in. Each card links to
  a guarded app route; it shows the signed-in user and a sign-out action.
- Each **app** is a full-screen, lazy-loaded route guarded by `authGuard`, with
  its own chrome and a brand mark that links back to the launcher (`routerLink="/"`).
- All four share the one Firebase session via `AuthService`.

## Install

```bash
npm install            # Angular 22 + @angular/aria + firebase
cp src/app/firebase.example.ts src/app/firebase.ts   # then fill in your config
npm start              # dev server → http://localhost:4200
```

## Firebase

Tasks (Maintenance Scheduler) are persisted in Firestore and scoped to the
signed-in user; the launcher, Rent Tracker, and TenantBridge run on local signal
state (matching the prototypes) behind the same auth gate.

### Config (`src/app/firebase.ts`) — git-ignored

The real `firebase.ts` holds project credentials and is git-ignored. Copy the
checked-in template (`firebase.example.ts`) and fill in your values. It exports
the three handles every module imports:

```ts
export const auth    = getAuth(app);
export const db      = getFirestore(app, 'dev-maintenance-scheduler'); // named DB
export const storage = getStorage(app);
```

### Auth (shared across all apps)

- `services/auth.service.ts` wraps Firebase Auth (email/password): `user`
  (signal), `initialized`, `isAuthenticated`, `signIn` / `signUp` / `signOut`.
- `guards/auth.guard.ts` waits for the first `onAuthStateChanged` tick before
  deciding, so a refresh never flickers a signed-in user out to `/login`.
- `AppComponent` gates the suite; the launcher and Maintenance shell both expose
  the user's initials + a sign-out action.

### Data model & ownership (Maintenance Scheduler)

- Flat **`tasks`** collection; document id = task id; fields match
  `MaintenanceTask` (incl. **`ownerId`**). Per-task **`tasks/{id}/prep`**
  subcollection holds prep items.
- `firestore.rules` enforces per-user ownership (create only with your own
  `ownerId`; read/update/delete only what you own; `ownerId` immutable; prep
  inherits the parent's ownership).
- `MaintenanceStore` opens `onSnapshot` listeners in `effect()`s and cleans them
  up via `DestroyRef.onDestroy`. Storage holds prep photos under
  `prep-photos/{taskId}/{itemId}/{file}`.

### Extending the other apps to Firestore

Rent Tracker (the year grid) and TenantBridge (threads/notes) keep state in
component signals. To persist, mirror `MaintenanceStore`: a `providedIn:'root'`
signal store with `onSnapshot` + ownership-scoped writes (e.g.
`rent/{ownerId}/months`, `tenants/{ownerId}/threads`). The render shape the
components already expose stays the same — only the source of the signal changes.

The TenantBridge assistant calls `services/assistant.service.ts`, which wraps the
host `window.claude.complete` with a demo fallback — swap it for an authenticated
backend call without touching the component.

## File tree

```
angular-handoff/
  firebase.json  .firebaserc  firestore.rules  firestore.indexes.json  storage.rules
  src/
    main.ts                              ← bootstrapApplication(AppComponent, appConfig)
    app/
      firebase.example.ts                ← template for git-ignored firebase.ts
      app.config.ts                      ← provideRouter + global error listeners
      app.routes.ts                      ← launcher (''), /rent, /maintenance, /tenant-bridge, /login, /secure
      app.component.ts                   ← auth gate + <router-outlet>
      models/task.model.ts               ← shared types (MaintenanceTask incl. ownerId, PrepItem, …)
      services/
        auth.service.ts                  ← Firebase Auth wrapper (shared session)
        maintenance-store.ts             ← Firestore signal store (tasks + prep + photos)
        assistant.service.ts             ← TenantBridge AI wrapper (window.claude + fallback)
      guards/auth.guard.ts               ← functional CanActivateFn (waits for auth init)
      screens/
        launcher/launcher.component.ts   ← HOME: Property Suite app grid + sign-out
        login/login.component.ts         ← email/password form → AuthService
        secure/secure.component.ts       ← example authGuard-protected page
        home/  task-prep/  scheduling/  smart-plan/   ← Maintenance Scheduler screens
      shared/
        task-icon / prep-list / task-editor components  ← Maintenance shared UI
        autofocus.directive.ts           ← focus-on-mount (Rent Tracker grid editor)
        safe-html.pipe.ts                ← trusted inline-SVG for [innerHTML] icons
      apps/
        maintenance/maintenance.component.*   ← Maintenance Scheduler shell (Aria-driven)
        rent-tracker/rent-tracker.component.ts ← Rent Tracker (Home/Grid/Houses/Expenses/Receipts)
        tenant-bridge/tenant-bridge.component.ts ← TenantBridge (Tenants/Thread/Assistant/Queue)
    styles/theme.css                     ← Maintenance Scheduler tokens + global focus ring
```

## The apps

| App | Route | Highlights |
|---|---|---|
| **Launcher** | `''` | Property Suite home; responsive app grid (full cards on wide, icon grid on phone); profile + sign-out |
| **Rent Tracker** | `/rent` | Dashboard, **editable Year Grid** (click-to-edit cells, filters, density, CSV export), Houses, Expenses donut, Receipts; sidebar/bottom-nav via container query |
| **Maintenance Scheduler** | `/maintenance` | `@angular/aria` Accordion/Tabs/Toolbar/Tree/Listbox screens; Firestore-backed tasks + prep; light/dark + accent theming |
| **TenantBridge** | `/tenant-bridge` | Tenant roster, per-tenant Thread (Messages / AI Suggestions / Profile), live AI Assistant, Scheduled queue; light/dark theme |

## Maintenance Scheduler — Aria patterns

| Screen | File | Aria |
|---|---|---|
| Home | `screens/home/` | layout + reuses `<app-prep-list>` |
| Task Prep | `screens/task-prep/` | Accordion (`ngAccordionGroup`/`Panel`/`Trigger`/`Content`) |
| Scheduling | `screens/scheduling/` | Tabs + Toolbar |
| Smart Plan | `screens/smart-plan/` | Tree + Combobox + Listbox |
| Shell | `apps/maintenance/` | Listbox property switcher |
| Task editor | `shared/task-editor.*` | `cdkTrapFocus` dialog + Listbox pickers |

Requirements met: no custom keyboard handling in Aria widgets (arrows, Home/End,
Enter/Space, Escape, type-ahead, roving tabindex come from the directives); ARIA
state drives styling (`[aria-selected]`, `[aria-expanded]`, `[aria-checked]`,
…); one global `:focus-visible` ring; all state via signals.

## Conventions (from the repo's `.claude/CLAUDE.md`)

`ChangeDetectionStrategy.OnPush` everywhere · `input()`/`output()` functions ·
`host: {}` for host bindings · native control flow (`@if`/`@for`/`@switch`) ·
`class`/`style` bindings, not `ngClass`/`ngStyle` · standalone components, no
NgModules.
