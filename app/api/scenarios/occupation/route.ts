import { getOccupation } from "@/lib/data/occupation";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { occupationQuerySchema } from "@/lib/schemas";

/**
 * GET /api/scenarios/occupation?date=YYYY-MM-DD&day=monday
 * Trazabilidad en vivo: qué grupo ACUDE usa cada escenario, en qué franja y con
 * cuántos inscritos.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const { date, day } = parseQuery(request, occupationQuerySchema);
  const serverTime = new Date().toISOString();
  const occupation = await getOccupation(
    date,
    day,
    new Date(),
    user.role === "manager" ? user.uid : undefined,
  );
  return Response.json({ ...occupation, serverTime });
});
