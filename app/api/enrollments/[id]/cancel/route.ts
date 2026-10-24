import { cancelEnrollment } from "@/lib/data/enrollments";
import { requireUser } from "@/lib/guard";
import { route } from "@/lib/http";

/**
 * PATCH /api/enrollments/:id/cancel
 * Libera el cupo inmediatamente. Es idempotente: cancelar dos veces devuelve 200.
 */
export const PATCH = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  const { enrollment, alreadyCanceled } = await cancelEnrollment(user, id);
  return Response.json({
    enrollment,
    alreadyCanceled,
    serverTime: new Date().toISOString(),
  });
});
