import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { archiveAcudeAction } from "@/app/actions";
import { AcudeForm } from "@/components/acude-form";
import { AcudeImage } from "@/components/acude-image";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  Alert,
  Badge,
  buttonClass,
  cardClass,
  PageHeader,
  ProgressBar,
  secondaryButtonClass,
} from "@/components/ui";
import { getAcude, listScenarioOptions } from "@/lib/data/acudes";
import { slotCapacity } from "@/lib/domain/schedule";
import { ApiError } from "@/lib/errors";
import {
  ACUDE_STATUS_LABELS,
  CATEGORY_LABELS,
  formatDateTime,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { listManagers } from "@/lib/services/auth";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "ACUDE" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function AcudeDetail({
  params,
  searchParams,
}: {
  params: PageProps<"/manager/acudes/[id]">["params"];
  searchParams: PageProps<"/manager/acudes/[id]">["searchParams"];
}) {
  const user = await requirePageStaff();
  const { id } = await params;
  const query = await searchParams;
  const acude = await getAcude(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  if (user.role === "manager" && acude.teacherId !== user.uid) notFound();

  const isAdmin = user.role === "admin";
  const [scenarios, managers] = await Promise.all([
    listScenarioOptions(),
    isAdmin ? listManagers() : Promise.resolve([]),
  ]);
  const scenarioNames = new Map(scenarios.map((scenario) => [scenario.id, scenario.name]));

  return (
    <>
      <Link
        href="/manager/acudes"
        className="mb-4 inline-block text-sm font-semibold text-teal-700 hover:underline"
      >
        ← {isAdmin ? "Volver a la gestión" : "Volver a mi ACUDE"}
      </Link>
      <PageHeader
        eyebrow={`${ACUDE_STATUS_LABELS[acude.status]} · ${CATEGORY_LABELS[acude.category]}`}
        title={acude.name}
        description={`Creado ${formatDateTime(acude.createdAt)} · Última actualización ${formatDateTime(acude.updatedAt)}`}
        actions={
          <>
            {acude.status === "published" && (
              <Link href={`/acudes/${acude.id}`} className={secondaryButtonClass}>
                Ver en cartelera
              </Link>
            )}
            <Link
              href={`/manager/attendance?acudeId=${acude.id}`}
              className={secondaryButtonClass}
            >
              Asistencia
            </Link>
            {isAdmin && (
              <form action={archiveAcudeAction.bind(null, acude.id)}>
                <ConfirmSubmit
                  message={`¿Archivar "${acude.name}"? Dejará de aparecer en la cartelera.`}
                  className={secondaryButtonClass}
                >
                  Archivar
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />

      {isAdmin && first(query.saved) && (
        <div className="mb-4">
          <Alert kind="ok">
            <span className="font-semibold">Cambios guardados correctamente.</span>{" "}
            <Link href="/manager/acudes" className="font-semibold underline">
              Volver a la lista
            </Link>{" "}
            o{" "}
            <Link href={`/manager/acudes/${acude.id}`} className="font-semibold underline">
              seguir editando
            </Link>
            .
          </Alert>
        </div>
      )}
      {isAdmin && first(query.imageError) && (
        <div className="mb-4">
          <Alert kind="error">{first(query.imageError)}</Alert>
        </div>
      )}

      {!isAdmin ? (
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="flex flex-col gap-6">
            {acude.imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <AcudeImage
                  src={acude.imageUrl}
                  name={acude.name}
                  className="h-56 w-full"
                />
              </div>
            )}

            <section className={`${cardClass} p-5`}>
              <h2 className="text-lg font-bold text-slate-900">Programación semanal</h2>
              <p className="mt-1 text-sm text-slate-500">
                Consulta las franjas que el administrador asignó a este ACUDE.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[540px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2">Día</th>
                      <th className="pb-2">Hora</th>
                      <th className="pb-2">Escenario</th>
                      <th className="pb-2">Cupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acude.schedule.map((slot) => {
                      const capacity = slotCapacity(slot, acude.maxCapacity);
                      const enrolled = acude.slotEnrolled[slot.id] ?? 0;
                      const pct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
                      return (
                        <tr key={slot.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 font-semibold text-slate-800">
                            {WEEKDAY_LABELS[slot.day]}
                          </td>
                          <td className="py-3 text-slate-600">
                            {slot.startTime}–{slot.endTime}
                          </td>
                          <td className="py-3 text-slate-600">
                            {scenarioNames.get(slot.scenarioId) ?? "Escenario por asignar"}
                          </td>
                          <td className="w-40 py-3">
                            <p className="text-[11px] text-slate-500">
                              {enrolled}/{capacity} · {pct}%
                            </p>
                            <div className="mt-1">
                              <ProgressBar value={pct} tone={pct >= 90 ? "rose" : "teal"} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={`${cardClass} p-5`}>
              <h2 className="text-lg font-bold text-slate-900">Información académica</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Docente
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">{acude.teacherName}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Disciplina
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">{acude.discipline}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Semestre
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">{acude.semester}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Asistencia mínima
                  </dt>
                  <dd className="mt-1 font-medium text-slate-800">{acude.attendanceMin}%</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Requisitos
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-slate-700">
                    {acude.requirements || "Carné institucional y vestimenta adecuada."}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-amber-200 bg-amber-50/60 p-5 text-sm text-amber-900 lg:sticky lg:top-20">
            <Badge tone={acude.status === "published" ? "teal" : "amber"}>
              {ACUDE_STATUS_LABELS[acude.status]}
            </Badge>
            <h2 className="mt-3 text-lg font-bold">Vista del profesor</h2>
            <p className="mt-2 text-xs leading-relaxed">
              {acude.status === "draft"
                ? "Este ACUDE todavía está en borrador. Puedes revisar su programación y pasar asistencia, pero la ficha pública no está disponible hasta que el administrador lo publique."
                : acude.status === "archived"
                  ? "Este ACUDE está archivado. Su histórico se conserva, pero no aparece en la cartelera."
                  : "Este ACUDE está publicado. Puedes consultar su programación y pasar asistencia."}
            </p>
            <Link
              href={`/manager/attendance?acudeId=${acude.id}`}
              className={`${buttonClass} mt-4 w-full`}
            >
              Pasar asistencia
            </Link>
            {acude.status === "published" && (
              <Link
                href={`/acudes/${acude.id}`}
                className={`${secondaryButtonClass} mt-2 w-full`}
              >
                Ver ficha pública
              </Link>
            )}
          </aside>
        </div>
      ) : (
        <>
          <AcudeForm
            initialAcude={acude}
            scenarios={scenarios}
            teachers={managers.map((manager) => ({
              uid: manager.uid,
              name: manager.name,
              email: manager.email,
            }))}
            defaultSemester={acude.semester}
          />
          <div className="mt-6">
            <Link href="/manager/acudes" className={buttonClass}>
              Volver a la lista
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export default function AcudeDetailPage(props: PageProps<"/manager/acudes/[id]">) {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
    >
      <AcudeDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
