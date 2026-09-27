import { defineMiddleware } from "astro:middleware";
import { sessionUserId } from "./lib/auth/session";
import { getUser } from "./lib/data";

// Who may reach what (docs/harness/architecture.md). Pages redirect to the
// right login; endpoints answer 401 (not logged in) or 403 (wrong role).
const STUDENT_ONLY = ["/archive", "/courses", "/planner", "/api/courses", "/api/plan"];
const STAFF_ONLY = ["/staff", "/api/staff"];
const ANY_USER = ["/api/demo"];
// the staff login page itself is public
const PUBLIC = ["/staff/login"];

const under = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));

export const onRequest = defineMiddleware((context, next) => {
  const id = sessionUserId(context.cookies);
  const user = (id === null ? undefined : getUser(id)) ?? null;
  context.locals.user = user;

  const path = context.url.pathname;
  const isApi = path.startsWith("/api/");
  if (under(path, PUBLIC)) return next();

  const needs = under(path, STAFF_ONLY) ? "staff" : under(path, STUDENT_ONLY) ? "student" : under(path, ANY_USER) ? "any" : null;
  if (needs === null) return next();

  if (!user) {
    if (isApi) return new Response("Log in first", { status: 401 });
    const login = needs === "staff" ? "/staff/login/" : "/login/";
    return context.redirect(`${login}?next=${encodeURIComponent(path)}`, 303);
  }
  if (needs !== "any" && user.role !== needs) {
    if (isApi) return new Response("Not allowed for this account", { status: 403 });
    return context.redirect(user.role === "staff" ? "/staff/" : "/", 303);
  }
  return next();
});
