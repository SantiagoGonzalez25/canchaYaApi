import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ManagerForm } from "@/components/manager-form";
import { Badge, cardClass, PageHeader, secondaryButtonClass } from "@/components/ui";
import { SEX_LABELS, formatDate } from "@/lib/labels";
import { listManagers } from "@/lib/services/auth";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Gestores institucionales" };

async function UsersContent() {
  await requireWebUser("admin");
  const managers = await listManagers();
  return (
    <div className="grid gap-6 lg:grid-cols-[0.4fr_0.6fr]">
      <section className={`${cardClass} h-fit p-5 lg:sticky lg:top-20`}>
        <h2 className="text-lg font-bold text-slate-900">Nuevo gestor de ACUDES</h2>
        <p className="mb-4 mt-1 text-xs text-slate-500">
          Crea perfiles institucionales con rol de gestor. Los estudiantes se registran desde la
          página pública y nunca pueden elegir su rol.
        </p>
        <ManagerForm />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Gestores registrados</h2>
          <Badge tone="neutral">{managers.length}</Badge>
        </div>
        <ul className="flex flex-col gap-3">
          {managers.map((manager) => (
            <li key={manager.uid} className={`${cardClass} flex flex-wrap items-start justify-between gap-3 p-4`}>
              <div>
                <p className="font-bold text-slate-900">{manager.name}</p>
                <p className="text-xs text-slate-500">{manager.email}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {manager.sex ? SEX_LABELS[manager.sex] : "Sexo sin registrar"} · Creado{" "}
                  {formatDate(manager.createdAt)}
                </p>
              </div>
              <Badge tone="teal">Gestor</Badge>
            </li>
          ))}
          {managers.length === 0 && (
            <li className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Aún no hay gestores. Crea el primero con el formulario de la izquierda o usa{" "}
              <code className="rounded bg-slate-100 px-1">pnpm create-user</code>.
            </li>
          )}
        </ul>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <p className="font-bold text-slate-700">Primer administrador</p>
          <p className="mt-1">
            El rol admin se asigna con el script{" "}
            <code className="rounded bg-slate-100 px-1">pnpm set-role</code> después de crear la
            cuenta. Desde la API pública nadie puede escalar privilegios.
          </p>
        </div>
      </section>
    </div>
  );
}

export default function UsersPage() {
  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Perfiles institucionales"
        description="Alta y consulta de gestores de ACUDES. Solo un administrador puede crear otros perfiles."
        actions={
          <Link href="/manager/acudes" className={secondaryButtonClass}>
            Gestionar ACUDES
          </Link>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <UsersContent />
      </Suspense>
    </>
  );
}
