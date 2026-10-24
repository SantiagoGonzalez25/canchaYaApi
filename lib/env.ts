import { z } from "zod";
import { ApiError } from "./errors";

const envSchema = z.object({
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().min(1),
  FIREBASE_PRIVATE_KEY: z.string().min(1),
  /** Web API Key del proyecto (para la API REST de Firebase Authentication). */
  FIREBASE_WEB_API_KEY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Se valida de forma perezosa para que `next build` no exija secretos.
 * El error indica exactamente qué variable falta.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new ApiError(
      500,
      "CONFIG_ERROR",
      `Faltan variables de entorno: ${missing.join(", ")}. Revisa .env`,
    );
  }
  cached = {
    ...parsed.data,
    FIREBASE_PRIVATE_KEY: parsed.data.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
  return cached;
}

/** Solo para scripts: comprueba las variables antes de inicializar Firebase. */
export function assertEnvForScript(): void {
  const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}. Completa .env.`);
    process.exit(1);
  }
}
