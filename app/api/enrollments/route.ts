import { createEnrollment, listEnrollments } from "@/lib/data/enrollments";
import { assertRole, requireUser, requireStaff } from "@/lib/guard";
import { parseBody, parseQuery, route, serverTimeNow } from "@/lib/http";
import { createEnrollmentSchema, enrollmentQuerySchema } from "@/lib/schemas";

/** GET /api/enrollments — gestor/admin: todas las inscripciones para trazabilidad. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const filter = parseQuery(request, enrollmentQuerySchema);
  const serverTime = serverTimeNow();
  return Response.json({ enrollments: await listEnrollments(filter), serverTime });
});

/**
 * POST /api/enrollments { acudeId, slotId, clientRequestId, sex }
 * Idempotente: 201 si creó y 200 si la misma solicitud ya existía.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  assertRole(user, "student");
  const input = await parseBody(request, createEnrollmentSchema);
  const { enrollment, created } = await createEnrollment(user, input);
  return Response.json(
    { enrollment, created, serverTime: new Date().toISOString() },
    { status: created ? 201 : 200 },
  );
});
