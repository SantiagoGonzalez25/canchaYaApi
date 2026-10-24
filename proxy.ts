import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-constants";

const PUBLIC_PATHS = ["/login", "/register"];

/**
 * Comprobación OPTIMISTA: solo mira si existe la cookie para redirigir rápido a
 * /login. La verificación real ocurre en lib/web/session.ts (requireWebUser).
 * /api/* queda fuera del matcher: allí la autenticación es Bearer o cookie.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isPublic = PUBLIC_PATHS.includes(pathname);
  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
