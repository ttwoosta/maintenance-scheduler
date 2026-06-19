/**
 * Seed script — populates Firestore with the 12 demo tasks and their prep
 * checklists. Uses stable document IDs so re-running is idempotent.
 *
 *   npm run seed
 */

import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../src/app/firebase';

// ---- tasks ---------------------------------------------------------------

const tasks = [
  // Maple Court
  { id: 'mc-lawn',   propertyId: 'p1', name: 'Mow the lawn',          iconKey: 'lawn',     tint: '#4CA57C', durationMin: 25,  bucket: 'quick', recurrence: 'Weekly',    dueInDays:  2,  done: false },
  { id: 'mc-boiler', propertyId: 'p1', name: 'Service the boiler',     iconKey: 'boiler',   tint: '#E08A3C', durationMin: 180, bucket: 'long',  recurrence: 'Quarterly', dueInDays: -3,  done: false },
  { id: 'mc-gutter', propertyId: 'p1', name: 'Clean the gutters',      iconKey: 'gutter',   tint: '#3E8FD0', durationMin: 150, bucket: 'long',  recurrence: 'Quarterly', dueInDays:  9,  done: false },
  { id: 'mc-alarm',  propertyId: 'p1', name: 'Test smoke alarms',      iconKey: 'alarm',    tint: '#D9544D', durationMin: 15,  bucket: 'quick', recurrence: 'Monthly',   dueInDays: -1,  done: false },
  { id: 'mc-filter', propertyId: 'p1', name: 'Replace AC filter',      iconKey: 'filter',   tint: '#7C6BC4', durationMin: 10,  bucket: 'quick', recurrence: 'Monthly',   dueInDays:  5,  done: false },
  { id: 'mc-rad',    propertyId: 'p1', name: 'Bleed the radiators',    iconKey: 'radiator', tint: '#C99A2E', durationMin: 20,  bucket: 'quick', recurrence: 'Quarterly', dueInDays: -10, done: true  },
  // 12 Birch Lane
  { id: 'bl-lawn',   propertyId: 'p2', name: 'Mow the lawn',          iconKey: 'lawn',     tint: '#4CA57C', durationMin: 30,  bucket: 'quick', recurrence: 'Weekly',    dueInDays:  1,  done: false },
  { id: 'bl-hedge',  propertyId: 'p2', name: 'Trim the hedges',       iconKey: 'wrench',   tint: '#5FA855', durationMin: 90,  bucket: 'long',  recurrence: 'Monthly',   dueInDays:  4,  done: false },
  { id: 'bl-boiler', propertyId: 'p2', name: 'Service the boiler',    iconKey: 'boiler',   tint: '#E08A3C', durationMin: 180, bucket: 'long',  recurrence: 'Quarterly', dueInDays: -2,  done: false },
  // Harbour View
  { id: 'hv-gutter', propertyId: 'p3', name: 'Clean the gutters',     iconKey: 'gutter',   tint: '#3E8FD0', durationMin: 120, bucket: 'long',  recurrence: 'Quarterly', dueInDays:  6,  done: false },
  { id: 'hv-alarm',  propertyId: 'p3', name: 'Test smoke alarms',     iconKey: 'alarm',    tint: '#D9544D', durationMin: 15,  bucket: 'quick', recurrence: 'Monthly',   dueInDays:  3,  done: false },
  { id: 'hv-paint',  propertyId: 'p3', name: 'Touch up window paint', iconKey: 'wrench',   tint: '#9A8B6B', durationMin: 240, bucket: 'long',  recurrence: 'Quarterly', dueInDays: -5,  done: false },
] as const;

// ---- prep checklists ------------------------------------------------------
// Each array entry: [label, checked, photo]

type PrepRow = [string, boolean, string | null];

const prep: Record<string, PrepRow[]> = {
  'mc-lawn':   [
    ['Petrol can filled',       true,  null              ],
    ['Engine oil level',        false, 'demo-photos/02.png'],
    ['Tyre pressure ~22 psi',   false, null              ],
    ['Safety goggles',          true,  null              ],
    ['Grass collection bags',   false, null              ],
  ],
  'mc-boiler': [
    ['Boiler service kit',              false, null],
    ['CO test meter',                   false, null],
    ['Replacement seals & gaskets',     false, null],
    ['Service log book',                false, null],
  ],
  'mc-gutter': [
    ['Extension ladder',   false, null],
    ['Gutter scoop',       false, null],
    ['Heavy-duty gloves',  false, null],
    ['Bucket & hose',      false, null],
    ['Spotter on site',    false, null],
  ],
  'mc-alarm':  [
    ['9V batteries ×4',  false, null],
    ['Step stool',       false, null],
    ['Alarm test tool',  false, null],
  ],
  'mc-filter': [
    ['16×25×1 filter',       false, null],
    ['Vacuum / soft brush',  false, null],
  ],
  'mc-rad':    [
    ['Radiator key',    false, null],
    ['Cloth & drip tray', false, null],
  ],
  'bl-lawn':   [
    ['Petrol can filled',      false, null],
    ['Tyre pressure ~22 psi',  false, null],
    ['Grass bags',             false, null],
  ],
  'bl-hedge':  [
    ['Hedge trimmer charged',  false, null],
    ['Extension lead',         false, null],
    ['Tarp & rake',            false, null],
    ['Goggles & gloves',       false, null],
  ],
  'bl-boiler': [
    ['Boiler service kit', false, null],
    ['CO test meter',      false, null],
    ['Service log book',   false, null],
  ],
  'hv-gutter': [
    ['Extension ladder', false, null],
    ['Gutter scoop',     false, null],
    ['Gloves',           false, null],
    ['Bucket',           false, null],
  ],
  'hv-alarm':  [
    ['9V batteries ×3', false, null],
    ['Step stool',      false, null],
  ],
  'hv-paint':  [
    ['Exterior paint',       false, null],
    ['Sandpaper & filler',   false, null],
    ['Brushes & tape',       false, null],
    ['Dust sheets',          false, null],
  ],
};

// ---- write ----------------------------------------------------------------

async function seed() {
  const batch = writeBatch(db);

  for (const { id, ...data } of tasks) {
    batch.set(doc(db, 'tasks', id), data);

    for (const [i, [label, checked, photo]] of (prep[id] ?? []).entries()) {
      batch.set(doc(db, 'tasks', id, 'prep', `${id}-prep-${i}`), { label, checked, photo });
    }
  }

  await batch.commit();

  const prepCount = Object.values(prep).reduce((n, items) => n + items.length, 0);
  console.log(`Seeded ${tasks.length} tasks and ${prepCount} prep items.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
