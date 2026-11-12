// Outline Editor nesting and ripple insert (1.17; Final Draft 13.1–13.2).
// * An element can have child elements in the lanes below it (OutlineMarker.parentId). A parent must be in a lane
//   above its child; a parent that is missing, hidden or not above is ignored, so a reordered lane or a deleted element
//   never leaves a broken or circular relation.
// * Moving a parent moves its children (and theirs) by the same amount; holding Option/Alt leaves them in place.
// * Ripple insert: a new element pushes the following elements of its lane (and their children) to the right, just far
//   enough to clear it.
import type { OutlineLane, OutlineMarker } from '../types/script';
export interface Placed { id: string; laneId: string; start: number; end: number; parentId?: string; point?: boolean }
const laneOrder = (lanes: OutlineLane[]) => new Map(lanes.map((l, i) => [l.id, i]));
/** parent id → direct child ids, for valid relations only. */
export function childMap(items: Placed[], lanes: OutlineLane[]) {
  const order = laneOrder(lanes), byId = new Map(items.map(i => [i.id, i])), out = new Map<string, string[]>();
  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    if (!parent || parent.id === item.id) continue;
    const a = order.get(parent.laneId), b = order.get(item.laneId);
    if (a === undefined || b === undefined || a >= b) continue;
    out.set(parent.id, [...(out.get(parent.id) || []), item.id]);
  }
  return out;
}
export function validParent(item: Placed, items: Placed[], lanes: OutlineLane[]) { return [...childMap(items, lanes)].some(([, kids]) => kids.includes(item.id)) ? item.parentId : undefined; }
/** Every element below `id` (children, grandchildren…), depth first. */
export function descendants(id: string, children: Map<string, string[]>): string[] {
  const out: string[] = [], seen = new Set([id]), walk = (p: string) => { for (const c of children.get(p) || []) if (!seen.has(c)) { seen.add(c); out.push(c); walk(c); } };
  walk(id); return out;
}
/** The element a new or moved element at `start` in `laneId` belongs to: the one covering `start` in the nearest lane
 * above that has one. Point markers are never parents. */
export function parentAt(items: Placed[], lanes: OutlineLane[], laneId: string, start: number, exclude = new Set<string>()): string | undefined {
  const order = laneOrder(lanes), mine = order.get(laneId); if (mine === undefined) return undefined;
  for (let i = mine - 1; i >= 0; i--) {
    const hit = items.filter(x => !x.point && !exclude.has(x.id) && x.laneId === lanes[i].id && start >= x.start - 1e-6 && start < x.end - 1e-6).sort((a, b) => b.start - a.start)[0];
    if (hit) return hit.id;
  }
  return undefined;
}
/** Ripple insert: shifts for the elements after a new element [start, end) in its lane, plus their descendants. */
export function rippleShifts(items: Placed[], lanes: OutlineLane[], laneId: string, start: number, end: number, newId?: string): Map<string, number> {
  const following = items.filter(x => x.laneId === laneId && x.id !== newId && x.start >= start - 1e-6).sort((a, b) => a.start - b.start);
  const shifts = new Map<string, number>(); if (!following.length) return shifts;
  const by = Math.max(0, end - following[0].start); if (by <= 1e-6) return shifts;
  const children = childMap(items, lanes);
  for (const f of following) { shifts.set(f.id, by); for (const d of descendants(f.id, children)) if (!shifts.has(d)) shifts.set(d, by); }
  return shifts;
}
/** Drops relations that are no longer valid (for saving and display). */
export function cleanNesting(markers: OutlineMarker[], lanes: OutlineLane[], place: (m: OutlineMarker) => Placed): OutlineMarker[] {
  const items = markers.map(place), kids = childMap(items, lanes), valid = new Set([...kids.values()].flat());
  let changed = false; const out = markers.map(m => m.parentId && !valid.has(m.id) ? (changed = true, { ...m, parentId: undefined }) : m);
  return changed ? out : markers;
}
