import "server-only";
import { randomUUID } from "node:crypto";
import { saveAcudeImageBase64 } from "../data/acude-images";
import { ApiError } from "../errors";
import { storageBucket } from "../firebase";
import { MAX_ACUDE_IMAGE_BYTES, sniffImageType, type ImageType } from "../image";

function extensionOf(type: ImageType): string {
  return type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
}

export interface UploadedImage {
  url: string;
  path: string;
}

/** Elimina un objeto de Storage sin romper si ya no existe. */
export async function deleteStorageImage(path: string): Promise<void> {
  if (!path) return;
  try {
    await storageBucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn("[storage] no se pudo eliminar la imagen anterior:", error);
  }
}

/**
 * Sube la portada de un ACUDE a Firebase Storage.
 * Se guarda una URL de descarga con token para que la imagen se pueda mostrar
 * sin abrir la escritura pública del bucket.
 */
export async function uploadAcudeImage(
  acudeId: string,
  file: File,
): Promise<UploadedImage> {
  if (file.size === 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "La imagen está vacía");
  }
  if (file.size > MAX_ACUDE_IMAGE_BYTES) {
    throw new ApiError(400, "PAYLOAD_TOO_LARGE", "La imagen no puede superar 500 KB");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "El archivo debe ser una imagen JPEG, PNG o WebP válida",
    );
  }

  const base64 = Buffer.from(bytes).toString("base64");
  const bucket = storageBucket();
  const path = `acudes/${acudeId}/portada-${randomUUID()}.${extensionOf(type)}`;
  const token = randomUUID();

  try {
    await bucket.file(path).save(Buffer.from(bytes), {
      resumable: false,
      metadata: {
        contentType: type,
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });
  } catch (error) {
    // Respaldo para proyectos Spark: Firebase Storage exige facturación para
    // crear el bucket. Si la imagen cabe en un documento, se sirve por la API.
    try {
      const url = await saveAcudeImageBase64(acudeId, type, base64);
      console.warn("[storage] bucket no disponible; imagen guardada en Firestore");
      return { url, path: "" };
    } catch (fallbackError) {
      console.error("[storage] error al subir la portada:", error);
      if (fallbackError instanceof ApiError) throw fallbackError;
      throw new ApiError(
        500,
        "CONFIG_ERROR",
        "No se pudo subir la imagen. Verifica Firebase Storage o usa una imagen menor a 500 KB.",
      );
    }
  }

  const url = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
    bucket.name,
  )}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
  return { url, path };
}
