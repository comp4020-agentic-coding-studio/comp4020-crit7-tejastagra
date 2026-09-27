// The data layer's front door: pages import from here. Loading it makes
// sure the demo student exists (it runs once per server process, after the
// migrations in db.ts).
import { ensureDemoStudent } from "./seed";

ensureDemoStudent();

export * from "./courses";
export * from "./seed";
export * from "./students";
