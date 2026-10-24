import { createScenario, listScenarios } from "@/lib/data/scenarios";
import { requireUser, requireStaff } from "@/lib/guard";
import { parseBody, parseQuery, route, serverTimeNow } from "@/lib/http";
import { scenarioQuerySchema, scenarioSchema } from "@/lib/schemas";

/** GET /api/scenarios — escenarios institucionales. */
export const GET = route(async (request) => {
  await requireUser(request);
  const filter = parseQuery(request, scenarioQuerySchema);
  const serverTime = serverTimeNow();
  return Response.json({ scenarios: await listScenarios(filter), serverTime });
});

/** POST /api/scenarios — solo gestor/admin. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  requireStaff(user);
  const input = await parseBody(request, scenarioSchema);
  return Response.json(
    { scenario: await createScenario(input), serverTime: new Date().toISOString() },
    { status: 201 },
  );
});
