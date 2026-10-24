import "server-only";
import { ApiError } from "./errors";
import { SESSION_COOKIE } from "./session-constants";
import { verifyIdToken, verifySessionCookie } from "./services/auth";
import type { AuthUser, Role } from "./types";

function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

/**
 * Autenticación de la API:
 *  - app móvil: `Authorization: Bearer <idToken>`
 *  - panel web: cookie de sesión httpOnly (mismo origen)
 */
export async function requireUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (token && scheme?.toLowerCase() === "bearer") return verifyIdToken(token);
  if (header && scheme?.toLowerCase() !== "bearer") {
    throw new ApiError(401, "UNAUTHENTICATED", "Esquema de autenticación inválido");
  }
  const cookie = cookieValue(request, SESSION_COOKIE);
  if (cookie) return verifySessionCookie(cookie);
  throw new ApiError(401, "UNAUTHENTICATED", "Falta el token de autenticación");
}

/** Autorización por rol. */
export function assertRole(user: AuthUser, roles: Role | Role[]): void {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "No tienes permisos para esta acción");
  }
}

export function isStaff(user: AuthUser): boolean {
  return user.role === "manager" || user.role === "admin";
}

export function requireStaff(user: AuthUser): void {
  assertRole(user, ["manager", "admin"]);
}
