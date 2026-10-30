/**
 * Errores de negocio con código estable. La app móvil decide qué hacer por
 * `code`, nunca por el texto del mensaje.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_IN_USE"
  | "ALREADY_ENROLLED"
  | "MAX_ACUDES"
  | "NO_CAPACITY"
  | "SCHEDULE_CONFLICT"
  | "STUDENT_OVERLAP"
  | "INVALID_STATE"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Convierte un error desconocido en un mensaje seguro para el usuario. */
export function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  console.error("[canchaya] error no controlado:", err);
  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}
