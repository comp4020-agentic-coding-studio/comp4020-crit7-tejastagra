import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here, keyed by
// uni ID. When staff release marks, the students in that course hear about
// it; when anyone changes their own data, their other tabs and devices do
// too. This only works because the app runs on exactly one machine (see
// fly.toml) — a second machine would have its own bus.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export const RESULTS_CHANGED = "results-changed";

export function notifyChanged(uniIds: Iterable<string>): void {
  for (const uniId of new Set(uniIds)) bus.emit(RESULTS_CHANGED, uniId);
}
