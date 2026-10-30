import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { deleteScenarioAction } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ScenarioForm } from "@/components/scenario-form";
import {
  Alert,
  Badge,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { listScenarios } from "@/lib/data/scenarios";
import {
  SCENARIO_STATUS_LABELS,
  SCENARIO_TYPE_LABELS,
  formatDate,
} from "@/lib/labels";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Escenarios" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function ScenarioManager({
  searchParams,
}: {
  searchParams: PageProps<"/manager/scenarios">["searchParams"];
}) {
  const user = await requirePageStaff();
  const isAdmin = user.role === "admin";
  const params = await searchParams;
  const scenarios = await listScenarios();
  const notice = first(params.saved)
    ? "Escenario guardado."
    : first(params.deleted)
      ? "Escenario eliminado."
      : null;
  const error = first(params.error);

  return (
    <>
      {notice && (
        <div className="mb-4">
          <Alert kind="ok">{notice}</Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className={isAdmin ? "grid gap-6 lg:grid-cols-[0.38fr_0.62fr]" : "grid gap-6"}>
        {isAdmin && (
          <section className={`${cardClass} h-fit p-5 lg:sticky lg:top-20`}>
            <h2 className="text-lg font-bold text-slate-900">Nuevo escenario</h2>
            <p className="mb-4 mt-1 text-xs text-slate-500">
              Los escenarios son las canchas, salones, coliseos y auditorios que ocupan los ACUDES.
            </p>
            <ScenarioForm />
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Escenarios registrados</h2>
            <Badge tone="neutral">{scenarios.length}</Badge>
          </div>
          {scenarios.length === 0 ? (
            <EmptyState
              title="Aún no hay escenarios"
              description={
                isAdmin
                  ? "Crea el primero con el formulario de la izquierda."
                  : "El administrador aún no ha registrado escenarios."
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {scenarios.map((scenario) => (
                <li key={scenario.id} className={`${cardClass} p-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          tone={
                            scenario.status === "available"
                              ? "teal"
                              : scenario.status === "maintenance"
                                ? "amber"
                                : "neutral"
                          }
                        >
                          {SCENARIO_STATUS_LABELS[scenario.status]}
                        </Badge>
                        <span className="text-xs font-medium text-slate-500">
                          {SCENARIO_TYPE_LABELS[scenario.type]}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base font-bold text-slate-900">{scenario.name}</h3>
                      <p className="text-xs text-slate-500">
                        {scenario.location} · Capacidad {scenario.capacity}
                      </p>
                      {scenario.description && (
                        <p className="mt-1 max-w-xl text-xs text-slate-500">{scenario.description}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-400">
                        Actualizado {formatDate(scenario.updatedAt)}
                      </p>
                    </div>
                    {isAdmin && (
                      <details className="w-full sm:w-auto">
                        <summary className={`${secondaryButtonClass} cursor-pointer list-none`}>
                          Editar
                        </summary>
                        <div className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 sm:w-96">
                          <ScenarioForm scenario={scenario} />
                          <form
                            action={deleteScenarioAction.bind(null, scenario.id)}
                            className="mt-2 border-t border-slate-200 pt-2"
                          >
                            <ConfirmSubmit
                              message={`¿Eliminar "${scenario.name}"? Solo es posible si ningún ACUDE activo lo usa.`}
                              className="text-xs font-semibold text-rose-600 hover:underline"
                            >
                              Eliminar escenario
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </details>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
            <p className="font-bold text-slate-700">Regla de ocupación</p>
            <p className="mt-1">
              Un escenario no puede tener dos grupos ACUDE en la misma franja. Al crear o editar un
              ACUDE, el servidor compara todas las franjas y responde 409 si detecta un cruce.
            </p>
            <Link href="/manager/occupation" className="mt-2 inline-block font-semibold text-teal-700 underline">
              Ver ocupación en vivo →
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}

export default function ScenariosPage(props: PageProps<"/manager/scenarios">) {
  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="Escenarios institucionales"
        description="Canchas, coliseos, salones y auditorios disponibles para programar ACUDES. Solo el administrador puede modificarlos."
        actions={
          <Link href="/manager/occupation" className={secondaryButtonClass}>
            Panel de ocupación
          </Link>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <ScenarioManager searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
