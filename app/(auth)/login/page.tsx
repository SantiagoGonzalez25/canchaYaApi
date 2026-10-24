import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

async function RedirectIfSignedIn() {
  await connection();
  if (await getWebUser()) redirect("/dashboard");
  return null;
}

export default function LoginPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <section className="hidden lg:block">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
          Bienestar Institucional · TdeA
        </p>
        <h1 className="mt-3 text-5xl font-black leading-[1.05] tracking-tight text-slate-900">
          Cartelera digital
          <br />
          <span className="text-teal-700">de ACUDES.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
          Consulta la programación de las actividades culturales y deportivas, inscríbete a un
          subgrupo y revisa la ocupación de los escenarios institucionales.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            ["10", "ACUDES publicados"],
            ["8", "Escenarios"],
            ["3", "Roles de acceso"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black text-teal-700">{value}</p>
              <p className="text-xs font-medium text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">CanchaYa</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-slate-500">
            Estudiantes, gestores de ACUDES y administradores.
          </p>
        </div>
        <AuthForm mode="login" />
      </section>
    </div>
  );
}
