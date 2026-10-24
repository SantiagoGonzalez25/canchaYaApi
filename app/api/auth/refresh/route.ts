import { parseBody, route } from "@/lib/http";
import { refreshSchema } from "@/lib/schemas";
import { refresh } from "@/lib/services/auth";

/** POST /api/auth/refresh — cambia un refreshToken por tokens nuevos. */
export const POST = route(async (request) => {
  const { refreshToken } = await parseBody(request, refreshSchema);
  return Response.json(await refresh(refreshToken));
});
