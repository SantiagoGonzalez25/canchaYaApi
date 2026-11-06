import { listAttendanceSessions } from "@/lib/data/attendance";
import { requireStaff, requireUser } from "@/lib/guard";
import { parseQuery, route, serverTimeNow } from "@/lib/http";
import { attendanceSessionsQuerySchema } from "@/lib/schemas";

/** GET /api/attendance/sessions — sesiones reales para pasar asistencia. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const query = parseQuery(request, attendanceSessionsQuerySchema);
  const sessions = await listAttendanceSessions(user, query);
  return Response.json({ sessions, serverTime: serverTimeNow() });
});
