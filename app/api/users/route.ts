import { requireAdmin, requireUser } from "@/lib/guard";
import { route, serverTimeNow } from "@/lib/http";
import { listUsers } from "@/lib/services/auth";

/** GET /api/users — listado completo de usuarios; solo admin. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireAdmin(user);
  return Response.json({ users: await listUsers(), serverTime: serverTimeNow() });
});
