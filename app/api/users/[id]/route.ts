import { requireAdmin, requireUser } from "@/lib/guard";
import { parseBody, route, serverTimeNow } from "@/lib/http";
import { updateUserSchema } from "@/lib/schemas";
import { changeUserAccess } from "@/lib/services/user-admin";

/** PATCH /api/users/:id — cambia rol y/o estado; solo admin. */
export const PATCH = route(
  async (request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireUser(request);
    requireAdmin(admin);
    const { id } = await ctx.params;
    const input = await parseBody(request, updateUserSchema);
    const user = await changeUserAccess(admin, id, input);
    return Response.json({ user, serverTime: serverTimeNow() });
  },
);
