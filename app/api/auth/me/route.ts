import { requireUser } from "@/lib/guard";
import { route } from "@/lib/http";

/** GET /api/auth/me — usuario de la sesión actual. */
export const GET = route(async (request) => {
  return Response.json({ user: await requireUser(request) });
});
