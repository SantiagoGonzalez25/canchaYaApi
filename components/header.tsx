import Link from "next/link";
import { connection } from "next/server";
import { logoutAction } from "@/app/actions";
import { ROLE_LABELS } from "@/lib/labels";
import { getWebUser } from "@/lib/web/session";
import { NavLink } from "./nav-link";
import { secondaryButtonClass } from "./ui";

interface NavItem {
  href: string;
  label: string;
}

function navItems(role: "student" | "manager" | "admin"): NavItem[] {
  if (role === "student") {
    return [
      { href: "/dashboard", label: "Inicio" },
      { href: "/calendar", label: "Calendario" },
      { href: "/acudes", label: "Cartelera" },
      { href: "/my-enrollments", label: "Mis ACUDES" },
    ];
  }
  return [
    { href: "/dashboard", label: "Panel" },
    { href: "/calendar", label: "Calendario" },
    { href: "/manager/occupation", label: "Ocupación" },
    { href: "/manager/acudes", label: role === "manager" ? "Mi ACUDE" : "ACUDES" },
    ...(role === "admin" ? [{ href: "/manager/scenarios", label: "Escenarios" }] : []),
    { href: "/manager/attendance", label: "Asistencia" },
    { href: "/manager/reports", label: "Reportes" },
    ...(role === "admin" ? [{ href: "/manager/users", label: "Profesores" }] : []),
  ];
}

export async function Header() {
  // La cookie de sesión se verifica con Firebase (usa la hora actual): debe
  // ocurrir en request time, nunca durante el prerender del shell.
  await connection();
  const user = await getWebUser();
  const items = user ? navItems(user.role) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4">
        <Link href={user ? "/dashboard" : "/login"} className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/tdea-horizontal.svg"
            alt="Tecnológico de Antioquia"
            className="h-8 w-auto"
          />
          <span className="border-l border-slate-200 pl-2.5">
            <span className="block text-base font-black leading-4 tracking-tight text-slate-900">
              CanchaYa
            </span>
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700">
              ACUDES
            </span>
          </span>
        </Link>

        {user && (
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
            {items.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                className="rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                activeClassName="bg-teal-50 text-teal-800"
              />
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-800">{user.name}</p>
                <p className="text-[11px] font-medium text-teal-700">{ROLE_LABELS[user.role]}</p>
              </div>
              <form action={logoutAction} className="hidden sm:block">
                <button className={secondaryButtonClass}>Salir</button>
              </form>
              <details className="relative lg:hidden">
                <summary className="cursor-pointer list-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                  Menú
                </summary>
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                  <div className="mb-1 rounded-xl bg-slate-50 px-3 py-2 sm:hidden">
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-teal-700">{ROLE_LABELS[user.role]}</p>
                  </div>
                  {items.map((item) => (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      label={item.label}
                      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                      activeClassName="bg-teal-50 text-teal-800"
                    />
                  ))}
                  <form action={logoutAction}>
                    <button className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50">
                      Cerrar sesión
                    </button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/login" className={secondaryButtonClass}>
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
