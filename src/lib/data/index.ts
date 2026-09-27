// The data layer's front door: pages import from here. Loading it makes
// sure the demo accounts exist (once per server process, after the
// migrations in db.ts).
import { ensureDemoData } from "./seed";

ensureDemoData();

export * from "./results";
export * from "./seed";
export * from "./staff";
export * from "./users";
