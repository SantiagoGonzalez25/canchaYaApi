import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Crear cuenta" };

async function RedirectIfSignedIn() {
  if (await getWebUser()) redirect("/dashboard");
  return null;
}

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md py-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">CanchaYa</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Crear cuenta de estudiante</h1>
          <p className="mt-1 text-sm text-slate-500">
            El registro público siempre crea estudiantes. Los perfiles de gestor los crea un
            administrador.
          </p>
        </div>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
