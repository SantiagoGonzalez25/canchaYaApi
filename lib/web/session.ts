import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "../session-constants";
import { SESSION_MAX_AGE_MS, verifySessionCookie } from "../services/auth";
import type { AuthUser, Role } from "../types";

export { SESSION_COOKIE };

export async function setSessionCookie(value: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuario de la sesión web o null. `cache` evita verificar la cookie dos veces. */
export const getWebUser = cache(async (): Promise<AuthUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    return await verifySessionCookie(value);
  } catch {
    return null;
  }
});

/**
 * Capa de acceso a datos (DAL). Cada página/acción pide el usuario aquí; no
 * confía solo en el proxy optimista.
 */
export async function requireWebUser(roles?: Role | Role[]): Promise<AuthUser> {
  const user = await getWebUser();
  if (!user) redirect("/login");
  if (roles) {
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(user.role)) redirect("/dashboard");
  }
  return user;
}

export async function requireWebStaff(): Promise<AuthUser> {
  return requireWebUser(["manager", "admin"]);
}

/**
 * Variante para páginas: marca explícitamente el render en tiempo de petición
 * antes de leer cookies o datos. Con cacheComponents, esto evita que Next
 * prerenderice operaciones inestables (fechas, Firestore, sesión).
 */
export async function requirePageUser(roles?: Role | Role[]): Promise<AuthUser> {
  await connection();
  return requireWebUser(roles);
}

export async function requirePageStaff(): Promise<AuthUser> {
  await connection();
  return requireWebUser(["manager", "admin"]);
}
