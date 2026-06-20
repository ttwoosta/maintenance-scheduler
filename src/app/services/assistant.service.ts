import { Injectable } from '@angular/core';

declare global {
  interface Window {
    claude?: { complete: (opts: { messages: { role: string; content: string }[] }) => Promise<string> };
  }
}

export interface TenantContext {
  name: string;
  room: string;
  style: string;
  time: string;
  pay: string;
  maint: { label: string; date: string }[];
}

const SYSTEM =
  'You are TenantBridge, an AI assistant helping a landlord (Alex) write warm, respectful ' +
  'messages to tenants. Core rule: mutual respect first — never condescending to the tenant, ' +
  'never passive-aggressive about rent. Coach toward empathetic, professional communication. ' +
  'When asked to draft a message, return the message itself in a natural voice (SMS length ' +
  'unless email is requested), then add one short line explaining the tone you chose and why, ' +
  "based on the tenant's profile. Keep replies concise.";

/**
 * Wraps the host-provided `window.claude.complete` used by the TenantBridge
 * assistant, with a deterministic demo fallback when it is unavailable.
 *
 * In production swap `window.claude` for your own backend call (e.g. an
 * authenticated Cloud Function that proxies the model) — the signature stays
 * the same so the component is unaffected.
 */
@Injectable({ providedIn: 'root' })
export class AssistantService {
  async draft(request: string, t: TenantContext): Promise<string> {
    const ctx =
      `TENANT CONTEXT — Name: ${t.name}, Unit ${t.room}. Communication style: ${t.style}. ` +
      `Preferred contact time: ${t.time}. Payment pattern: ${t.pay}. ` +
      `Recent maintenance: ${t.maint.map((m) => `${m.label} (${m.date})`).join('; ')}.`;
    const prompt = `${SYSTEM}\n\n${ctx}\n\nLANDLORD REQUEST: ${request}`;

    if (window.claude?.complete) {
      const reply = await window.claude.complete({ messages: [{ role: 'user', content: prompt }] });
      return (reply || '').trim() || 'Sorry, I could not draft that just now.';
    }

    const first = t.name.split(' ')[0];
    return (
      `(Demo) Here's a friendly draft for ${t.name}:\n\n` +
      `\u201cHi ${first}, just checking in — hope all's well at the unit. ` +
      `Let me know if there's anything you need.\u201d\n\n` +
      `Tone: warm and low-pressure, matching ${first}'s profile.`
    );
  }
}
