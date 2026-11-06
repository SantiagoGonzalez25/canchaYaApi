import { listEnrollments } from "@/lib/data/enrollments";
import { requireAdmin, requireUser } from "@/lib/guard";
import { route, serverTimeNow } from "@/lib/http";

/** GET /api/users/:id/enrollments — historial de inscripciones; solo admin. */
export const GET = route(
  async (request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireUser(request);
    requireAdmin(admin);
    const { id } = await ctx.params;
    const enrollments = await listEnrollments({ userId: id });
    return Response.json({ enrollments, serverTime: serverTimeNow() });
  },
);
