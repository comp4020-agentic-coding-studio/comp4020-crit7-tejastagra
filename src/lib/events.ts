import { EventEmitter } from "node:events";

// One process, one bus: every open SSE connection subscribes here. When a
// student changes their data, their other open tabs and devices hear about
// it and offer a refresh. This only works because the app runs on exactly
// one machine (see fly.toml) — a second machine would have its own bus.
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export const STUDENT_CHANGED = "student-changed";

export function notifyStudentChanged(studentId: number): void {
  bus.emit(STUDENT_CHANGED, studentId);
}
