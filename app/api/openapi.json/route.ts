import { buildOpenApiSpec } from "@/lib/openapi";

/** GET /api/openapi.json — especificación OpenAPI 3.1 generada desde Zod. */
export async function GET() {
  return Response.json(buildOpenApiSpec(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
