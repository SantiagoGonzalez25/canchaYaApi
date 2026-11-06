import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { archiveAcudeAction } from "@/app/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import {
  Alert,
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  inputClass,
  PageHeader,
  ProgressBar,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { slotCapacity } from "@/lib/domain/schedule";
import {
  ACUDE_STATUS_LABELS,
  CATEGORY_LABELS,
  formatDate,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Gestión de ACUDES" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function AcudeManager({
  searchParams,
}: {
  searchParams: PageProps<"/manager/acudes">["searchParams"];
}) {
  const user = await requirePageStaff();
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const status = first(params.status) as
    | "draft"
    | "published"
    | "archived"
    | undefined;
  const category = first(params.category) as
    | "sports"
    | "cultural"
    | "training"
    | "recreational"
    | undefined;
  const acudes = await listAcudes({
    q,
    status: status || undefined,
    category,
    ...(user.role === "manager" ? { teacherId: user.uid } : {}),
  });
  const isAdmin = user.role === "admin";
  const notice = first(params.archived)
    ? "ACUDE archivado. Su histórico de inscripciones y asistencia se conserva."
    : first(params.saved)
      ? "Cambios guardados correctamente."
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

      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar ACUDE, docente o disciplina..."
          className={inputClass}
          aria-label="Buscar"
        />
        <select name="status" defaultValue={status ?? ""} className={selectClass} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(ACUDE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={category ?? ""}
          className={selectClass}
          aria-label="Categoría"
        >
          <option value="">Todas las categorías</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className={buttonClass}>Filtrar</button>
        <Link href="/manager/acudes" className={secondaryButtonClass}>
          Limpiar
        </Link>
      </form>

      <p className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          <span className="font-bold text-slate-900">{acudes.length}</span> ACUDES en la vista
        </span>
        {isAdmin && (
          <Link href="/manager/acudes/new" className={buttonClass}>
            Nuevo ACUDE
          </Link>
        )}
      </p>

      {acudes.length === 0 ? (
        <EmptyState
          title="No hay ACUDES con esos filtros"
          description={
            isAdmin
              ? "Crea el primero o cambia los criterios de búsqueda."
              : "Cambia los criterios de búsqueda o espera a que el administrador te asigne un ACUDE."
          }
          action={
            isAdmin ? (
              <Link href="/manager/acudes/new" className={buttonClass}>
                Crear ACUDE
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {acudes.map((acude) => {
            const totalCapacity = acude.schedule.reduce(
              (sum, slot) => sum + slotCapacity(slot, acude.maxCapacity),
              0,
            );
            const pct =
              totalCapacity > 0 ? Math.round((acude.currentEnrolled / totalCapacity) * 100) : 0;
            return (
              <li key={acude.id} className={`${cardClass} p-5`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        tone={
                          acude.status === "published"
                            ? "teal"
                            : acude.status === "draft"
                              ? "amber"
                              : "neutral"
                        }
                      >
                        {ACUDE_STATUS_LABELS[acude.status]}
                      </Badge>
                      <Badge tone={acude.category === "sports" ? "blue" : "violet"}>
                        {CATEGORY_LABELS[acude.category]}
                      </Badge>
                      <span className="text-[11px] font-medium text-slate-400">
                        {acude.semester} · {acude.discipline}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-bold text-slate-900">
                      <Link href={`/manager/acudes/${acude.id}`} className="hover:text-teal-800">
                        {acude.name}
                      </Link>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {acude.teacherName} · {acude.schedule.length} subgrupo(s) ·{" "}
                      {acude.currentEnrolled}/{totalCapacity} inscritos
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {acude.schedule.map((slot) => (
                        <span
                          key={slot.id}
                          className="rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
                        >
                          {WEEKDAY_LABELS[slot.day].slice(0, 3)} {slot.startTime}–{slot.endTime}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 max-w-md">
                      <ProgressBar value={pct} tone={pct >= 90 ? "rose" : pct >= 60 ? "amber" : "teal"} />
                      <p className="mt-1 text-[11px] text-slate-400">
                        Ocupación {pct}% · Actualizado {formatDate(acude.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {acude.status === "published" && (
                      <Link href={`/acudes/${acude.id}`} className={secondaryButtonClass}>
                        Ver ficha
                      </Link>
                    )}
                    <Link href={`/manager/attendance?acudeId=${acude.id}`} className={secondaryButtonClass}>
                      Asistencia
                    </Link>
                    {isAdmin && (
                      <>
                        <Link href={`/manager/acudes/${acude.id}`} className={buttonClass}>
                          Editar
                        </Link>
                        <form action={archiveAcudeAction.bind(null, acude.id)}>
                          <ConfirmSubmit
                            message={`¿Archivar "${acude.name}" de ${acude.teacherName} (${acude.schedule
                              .map(
                                (slot) =>
                                  `${WEEKDAY_LABELS[slot.day]} ${slot.startTime}-${slot.endTime}`,
                              )
                              .join(", ")})? Dejará de aparecer en la cartelera y liberará sus franjas para otros ACUDES.`}
                            className={secondaryButtonClass}
                          >
                            Archivar
                          </ConfirmSubmit>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

export default function ManagerAcudesPage(props: PageProps<"/manager/acudes">) {
  return (
    <>
      <PageHeader
        eyebrow="Gestión"
        title="ACUDES y subgrupos"
        description="Consulta grupos, docentes, escenarios, cupos y franjas. La creación y edición están reservadas al administrador."
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <AcudeManager searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
