import { clearAcudeImage, getAcude, updateAcudeImage } from "@/lib/data/acudes";
import {
  deleteAcudeImageBase64,
  getAcudeImageBase64,
} from "@/lib/data/acude-images";
import { ApiError } from "@/lib/errors";
import { requireAdmin, requireUser } from "@/lib/guard";
import { route } from "@/lib/http";
import { deleteStorageImage, uploadAcudeImage } from "@/lib/services/storage";

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

/**
 * POST /api/acudes/:id/image — solo admin.
 * multipart/form-data con el campo `file`. Guarda la portada global en Storage
 * o en Firestore como respaldo y actualiza el ACUDE.
 */
export const POST = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const { id } = await ctx.params;
  const existing = await getAcude(id);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "VALIDATION_ERROR", "Envía la imagen como multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Adjunta una imagen en el campo `file`");
  }

  const image = await uploadAcudeImage(id, file);
  const acude = await updateAcudeImage(id, image.url, image.path);

  // Limpia la portada anterior sin romper la subida si ya no existe.
  if (image.path) await deleteAcudeImageBase64(id);
  if (existing.imageStoragePath && existing.imageStoragePath !== image.path) {
    await deleteStorageImage(existing.imageStoragePath);
  }

  return Response.json({
    acude,
    image: { url: image.url, storagePath: image.path || null },
    serverTime: new Date().toISOString(),
  });
});

/**
 * DELETE /api/acudes/:id/image — solo admin.
 * Quita la portada global y limpia Storage/Firestore.
 */
export const DELETE = route(async (request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser(request);
  requireAdmin(user);
  const { id } = await ctx.params;
  const existing = await getAcude(id);

  const acude = await clearAcudeImage(id);
  await deleteAcudeImageBase64(id);
  if (existing.imageStoragePath) await deleteStorageImage(existing.imageStoragePath);

  return Response.json({
    acude,
    deleted: true,
    serverTime: new Date().toISOString(),
  });
});
