import { defineMiddleware } from "astro:middleware";
import { sessionStudentId } from "./lib/auth/session";
import { getStudent } from "./lib/data";

// Pages and endpoints under these prefixes need a logged-in student.
const PROTECTED = ["/archive", "/courses", "/planner", "/api/courses", "/api/plan", "/api/demo"];

export const onRequest = defineMiddleware((context, next) => {
  const id = sessionStudentId(context.cookies);
  const student = id === null ? undefined : getStudent(id);
  context.locals.student = student ?? null;

  const path = context.url.pathname;
  if (!student && PROTECTED.some((p) => path === p || path.startsWith(`${p}/`))) {
    if (context.request.method !== "GET") return new Response("Log in first", { status: 401 });
    return context.redirect(`/login/?next=${encodeURIComponent(path)}`, 303);
  }
  return next();
});
