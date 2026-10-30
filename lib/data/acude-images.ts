import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "../firebase";
import { ApiError } from "../errors";

export const ACUDE_IMAGES = "acudeImages";
const MAX_BASE64_LENGTH = 700_000;

/**
 * Respaldo gratuito cuando Firebase Storage no está habilitado.
 * Guarda la imagen como base64 en un documento pequeño de Firestore y la
 * sirve mediante una ruta de la API.
 */
export async function saveAcudeImageBase64(
  acudeId: string,
  contentType: string,
  data: string,
): Promise<string> {
  if (data.length > MAX_BASE64_LENGTH) {
    throw new ApiError(
      400,
      "PAYLOAD_TOO_LARGE",
      "La imagen es demasiado grande para el modo sin Storage. Usa una imagen menor a 500 KB o una URL externa.",
    );
  }
  const version = randomUUID().slice(0, 8);
  await db().collection(ACUDE_IMAGES).doc(acudeId).set({
    contentType,
    data,
    version,
    updatedAt: new Date().toISOString(),
  });
  return `/api/acudes/${acudeId}/image?v=${version}`;
}

export async function deleteAcudeImageBase64(acudeId: string): Promise<void> {
  await db().collection(ACUDE_IMAGES).doc(acudeId).delete();
}

export async function getAcudeImageBase64(
  acudeId: string,
): Promise<{ contentType: string; data: string }> {
  const snap = await db().collection(ACUDE_IMAGES).doc(acudeId).get();
  if (!snap.exists) {
    throw new ApiError(404, "NOT_FOUND", "El ACUDE no tiene imagen");
  }
  const data = snap.data() as { contentType?: string; data?: string };
  if (!data.data) {
    throw new ApiError(404, "NOT_FOUND", "El ACUDE no tiene imagen");
  }
  return { contentType: data.contentType ?? "image/jpeg", data: data.data };
}
