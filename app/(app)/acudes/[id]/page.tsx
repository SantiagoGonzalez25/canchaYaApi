import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnrollmentPanel } from "@/components/enrollment-panel";
import { AcudeImage } from "@/components/acude-image";
import { Alert, Badge, buttonClass, cardClass, PageHeader, ProgressBar, secondaryButtonClass } from "@/components/ui";
import { getLiveAcude } from "@/lib/data/acudes";
import { listMyActiveEnrollmentForAcude } from "@/lib/data/enrollments";
import { ApiError } from "@/lib/errors";
import {
  ACUDE_STATUS_LABELS,
  CATEGORY_LABELS,
  formatDate,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { requirePageUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Detalle del ACUDE" };

async function AcudeDetail({ params }: { params: PageProps<"/acudes/[id]">["params"] }) {
  const user = await requirePageUser();
  const { id } = await params;
  const existing =
    user.role === "student" ? await listMyActiveEnrollmentForAcude(user.uid, id) : null;
  const acude = await getLiveAcude(id, {
    allowUnpublished:
      user.role === "admin" || user.role === "manager" || Boolean(existing),
  }).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  if (user.role === "manager" && acude.teacherId !== user.uid) notFound();

  return (
    <>
      <Link
        href={user.role === "manager" ? "/manager/acudes" : "/acudes"}
        className="mb-4 inline-block text-sm font-semibold text-teal-700 hover:underline"
      >
        ← {user.role === "manager" ? "Volver a mi ACUDE" : "Volver a la cartelera"}
      </Link>
      <PageHeader
        eyebrow={`${CATEGORY_LABELS[acude.category]} · ${acude.semester}`}
        title={acude.name}
        description={acude.description}
        actions={
          user.role === "student" ? (
            <Badge tone={acude.totalAvailable > 0 ? "teal" : "rose"}>
              {acude.totalAvailable > 0
                ? `${acude.totalAvailable} cupos disponibles`
                : "Sin cupos disponibles"}
            </Badge>
          ) : user.role === "admin" ? (
            <Link href={`/manager/acudes/${acude.id}`} className={buttonClass}>
              Editar ACUDE
            </Link>
          ) : null
        }
      />

      {acude.status !== "published" && (
        <div className="mb-4">
          <Alert kind="info">
            Este ACUDE está en estado <strong>{ACUDE_STATUS_LABELS[acude.status]}</strong>.{" "}
            {user.role === "student"
              ? "Puedes consultar tu inscripción y cancelarla si lo necesitas."
              : "Solo es visible para administración."}
          </Alert>
        </div>
      )}

      {acude.imageUrl && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200">
          <AcudeImage
            src={acude.imageUrl}
            name={acude.name}
            className="h-56 w-full sm:h-72"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="flex flex-col gap-6">
          <section className={`${cardClass} p-5`}>
            <h2 className="text-lg font-bold text-slate-900">Programación semanal</h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada franja es un subgrupo con cupo propio. El escenario se reserva institucionalmente
              para el grupo, nunca para una persona.
            </p>
            <div className="mt-4 grid gap-3 sm:hidden">
              {acude.schedule.map((slot) => (
                <div
                  key={slot.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {WEEKDAY_LABELS[slot.day]}
                      </p>
                      <p className="text-xs text-slate-500">
                        {slot.startTime}–{slot.endTime}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                      {slot.enrolled}/{slot.capacity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{slot.scenarioName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <ProgressBar
                        value={slot.occupancyPct}
                        tone={
                          slot.occupancyPct >= 90
                            ? "rose"
                            : slot.occupancyPct >= 60
                              ? "amber"
                              : "teal"
                        }
                      />
                    </div>
                    <span className="text-[11px] text-slate-500">{slot.occupancyPct}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2">Día</th>
                    <th className="pb-2">Hora</th>
                    <th className="pb-2">Escenario</th>
                    <th className="pb-2">Ocupación</th>
                  </tr>
                </thead>
                <tbody>
                  {acude.schedule.map((slot) => (
                    <tr key={slot.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 font-semibold text-slate-800">{WEEKDAY_LABELS[slot.day]}</td>
                      <td className="py-3 text-slate-600">
                        {slot.startTime}–{slot.endTime}
                      </td>
                      <td className="py-3 text-slate-600">{slot.scenarioName}</td>
                      <td className="w-48 py-3">
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {slot.enrolled}/{slot.capacity}
                          </span>
                          <span>{slot.occupancyPct}%</span>
                        </div>
                        <div className="mt-1">
                          <ProgressBar
                            value={slot.occupancyPct}
                            tone={
                              slot.occupancyPct >= 90
                                ? "rose"
                                : slot.occupancyPct >= 60
                                  ? "amber"
                                  : "teal"
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`${cardClass} p-5`}>
            <h2 className="text-lg font-bold text-slate-900">Información académica</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Docente</dt>
                <dd className="mt-1 break-words font-medium text-slate-800">{acude.teacherName}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Disciplina</dt>
                <dd className="mt-1 break-words font-medium text-slate-800">{acude.discipline}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cupo por subgrupo</dt>
                <dd className="mt-1 font-medium text-slate-800">{acude.maxCapacity} estudiantes</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Asistencia mínima</dt>
                <dd className="mt-1 font-medium text-slate-800">{acude.attendanceMin}%</dd>
              </div>
              <div className="min-w-0 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Requisitos</dt>
                <dd className="mt-1 whitespace-pre-line break-words text-slate-700 [overflow-wrap:anywhere]">
                  {acude.requirements || "Carné institucional y vestimenta adecuada."}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última actualización</dt>
                <dd className="mt-1 text-slate-700">{formatDate(acude.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <section className={`${cardClass} p-5`}>
            <h2 className="text-lg font-bold text-slate-900">
              {user.role === "student"
                ? "Inscripción"
                : user.role === "admin"
                  ? "Administración"
                  : "Mi ACUDE"}
            </h2>
            {user.role === "student" ? (
              <div className="mt-4">
                <EnrollmentPanel acude={acude} userSex={user.sex} existing={existing} />
              </div>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-sm text-slate-600">
                  Este ACUDE tiene {acude.currentEnrolled} inscripciones activas y{" "}
                  {acude.schedule.length} subgrupos.
                </p>
                {user.role === "admin" && (
                  <Link href={`/manager/acudes/${acude.id}`} className={buttonClass}>
                    Editar programación
                  </Link>
                )}
                <Link href={`/manager/attendance?acudeId=${acude.id}`} className={secondaryButtonClass}>
                  Pasar asistencia
                </Link>
                {user.role === "admin" && (
                  <Link href="/manager/occupation" className={secondaryButtonClass}>
                    Ver ocupación
                  </Link>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export default function AcudeDetailPage(props: PageProps<"/acudes/[id]">) {
  return (
    <Suspense
      fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
    >
      <AcudeDetail params={props.params} />
    </Suspense>
  );
}
