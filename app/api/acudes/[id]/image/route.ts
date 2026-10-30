import { getAcudeImageBase64 } from "@/lib/data/acude-images";
import { route } from "@/lib/http";

/**
 * GET /api/acudes/:id/image
 * Imagen de portada cuando se usa el respaldo gratuito de Firestore.
 */
export const GET = route(async (_request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const { contentType, data } = await getAcudeImageBase64(id);
  return new Response(new Uint8Array(Buffer.from(data, "base64")), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
