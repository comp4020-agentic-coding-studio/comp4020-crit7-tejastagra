import type { APIRoute } from "astro";
import { startSession } from "../../lib/auth/session";
import { createStudent, findStudentByUniId, normaliseUniId, UNI_ID_PATTERN } from "../../lib/data";
import { text, withMessage } from "../../lib/forms";

const MIN_PASSWORD = 8;

export const POST: APIRoute = async ({ request, cookies, redirect, url }) => {
  const form = await request.formData();
  const fail = (message: string) => redirect(withMessage("/register/", "error", message), 303);

  const uniId = normaliseUniId(String(form.get("uniId") ?? ""));
  if (!UNI_ID_PATTERN.test(uniId)) return fail("A uni ID looks like u1234567.");
  const name = text(form, "name", "Your name", 80);
  if (!name.ok) return fail(name.error);
  const password = String(form.get("password") ?? "");
  if (password.length < MIN_PASSWORD) return fail(`Use a password of at least ${MIN_PASSWORD} characters.`);
  if (findStudentByUniId(uniId)) return fail("That uni ID already has an account. Try logging in.");

  const student = createStudent({ uniId, name: name.value, password });
  startSession(cookies, student.id, url.protocol === "https:");
  return redirect(withMessage("/", "notice", "Welcome! Add your first course to get started."), 303);
};
