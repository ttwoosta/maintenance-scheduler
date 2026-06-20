import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../../services/assistant.service';
import { SafeHtmlPipe } from '../../shared/safe-html.pipe';

type Tab = 'tenants' | 'thread' | 'assistant' | 'queue';
type Sub = 'messages' | 'suggestions' | 'profile';
type Channel = 'sms' | 'email' | 'note';

interface Property { id: string; name: string; short: string; addr: string; dot: string; }
interface Tenant {
  id: string; name: string; initials: string; pid: string; room: string; score: number; last: string;
  avBg: string; avFg: string; style: string; time: string; pay: string;
  maint: { label: string; date: string; dot: string }[]; noteSeed: string;
}
interface Message { dir: 'in' | 'out' | 'note'; ch: Channel; time: string; ai: boolean; body: string; }
interface Suggestion { id: string; trigger: string; source: string; sourceDot: string; tone: string; toneEmoji: string; text: string; }
interface QueueItem { id: string; mon: string; day: string; title: string; recipient: string; ch: Channel; countdown: string; }

/**
 * TenantBridge app (route `/tenant-bridge`).
 *
 * Tenant communication hub with four sections — Tenants roster, a per-tenant
 * Thread (Messages / AI Suggestions / Profile), a live AI Assistant, and a
 * Scheduled queue — plus a light/dark theme. The brand mark links back to the
 * launcher.
 *
 * The assistant calls `AssistantService` (host `window.claude`, with a demo
 * fallback). All conversational state is local to the component, matching the
 * prototype; persist threads/notes to Firestore the same way `MaintenanceStore`
 * does if you need them shared across devices.
 */
@Component({
  selector: 'app-tenant-bridge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, SafeHtmlPipe],
  host: { class: 'tb-root', '[attr.data-theme]': 'theme()' },
  template: `
    <div class="tb-viewport">
      <div class="tb-shell">

        <!-- ===== SIDEBAR (wide) ===== -->
        <aside class="tb-sidebar">
          <a class="tb-brand-side" routerLink="/" aria-label="Back to all apps">
            <span class="tb-logo"><svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-4a3 3 0 0 1 6 0v4" /><path d="M3 13.5h3M18 13.5h3" /></svg></span>
            <div><div class="nm">TenantBridge</div><div class="su">Property Suite</div></div>
          </a>
          <div class="tb-side-heading">Workspace</div>
          <div role="tablist" aria-label="App sections" (keydown)="rove($event)" class="tb-side-nav">
            @for (n of navItems(); track n.key) {
              <button role="tab" data-roving="1" [attr.aria-selected]="n.active" [attr.tabindex]="n.active ? 0 : -1" class="tb-side-item" [class.active]="n.active" (click)="setTab(n.key)">
                <span class="ic" [innerHTML]="n.svg | safeHtml"></span>
                <span>{{ n.label }}</span>
                @if (n.badge > 0) { <span class="tb-badge side">{{ n.badge }}</span> }
              </button>
            }
          </div>
          <span class="tb-grow"></span>
          <div class="tb-side-heading">Suite</div>
          <a class="tb-suite-link" routerLink="/maintenance"><span class="sw" style="background:#2F6B4F"></span>Maintenance Scheduler</a>
          <a class="tb-suite-link" routerLink="/rent"><span class="sw" style="background:#4F46E5"></span>Rent Tracker</a>
        </aside>

        <!-- ===== MAIN ===== -->
        <div class="tb-maincol">
          <header class="tb-topbar">
            <a class="tb-brand" routerLink="/" aria-label="Back to all apps">
              <span class="tb-logo sm"><svg viewBox="0 0 24 24"><path d="M4 20V10l8-6 8 6v10" /><path d="M9 20v-4a3 3 0 0 1 6 0v4" /><path d="M3 13.5h3M18 13.5h3" /></svg></span>
              <span class="tb-brand-name">TenantBridge</span>
            </a>
            <div class="tb-topbar-row">
              <div class="tb-titles">
                <div class="tb-title">{{ titles()[tab()] }}</div>
                <div class="tb-subtitle">{{ subs()[tab()] }}</div>
              </div>
              <button class="tb-theme" (click)="toggleTheme()" aria-label="Toggle light or dark theme">
                @if (theme() === 'dark') {
                  <svg viewBox="0 0 20 20"><path d="M16.5 11.5A6.5 6.5 0 1 1 8.5 3.5a5 5 0 0 0 8 8Z" /></svg>
                } @else {
                  <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="3.4" /><path d="M10 2v1.6M10 16.4V18M2 10h1.6M16.4 10H18M4.3 4.3l1.2 1.2M14.5 14.5l1.2 1.2M15.7 4.3l-1.2 1.2M5.5 14.5l-1.2 1.2" /></svg>
                }
              </button>
            </div>
          </header>

          <main class="tb-content">
            @switch (tab()) {

              <!-- ============ TENANTS ============ -->
              @case ('tenants') {
                <div class="tb-narrow">
                  @for (g of propertyGroups(); track g.name) {
                    <div class="tb-group-head">
                      <span class="gdot" [style.background]="g.dot"></span>
                      <span class="gname">{{ g.name }}</span>
                      <span class="gmeta">{{ g.meta }}</span>
                    </div>
                    <div class="tb-roster">
                      @for (t of g.tenants; track t.id) {
                        <button class="tb-tenant-card" (click)="openTenant(t.id)">
                          <div class="row">
                            <span class="av" [style.background]="t.avBg" [style.color]="t.avFg">{{ t.initials }}</span>
                            <div class="info">
                              <div class="line"><span class="nm">{{ t.name }}</span><span class="tb-status">Occupied</span></div>
                              <div class="sub">Unit {{ t.room }} · {{ t.shortAddr }}</div>
                            </div>
                          </div>
                          <div class="foot">
                            <div class="stars" [attr.aria-label]="'Relationship score ' + t.score + ' of 5'">
                              @for (on of t.stars; track $index) {
                                <svg viewBox="0 0 20 20" [attr.fill]="on ? 'var(--accent)' : 'none'" [attr.stroke]="on ? 'var(--accent)' : 'var(--text-tertiary)'"><path d="M10 1.8l2.5 5.1 5.6.8-4 4 1 5.6-5.1-2.7-5 2.7 1-5.6-4-4 5.6-.8Z" /></svg>
                              }
                              <span class="score">{{ t.score }}.0</span>
                            </div>
                            <span class="last">Last contact {{ t.last }}</span>
                          </div>
                        </button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- ============ THREAD ============ -->
              @case ('thread') {
                <div class="tb-narrow">
                  <!-- header card -->
                  <div class="tb-thread-head">
                    <div class="row">
                      <span class="av big" [style.background]="cur().avBg" [style.color]="cur().avFg">{{ cur().initials }}</span>
                      <div class="info">
                        <div class="line"><span class="nm big">{{ cur().name }}</span><span class="tb-status">Occupied</span></div>
                        <div class="sub">Unit {{ cur().room }} · {{ cur().address }}</div>
                      </div>
                    </div>
                    <div class="qa">
                      <button class="qa-btn primary" (click)="qa('sms')"><svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5Z" /></svg>Text</button>
                      <button class="qa-btn" (click)="qa('email')"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 5.5L20 7" /></svg>Email</button>
                      <button class="qa-btn" (click)="qa('note')"><svg viewBox="0 0 24 24"><path d="M5 4h14v12l-4 4H5z" /><path d="M15 20v-4h4M8.5 9h7M8.5 12.5h4" /></svg>Note</button>
                    </div>
                  </div>

                  <!-- subtabs -->
                  <div role="tablist" aria-label="Conversation views" (keydown)="rove($event)" class="tb-subtabs">
                    @for (st of subTabs(); track st.key) {
                      <button role="tab" data-roving="1" [attr.aria-selected]="st.active" [attr.tabindex]="st.active ? 0 : -1" class="tb-subtab" [class.active]="st.active" (click)="setSub(st.key)">
                        @if (st.pulse) { <span class="pulse"></span> }
                        {{ st.label }}
                        @if (st.count > 0) { <span class="tb-count" [class.active]="st.active">{{ st.count }}</span> }
                      </button>
                    }
                  </div>

                  @switch (sub()) {
                    @case ('messages') {
                      <div class="tb-messages">
                        @for (m of thread(); track $index) {
                          @if (m.dir === 'note') {
                            <div class="tb-note"><svg viewBox="0 0 24 24"><path d="M5 4h14v12l-4 4H5z" /></svg>{{ m.body }}</div>
                          } @else {
                            <div class="tb-msg" [class.out]="m.dir === 'out'">
                              <div class="wrap">
                                <div class="tb-bubble" [class.out]="m.dir === 'out'">{{ m.body }}</div>
                                <div class="meta" [class.out]="m.dir === 'out'">
                                  @if (m.ch === 'email') { <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 5.5L20 7" /></svg> }
                                  @else { <svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5Z" /></svg> }
                                  <span>{{ m.time }}</span>
                                  @if (m.ai) { <span class="ai"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg>AI Drafted</span> }
                                </div>
                              </div>
                            </div>
                          }
                        }
                      </div>
                      <div class="tb-composer-wrap">
                        <div class="tb-composer">
                          <span class="chip" [class.note]="channel() === 'note'">{{ channelLabel() }}</span>
                          <textarea rows="1" [ngModel]="draft()" (ngModelChange)="setDraft($event)" (keydown)="draftKey($event)" [placeholder]="composerPlaceholder()"></textarea>
                          <button class="send" [class.ready]="draft().trim().length > 0" (click)="sendDraft()" aria-label="Send message"><svg viewBox="0 0 24 24"><path d="M4.5 12h13M11 5.5l6.5 6.5L11 18.5" /></svg></button>
                        </div>
                      </div>
                    }

                    @case ('suggestions') {
                      <div class="tb-sug-banner">
                        <span class="glow"></span>
                        <span class="orb"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg></span>
                        <div class="txt">
                          <div class="t">AI is watching {{ cur().firstName }}'s patterns</div>
                          <div class="s">{{ suggestionsLead() }}</div>
                        </div>
                      </div>
                      <div class="tb-sug-list">
                        @for (s of suggestions(); track s.id) {
                          <div class="tb-sug">
                            <div class="trigger">{{ s.trigger }}</div>
                            <div class="tags">
                              <span class="src"><span class="d" [style.background]="s.sourceDot"></span>{{ s.source }}</span>
                              <span class="tone" [class]="'tone-' + s.toneKey">{{ s.toneEmoji }}&nbsp;&nbsp;{{ s.toneLabel }}</span>
                            </div>
                            @if (s.editing) {
                              <textarea class="edit" rows="4" [ngModel]="s.text" (ngModelChange)="onSugEdit(s.id, $event)"></textarea>
                            } @else {
                              <div class="preview">{{ s.text }}</div>
                            }
                            <div class="actions">
                              <button class="approve" (click)="approveSug(s.id)"><svg viewBox="0 0 16 16"><path d="M3 8.5l3 3 7-7.5" /></svg>Approve &amp; Send</button>
                              <button class="edit-btn" (click)="toggleSugEdit(s.id)">{{ s.editing ? 'Done' : 'Edit' }}</button>
                              <button class="dismiss" (click)="dismissSug(s.id)" aria-label="Dismiss suggestion"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8" /></svg></button>
                            </div>
                          </div>
                        }
                        @if (suggestions().length === 0) {
                          <div class="tb-empty">
                            <svg viewBox="0 0 24 24"><path d="M3 8.5l3 3 7-7.5" /><circle cx="12" cy="12" r="10" /></svg>
                            <div>All caught up — nothing needs your review right now.</div>
                          </div>
                        }
                      </div>
                    }

                    @case ('profile') {
                      <div class="tb-profile">
                        <div class="card prefs">
                          @for (p of cur().prefs; track p.label) {
                            <div class="pref">
                              <span class="pic" [innerHTML]="p.icon | safeHtml"></span>
                              <div><div class="pl">{{ p.label }}</div><div class="pv">{{ p.value }}</div></div>
                            </div>
                          }
                        </div>
                        <div class="card">
                          <div class="ch">Maintenance history</div>
                          @for (h of cur().maint; track h.label) {
                            <div class="hist"><span class="hd" [style.background]="h.dot"></span><span class="hl">{{ h.label }}</span><span class="hdate">{{ h.date }}</span></div>
                          }
                        </div>
                        <div class="card">
                          <div class="ch">Your notes</div>
                          <textarea class="notes" rows="3" [ngModel]="notes()" (ngModelChange)="setNotes($event)" placeholder="Add an observation about this tenant…"></textarea>
                        </div>
                      </div>
                    }
                  }
                </div>
              }

              <!-- ============ ASSISTANT ============ -->
              @case ('assistant') {
                <div class="tb-assistant">
                  <div class="chat">
                    @for (c of chat(); track $index) {
                      @if (c.from === 'ai') {
                        <div class="ai-row">
                          <span class="orb sm"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg></span>
                          <div class="ai-bubble">{{ c.text }}</div>
                        </div>
                      } @else {
                        <div class="user-bubble">{{ c.text }}</div>
                      }
                    }
                    @if (chatBusy()) {
                      <div class="ai-row">
                        <span class="orb sm busy"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg></span>
                        <div class="dots"><span></span><span></span><span></span></div>
                      </div>
                    }
                  </div>
                  <div class="tb-composer-wrap">
                    @if (!chatStarted()) {
                      <div class="chips">
                        @for (ch of chips; track ch) {
                          <button (click)="sendChat(ch)"><svg viewBox="0 0 24 24" fill="var(--primary)"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z" /></svg>{{ ch.length > 42 ? (ch.slice(0,40) + '…') : ch }}</button>
                        }
                      </div>
                    }
                    <div class="tb-composer">
                      <textarea rows="1" [ngModel]="chatInput()" (ngModelChange)="chatInput.set($event)" (keydown)="chatKey($event)" placeholder="Ask TenantBridge to draft or schedule a message…"></textarea>
                      <button class="send" [class.ready]="chatInput().trim().length > 0" (click)="sendChat()" aria-label="Send to assistant"><svg viewBox="0 0 24 24"><path d="M4.5 12h13M11 5.5l6.5 6.5L11 18.5" /></svg></button>
                    </div>
                  </div>
                </div>
              }

              <!-- ============ QUEUE ============ -->
              @case ('queue') {
                <div class="tb-narrow tb-queue">
                  @for (q of QUEUE; track q.id) {
                    <div class="tb-q">
                      <div class="date"><span class="mon">{{ q.mon }}</span><span class="day">{{ q.day }}</span></div>
                      <div class="qinfo">
                        <div class="qt">{{ q.title }}</div>
                        <div class="qr">
                          @if (q.ch === 'email') { <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 5.5L20 7" /></svg> }
                          @else { <svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5Z" /></svg> }
                          {{ q.recipient }}
                        </div>
                      </div>
                      <span class="cd">{{ q.countdown }}</span>
                      <button class="qedit" aria-label="Edit scheduled message"><svg viewBox="0 0 24 24"><path d="M16.5 3.5 20.5 7.5 8 20l-4.5 1L4.5 16z" /></svg></button>
                    </div>
                  }
                </div>
              }
            }
          </main>
        </div>

        <!-- ===== BOTTOM NAV (phone) ===== -->
        <nav class="tb-bottomnav" role="tablist" aria-label="App sections" (keydown)="rove($event)">
          @for (n of navItems(); track n.key) {
            <button role="tab" data-roving="1" [attr.aria-selected]="n.active" [attr.tabindex]="n.active ? 0 : -1" [class.active]="n.active" (click)="setTab(n.key)">
              <span class="ic" [innerHTML]="n.svg | safeHtml"></span>
              <span class="lbl">{{ n.label }}</span>
              @if (n.badge > 0) { <span class="tb-badge bottom">{{ n.badge }}</span> }
            </button>
          }
        </nav>

      </div>
    </div>
  `,
  styles: [`
    :host {
      display:block; height:100dvh; color:var(--text); background:var(--page-background);
      font-family:-apple-system,system-ui,sans-serif;
      --primary:#1E9CD7; --primary-contrast:#FFFFFF; --primary-soft:#E3F3FB; --primary-deep:#1577A5;
      --accent:#F5A623; --accent-soft:#FEF1DC; --accent-deep:#B9760D;
      --page-background:#F4F7FA; --surface:#FFFFFF; --surface-2:#EDF1F6;
      --text:#1A1A2E; --text-secondary:rgba(26,26,46,0.6); --text-tertiary:rgba(26,26,46,0.36);
      --separator:rgba(26,26,46,0.11); --ok:#1F9D6B; --ok-soft:#E1F5EC;
      --shadow:0 1px 2px rgba(16,24,40,0.04), 0 10px 28px rgba(16,24,40,0.06);
      --header-bg:rgba(244,247,250,0.82); --pulse:30,156,215;
    }
    :host([data-theme="dark"]) {
      --primary:#3DB4ED; --primary-contrast:#04121B; --primary-soft:rgba(61,180,237,0.18); --primary-deep:#7FCDF3;
      --accent:#F5B544; --accent-soft:rgba(245,166,35,0.18); --accent-deep:#F5C96E;
      --page-background:#0B0F14; --surface:#161B22; --surface-2:#212833;
      --text:#FFFFFF; --text-secondary:rgba(235,240,245,0.6); --text-tertiary:rgba(235,240,245,0.32);
      --separator:rgba(140,150,165,0.22); --ok:#39C08A; --ok-soft:rgba(57,192,138,0.16);
      --shadow:0 1px 2px rgba(0,0,0,0.4), 0 10px 30px rgba(0,0,0,0.55);
      --header-bg:rgba(11,15,20,0.74); --pulse:61,180,237;
    }
    button { font-family:inherit; }
    textarea { font-family:inherit; }
    :host ::-webkit-scrollbar { width:0; height:0; }
    @keyframes tb-breathe { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
    @keyframes tb-pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(var(--pulse),0.32),0 0 13px 1px rgba(var(--pulse),0.22)} 50%{box-shadow:0 0 0 7px rgba(var(--pulse),0.05),0 0 22px 5px rgba(var(--pulse),0.36)} }
    @keyframes tb-rise { 0%{transform:translateY(7px);opacity:0} 100%{transform:translateY(0);opacity:1} }
    @keyframes tb-dots { 0%,80%,100%{opacity:0.25;transform:translateY(0)} 40%{opacity:1;transform:translateY(-3px)} }

    .tb-viewport { container-type:inline-size; container-name:tb; height:100%; width:100%; box-sizing:border-box; background:var(--page-background); }
    .tb-shell { display:flex; flex-direction:column; height:100%; }
    .tb-grow { flex:1; min-height:14px; }
    .gdot,.d { flex:none; }

    /* sidebar */
    .tb-sidebar { display:none; flex-direction:column; box-sizing:border-box; width:248px; flex:none; background:var(--surface); border-right:0.5px solid var(--separator); gap:4px; padding:26px 14px 16px; overflow-y:auto; }
    .tb-brand-side { display:flex; align-items:center; gap:11px; padding:2px 8px 18px; text-decoration:none; color:inherit; }
    .tb-logo { width:34px; height:34px; border-radius:10px; background:linear-gradient(150deg,var(--primary),var(--primary-deep)); display:flex; align-items:center; justify-content:center; flex:none; box-shadow:0 4px 12px rgba(var(--pulse),0.4); }
    .tb-logo.sm { width:26px; height:26px; }
    .tb-logo svg { width:19px; height:19px; fill:none; stroke:#fff; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .tb-logo.sm svg { width:15px; height:15px; stroke-width:2; }
    .tb-brand-side .nm { font-size:16px; font-weight:800; line-height:1.05; letter-spacing:-0.3px; }
    .tb-brand-side .su { font-size:11px; color:var(--text-secondary); margin-top:2px; }
    .tb-side-heading { font-size:11px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; padding:4px 11px 6px; }
    .tb-side-nav { display:flex; flex-direction:column; gap:2px; }
    .tb-side-item { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:11px; border:none; cursor:pointer; width:100%; text-align:left; font-size:15px; font-weight:600; background:transparent; color:var(--text-secondary); }
    .tb-side-item.active { background:var(--primary-soft); color:var(--primary); }
    .tb-side-item .ic { display:flex; }
    .ic svg { width:21px; height:21px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; flex:none; }
    .tb-badge.side { margin-left:auto; min-width:19px; height:19px; padding:0 5px; border-radius:10px; font-size:11px; font-weight:700; display:inline-flex; align-items:center; justify-content:center; background:var(--accent); color:#fff; }
    .tb-suite-link { display:flex; align-items:center; gap:10px; padding:8px 11px; border-radius:11px; text-decoration:none; color:var(--text-secondary); font-size:13.5px; font-weight:600; }
    .tb-suite-link .sw { width:22px; height:22px; border-radius:7px; flex:none; }

    /* main */
    .tb-maincol { display:flex; flex-direction:column; flex:1; min-width:0; min-height:0; }
    .tb-topbar { flex:none; box-sizing:border-box; padding:18px 18px 12px; background:var(--header-bg); backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px); border-bottom:0.5px solid var(--separator); position:relative; z-index:5; }
    .tb-brand { display:flex; align-items:center; gap:8px; text-decoration:none; color:inherit; margin-bottom:9px; }
    .tb-brand-name { font-size:15px; font-weight:800; letter-spacing:-0.3px; }
    .tb-topbar-row { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
    .tb-titles { min-width:0; }
    .tb-title { font-size:26px; font-weight:800; letter-spacing:-0.4px; line-height:1.12; }
    .tb-subtitle { font-size:13.5px; color:var(--text-secondary); margin-top:3px; }
    .tb-theme { flex:none; width:38px; height:38px; border-radius:50%; border:none; cursor:pointer; background:var(--surface-2); color:var(--text); display:flex; align-items:center; justify-content:center; }
    .tb-theme svg { width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
    .tb-content { flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; padding:16px 16px 26px; }
    .tb-narrow { max-width:780px; margin:0 auto; }

    /* tenants */
    .tb-group-head { display:flex; align-items:center; gap:9px; margin:2px 2px 11px; }
    .tb-group-head .gdot { width:9px; height:9px; border-radius:50%; }
    .tb-group-head .gname { font-size:13px; font-weight:700; letter-spacing:0.2px; }
    .tb-group-head .gmeta { font-size:12px; color:var(--text-tertiary); }
    .tb-roster { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:11px; margin-bottom:22px; }
    .tb-tenant-card { display:block; width:100%; text-align:left; background:var(--surface); border:0.5px solid var(--separator); border-radius:16px; box-shadow:var(--shadow); padding:14px 15px; cursor:pointer; color:var(--text); }
    .row { display:flex; align-items:center; gap:12px; }
    .av { flex:none; width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:800; }
    .av.big { width:48px; height:48px; border-radius:15px; font-size:16px; }
    .info { flex:1; min-width:0; }
    .line { display:flex; align-items:center; gap:8px; }
    .line .nm { font-size:15.5px; font-weight:700; letter-spacing:-0.2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .line .nm.big { font-size:17.5px; font-weight:800; }
    .tb-status { flex:none; font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:20px; background:var(--ok-soft); color:var(--ok); }
    .info .sub { font-size:12.5px; color:var(--text-secondary); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .tb-tenant-card .foot { display:flex; align-items:center; justify-content:space-between; margin-top:13px; padding-top:12px; border-top:0.5px solid var(--separator); }
    .stars { display:flex; align-items:center; gap:3px; }
    .stars svg { width:14px; height:14px; stroke-width:1.3; }
    .stars .score { font-size:11.5px; font-weight:600; color:var(--text-tertiary); margin-left:4px; }
    .foot .last { font-size:11.5px; color:var(--text-tertiary); }

    /* thread */
    .tb-thread-head { background:var(--surface); border-radius:18px; box-shadow:var(--shadow); padding:16px 17px; margin-bottom:14px; }
    .tb-thread-head .info .sub { white-space:normal; }
    .qa { display:flex; gap:8px; margin-top:14px; }
    .qa-btn { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:10px; border-radius:12px; border:0.5px solid var(--separator); cursor:pointer; font-size:13px; font-weight:700; background:var(--surface); color:var(--text); }
    .qa-btn.primary { border:none; background:var(--primary); color:var(--primary-contrast); }
    .qa-btn svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    .qa-btn.primary svg { stroke-width:2; }
    .tb-subtabs { display:flex; gap:2px; background:var(--surface-2); border-radius:12px; padding:3px; margin-bottom:15px; }
    .tb-subtab { flex:1; display:flex; align-items:center; justify-content:center; gap:6px; padding:9px 4px; border-radius:9px; border:none; cursor:pointer; font-size:13px; font-weight:700; background:transparent; color:var(--text-secondary); }
    .tb-subtab.active { background:var(--surface); color:var(--text); box-shadow:0 1px 3px rgba(0,0,0,0.12); }
    .tb-subtab .pulse { width:7px; height:7px; border-radius:50%; background:var(--primary); animation:tb-breathe 2.6s ease-in-out infinite; }
    .tb-count { font-size:11px; font-weight:700; min-width:17px; height:17px; padding:0 5px; border-radius:9px; display:inline-flex; align-items:center; justify-content:center; color:#fff; background:var(--accent); }
    .tb-count.active { background:var(--primary); }

    .tb-messages { display:flex; flex-direction:column; gap:10px; }
    .tb-note { align-self:center; max-width:90%; display:flex; align-items:center; gap:8px; background:var(--accent-soft); color:var(--accent-deep); border-radius:11px; padding:8px 13px; font-size:12.5px; font-weight:600; }
    .tb-note svg { width:13px; height:13px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; flex:none; }
    .tb-msg { display:flex; justify-content:flex-start; }
    .tb-msg.out { justify-content:flex-end; }
    .tb-msg .wrap { max-width:78%; }
    .tb-bubble { border-radius:5px 16px 16px 16px; padding:11px 14px; font-size:14.5px; line-height:1.45; white-space:pre-wrap; background:var(--surface); color:var(--text); box-shadow:var(--shadow); }
    .tb-bubble.out { border-radius:16px 5px 16px 16px; background:var(--primary); color:var(--primary-contrast); box-shadow:none; }
    .meta { display:flex; align-items:center; gap:5px; margin-top:5px; font-size:11px; color:var(--text-tertiary); justify-content:flex-start; }
    .meta.out { justify-content:flex-end; }
    .meta svg { width:11px; height:11px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
    .meta .ai { display:inline-flex; align-items:center; gap:3px; color:var(--primary); font-weight:700; }
    .meta .ai svg { width:10px; height:10px; stroke:none; }

    .tb-composer-wrap { position:sticky; bottom:0; margin-top:14px; padding-top:10px; background:linear-gradient(to top,var(--page-background) 70%,transparent); }
    .tb-composer { display:flex; align-items:flex-end; gap:9px; background:var(--surface); border:0.5px solid var(--separator); border-radius:16px; padding:7px 7px 7px 14px; box-shadow:var(--shadow); }
    .tb-composer .chip { flex:none; align-self:center; font-size:10.5px; font-weight:700; padding:4px 9px; border-radius:8px; background:var(--primary-soft); color:var(--primary); }
    .tb-composer .chip.note { background:var(--accent-soft); color:var(--accent-deep); }
    .tb-composer textarea { flex:1; min-width:0; resize:none; border:none; outline:none; background:transparent; color:var(--text); font-size:14.5px; line-height:1.4; max-height:120px; padding:7px 0; }
    .tb-composer .send { flex:none; width:38px; height:38px; border-radius:12px; border:none; cursor:pointer; background:var(--text-tertiary); color:var(--primary-contrast); display:flex; align-items:center; justify-content:center; }
    .tb-composer .send.ready { background:var(--primary); }
    .tb-composer .send svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }

    /* suggestions */
    .tb-sug-banner { display:flex; align-items:center; gap:12px; background:var(--surface); border-radius:16px; box-shadow:var(--shadow); padding:14px 16px; margin-bottom:13px; position:relative; overflow:hidden; }
    .tb-sug-banner .glow { position:absolute; inset:0; background:radial-gradient(120% 80% at 12% 0%,var(--primary-soft),transparent 60%); pointer-events:none; }
    .orb { flex:none; width:42px; height:42px; border-radius:50%; background:linear-gradient(150deg,var(--primary),var(--primary-deep)); display:flex; align-items:center; justify-content:center; animation:tb-pulse-ring 3.4s ease-in-out infinite; position:relative; }
    .orb svg { width:20px; height:20px; }
    .orb.sm { width:32px; height:32px; animation:none; }
    .orb.sm svg { width:16px; height:16px; }
    .orb.sm.busy { animation:tb-pulse-ring 3.4s ease-in-out infinite; }
    .tb-sug-banner .txt { flex:1; min-width:0; position:relative; }
    .tb-sug-banner .t { font-size:14.5px; font-weight:700; }
    .tb-sug-banner .s { font-size:12.5px; color:var(--text-secondary); margin-top:1px; }
    .tb-sug-list { display:flex; flex-direction:column; gap:12px; }
    .tb-sug { background:var(--surface); border:0.5px solid var(--separator); border-left:3px solid var(--accent); border-radius:15px; box-shadow:var(--shadow); padding:15px 16px; animation:tb-rise 0.3s ease both; }
    .tb-sug .trigger { font-size:14px; font-weight:700; line-height:1.3; }
    .tb-sug .tags { display:flex; align-items:center; gap:7px; flex-wrap:wrap; margin-top:8px; }
    .tb-sug .src { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; background:var(--surface-2); color:var(--text-secondary); }
    .tb-sug .src .d { width:7px; height:7px; border-radius:2px; }
    .tb-sug .tone { font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px; }
    .tone-Friendly { background:var(--ok-soft); color:var(--ok); }
    .tone-Reminder { background:var(--accent-soft); color:var(--accent-deep); }
    .tone-Informational { background:var(--primary-soft); color:var(--primary); }
    .tb-sug .preview { margin-top:12px; background:var(--surface-2); border-radius:12px; padding:12px 14px; font-size:14px; line-height:1.5; color:var(--text); }
    .tb-sug .edit { width:100%; box-sizing:border-box; margin-top:12px; resize:vertical; border:1.5px solid var(--primary); border-radius:12px; background:var(--surface-2); color:var(--text); font-size:14px; line-height:1.5; padding:11px 13px; outline:none; }
    .tb-sug .actions { display:flex; align-items:center; gap:8px; margin-top:12px; }
    .tb-sug .approve { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:10px; border-radius:11px; border:none; cursor:pointer; font-size:13px; font-weight:700; background:var(--primary); color:var(--primary-contrast); }
    .tb-sug .approve svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:2.4; stroke-linecap:round; stroke-linejoin:round; }
    .tb-sug .edit-btn { flex:none; padding:10px 14px; border-radius:11px; border:0.5px solid var(--separator); cursor:pointer; font-size:13px; font-weight:700; background:var(--surface); color:var(--text); }
    .tb-sug .dismiss { flex:none; width:40px; height:40px; border-radius:11px; border:0.5px solid var(--separator); cursor:pointer; background:var(--surface); color:var(--text-tertiary); display:flex; align-items:center; justify-content:center; }
    .tb-sug .dismiss svg { width:14px; height:14px; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; }
    .tb-empty { text-align:center; padding:38px 20px; color:var(--text-tertiary); }
    .tb-empty svg { width:34px; height:34px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; margin-bottom:10px; }
    .tb-empty div { font-size:14px; color:var(--text-secondary); }

    /* profile */
    .tb-profile { display:flex; flex-direction:column; gap:12px; }
    .tb-profile .card { background:var(--surface); border-radius:16px; box-shadow:var(--shadow); padding:15px 17px; }
    .tb-profile .card.prefs { padding:6px 17px; }
    .pref { display:flex; align-items:center; gap:13px; padding:13px 0; border-bottom:0.5px solid var(--separator); }
    .pic { flex:none; width:34px; height:34px; border-radius:10px; background:var(--primary-soft); color:var(--primary); display:flex; align-items:center; justify-content:center; }
    .pic svg { width:17px; height:17px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .pl { font-size:11.5px; font-weight:700; letter-spacing:0.3px; text-transform:uppercase; color:var(--text-tertiary); }
    .pv { font-size:14.5px; font-weight:600; margin-top:2px; }
    .ch { font-size:13px; font-weight:700; margin-bottom:11px; }
    .hist { display:flex; align-items:center; gap:11px; padding:8px 0; }
    .hist .hd { flex:none; width:8px; height:8px; border-radius:50%; }
    .hist .hl { flex:1; font-size:14px; font-weight:500; }
    .hist .hdate { font-size:12.5px; color:var(--text-tertiary); }
    .notes { width:100%; box-sizing:border-box; resize:vertical; border:0.5px solid var(--separator); border-radius:12px; background:var(--surface-2); color:var(--text); font-size:14px; line-height:1.5; padding:11px 13px; outline:none; }

    /* assistant */
    .tb-assistant { max-width:720px; margin:0 auto; display:flex; flex-direction:column; min-height:100%; }
    .tb-assistant .chat { display:flex; flex-direction:column; gap:12px; flex:1; }
    .ai-row { display:flex; gap:10px; align-items:flex-start; animation:tb-rise 0.3s ease both; }
    .ai-bubble { flex:1; min-width:0; background:var(--surface); border-radius:4px 16px 16px 16px; box-shadow:var(--shadow); padding:13px 15px; font-size:14.5px; line-height:1.55; white-space:pre-wrap; }
    .user-bubble { align-self:flex-end; max-width:82%; background:var(--primary); color:var(--primary-contrast); border-radius:16px 4px 16px 16px; padding:11px 15px; font-size:14.5px; line-height:1.5; white-space:pre-wrap; animation:tb-rise 0.3s ease both; }
    .dots { display:flex; gap:4px; background:var(--surface); border-radius:14px; box-shadow:var(--shadow); padding:14px 16px; align-items:center; }
    .dots span { width:7px; height:7px; border-radius:50%; background:var(--text-tertiary); animation:tb-dots 1.2s infinite; }
    .dots span:nth-child(2) { animation-delay:0.18s; }
    .dots span:nth-child(3) { animation-delay:0.36s; }
    .chips { display:flex; gap:8px; overflow-x:auto; padding-bottom:10px; }
    .chips button { flex:none; display:flex; align-items:center; gap:6px; padding:8px 13px; border-radius:20px; border:0.5px solid var(--separator); cursor:pointer; font-size:12.5px; font-weight:600; background:var(--surface); color:var(--text); white-space:nowrap; }
    .chips button svg { width:12px; height:12px; }

    /* queue */
    .tb-queue { display:flex; flex-direction:column; gap:11px; }
    .tb-q { background:var(--surface); border-radius:16px; box-shadow:var(--shadow); padding:15px 17px; display:flex; align-items:center; gap:14px; }
    .tb-q .date { flex:none; width:48px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:1px; padding:8px 0; border-radius:12px; background:var(--surface-2); }
    .tb-q .mon { font-size:11px; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.4px; }
    .tb-q .day { font-size:18px; font-weight:800; line-height:1; }
    .tb-q .qinfo { flex:1; min-width:0; }
    .tb-q .qt { font-size:14.5px; font-weight:700; line-height:1.3; }
    .tb-q .qr { display:inline-flex; align-items:center; gap:5px; margin-top:5px; font-size:12px; color:var(--text-secondary); }
    .tb-q .qr svg { width:12px; height:12px; fill:none; stroke:currentColor; stroke-width:1.9; stroke-linecap:round; stroke-linejoin:round; }
    .tb-q .cd { flex:none; font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:20px; background:var(--accent-soft); color:var(--accent-deep); }
    .tb-q .qedit { flex:none; width:36px; height:36px; border-radius:11px; border:0.5px solid var(--separator); cursor:pointer; background:var(--surface); color:var(--text-secondary); display:flex; align-items:center; justify-content:center; }
    .tb-q .qedit svg { width:15px; height:15px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }

    /* bottom nav */
    .tb-bottomnav { display:flex; flex:none; background:var(--header-bg); backdrop-filter:saturate(180%) blur(20px); -webkit-backdrop-filter:saturate(180%) blur(20px); border-top:0.5px solid var(--separator); padding:8px 6px 24px; }
    .tb-bottomnav button { flex:1; position:relative; display:flex; flex-direction:column; align-items:center; gap:4px; background:none; border:none; cursor:pointer; padding:5px 0; color:var(--text-tertiary); }
    .tb-bottomnav button.active { color:var(--primary); }
    .tb-bottomnav .ic svg { width:24px; height:24px; }
    .tb-bottomnav .lbl { font-size:10.5px; font-weight:600; letter-spacing:0.1px; }
    .tb-badge.bottom { position:absolute; top:1px; right:50%; margin-right:-19px; min-width:16px; height:16px; padding:0 4px; border-radius:8px; background:var(--accent); color:#fff; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; }

    @container tb (min-width:700px) {
      .tb-shell { flex-direction:row; }
      .tb-sidebar { display:flex; }
      .tb-bottomnav { display:none; }
      .tb-brand { display:none; }
      .tb-topbar { padding:22px 30px 16px; }
      .tb-content { padding:22px 30px 32px; }
    }
  `],
})
export class TenantBridgeComponent {
  private readonly assistant = inject(AssistantService);

  readonly theme = signal<'light' | 'dark'>('light');
  readonly tab = signal<Tab>('thread');
  readonly tid = signal('t-marcus');
  readonly sub = signal<Sub>('messages');
  readonly channel = signal<Channel>('sms');

  readonly draftMap = signal<Record<string, string>>({});
  readonly extra = signal<Record<string, Message[]>>({});
  readonly notesMap = signal<Record<string, string>>({});
  readonly dismissed = signal<Record<string, boolean>>({});
  readonly sugEditMap = signal<Record<string, boolean>>({});
  readonly sugTextMap = signal<Record<string, string>>({});

  readonly chat = signal<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: "Hi Alex — I'm your TenantBridge assistant. I keep an eye on rent schedules and maintenance, and I draft messages in each tenant's voice.\n\nTry one of the suggestions below, or just tell me what you'd like to say." },
  ]);
  readonly chatInput = signal('');
  readonly chatBusy = signal(false);
  readonly chatStarted = signal(false);

  private readonly TITLES: Record<Tab, string> = { tenants: 'Tenants', thread: '', assistant: 'AI Assistant', queue: 'Scheduled' };
  private readonly SUBS: Record<Tab, string> = {
    tenants: 'Your roster across every property',
    thread: '',
    assistant: 'Drafts and schedules messages in each tenant\u2019s voice',
    queue: 'Messages queued to send automatically',
  };

  readonly chips = [
    'Remind Marcus the AC filter swap is next week, keep it casual',
    'Draft a warm July rent nudge for Elena',
    'Check in with James about his paint color',
  ];

  readonly PROPERTIES: Property[] = [
    { id: 'p1', name: 'Maple Court', short: 'Maple Court', addr: '48 Maple Court, Springfield IL', dot: '#1E9CD7' },
    { id: 'p2', name: '12 Birch Lane', short: 'Birch Lane', addr: '12 Birch Lane, Springfield IL', dot: '#F5A623' },
  ];

  readonly TENANTS: Tenant[] = [
    { id: 't-marcus', name: 'Marcus Reed', initials: 'MR', pid: 'p1', room: '1B', score: 4, last: '6 days ago', avBg: '#FFEDD5', avFg: '#C2410C', style: 'Responds to a friendly tone', time: 'Best reached after 6pm', pay: 'Often pays in two installments, settled by the 5th', maint: [{ label: 'New AC unit installed', date: 'Jun 14', dot: '#1E9CD7' }, { label: 'Plumbing repair — kitchen', date: 'Apr 6', dot: '#94A3B8' }, { label: 'AC filter replaced', date: 'Mar 2', dot: '#7C6BC4' }], noteSeed: 'Easygoing — appreciates a heads-up text the day before any visit.' },
    { id: 't-sarah', name: 'Sarah Chen', initials: 'SC', pid: 'p1', room: '1A', score: 5, last: '2 days ago', avBg: '#DCFCE7', avFg: '#15803D', style: 'Direct and prompt — keep it brief', time: 'Usually replies within the hour', pay: 'Always pays in full on the 1st', maint: [{ label: 'Dishwasher serviced', date: 'May 20', dot: '#3E8FD0' }, { label: 'Smoke alarms tested', date: 'Mar 11', dot: '#D9544D' }], noteSeed: 'Prefers email for anything with a date or dollar figure.' },
    { id: 't-elena', name: 'Elena Duarte', initials: 'ED', pid: 'p1', room: '2A', score: 3, last: '12 days ago', avBg: '#FEE2E2', avFg: '#DC2626', style: 'Appreciates reassurance and a warm tone', time: 'Prefers an evening phone call', pay: 'Usually pays around the 5th — likes a gentle reminder', maint: [{ label: 'Window seal replaced', date: 'May 2', dot: '#7C6BC4' }, { label: 'Heating check', date: 'Feb 18', dot: '#E08A3C' }], noteSeed: 'Lease renewal coming up in July — wants to stay, just needs the paperwork early.' },
    { id: 't-james', name: 'James Okafor', initials: 'JO', pid: 'p2', room: 'A', score: 4, last: '4 days ago', avBg: '#E3F3FB', avFg: '#1577A5', style: 'Friendly and chatty — quick to reply', time: 'Any time, very responsive', pay: 'Autopay on the 1st, never late', maint: [{ label: 'Gutters cleaned', date: 'Jun 3', dot: '#3E8FD0' }, { label: 'Hedge trim', date: 'May 9', dot: '#4CA57C' }], noteSeed: 'Mentioned wanting to repaint the spare room — said yes, awaiting his color choice.' },
    { id: 't-priya', name: 'Priya Nair', initials: 'PN', pid: 'p2', room: 'B', score: 5, last: '3 days ago', avBg: '#EDE9FE', avFg: '#6D28D9', style: 'Concise — prefers email over text', time: 'Mornings work best', pay: 'Always early, by the 28th', maint: [{ label: 'Quarterly inspection', date: 'Mar 22', dot: '#1E9CD7' }], noteSeed: 'Travels often for work — schedule any visits at least a week ahead.' },
  ];

  readonly THREADS: Record<string, Message[]> = {
    't-marcus': [
      { dir: 'out', ch: 'sms', time: 'Jun 2, 9:12 AM', ai: false, body: 'Hi Marcus — just confirming I received your first June payment. Thanks for getting that over early!' },
      { dir: 'in', ch: 'sms', time: 'Jun 2, 7:40 PM', ai: false, body: 'No problem, the rest will come through by the 5th like usual 👍' },
      { dir: 'out', ch: 'sms', time: 'Jun 4, 6:30 PM', ai: true, body: 'Got the balance — all squared away for June. Appreciate you, Marcus.' },
      { dir: 'in', ch: 'sms', time: 'Jun 9, 8:05 PM', ai: false, body: 'Cheers! Quick thing — the AC has really been struggling in this heat' },
      { dir: 'out', ch: 'email', time: 'Jun 10, 10:00 AM', ai: true, body: "Thanks for flagging it. I've ordered a new AC unit rather than patch the old one again — I'll confirm the install date shortly. Hang in there." },
      { dir: 'in', ch: 'sms', time: 'Jun 10, 6:22 PM', ai: false, body: 'Amazing, thank you! No rush' },
      { dir: 'out', ch: 'sms', time: 'Jun 12, 5:48 PM', ai: true, body: 'Update: the new AC goes in this Saturday, Jun 14. The tech needs access 9am–12pm — does that work for you?' },
      { dir: 'in', ch: 'sms', time: 'Jun 13, 7:10 PM', ai: false, body: "That works great, I'll be around. Thanks for sorting it so fast" },
    ],
    't-sarah': [
      { dir: 'out', ch: 'email', time: 'Jun 1, 8:30 AM', ai: false, body: 'Morning Sarah — June rent received, thank you. Receipt attached.' },
      { dir: 'in', ch: 'email', time: 'Jun 1, 9:02 AM', ai: false, body: 'Got it, thanks. All good on my end.' },
      { dir: 'out', ch: 'sms', time: 'Jun 17, 2:15 PM', ai: true, body: "Hi Sarah — the dishwasher service is booked for next Tuesday AM. I'll text a reminder the day before." },
    ],
    't-elena': [
      { dir: 'out', ch: 'sms', time: 'Jun 7, 6:40 PM', ai: true, body: 'Hi Elena — just a gentle note that June rent is due. No pressure at all, whenever works this week is fine.' },
      { dir: 'in', ch: 'sms', time: 'Jun 8, 7:55 PM', ai: false, body: "Thank you for understanding, I'll have it over by Friday" },
      { dir: 'out', ch: 'sms', time: 'Jun 8, 8:10 PM', ai: false, body: "Perfect, that's completely fine. Thanks Elena." },
    ],
    't-james': [
      { dir: 'in', ch: 'sms', time: 'Jun 15, 11:20 AM', ai: false, body: 'Hey! Gutters look spotless, cheers for sorting that' },
      { dir: 'out', ch: 'sms', time: 'Jun 15, 11:45 AM', ai: false, body: "Glad it's done before the rain! Let me know your paint color whenever you've decided." },
    ],
    't-priya': [
      { dir: 'out', ch: 'email', time: 'Jun 16, 9:00 AM', ai: true, body: 'Hi Priya — flagging early since you travel: the quarterly inspection is due. Could we pencil in a morning the week of the 23rd?' },
      { dir: 'in', ch: 'email', time: 'Jun 16, 9:25 AM', ai: false, body: 'Tuesday the 25th, 9am works. Thanks for the notice.' },
    ],
  };

  readonly SUGGESTIONS: Record<string, Suggestion[]> = {
    't-marcus': [
      { id: 'm1', trigger: 'New AC was installed 5 days ago — check in on comfort', source: 'Maintenance Scheduler', sourceDot: '#2F6B4F', tone: 'Friendly', toneEmoji: '😊', text: "Hey Marcus! Now the new AC has had a few days to settle in — how's it keeping the place cool? Want to make sure you're comfortable before the real heat hits." },
      { id: 'm2', trigger: 'July rent due in 12 days', source: 'Rent Tracker', sourceDot: '#4F46E5', tone: 'Reminder', toneEmoji: '⚠️', text: "Hi Marcus, friendly heads-up that July rent is due on the 1st. I know you usually split it and that works perfectly — just let me know if anything's changed this month." },
      { id: 'm3', trigger: 'AC filter swap due next week', source: 'Maintenance Scheduler', sourceDot: '#2F6B4F', tone: 'Informational', toneEmoji: '📋', text: "Quick note, Marcus — I'll swing by to swap the AC filter next week to keep the new unit running clean. I'll confirm a time that suits you a day ahead." },
    ],
    't-sarah': [
      { id: 's1', trigger: 'Dishwasher service scheduled for Tuesday', source: 'Maintenance Scheduler', sourceDot: '#2F6B4F', tone: 'Informational', toneEmoji: '📋', text: "Hi Sarah — confirming the dishwasher service for Tuesday morning (9–11am). The tech has a key but I'll text you the day before. Anything else you'd like looked at while they're in?" },
    ],
    't-elena': [
      { id: 'e1', trigger: 'Lease renewal window opens in 3 weeks', source: 'Rent Tracker', sourceDot: '#4F46E5', tone: 'Friendly', toneEmoji: '😊', text: "Hi Elena — your lease comes up for renewal in July and I'd love for you to stay. I'll get the paperwork to you early so there's no rush. Same terms — does that sound good?" },
      { id: 'e2', trigger: 'June rent received — send a thank-you', source: 'Rent Tracker', sourceDot: '#4F46E5', tone: 'Friendly', toneEmoji: '😊', text: 'Got your June payment, Elena — thank you! Really appreciate you sorting it out this week. Have a lovely weekend.' },
    ],
    't-james': [
      { id: 'j1', trigger: 'Awaiting paint color — gentle nudge', source: 'Maintenance Scheduler', sourceDot: '#2F6B4F', tone: 'Friendly', toneEmoji: '😊', text: "Hey James — no rush, but whenever you've landed on a paint color for the spare room, send it over and I'll get the supplies ordered." },
    ],
    't-priya': [
      { id: 'p1', trigger: 'Inspection confirmed for Jun 25 — send reminder', source: 'Maintenance Scheduler', sourceDot: '#2F6B4F', tone: 'Informational', toneEmoji: '📋', text: 'Hi Priya — confirming the quarterly inspection for Tuesday Jun 25 at 9am as agreed. It\u2019ll take about 30 minutes. Thanks again for the easy scheduling.' },
    ],
  };

  readonly QUEUE: QueueItem[] = [
    { id: 'q1', mon: 'JUN', day: '22', title: 'AC follow-up check-in', recipient: 'Marcus · Unit 1B', ch: 'sms', countdown: 'in 3 days' },
    { id: 'q2', mon: 'JUN', day: '25', title: 'Quarterly inspection reminder', recipient: 'Priya · Unit B', ch: 'email', countdown: 'in 6 days' },
    { id: 'q3', mon: 'JUL', day: '01', title: 'July rent reminder', recipient: 'All tenants', ch: 'email', countdown: 'in 12 days' },
    { id: 'q4', mon: 'JUL', day: '05', title: 'Lease renewal check-in', recipient: 'Elena · Unit 2A', ch: 'sms', countdown: 'in 16 days' },
  ];

  private readonly NAV_SVG: Record<Tab, string> = {
    tenants: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6M17.5 19a5 5 0 0 0-3-4.6"/></svg>',
    thread: '<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5Z"/></svg>',
    assistant: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3Z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/></svg>',
    queue: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.6 1.6M9 2.5h6"/></svg>',
  };

  private readonly PREF_ICONS = {
    time: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    style: '<svg viewBox="0 0 24 24"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.4-4.1A7.5 7.5 0 1 1 20 11.5Z"></path></svg>',
    pay: '<svg viewBox="0 0 24 24"><path d="M12 3v18M7 7h7a3 3 0 0 1 0 6H7"></path></svg>',
  };

  tenant(id: string): Tenant {
    return this.TENANTS.find((t) => t.id === id)!;
  }

  // ---- derived ----
  readonly titlesComputed = computed<Record<Tab, string>>(() => ({ ...this.TITLES, thread: this.tenant(this.tid()).name }));
  readonly subsComputed = computed<Record<Tab, string>>(() => {
    const t = this.tenant(this.tid());
    return { ...this.SUBS, thread: 'Unit ' + t.room + ' · ' + this.PROPERTIES.find((p) => p.id === t.pid)!.short };
  });

  readonly liveSug = computed(() => (this.SUGGESTIONS[this.tid()] || []).filter((g) => !this.dismissed()[g.id]));

  readonly navItems = computed(() => {
    const pending = this.TENANTS.reduce((acc, t) => acc + (this.SUGGESTIONS[t.id] || []).filter((g) => !this.dismissed()[g.id]).length, 0);
    const defs: { key: Tab; label: string; badge: number }[] = [
      { key: 'tenants', label: 'Tenants', badge: 0 },
      { key: 'thread', label: 'Thread', badge: 0 },
      { key: 'assistant', label: 'Assistant', badge: pending },
      { key: 'queue', label: 'Queue', badge: this.QUEUE.length },
    ];
    return defs.map((n) => ({ ...n, active: this.tab() === n.key, svg: this.NAV_SVG[n.key] }));
  });

  readonly propertyGroups = computed(() =>
    this.PROPERTIES.map((p) => {
      const tenants = this.TENANTS.filter((t) => t.pid === p.id).map((t) => ({
        id: t.id, name: t.name, initials: t.initials, room: t.room, score: t.score,
        shortAddr: p.short, avBg: t.avBg, avFg: t.avFg, last: t.last,
        stars: [1, 2, 3, 4, 5].map((i) => i <= t.score),
      }));
      return { name: p.name, dot: p.dot, meta: tenants.length + ' occupied', tenants };
    }),
  );

  readonly cur = computed(() => {
    const t = this.tenant(this.tid());
    return {
      name: t.name, firstName: t.name.split(' ')[0], initials: t.initials, room: t.room,
      address: this.PROPERTIES.find((p) => p.id === t.pid)!.addr, avBg: t.avBg, avFg: t.avFg,
      maint: t.maint,
      prefs: [
        { label: 'Preferred contact time', value: t.time, icon: this.PREF_ICONS.time },
        { label: 'Communication style', value: t.style, icon: this.PREF_ICONS.style },
        { label: 'Payment pattern', value: t.pay, icon: this.PREF_ICONS.pay },
      ],
    };
  });

  readonly subTabs = computed(() => {
    const live = this.liveSug().length;
    const defs: { key: Sub; label: string; count: number; pulse: boolean }[] = [
      { key: 'messages', label: 'Messages', count: 0, pulse: false },
      { key: 'suggestions', label: 'AI Suggestions', count: live, pulse: true },
      { key: 'profile', label: 'Profile', count: 0, pulse: false },
    ];
    return defs.map((d) => ({ ...d, active: this.sub() === d.key, pulse: d.pulse && this.sub() !== d.key }));
  });

  readonly thread = computed(() => (this.THREADS[this.tid()] || []).concat(this.extra()[this.tid()] || []));

  readonly suggestions = computed(() =>
    this.liveSug().map((g) => ({
      id: g.id, trigger: g.trigger, source: g.source, sourceDot: g.sourceDot,
      toneKey: g.tone, toneLabel: g.tone, toneEmoji: g.toneEmoji,
      editing: !!this.sugEditMap()[g.id],
      text: this.sugTextMap()[g.id] != null ? this.sugTextMap()[g.id] : g.text,
    })),
  );

  readonly suggestionsLead = computed(() => {
    const n = this.liveSug().length;
    return n ? `${n} message${n === 1 ? '' : 's'} ready for your review` : 'Nothing needs review right now';
  });

  readonly channelLabel = computed(() => ({ sms: 'SMS', email: 'Email', note: 'Note' }[this.channel()]));
  readonly composerPlaceholder = computed(() =>
    this.channel() === 'note' ? 'Log a private note…' : `Message ${this.cur().firstName} by ${this.channelLabel()}…`,
  );
  readonly draft = computed(() => this.draftMap()[this.tid()] || '');
  readonly notes = computed(() => {
    const v = this.notesMap()[this.tid()];
    return v != null ? v : this.tenant(this.tid()).noteSeed;
  });

  // template helpers
  titles() { return this.titlesComputed(); }
  subs() { return this.subsComputed(); }

  // ---- actions ----
  setTab(tab: Tab) { this.tab.set(tab); }
  setSub(sub: Sub) { this.sub.set(sub); }
  toggleTheme() { this.theme.update((t) => (t === 'dark' ? 'light' : 'dark')); }
  openTenant(id: string) { this.tid.set(id); this.tab.set('thread'); this.sub.set('messages'); }
  qa(ch: Channel) { this.channel.set(ch); this.sub.set('messages'); }

  setDraft(v: string) { const tid = this.tid(); this.draftMap.update((m) => ({ ...m, [tid]: v })); }
  draftKey(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendDraft(); } }
  sendDraft() {
    const tid = this.tid();
    const text = (this.draftMap()[tid] || '').trim();
    if (!text) return;
    const ch = this.channel();
    const msg: Message = { dir: ch === 'note' ? 'note' : 'out', ch, time: this.stamp(), ai: false, body: text };
    this.extra.update((m) => ({ ...m, [tid]: [...(m[tid] || []), msg] }));
    this.draftMap.update((m) => ({ ...m, [tid]: '' }));
  }

  private stamp(): string {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return 'Jun 19, ' + h + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  approveSug(id: string) {
    const sug = (this.SUGGESTIONS[this.tid()] || []).find((g) => g.id === id);
    if (!sug) return;
    const tid = this.tid();
    const text = this.sugTextMap()[id] != null ? this.sugTextMap()[id] : sug.text;
    const ch: Channel = sug.tone === 'Informational' && sug.source === 'Rent Tracker' ? 'email' : 'sms';
    const msg: Message = { dir: 'out', ch, time: this.stamp(), ai: true, body: text };
    this.extra.update((m) => ({ ...m, [tid]: [...(m[tid] || []), msg] }));
    this.dismissed.update((m) => ({ ...m, [id]: true }));
    this.sub.set('messages');
  }
  dismissSug(id: string) { this.dismissed.update((m) => ({ ...m, [id]: true })); }
  toggleSugEdit(id: string) { this.sugEditMap.update((m) => ({ ...m, [id]: !m[id] })); }
  onSugEdit(id: string, v: string) { this.sugTextMap.update((m) => ({ ...m, [id]: v })); }

  setNotes(v: string) { const tid = this.tid(); this.notesMap.update((m) => ({ ...m, [tid]: v })); }

  chatKey(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); } }

  async sendChat(preset?: string) {
    const text = (typeof preset === 'string' ? preset : this.chatInput()).trim();
    if (!text || this.chatBusy()) return;
    const t = this.tenant(this.tid());
    this.chat.update((c) => [...c, { from: 'user', text }]);
    this.chatInput.set('');
    this.chatBusy.set(true);
    this.chatStarted.set(true);
    try {
      const reply = await this.assistant.draft(text, t);
      this.chat.update((c) => [...c, { from: 'ai', text: reply }]);
    } catch {
      this.chat.update((c) => [...c, { from: 'ai', text: 'I hit a snag reaching the model just now. Mind trying again in a moment?' }]);
    } finally {
      this.chatBusy.set(false);
    }
  }

  rove(e: KeyboardEvent) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const host = e.currentTarget as HTMLElement;
    const items = [...host.querySelectorAll<HTMLButtonElement>('[data-roving]')].filter((x) => !x.disabled);
    if (!items.length) return;
    let i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) i = 0;
    let n = i;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % items.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + items.length) % items.length;
    else if (e.key === 'Home') n = 0;
    else if (e.key === 'End') n = items.length - 1;
    items[n].focus();
    e.preventDefault();
  }
}
