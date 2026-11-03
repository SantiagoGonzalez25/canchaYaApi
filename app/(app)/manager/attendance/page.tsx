import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceForm } from "@/components/attendance-form";
import { AttendanceFilters } from "@/components/attendance-filters";
import {
  Alert,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
} from "@/components/ui";
import { listAcudes } from "@/lib/data/acudes";
import { attendanceRoster } from "@/lib/data/attendance";
import {
  formatDateNumeric,
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
  const requestedDate = first(params.date);
  const date = isDateKey(requestedDate) ? requestedDate : todayKey();
  const daySlots = acude.schedule.filter((item) => item.day === weekdayOf(date));
  const requestedSlot = first(params.slotId);
  const slot = daySlots.find((item) => item.id === requestedSlot) ?? daySlots[0] ?? null;
  const roster = slot ? await attendanceRoster(acude.id, slot.id, date) : null;
  const enrollments = roster?.enrollments ?? [];
  const attendance = roster?.attendance ?? [];

  return (
    <>
      <AttendanceFilters
        acudes={acudes.map((item) => ({
          id: item.id,
          name: item.name,
          slots: item.schedule.map((schedule) => ({
            id: schedule.id,
            day: schedule.day,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          })),
        }))}
        acudeId={acude.id}
        slotId={slot?.id ?? ""}
        date={date}
        canSelectAcude={user.role === "admin"}
        weekdayLabels={WEEKDAY_LABELS}
      />

      {!slot ? (
        <EmptyState
          title="No hay sesiones para este día"
          description={`El ${formatDateNumeric(date)} no hay franjas programadas en ${acude.name}. Elige otra fecha o vuelve a hoy.`}
          action={
            <Link href={`/manager/attendance?acudeId=${acude.id}`} className={buttonClass}>
              Volver a hoy
            </Link>
          }
        />
      ) : (
        <>
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
                  {formatDateNumeric(date)} · {WEEKDAY_LABELS[slot.day]} {slot.startTime}–
                  {slot.endTime}
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
      )}
    </>
  );
}

export default function AttendancePage(props: PageProps<"/manager/attendance">) {
  return (
    <>
      <PageHeader
        eyebrow="Profesor"
        title="Control de asistencia"
        description="Selecciona el ACUDE y la fecha; las franjas se ajustan automáticamente al día elegido."
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <AttendanceContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
