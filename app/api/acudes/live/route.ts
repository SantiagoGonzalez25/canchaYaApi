import { listLiveAcudes } from "@/lib/data/acudes";
import { requireUser } from "@/lib/guard";
import { parseQuery, route, serverTimeNow } from "@/lib/http";
import { liveQuerySchema } from "@/lib/schemas";

/**
 * GET /api/acudes/live?q=&category=&day=&updatedSince=
 * Cartelera digital en tiempo real: franjas, escenarios y cupos disponibles.
 * `serverTime` se toma ANTES de consultar: es el cursor de la próxima sincronización.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const filter = parseQuery(request, liveQuerySchema);
  const serverTime = serverTimeNow();
  const acudes = await listLiveAcudes({
    ...filter,
    ...(user.role === "manager" ? { teacherId: user.uid } : {}),
  });
  return Response.json({ acudes, serverTime });
});
