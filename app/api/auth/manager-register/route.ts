import { assertRole, requireUser } from "@/lib/guard";
import { parseBody, route } from "@/lib/http";
import { managerRegisterSchema } from "@/lib/schemas";
import { createManager } from "@/lib/services/auth";

/**
 * POST /api/auth/manager-register
 * Alta de perfiles institucionales. Solo un administrador puede crear gestores.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  assertRole(user, "admin");
  const input = await parseBody(request, managerRegisterSchema);
  const manager = await createManager(input);
  return Response.json({ manager }, { status: 201 });
});
