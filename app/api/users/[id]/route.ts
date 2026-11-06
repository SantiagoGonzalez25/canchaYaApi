import { ApiError } from "@/lib/errors";
import { requireAdmin, requireUser } from "@/lib/guard";
import { parseBody, route, serverTimeNow } from "@/lib/http";
import { updateUserSchema } from "@/lib/schemas";
import { updateUserAccess } from "@/lib/services/auth";

/** PATCH /api/users/:id — cambia rol y/o estado; solo admin. */
export const PATCH = route(
  async (request, ctx: { params: Promise<{ id: string }> }) => {
    const admin = await requireUser(request);
    requireAdmin(admin);
    const { id } = await ctx.params;
    const input = await parseBody(request, updateUserSchema);

    if (
      id === admin.uid &&
      ((input.role && input.role !== "admin") ||
        (input.status && input.status !== "active"))
    ) {
      throw new ApiError(
        409,
        "INVALID_STATE",
        "No puedes quitarte el rol de administrador ni deshabilitar tu propia cuenta",
      );
    }

    const user = await updateUserAccess(id, input);
    return Response.json({ user, serverTime: serverTimeNow() });
  },
);
