import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceForm } from "@/components/attendance-form";
import {
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
  selectClass,
  StatCard,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { attendanceRoster } from "@/lib/data/attendance";
import { listScenarios } from "@/lib/data/scenarios";
import {
  formatDate,
  isDateKey,
  todayKey,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/labels";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Control de asistencia" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function AttendanceContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/attendance">["searchParams"];
}) {
  await requirePageStaff();
  const params = await searchParams;
  const [acudes, scenarios] = await Promise.all([listAcudes(), listScenarios()]);
  if (acudes.length === 0) {
    return (
      <EmptyState
        title="Primero crea un ACUDE"
        description="La asistencia se registra sobre inscripciones activas de una franja."
        action={
          <Link href="/manager/acudes/new" className={buttonClass}>
            Crear ACUDE
          </Link>
        }
      />
    );
  }

  const requestedAcude = first(params.acudeId);
  const acude =
    acudes.find((item) => item.id === requestedAcude) ??
    acudes.find((item) => item.status === "published") ??
    acudes[0];
  const requestedSlot = first(params.slotId);
  const slot =
    acude.schedule.find((item) => item.id === requestedSlot) ?? acude.schedule[0];
  const requestedDate = first(params.date);
  const date = isDateKey(requestedDate) ? requestedDate : todayKey();
  const scenarioName =
    scenarios.find((scenario) => scenario.id === slot.scenarioId)?.name ?? slot.scenarioId;
  const { enrollments, attendance } = await attendanceRoster(acude.id, slot.id, date);
  const present = attendance.filter(
    (item) => item.status === "present" || item.status === "late",
  ).length;
  const recorded = attendance.length;

  return (
    <>
      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1.2fr_1.2fr_auto_auto]">
        <select name="acudeId" defaultValue={acude.id} className={selectClass} aria-label="ACUDE">
          {acudes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select name="slotId" defaultValue={slot.id} className={selectClass} aria-label="Franja">
          {acude.schedule.map((item) => (
            <option key={item.id} value={item.id}>
              {WEEKDAY_LABELS[item.day]} {item.startTime}–{item.endTime}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date"
          defaultValue={date}
          className={selectClass}
          aria-label="Fecha de la sesión"
        />
        <button className={buttonClass}>Cargar lista</button>
      </form>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Inscritos activos" value={enrollments.length} icon="🎓" />
        <StatCard label="Registros del día" value={recorded} tone="blue" icon="📝" />
        <StatCard
          label="Asistencia efectiva"
          value={`${recorded > 0 ? Math.round((present / recorded) * 100) : 0}%`}
          tone="violet"
          icon="✅"
        />
        <StatCard
          label="Asistencia mínima"
          value={`${acude.attendanceMin}%`}
          tone="amber"
          icon="⚠️"
        />
      </div>

      <section className={`${cardClass} p-5`}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">{acude.semester}</Badge>
              <Badge tone="neutral">{acude.discipline}</Badge>
            </div>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{acude.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {WEEKDAY_LABELS[slot.day]} {slot.startTime}–{slot.endTime} ·{" "}
              {formatDate(`${date}T12:00:00`)} · {scenarioName}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Docente: {acude.teacherName} · Día de la fecha: {WEEKDAY_LABELS[weekdayOf(date)]}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/manager/acudes/${acude.id}`} className={secondaryButtonClass}>
              Editar ACUDE
            </Link>
            <Link href="/manager/reports?kind=attendance" className={secondaryButtonClass}>
              Reporte de asistencia
            </Link>
          </div>
        </div>

        <AttendanceForm
          key={`${acude.id}-${slot.id}-${date}`}
          acudeId={acude.id}
          slotId={slot.id}
          date={date}
          enrollments={enrollments}
          attendance={attendance}
        />
      </section>

      <p className="mt-4 text-xs text-slate-500">
        El registro es idempotente por estudiante y fecha: guardar dos veces el mismo día actualiza
        la asistencia, no crea duplicados.
      </p>
    </>
  );
}

export default function AttendancePage(props: PageProps<"/manager/attendance">) {
  return (
    <>
      <PageHeader
        eyebrow="Gestión · Asistencia"
        title="Control de asistencia real"
        description="Registra el uso real de cada subgrupo para evitar acuerdos informales y alimentar los reportes por ACUDE."
        actions={
          <Link href="/manager/occupation" className={secondaryButtonClass}>
            Ver ocupación
          </Link>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <AttendanceContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
