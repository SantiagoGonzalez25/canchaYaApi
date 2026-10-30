import { deleteScenario, getScenario, updateScenario } from "@/lib/data/scenarios";
import { requireAdmin, requireUser } from "@/lib/guard";
import { parseBody, route } from "@/lib/http";
import { scenarioSchema } from "@/lib/schemas";

export const GET = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser(request);
  const { id } = await ctx.params;
  return Response.json({ scenario: await getScenario(id), serverTime: new Date().toISOString() });
});

export const PUT = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const { id } = await ctx.params;
  const input = await parseBody(request, scenarioSchema);
  return Response.json({
    scenario: await updateScenario(id, input),
    serverTime: new Date().toISOString(),
  });
});

export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const { id } = await ctx.params;
  await deleteScenario(id);
  return Response.json({ deleted: true, serverTime: new Date().toISOString() });
});
