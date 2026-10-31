import { requireAdmin, requireUser } from "@/lib/guard";
import { route, serverTimeNow } from "@/lib/http";
import { listManagers } from "@/lib/services/auth";

/**
 * GET /api/auth/managers — solo admin.
 * Listado completo de perfiles de profesor para asignarlos a un ACUDE.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const serverTime = serverTimeNow();
  return Response.json({ managers: await listManagers(), serverTime });
});
