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
      <section className="hidden lg:flex lg:flex-col lg:items-start lg:justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/tdea-horizontal.svg"
          alt="Tecnológico de Antioquia"
          className="mb-8 h-10 w-auto self-start"
        />
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
          Bienestar Institucional · TdeA
        </p>
        <h1 className="mt-3 text-6xl font-black tracking-tight text-slate-900">CanchaYa</h1>
        <p className="mt-4 text-base text-slate-600">Sistema de gestión de ACUDES.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Suspense fallback={null}>
          <RedirectIfSignedIn />
        </Suspense>
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">CanchaYa</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">Iniciar sesión</h2>
        </div>
        <AuthForm mode="login" />
      </section>
    </div>
  );
}
