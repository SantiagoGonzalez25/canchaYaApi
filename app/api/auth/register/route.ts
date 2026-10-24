import { parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { register } from "@/lib/services/auth";

/** POST /api/auth/register — registro público; SIEMPRE crea un estudiante. */
export const POST = route(async (request) => {
  const input = await parseBody(request, registerSchema);
  return Response.json(await register(input), { status: 201 });
});
