import { attendanceReport } from "@/lib/data/reports";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { reportQuerySchema } from "@/lib/schemas";

/**
 * GET /api/reports/attendance
 * Reporte de asistencia por ACUDE y por todos los campos del formulario, con
 * rango de fechas y agrupación configurable (día, ACUDE, sexo, escenario...).
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const query = parseQuery(request, reportQuerySchema);
  return Response.json(await attendanceReport(query));
});
