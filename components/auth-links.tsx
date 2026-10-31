"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AuthLinks() {
  const pathname = usePathname();

  return (
    <>
      {pathname !== "/login" && (
        <Link href="/login" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Ingresar
        </Link>
      )}
      {pathname !== "/register" && (
        <Link
          href="/register"
          className="rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Crear cuenta
        </Link>
      )}
    </>
  );
}
