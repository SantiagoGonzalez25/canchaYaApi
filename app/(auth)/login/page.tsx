import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

async function RedirectIfSignedIn() {
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
          Tu tiempo libre,
          <br />
          <span className="text-teal-700">mejor organizado.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600">
          Consulta la cartelera digital de ACUDES, inscríbete a un subgrupo en tiempo real y revisa
          la ocupación de los escenarios. Sin reservas individuales: todo pasa por la oferta
          formativa y deportiva institucional.
        </p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            ["9", "ACUDES de ejemplo"],
            ["8", "Escenarios"],
            ["100%", "Trazabilidad"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-2xl font-black text-teal-700">{value}</p>
              <p className="text-xs font-medium text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
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
        <div className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-600">Cuentas demo (si ejecutaste el seed con --demo)</p>
          <p className="mt-1 font-mono">estudiante1@canchaya.demo · Demo1234!</p>
          <p className="font-mono">gestor@canchaya.demo · Gestor1234!</p>
          <p className="font-mono">admin@canchaya.demo · Admin1234!</p>
        </div>
      </section>
    </div>
  );
}
