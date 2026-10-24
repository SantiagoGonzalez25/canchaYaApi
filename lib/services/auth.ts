import "server-only";
import { adminAuth, db } from "../firebase";
import { getEnv } from "../env";
import { ApiError } from "../errors";
import type { AuthResult, AuthUser, Role, Sex, TokenSet, UserProfile } from "../types";

const IDENTITY = "https://identitytoolkit.googleapis.com/v1";
const SECURE_TOKEN = "https://securetoken.googleapis.com/v1";

/** 5 días: cookie de sesión web (Firebase admite hasta 14 días). */
export const SESSION_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;

export interface DecodedUser {
  uid: string;
  email?: string;
  name?: string;
  role?: unknown;
  sex?: unknown;
}

export function toRole(value: unknown): Role {
  return value === "manager" || value === "admin" ? value : "student";
}

export function toSex(value: unknown): Sex | null {
  return value === "female" || value === "male" || value === "non_binary" || value === "prefer_not_to_say"
    ? value
    : null;
}

export function toAuthUser(decoded: DecodedUser): AuthUser {
  return {
    uid: decoded.uid,
    email: decoded.email ?? "",
    name: decoded.name ?? decoded.email ?? "Usuario",
    role: toRole(decoded.role),
    sex: toSex(decoded.sex),
  };
}

/** Verifica un idToken de Firebase (Authorization: Bearer ...). */
export async function verifyIdToken(idToken: string): Promise<AuthUser> {
  try {
    return toAuthUser(await adminAuth().verifyIdToken(idToken));
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Sesión inválida o expirada");
  }
}

/** Verifica la cookie de sesión httpOnly del panel web. */
export async function verifySessionCookie(cookie: string): Promise<AuthUser> {
  try {
    return toAuthUser(await adminAuth().verifySessionCookie(cookie, true));
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Sesión inválida o expirada");
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_MS });
}

async function firebaseRest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  } & T;
  if (!response.ok) {
    const code = body.error?.message ?? "UNKNOWN";
    if (
      code.startsWith("INVALID_LOGIN_CREDENTIALS") ||
      code.startsWith("INVALID_PASSWORD") ||
      code.startsWith("EMAIL_NOT_FOUND") ||
      code.startsWith("INVALID_REFRESH_TOKEN") ||
      code.startsWith("TOKEN_EXPIRED")
    ) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos");
    }
    if (code.startsWith("USER_DISABLED")) {
      throw new ApiError(403, "FORBIDDEN", "Tu cuenta está deshabilitada");
    }
    if (code.startsWith("TOO_MANY_ATTEMPTS")) {
      throw new ApiError(429, "RATE_LIMITED", "Demasiados intentos, espera un momento");
    }
    throw new ApiError(502, "INTERNAL_ERROR", "Error al contactar el servicio de autenticación");
  }
  return body;
}

/** Login con correo y contraseña usando la API REST de Firebase Auth. */
export async function login(email: string, password: string): Promise<AuthResult> {
  const key = getEnv().FIREBASE_WEB_API_KEY;
  const data = await firebaseRest<{ idToken: string; refreshToken: string; expiresIn: string }>(
    `${IDENTITY}/accounts:signInWithPassword?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  return {
    tokens: {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: Number(data.expiresIn),
    },
    user: await verifyIdToken(data.idToken),
  };
}

/** Intercambia el refreshToken por un idToken nuevo. */
export async function refresh(refreshToken: string): Promise<AuthResult> {
  const key = getEnv().FIREBASE_WEB_API_KEY;
  const data = await firebaseRest<{ id_token: string; refresh_token: string; expires_in: string }>(
    `${SECURE_TOKEN}/token?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    },
  );
  return {
    tokens: {
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      expiresIn: Number(data.expires_in),
    },
    user: await verifyIdToken(data.id_token),
  };
}

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  sex: Sex;
  phone?: string;
  documentId?: string;
}

async function assertEmailAvailable(email: string): Promise<void> {
  try {
    await adminAuth().getUserByEmail(email);
    throw new ApiError(409, "EMAIL_IN_USE", "Ya existe una cuenta con ese correo");
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  }
}

async function writeProfile(
  uid: string,
  input: RegisterInput,
  role: Role,
  now = new Date().toISOString(),
): Promise<UserProfile> {
  const profile: UserProfile = {
    uid,
    email: input.email,
    name: input.displayName,
    role,
    sex: input.sex,
    phone: input.phone ?? null,
    documentId: input.documentId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db().collection("users").doc(uid).set(profile, { merge: true });
  return profile;
}

/**
 * Registro público: SIEMPRE crea un estudiante. El rol gestor/admin solo se
 * asigna con el script `set-role` o con `manager-register` (admin).
 */
export async function register(input: RegisterInput): Promise<AuthResult> {
  const auth = adminAuth();
  await assertEmailAvailable(input.email);
  let uid: string;
  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
    uid = created.uid;
  } catch (err) {
    if ((err as { code?: string }).code === "auth/email-already-exists") {
      throw new ApiError(409, "EMAIL_IN_USE", "Ya existe una cuenta con ese correo");
    }
    if ((err as { code?: string }).code === "auth/invalid-password") {
      throw new ApiError(400, "VALIDATION_ERROR", "La contraseña no cumple los requisitos");
    }
    throw err;
  }
  await auth.setCustomUserClaims(uid, { role: "student", sex: input.sex });
  await writeProfile(uid, input, "student");
  // Se inicia sesión DESPUÉS de fijar los claims para que el token ya traiga el rol.
  return login(input.email, input.password);
}

/** Alta de un gestor institucional. Solo un administrador puede invocarlo. */
export async function createManager(input: RegisterInput): Promise<UserProfile> {
  const auth = adminAuth();
  await assertEmailAvailable(input.email);
  let uid: string;
  try {
    const created = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
    uid = created.uid;
  } catch (err) {
    if ((err as { code?: string }).code === "auth/email-already-exists") {
      throw new ApiError(409, "EMAIL_IN_USE", "Ya existe una cuenta con ese correo");
    }
    throw err;
  }
  await auth.setCustomUserClaims(uid, { role: "manager", sex: input.sex });
  return writeProfile(uid, input, "manager");
}

export async function getProfile(uid: string): Promise<UserProfile> {
  const snap = await db().collection("users").doc(uid).get();
  if (!snap.exists) {
    throw new ApiError(404, "NOT_FOUND", "Perfil de usuario no encontrado");
  }
  return snap.data() as UserProfile;
}

/** Actualiza el sexo declarado por el usuario y su claim (se aplica al renovar el token). */
export async function updateUserSex(uid: string, sex: Sex): Promise<void> {
  const now = new Date().toISOString();
  await db().collection("users").doc(uid).set({ sex, updatedAt: now }, { merge: true });
  const user = await adminAuth().getUser(uid);
  await adminAuth().setCustomUserClaims(uid, { ...(user.customClaims ?? {}), sex });
}

export async function listManagers(): Promise<UserProfile[]> {
  const snap = await db().collection("users").where("role", "==", "manager").get();
  return snap.docs
    .map((doc) => doc.data() as UserProfile)
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export type { TokenSet };
