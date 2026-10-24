import { createAcude, listAcudes } from "@/lib/data/acudes";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseBody, parseQuery, route, serverTimeNow } from "@/lib/http";
import { acudeQuerySchema, acudeSchema } from "@/lib/schemas";

/**
 * GET /api/acudes?status=&category=&discipline=&q=&updatedSince=
 * Catálogo de gestión (borradores incluidos). Para estudiantes existe /api/acudes/live.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const filter = parseQuery(request, acudeQuerySchema);
  const serverTime = serverTimeNow();
  const acudes = await listAcudes(filter);
  return Response.json({ acudes, serverTime });
});

/** POST /api/acudes — crea un grupo y bloquea cruces de escenario/docente. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const input = await parseBody(request, acudeSchema);
  const acude = await createAcude(input, user);
  return Response.json({ acude, serverTime: new Date().toISOString() }, { status: 201 });
});
