import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AcudeForm } from "@/components/acude-form";
import { buttonClass, EmptyState, PageHeader, secondaryButtonClass } from "@/components/ui";
import { listScenarioOptions } from "@/lib/data/acudes";
import { listManagers } from "@/lib/services/auth";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Nuevo ACUDE" };

function currentSemester(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${month >= 7 ? 2 : 1}`;
}

async function NewAcude() {
  await requirePageStaff();
  const [scenarios, managers] = await Promise.all([listScenarioOptions(), listManagers()]);
  if (scenarios.length === 0) {
    return (
      <EmptyState
        title="Primero registra un escenario"
        description="Todo ACUDE necesita un escenario institucional para programar sus franjas."
        action={
          <Link href="/manager/scenarios" className={buttonClass}>
            Crear escenario
          </Link>
        }
      />
    );
  }
  return (
    <AcudeForm
      initialAcude={null}
      scenarios={scenarios}
      teachers={managers.map((manager) => ({
        uid: manager.uid,
        name: manager.name,
        email: manager.email,
      }))}
      defaultSemester={currentSemester()}
    />
  );
}

export default function NewAcudePage() {
  return (
    <>
      <PageHeader
        eyebrow="Gestión · Nuevo"
        title="Crear un ACUDE"
        description="Define el grupo, sus subgrupos semanales y el escenario de cada franja."
        actions={
          <Link href="/manager/acudes" className={secondaryButtonClass}>
            Volver a la lista
          </Link>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <NewAcude />
      </Suspense>
    </>
  );
}
