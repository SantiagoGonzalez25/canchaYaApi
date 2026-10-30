import { listAttendance, saveAttendance } from "@/lib/data/attendance";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseBody, parseQuery, route, serverTimeNow } from "@/lib/http";
import { attendanceQuerySchema, saveAttendanceSchema } from "@/lib/schemas";

/** GET /api/attendance?acudeId=&slotId=&date=&from=&to= — gestor/admin. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const filter = parseQuery(request, attendanceQuerySchema);
  const serverTime = serverTimeNow();
  const attendance = await listAttendance({
    ...filter,
    ...(user.role === "manager" ? { teacherId: user.uid } : {}),
  });
  return Response.json({ attendance, serverTime });
});

/**
 * POST /api/attendance { acudeId, slotId, date, records[] }
 * Registro masivo e idempotente de la asistencia real al subgrupo.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const input = await parseBody(request, saveAttendanceSchema);
  const attendance = await saveAttendance(input, user);
  return Response.json({
    attendance,
    saved: attendance.length,
    serverTime: new Date().toISOString(),
  });
});
