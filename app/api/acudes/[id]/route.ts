import { archiveAcude, getAcude, updateAcude } from "@/lib/data/acudes";
import { requireUser, requireStaff } from "@/lib/guard";
import { ApiError } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";
import { acudeSchema } from "@/lib/schemas";

/** GET /api/acudes/:id — detalle. Un estudiante solo ve ACUDES publicados. */
export const GET = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  const acude = await getAcude(id);
  if (user.role === "student" && acude.status !== "published") {
    throw new ApiError(404, "NOT_FOUND", "ACUDE no encontrado");
  }
  return Response.json({ acude, serverTime: new Date().toISOString() });
});

/** PUT /api/acudes/:id — actualiza y vuelve a validar cruces. */
export const PUT = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireStaff(user);
  const { id } = await ctx.params;
  const input = await parseBody(request, acudeSchema);
  const acude = await updateAcude(id, input, user);
  return Response.json({ acude, serverTime: new Date().toISOString() });
});

/** DELETE /api/acudes/:id — borrado lógico (archivado), conserva trazabilidad. */
export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireStaff(user);
  const { id } = await ctx.params;
  const acude = await archiveAcude(id);
  return Response.json({ acude, serverTime: new Date().toISOString() });
});
