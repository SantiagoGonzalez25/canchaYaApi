import { createAcude, listAcudes } from "@/lib/data/acudes";
import { requireAdmin, requireUser } from "@/lib/guard";
import { parseBody, parseQuery, route, serverTimeNow } from "@/lib/http";
import { acudeQuerySchema, acudeSchema } from "@/lib/schemas";

/**
 * GET /api/acudes?status=&category=&discipline=&q=&updatedSince=
 * Catálogo de gestión. El gestor solo ve los ACUDES que tiene asignados.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  if (user.role === "student") {
    requireAdmin(user);
  }
  const filter = parseQuery(request, acudeQuerySchema);
  if (user.role === "manager") filter.teacherId = user.uid;
  const serverTime = serverTimeNow();
  const acudes = await listAcudes(filter);
  return Response.json({ acudes, serverTime });
});

/** POST /api/acudes — solo el administrador crea grupos. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const input = await parseBody(request, acudeSchema);
  const acude = await createAcude(input, user);
  return Response.json({ acude, serverTime: new Date().toISOString() }, { status: 201 });
});
