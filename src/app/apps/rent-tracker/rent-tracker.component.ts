import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AutofocusDirective } from '../../shared/autofocus.directive';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

type View = 'Home' | 'Grid' | 'Houses' | 'Expenses' | 'Receipts';
type GridFilter = 'All' | 'Expenses' | 'Income';
type Density = 'Comfortable' | 'Compact';

interface GridRow {
  m: string;
  ptax: number | null; water: number | null; elec: number | null; gas: number | null;
  u1a: number | null; u1b: number | null; u2a: number | null; u2b: number | null;
  current?: boolean;
}

const EXP_COLS = [
  { k: 'ptax', label: 'Property Tax', hc: '#9333EA' },
  { k: 'water', label: 'Water', hc: '#2563EB' },
  { k: 'elec', label: 'Electricity', hc: '#D97706' },
  { k: 'gas', label: 'Gas', hc: '#EA580C' },
] as const;
const INC_COLS = [
  { k: 'u1a', label: 'Unit 1A', hc: '#64748B' },
  { k: 'u1b', label: 'Unit 1B', hc: '#64748B' },
  { k: 'u2a', label: 'Unit 2A', hc: '#64748B' },
  { k: 'u2b', label: 'Unit 2B', hc: '#64748B' },
] as const;
const INC_KEYS = new Set(['u1a', 'u1b', 'u2a', 'u2b']);

/**
 * Rent Tracker app (route `/rent`).
 *
 * Income & expense tracking across units. Five views — Home dashboard, an
 * editable Year Grid, Houses, an Expenses breakdown, and Receipts — switched by
 * the in-app `view` signal (sidebar on wide, bottom tabs on phone). The brand
 * mark links back to the launcher.
 *
 * State is local to the component (signals), matching the prototype. To persist,
 * swap the grid signal for a Firestore-backed store mirroring `MaintenanceStore`
 * (e.g. a `rent/{ownerId}/months` collection) and keep the same render shape.
 */
@Component({
  selector: 'app-rent-tracker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AutofocusDirective, SafeHtmlPipe],
  template: `
    <div class="rt-root">
      <!-- ===== SIDEBAR (wide) ===== -->
      <aside class="rt-sidebar">
        <a class="rt-brand" routerLink="/" aria-label="Back to all apps">
          <span class="rt-brand-mark">$</span>
          <span class="rt-brand-name">RentTracker</span>
        </a>
        <nav class="rt-nav">
          @for (n of navItems; track n.key) {
            <button class="rt-nav-item" [class.active]="view() === n.key" (click)="view.set(n.key)">
              <span class="rt-nav-ic" [innerHTML]="n.svg | safeHtml"></span>{{ n.key }}
            </button>
          }
        </nav>
        <span class="rt-grow"></span>
        <div class="rt-foot">2 houses · 7 rooms</div>
      </aside>

      <!-- ===== MAIN ===== -->
      <div class="rt-main">
        <header class="rt-topbar">
          <a class="rt-brand-sm" routerLink="/" aria-label="Back to all apps">
            <span class="rt-brand-mark sm">$</span>
            <span class="rt-brand-name sm">RentTracker</span>
          </a>
          <button class="rt-chip-btn">
            <span class="dot" style="background:#6366F1"></span>Maple Court
            <svg class="caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <span class="rt-grow"></span>
          <button class="rt-chip-btn">
            <svg class="cal" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9h18M8 2.5v4M16 2.5v4" /></svg>June 2026
            <svg class="caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
          </button>
          <span class="rt-avatar">AM</span>
        </header>

        <div class="rt-scroll">
          @switch (view()) {

            <!-- ======== HOME ======== -->
            @case ('Home') {
              <div class="rt-narrow">
                <h1 class="rt-h1">Dashboard</h1>
                <p class="rt-sub">Maple Court · June 2026</p>
                <div class="rt-stats">
                  <div class="rt-card pad">
                    <div class="rt-stat-label" style="color:#16A34A"><span class="dot" style="background:#22C55E"></span>Monthly Income</div>
                    <div class="rt-stat-row"><span class="rt-stat-num">$1,850</span><span class="rt-delta down">-49.3%</span></div>
                    <div class="rt-stat-foot">vs May</div>
                  </div>
                  <div class="rt-card pad">
                    <div class="rt-stat-label" style="color:#EA580C"><span class="dot" style="background:#F97316"></span>Monthly Expenses</div>
                    <div class="rt-stat-row"><span class="rt-stat-num">$2,660</span><span class="rt-delta down">+20.9%</span></div>
                    <div class="rt-stat-foot">vs May</div>
                  </div>
                </div>

                <div class="rt-card pad2">
                  <div class="rt-chart-head">
                    <span class="rt-card-title">Income vs Expenses</span>
                    <span class="rt-grow"></span>
                    <div class="rt-legend-inline">
                      <span><span class="sq" style="background:#22C55E"></span>Income</span>
                      <span><span class="sq" style="background:#F97316"></span>Expenses</span>
                    </div>
                  </div>
                  <div class="rt-bars">
                    @for (b of bars; track b.m) {
                      <div class="rt-bar-col">
                        <div class="rt-bar-pair">
                          <div class="rt-bar" style="background:#22C55E" [style.height.%]="b.incH"></div>
                          <div class="rt-bar" style="background:#F97316" [style.height.%]="b.expH"></div>
                        </div>
                        <span class="rt-bar-label" [style.color]="b.current ? '#111827' : '#9CA3AF'">{{ b.m }}</span>
                      </div>
                    }
                  </div>
                </div>

                <div class="rt-card pad2">
                  <div class="rt-card-title" style="margin-bottom:6px">Recent Activity</div>
                  @for (a of activity; track a.title) {
                    <div class="rt-act">
                      <span class="dot" [style.background]="a.dot"></span>
                      <div class="rt-act-body">
                        <div class="rt-act-title">{{ a.title }}</div>
                        <div class="rt-act-sub">{{ a.sub }}</div>
                      </div>
                      <span class="rt-act-amt" [style.color]="a.amtColor">{{ a.amount }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ======== GRID ======== -->
            @case ('Grid') {
              <div>
                <h1 class="rt-h1">Year Grid</h1>
                <p class="rt-sub">Maple Court · 2026</p>
                <div class="rt-toolbar">
                  <div class="rt-seg">
                    @for (f of ['All','Expenses','Income']; track f) {
                      <button [class.on]="gridFilter() === f" (click)="gridFilter.set($any(f))">{{ f }}</button>
                    }
                  </div>
                  <div class="rt-seg">
                    @for (d of ['Comfortable','Compact']; track d) {
                      <button [class.on]="density() === d" (click)="density.set($any(d))">{{ d }}</button>
                    }
                  </div>
                  <button class="rt-ghost" (click)="exportCsv()">
                    <svg viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 4 5-4" /><path d="M5 20h14" /></svg>Export CSV
                  </button>
                </div>
                <p class="rt-hint">Click any cell to edit · Enter to save</p>

                <div class="rt-table-wrap">
                  <table class="rt-table">
                    <thead>
                      <tr>
                        <th rowspan="2" class="rt-corner">2026</th>
                        @if (showExp()) { <th [attr.colspan]="4" class="rt-group exp">Utilities &amp; Tax</th> }
                        @if (showInc()) { <th [attr.colspan]="4" class="rt-group inc">Rent Income</th> }
                      </tr>
                      <tr>
                        @for (c of cols(); track c.k) {
                          <th class="rt-colhead" [style.color]="c.hc">{{ c.label }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of rows(); track row.ri) {
                        <tr [style.background]="row.rowBg">
                          <td class="rt-month" [style.background]="row.rowBg" [style.color]="row.monthColor" [style.padding]="gridPad()">{{ row.m }}</td>
                          @for (cell of row.cells; track cell.id) {
                            <td class="rt-cell" [style.padding]="gridPad()" [style.fontWeight]="cell.weight" [style.color]="cell.color" (click)="startEdit(cell.id)">
                              @if (editing() === cell.id) {
                                <input class="rt-cell-input" [value]="cell.raw" (blur)="commitCell(cell.id, $event)" (keydown)="cellKey($event)" appAutofocus />
                              } @else {
                                {{ cell.disp }}
                              }
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- ======== HOUSES ======== -->
            @case ('Houses') {
              <div>
                <div class="rt-page-head">
                  <div class="rt-page-head-l">
                    <div class="rt-title-row"><h1 class="rt-h1 sm">Maple Court</h1><span class="rt-pill ok">3/4 occupied</span></div>
                    <p class="rt-sub">48 Maple Court, Springfield, IL 62704</p>
                  </div>
                  <button class="rt-primary"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>Add House</button>
                </div>
                <div class="rt-card ovh">
                  <table class="rt-units">
                    <thead><tr>
                      <th style="text-align:left">UNIT</th><th style="text-align:left">TENANT</th>
                      <th style="text-align:right">BASE RENT</th><th style="text-align:right">PAID · JUN</th>
                      <th style="text-align:left">STATUS</th><th style="text-align:right">ACTIONS</th>
                    </tr></thead>
                    <tbody>
                      @for (u of units; track u.unit) {
                        <tr>
                          <td class="b">{{ u.unit }}</td>
                          <td [style.color]="u.tenantColor" [style.fontStyle]="u.tenantStyle">{{ u.tenant }}</td>
                          <td style="text-align:right" class="b6">{{ u.base }}</td>
                          <td style="text-align:right;font-weight:600" [style.color]="u.paidColor">{{ u.paid }}</td>
                          <td><span class="rt-status" [style.background]="u.stBg" [style.color]="u.stFg">{{ u.status }}</span></td>
                          <td>
                            <div class="rt-acts">
                              <button class="ic"><svg viewBox="0 0 24 24"><path d="M16.5 3.5 20.5 7.5 8 20l-4.5 1L4.5 16z" /></svg></button>
                              <button class="ic plus"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            <!-- ======== EXPENSES ======== -->
            @case ('Expenses') {
              <div class="rt-narrow2">
                <h1 class="rt-h1">Expenses</h1>
                <p class="rt-sub">Maple Court · June 2026</p>
                <div class="rt-card donut-card">
                  <div class="rt-donut">
                    <div class="rt-donut-hole"><span class="t">TOTAL</span><span class="v">$2,660</span></div>
                  </div>
                  <div class="rt-donut-legend">
                    @for (l of legend; track l.name) {
                      <div class="rt-leg"><span class="sq" [style.background]="l.dot"></span><span class="nm">{{ l.name }}</span><span class="am">{{ l.amount }}</span></div>
                    }
                  </div>
                </div>
                <div class="rt-leg-list">
                  @for (l of legend; track l.name) {
                    <div class="rt-card leg-row">
                      <span class="dot" [style.background]="l.dot"></span>
                      <span class="leg-name">{{ l.name }}</span>
                      <div class="leg-amt"><div class="a">{{ l.amount }}</div><div class="y">{{ l.ytd }}</div></div>
                      <svg class="caret" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- ======== RECEIPTS ======== -->
            @case ('Receipts') {
              <div>
                <div class="rt-page-head">
                  <div class="rt-page-head-l">
                    <div class="rt-title-row"><h1 class="rt-h1 sm">Receipts · 2026</h1><span class="rt-pill">6 receipts</span></div>
                    <p class="rt-sub">Maple Court</p>
                  </div>
                  <button class="rt-primary"><svg viewBox="0 0 24 24"><path d="M12 16V4M7 8l5-4 5 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>Upload receipt</button>
                </div>
                <div class="rt-receipts">
                  @for (r of receipts; track r.vendor) {
                    <div class="rt-card ovh">
                      @if (r.photo) {
                        <div class="rt-rec-photo"></div>
                      } @else {
                        <div class="rt-rec-ph" [style.background]="r.bg" [style.color]="r.fg">
                          <svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-3 2-3-2-3 2z" /><path d="M8.5 8h7M8.5 12h7" /></svg>
                          <span>{{ r.cat }}</span>
                        </div>
                      }
                      <div class="rt-rec-foot">
                        <div class="rt-rec-meta"><div class="v">{{ r.vendor }}</div><div class="d">{{ r.date }}</div></div>
                        <span class="rt-rec-amt">{{ r.amount }}</span>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- ===== BOTTOM TABS (phone) ===== -->
        <nav class="rt-bottomnav">
          @for (n of navItems; track n.key) {
            <button [class.active]="view() === n.key" (click)="view.set(n.key)">
              <span class="rt-nav-ic" [innerHTML]="n.svg | safeHtml"></span>
              <span class="lbl">{{ n.key }}</span>
            </button>
          }
        </nav>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; height:100dvh; }
    .rt-root { container-type:inline-size; container-name:rt; display:flex; height:100%; width:100%; overflow:hidden; background:#FAFBFC; color:#111827; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif; }
    .dot { width:8px; height:8px; border-radius:50%; flex:none; }
    .sq { width:9px; height:9px; border-radius:2px; flex:none; }
    .rt-grow { flex:1; }

    /* sidebar */
    .rt-sidebar { display:none; flex:none; width:216px; height:100%; background:linear-gradient(184deg,#1c2740,#141d30); flex-direction:column; padding:20px 14px; color:#9aa6b8; box-sizing:border-box; }
    .rt-brand { display:flex; align-items:center; gap:11px; padding:4px 6px 22px; text-decoration:none; }
    .rt-brand-mark { width:34px; height:34px; border-radius:10px; background:linear-gradient(145deg,#6366F1,#4F46E5); display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; color:#fff; box-shadow:0 4px 12px rgba(79,70,229,.45); }
    .rt-brand-mark.sm { width:30px; height:30px; font-size:16px; }
    .rt-brand-name { font-size:16.5px; font-weight:700; color:#fff; letter-spacing:-.2px; }
    .rt-nav { display:flex; flex-direction:column; gap:3px; }
    .rt-nav-item { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:10px 12px; border:none; border-radius:11px; font:600 14.5px/1 inherit; cursor:pointer; background:transparent; color:#9aa6b8; }
    .rt-nav-item.active { background:#4F46E5; color:#fff; }
    .rt-nav-ic { display:flex; }
    .rt-nav-ic svg { width:20px; height:20px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .rt-foot { border-top:1px solid rgba(255,255,255,.08); padding:14px 8px 2px; font-size:12.5px; color:#6b7794; }

    /* main */
    .rt-main { flex:1; display:flex; flex-direction:column; min-width:0; height:100%; }
    .rt-topbar { flex:none; display:flex; align-items:center; gap:10px; padding:0 18px; height:62px; background:#fff; border-bottom:1px solid #ECECF1; }
    .rt-brand-sm { display:flex; align-items:center; gap:9px; text-decoration:none; margin-right:2px; }
    .rt-brand-name.sm { font-size:15.5px; color:#111827; }
    .rt-chip-btn { display:flex; align-items:center; gap:9px; padding:8px 13px; border:1px solid #E6E6EC; border-radius:11px; background:#fff; cursor:pointer; font:600 14px/1 inherit; color:#111827; }
    .rt-chip-btn .caret { width:14px; height:14px; fill:none; stroke:#9CA3AF; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
    .rt-chip-btn .cal { width:15px; height:15px; fill:none; stroke:#6B7280; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .rt-avatar { flex:none; width:38px; height:38px; border-radius:50%; background:#111827; color:#fff; display:flex; align-items:center; justify-content:center; font-size:12.5px; font-weight:700; letter-spacing:.5px; }
    .rt-scroll { flex:1; overflow-y:auto; overflow-x:hidden; padding:18px 16px; }

    .rt-narrow { max-width:760px; margin:0 auto; }
    .rt-narrow2 { max-width:660px; margin:0 auto; }
    .rt-h1 { margin:0; font-size:27px; font-weight:800; letter-spacing:-.5px; }
    .rt-h1.sm { font-size:25px; }
    .rt-sub { margin:5px 0 22px; font-size:14.5px; color:#9CA3AF; }
    .rt-card { background:#fff; border:1px solid #ECECF1; border-radius:16px; box-shadow:0 1px 2px rgba(16,24,40,.04); }
    .rt-card.pad { padding:19px 21px; }
    .rt-card.pad2 { padding:20px 22px; margin-bottom:18px; }
    .rt-card.ovh { overflow:hidden; }
    .rt-card-title { font-size:15.5px; font-weight:700; }

    .rt-stats { display:grid; grid-template-columns:1fr; gap:18px; margin-bottom:18px; }
    .rt-stat-label { display:flex; align-items:center; gap:8px; font-size:11.5px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; }
    .rt-stat-row { display:flex; align-items:baseline; gap:10px; margin:11px 0 5px; }
    .rt-stat-num { font-size:33px; font-weight:800; letter-spacing:-1px; }
    .rt-delta { font-size:12px; font-weight:700; padding:3px 7px; border-radius:7px; }
    .rt-delta.down { color:#DC2626; background:#FEE2E2; }
    .rt-stat-foot { font-size:13px; color:#9CA3AF; }

    .rt-chart-head { display:flex; align-items:center; margin-bottom:18px; }
    .rt-legend-inline { display:flex; gap:14px; font-size:12px; font-weight:600; color:#6B7280; }
    .rt-legend-inline span { display:flex; align-items:center; gap:6px; }
    .rt-bars { display:flex; align-items:flex-end; justify-content:space-between; gap:14px; height:170px; }
    .rt-bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:9px; height:100%; justify-content:flex-end; }
    .rt-bar-pair { display:flex; align-items:flex-end; gap:5px; width:100%; justify-content:center; height:100%; }
    .rt-bar { width:26%; max-width:30px; border-radius:5px 5px 0 0; }
    .rt-bar-label { font-size:12px; font-weight:600; }

    .rt-act { display:flex; align-items:center; gap:13px; padding:13px 0; border-bottom:1px solid #F3F4F6; }
    .rt-act-body { flex:1; min-width:0; }
    .rt-act-title { font-size:14.5px; font-weight:600; }
    .rt-act-sub { font-size:12.5px; color:#9CA3AF; margin-top:2px; }
    .rt-act-amt { font-size:14.5px; font-weight:700; }

    /* grid */
    .rt-toolbar { display:flex; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:12px; }
    .rt-seg { display:flex; gap:2px; padding:3px; background:#F1F2F5; border-radius:10px; }
    .rt-seg button { padding:7px 15px; border:none; border-radius:8px; font:600 13px/1 inherit; cursor:pointer; background:transparent; color:#6B7280; }
    .rt-seg button.on { background:#fff; color:#111827; box-shadow:0 1px 2px rgba(16,24,40,.14); }
    .rt-ghost { display:flex; align-items:center; gap:8px; padding:8px 14px; border:1px solid #E6E6EC; border-radius:10px; background:#fff; cursor:pointer; font:600 13px/1 inherit; color:#374151; }
    .rt-ghost svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .rt-hint { margin:0 0 10px; font-size:12.5px; color:#B0B6BF; }
    .rt-table-wrap { overflow-x:auto; border:1px solid #ECECF1; border-radius:14px; background:#fff; box-shadow:0 1px 2px rgba(16,24,40,.04); }
    .rt-table { border-collapse:collapse; width:100%; font-size:13.5px; white-space:nowrap; }
    .rt-corner { position:sticky; left:0; z-index:2; background:#F7F8FA; padding:10px 16px; text-align:left; font-weight:700; color:#374151; border-right:1px solid #ECECF1; border-bottom:1px solid #ECECF1; }
    .rt-group { padding:9px 12px; color:#fff; font-weight:700; font-size:12.5px; border-bottom:1px solid #ECECF1; }
    .rt-group.exp { background:#7C3AED; } .rt-group.inc { background:#16A34A; }
    .rt-colhead { padding:8px 14px; text-align:right; font-weight:600; font-size:11.5px; letter-spacing:.3px; border-bottom:1px solid #ECECF1; background:#FBFBFD; }
    .rt-month { position:sticky; left:0; z-index:1; font-weight:700; border-right:1px solid #ECECF1; border-bottom:1px solid #F3F4F6; }
    .rt-cell { text-align:right; cursor:pointer; border-bottom:1px solid #F3F4F6; }
    .rt-cell-input { width:62px; text-align:right; font:inherit; color:#111827; border:1.5px solid #6366F1; border-radius:6px; padding:3px 6px; outline:none; }

    /* houses */
    .rt-page-head { display:flex; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:18px; }
    .rt-page-head-l { flex:1; min-width:200px; }
    .rt-title-row { display:flex; align-items:center; gap:11px; flex-wrap:wrap; }
    .rt-pill { font-size:12px; font-weight:700; color:#6B7280; background:#F1F2F5; padding:4px 10px; border-radius:20px; }
    .rt-pill.ok { color:#15803D; background:#DCFCE7; }
    .rt-primary { display:flex; align-items:center; gap:8px; padding:11px 17px; border:none; border-radius:11px; background:#4F46E5; color:#fff; cursor:pointer; font:700 14px/1 inherit; box-shadow:0 4px 12px rgba(79,70,229,.35); }
    .rt-primary svg { width:16px; height:16px; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; }
    .rt-units { border-collapse:collapse; width:100%; font-size:14px; }
    .rt-units th { padding:13px 14px; font-size:11.5px; font-weight:700; letter-spacing:.5px; color:#9CA3AF; background:#FBFBFD; }
    .rt-units td { padding:16px 14px; border-top:1px solid #F1F2F5; }
    .rt-units td.b { font-weight:700; } .rt-units td.b6 { font-weight:600; }
    .rt-status { display:inline-block; font-size:12px; font-weight:700; padding:4px 11px; border-radius:20px; }
    .rt-acts { display:flex; gap:7px; justify-content:flex-end; }
    .rt-acts .ic { width:32px; height:32px; border:1px solid #E6E6EC; border-radius:9px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6B7280; }
    .rt-acts .ic.plus { border:none; background:#EEF0FF; color:#4F46E5; }
    .rt-acts .ic svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .rt-acts .ic.plus svg { stroke-width:2.2; }

    /* expenses */
    .rt-donut-card { padding:26px 24px; margin-bottom:18px; display:flex; align-items:center; gap:30px; flex-wrap:wrap; justify-content:center; }
    .rt-donut { flex:none; width:170px; height:170px; border-radius:50%; background:conic-gradient(#1f2a44 0deg 250.38deg,#94A3B8 250.38deg 315.34deg,#F59E0B 315.34deg 342.14deg,#3B82F6 342.14deg 355.27deg,#EA580C 355.27deg 360deg); display:flex; align-items:center; justify-content:center; }
    .rt-donut-hole { width:108px; height:108px; border-radius:50%; background:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; }
    .rt-donut-hole .t { font-size:11px; font-weight:700; letter-spacing:.5px; color:#9CA3AF; }
    .rt-donut-hole .v { font-size:24px; font-weight:800; letter-spacing:-.5px; }
    .rt-donut-legend { flex:1; min-width:230px; display:grid; grid-template-columns:1fr 1fr; gap:13px 20px; }
    .rt-leg { display:flex; align-items:center; gap:9px; font-size:13.5px; }
    .rt-leg .nm { flex:1; color:#374151; } .rt-leg .am { font-weight:700; color:#111827; }
    .rt-leg-list { display:flex; flex-direction:column; gap:11px; }
    .rt-card.leg-row { display:flex; align-items:center; gap:13px; padding:17px 20px; }
    .leg-row .dot { width:11px; height:11px; }
    .leg-row .leg-name { flex:1; font-size:15px; font-weight:600; }
    .leg-row .leg-amt { text-align:right; }
    .leg-row .leg-amt .a { font-size:15px; font-weight:700; } .leg-row .leg-amt .y { font-size:12px; color:#9CA3AF; margin-top:2px; }
    .leg-row .caret { width:17px; height:17px; fill:none; stroke:#C4C9D1; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; }

    /* receipts */
    .rt-receipts { display:grid; grid-template-columns:1fr; gap:16px; }
    .rt-rec-photo { height:140px; background-image:url('/demo-photos/01.png'); background-size:cover; background-position:center; }
    .rt-rec-ph { height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px; }
    .rt-rec-ph svg { width:30px; height:30px; fill:none; stroke:currentColor; stroke-width:1.7; stroke-linecap:round; stroke-linejoin:round; }
    .rt-rec-ph span { font-size:12px; font-weight:700; }
    .rt-rec-foot { padding:14px 16px; display:flex; align-items:center; gap:10px; }
    .rt-rec-meta { flex:1; min-width:0; }
    .rt-rec-meta .v { font-size:14.5px; font-weight:700; } .rt-rec-meta .d { font-size:12.5px; color:#9CA3AF; margin-top:2px; }
    .rt-rec-amt { font-size:15px; font-weight:800; letter-spacing:-.3px; }

    /* bottom nav (phone) */
    .rt-bottomnav { flex:none; display:flex; background:#fff; border-top:1px solid #ECECF1; padding:6px 4px 8px; }
    .rt-bottomnav button { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; border:none; background:none; cursor:pointer; padding:5px 0; color:#9aa6b8; }
    .rt-bottomnav button.active { color:#4F46E5; }
    .rt-bottomnav .rt-nav-ic svg { width:23px; height:23px; }
    .rt-bottomnav .lbl { font-size:10.5px; font-weight:600; }

    /* responsive */
    @container rt (min-width: 620px) {
      .rt-sidebar { display:flex; }
      .rt-bottomnav { display:none; }
      .rt-brand-sm { display:none; }
      .rt-scroll { padding:28px 32px; }
      .rt-stats { grid-template-columns:1fr 1fr; }
      .rt-receipts { grid-template-columns:1fr 1fr; }
    }
  `],
})
export class RentTrackerComponent {
  readonly view = signal<View>('Home');
  readonly gridFilter = signal<GridFilter>('All');
  readonly density = signal<Density>('Comfortable');
  readonly editing = signal<string | null>(null);
  readonly grid = signal<GridRow[]>(this.defaultGrid());

  readonly navItems = [
    { key: 'Home' as View, svg: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.4V20h14V9.4"/></svg>' },
    { key: 'Grid' as View, svg: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>' },
    { key: 'Houses' as View, svg: '<svg viewBox="0 0 24 24"><path d="M3 21h18"/><path d="M5 21V8l7-4 7 4v13"/><path d="M9.5 21v-5h5v5"/></svg>' },
    { key: 'Expenses' as View, svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v9l6.4 6.4"/></svg>' },
    { key: 'Receipts' as View, svg: '<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-3-2-3 2-3-2-3 2z"/><path d="M8.5 8h7M8.5 12h7"/></svg>' },
  ];

  readonly bars = [
    { m: 'Jan', incH: 96, expH: 92, current: false },
    { m: 'Feb', incH: 96, expH: 49, current: false },
    { m: 'Mar', incH: 96, expH: 39, current: false },
    { m: 'Apr', incH: 96, expH: 94, current: false },
    { m: 'May', incH: 100, expH: 46, current: false },
    { m: 'Jun', incH: 49, expH: 70, current: true },
  ];

  readonly activity = [
    { title: 'Rent received', sub: 'Sarah Chen · Unit 1A · 2 days ago', amount: '+$1,250', amtColor: '#16A34A', dot: '#22C55E' },
    { title: 'Electricity', sub: 'ComEd · 3 days ago', amount: '−$210', amtColor: '#374151', dot: '#F59E0B' },
    { title: 'Partial rent', sub: 'Marcus Reed · Unit 1B · 5 days ago', amount: '+$600', amtColor: '#16A34A', dot: '#22C55E' },
    { title: 'Maintenance', sub: 'Plumbing repair · 6 days ago', amount: '−$480', amtColor: '#374151', dot: '#94A3B8' },
    { title: 'Water', sub: 'City Water Dept · 1 week ago', amount: '−$101', amtColor: '#374151', dot: '#3B82F6' },
    { title: 'Loan payment', sub: 'First National · 2 weeks ago', amount: '−$1,850', amtColor: '#374151', dot: '#1f2a44' },
  ];

  readonly units = [
    { unit: 'Unit 1A', tenant: 'Sarah Chen', base: '$1,250', paid: '$1,250', paidColor: '#16A34A', status: 'Paid', stBg: '#DCFCE7', stFg: '#15803D', tenantColor: '#374151', tenantStyle: 'normal' },
    { unit: 'Unit 1B', tenant: 'Marcus Reed', base: '$1,100', paid: '$600', paidColor: '#EA580C', status: 'Partial', stBg: '#FEF3C7', stFg: '#B45309', tenantColor: '#374151', tenantStyle: 'normal' },
    { unit: 'Unit 2A', tenant: 'Elena Duarte', base: '$1,300', paid: '—', paidColor: '#CBD2DA', status: 'Pending', stBg: '#FFEDD5', stFg: '#C2410C', tenantColor: '#374151', tenantStyle: 'normal' },
    { unit: 'Unit 2B', tenant: 'Vacant', base: '$1,150', paid: '—', paidColor: '#CBD2DA', status: 'Vacant', stBg: '#F1F5F9', stFg: '#94A3B8', tenantColor: '#9CA3AF', tenantStyle: 'italic' },
  ];

  readonly legend = [
    { name: 'Property Tax', dot: '#9333EA', amount: '—', ytd: 'YTD $2,480' },
    { name: 'Electricity', dot: '#F59E0B', amount: '$198', ytd: 'YTD $1,103' },
    { name: 'Maintenance', dot: '#94A3B8', amount: '$480', ytd: 'YTD $1,240' },
    { name: 'Water', dot: '#3B82F6', amount: '$97', ytd: 'YTD $563' },
    { name: 'Gas', dot: '#EA580C', amount: '$35', ytd: 'YTD $370' },
    { name: 'Loan Payment', dot: '#1f2a44', amount: '$1,850', ytd: 'YTD $11,100' },
  ];

  readonly receipts = [
    { vendor: 'Home Depot', date: 'Jun 12, 2026', amount: '$84.20', cat: 'Maintenance', photo: true, bg: '', fg: '' },
    { vendor: 'ComEd', date: 'Jun 5, 2026', amount: '$210.00', cat: 'Electricity', photo: false, bg: '#FEF3C7', fg: '#D97706' },
    { vendor: 'First National', date: 'Jun 1, 2026', amount: '$1,850.00', cat: 'Loan Payment', photo: false, bg: '#EDE9FE', fg: '#7C3AED' },
    { vendor: 'City Water Dept', date: 'May 28, 2026', amount: '$101.00', cat: 'Water', photo: false, bg: '#DBEAFE', fg: '#2563EB' },
    { vendor: 'State Gas Co.', date: 'Jun 8, 2026', amount: '$35.00', cat: 'Gas', photo: false, bg: '#FFEDD5', fg: '#EA580C' },
    { vendor: 'County Treasurer', date: 'Apr 1, 2026', amount: '$2,480.00', cat: 'Property Tax', photo: false, bg: '#F3E8FF', fg: '#9333EA' },
  ];

  readonly showExp = computed(() => this.gridFilter() !== 'Income');
  readonly showInc = computed(() => this.gridFilter() !== 'Expenses');
  readonly cols = computed(() => [
    ...(this.showExp() ? EXP_COLS : []),
    ...(this.showInc() ? INC_COLS : []),
  ]);
  readonly gridPad = computed(() => (this.density() === 'Compact' ? '6px 14px' : '11px 14px'));

  readonly rows = computed(() => {
    const cols = this.cols();
    return this.grid().map((row, ri) => ({
      ri, m: row.m,
      rowBg: row.current ? '#F5F4FF' : '#fff',
      monthColor: row.current ? '#4F46E5' : '#111827',
      cells: cols.map((col) => {
        const income = INC_KEYS.has(col.k);
        const id = ri + '.' + col.k;
        const val = (row as any)[col.k] as number | null;
        return {
          id,
          disp: this.fmt(val),
          raw: val == null ? '' : String(val),
          weight: income ? '600' : '500',
          color: val == null ? '#CBD2DA' : income ? '#15803D' : '#1F2937',
        };
      }),
    }));
  });

  private fmt(n: number | null): string {
    return n == null ? '—' : '$' + n.toLocaleString();
  }

  startEdit(id: string) {
    this.editing.set(id);
  }

  cellKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'Escape') {
      this.editing.set(null);
    }
  }

  commitCell(id: string, e: Event) {
    const dot = id.indexOf('.');
    const ri = +id.slice(0, dot);
    const k = id.slice(dot + 1);
    const text = ((e.target as HTMLInputElement).value || '').replace(/[^0-9.]/g, '');
    const v = text === '' ? null : Math.round(parseFloat(text));
    this.grid.update((g) => {
      const next = g.map((r) => ({ ...r }));
      (next[ri] as any)[k] = v == null || isNaN(v) ? null : v;
      return next;
    });
    this.editing.set(null);
  }

  exportCsv() {
    const data = this.grid();
    const head = ['Month', 'Property Tax', 'Water', 'Electricity', 'Gas', 'Unit 1A', 'Unit 1B', 'Unit 2A', 'Unit 2B'];
    const keys: (keyof GridRow)[] = ['m', 'ptax', 'water', 'elec', 'gas', 'u1a', 'u1b', 'u2a', 'u2b'];
    const lines = [head.join(',')].concat(
      data.map((r) => keys.map((k) => (r[k] == null ? '' : r[k])).join(',')),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'maple-court-2026.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  private defaultGrid(): GridRow[] {
    const m = (mo: string, ptax: number | null, water: number | null, elec: number | null, gas: number | null, u1a: number | null, u1b: number | null, u2a: number | null, u2b: number | null, current = false): GridRow =>
      ({ m: mo, ptax, water, elec, gas, u1a, u1b, u2a, u2b, current });
    return [
      m('Jan', 1240, 92, 165, 88, 1250, 1100, 1300, null),
      m('Feb', null, 88, 158, 82, 1250, 1100, 1300, null),
      m('Mar', null, 95, 172, 70, 1250, 1100, 1300, null),
      m('Apr', 1240, 90, 180, 55, 1250, 1100, 1300, null),
      m('May', null, 101, 210, 40, 1250, 1100, 1300, null),
      m('Jun', null, 97, 198, 35, 1250, 600, null, null, true),
      m('Jul', null, null, null, null, null, null, null, null),
      m('Aug', null, null, null, null, null, null, null, null),
      m('Sep', null, null, null, null, null, null, null, null),
      m('Oct', null, null, null, null, null, null, null, null),
      m('Nov', null, null, null, null, null, null, null, null),
      m('Dec', null, null, null, null, null, null, null, null),
    ];
  }
}
