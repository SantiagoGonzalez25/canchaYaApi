import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceForm } from "@/components/attendance-form";
import {
  Alert,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { attendanceRoster } from "@/lib/data/attendance";
import { formatDateNumeric, isDateKey, todayKey, WEEKDAY_LABELS } from "@/lib/labels";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Control de asistencia" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

async function AttendanceContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/attendance">["searchParams"];
}) {
  const user = await requirePageStaff();
  const params = await searchParams;
  const acudes = await listAcudes(
    user.role === "manager" ? { teacherId: user.uid } : {},
  );

  if (acudes.length === 0) {
    return (
      <EmptyState
        title={
          user.role === "manager"
            ? "No tienes un ACUDE asignado"
            : "Primero crea un ACUDE"
        }
        description={
          user.role === "manager"
            ? "El administrador debe asignarte un ACUDE y una franja horaria para poder registrar asistencia."
            : "La asistencia se registra sobre inscripciones activas de una franja."
        }
        action={
          user.role === "admin" ? (
            <Link href="/manager/acudes/new" className={buttonClass}>
              Crear ACUDE
            </Link>
          ) : null
        }
      />
    );
  }

  const requestedAcude = first(params.acudeId);
  const acude =
    acudes.find((item) => item.id === requestedAcude) ?? acudes[0];
  const requestedSlot = first(params.slotId);
  const slot =
    acude.schedule.find((item) => item.id === requestedSlot) ?? acude.schedule[0];
  const requestedDate = first(params.date);
  const date = isDateKey(requestedDate) ? requestedDate : todayKey();
  const { enrollments, attendance } = await attendanceRoster(acude.id, slot.id, date);

  return (
    <>
      <form className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1.2fr_1.2fr_auto_auto]">
        {user.role === "admin" ? (
          <select name="acudeId" defaultValue={acude.id} className={selectClass} aria-label="ACUDE">
            {acudes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            {acude.name}
          </div>
        )}
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

      <section className={`${cardClass} p-5`}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
              Control de asistencia
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Asistencia de {acude.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatDateNumeric(date)} · {WEEKDAY_LABELS[slot.day]} {slot.startTime}–{slot.endTime}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Docente: {acude.teacherName}
            </p>
          </div>
          <Link
            href={`/manager/reports?kind=attendance&acudeId=${acude.id}`}
            className={secondaryButtonClass}
          >
            Ver reporte
          </Link>
        </div>

        {attendance.length > 0 && (
          <div className="mb-4">
            <Alert kind="info">
              Esta sesión ya tiene asistencia registrada. Puedes corregirla y volver a guardar.
            </Alert>
          </div>
        )}

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
        La asistencia se guarda por estudiante y fecha. Si se vuelve a guardar el mismo día, se
        actualiza el registro.
      </p>
    </>
  );
}

export default function AttendancePage(props: PageProps<"/manager/attendance">) {
  return (
    <>
      <PageHeader
        eyebrow="Profesor"
        title="Control de asistencia"
        description="Selecciona el ACUDE, la franja y la fecha. La lista muestra únicamente los estudiantes inscritos."
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <AttendanceContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
