import { listMyEnrollments } from "@/lib/data/enrollments";
import { requireUser } from "@/lib/guard";
import { parseQuery, route, serverTimeNow } from "@/lib/http";
import { enrollmentQuerySchema } from "@/lib/schemas";

/**
 * GET /api/enrollments/me?status=&updatedSince=
 * Inscripciones del estudiante autenticado. `serverTime` es el cursor de la
 * próxima sincronización offline.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const filter = parseQuery(request, enrollmentQuerySchema);
  const serverTime = serverTimeNow();
  const enrollments = await listMyEnrollments(user, filter);
  return Response.json({ enrollments, serverTime });
});
