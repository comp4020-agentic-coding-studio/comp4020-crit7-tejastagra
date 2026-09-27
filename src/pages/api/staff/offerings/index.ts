import type { APIRoute } from "astro";
import { createOffering } from "../../../../lib/data";
import { withMessage } from "../../../../lib/forms";
import { parseOffering } from "../../../../lib/staff-forms";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const staff = locals.user!;
  const parsed = parseOffering(await request.formData());
  if (!parsed.ok) return redirect(withMessage("/staff/#new-offering", "error", parsed.error), 303);
  const offering = createOffering(staff.id, parsed.value);
  return redirect(
    withMessage(`/staff/offerings/${offering.id}/`, "notice", `Created ${offering.code}. Add its assessment and students.`),
    303,
  );
};
