import { enrollmentReport } from "@/lib/data/reports";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseQuery, route } from "@/lib/http";
import { reportQuerySchema } from "@/lib/schemas";

/**
 * GET /api/reports/enrollments
 * Reporte de eventos de inscripción filtrable por TODOS los campos del formulario
 * (ACUDE, categoría, disciplina, escenario, franja, día, sexo, estado, docente,
 * estudiante) y por rango de fechas. `groupBy` define la dimensión de la gráfica.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const query = parseQuery(request, reportQuerySchema);
  return Response.json(await enrollmentReport(query));
});
