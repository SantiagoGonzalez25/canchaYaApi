import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AttendanceForm } from "@/components/attendance-form";
import {
  Alert,
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import { listAcudes, listScenarioOptions } from "@/lib/data/acudes";
import {
  ATTENDANCE_EDIT_WINDOW_DAYS,
  attendanceRoster,
  listAttendanceSessions,
  type AttendanceSession,
} from "@/lib/data/attendance";
import {
  addDays,
  formatDateNumeric,
  isDateKey,
  startOfWeek,
  todayKey,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/labels";
import { requirePageStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Control de asistencia" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

function attendanceHref(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return `/manager/attendance${search ? `?${search}` : ""}`;
}

function sessionHref(
  session: AttendanceSession,
  from: string,
  filterAcudeId: string,
): string {
  return attendanceHref({
    from,
    session: session.sessionKey,
    acudeId: filterAcudeId,
  });
}

function groupByDate(
  sessions: AttendanceSession[],
): { date: string; sessions: AttendanceSession[] }[] {
  const grouped = new Map<string, AttendanceSession[]>();
  for (const session of sessions) {
    const list = grouped.get(session.date) ?? [];
    list.push(session);
    grouped.set(session.date, list);
  }
  return [...grouped.entries()].map(([date, items]) => ({ date, sessions: items }));
}

async function AttendanceContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/attendance">["searchParams"];
}) {
  const user = await requirePageStaff();
  const params = await searchParams;
  const acudes = (
    await listAcudes(user.role === "manager" ? { teacherId: user.uid } : {})
  ).filter((acude) => acude.status !== "archived");

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

  const today = todayKey();
  const currentWeekStart = startOfWeek(today);
  const oldestWeekStart = addDays(currentWeekStart, -7);
  const windowStart = addDays(today, -ATTENDANCE_EDIT_WINDOW_DAYS);

  const requestedSession = first(params.session);
  const requestedAcudeId = first(params.acudeId);
  const requestedSlotId = first(params.slotId);
  const requestedDate = first(params.date);

  let selectedAcudeId = "";
  let selectedSlotId = "";
  let selectedDate = "";
  const hasRequestedSelection = Boolean(
    requestedSession ||
      (requestedAcudeId && requestedSlotId && requestedDate),
  );

  if (requestedSession) {
    const [acudeId, slotId, date] = requestedSession.split(":");
    if (acudeId && slotId && isDateKey(date)) {
      selectedAcudeId = acudeId;
      selectedSlotId = slotId;
      selectedDate = date;
    }
  } else if (
    requestedAcudeId &&
    requestedSlotId &&
    isDateKey(requestedDate)
  ) {
    selectedAcudeId = requestedAcudeId;
    selectedSlotId = requestedSlotId;
    selectedDate = requestedDate;
  }

  const filterAcudeId = acudes.some((acude) => acude.id === requestedAcudeId)
    ? requestedAcudeId ?? ""
    : "";

  const requestedFrom = first(params.from);
  const baseDate = isDateKey(selectedDate)
    ? selectedDate
    : isDateKey(requestedFrom)
      ? requestedFrom
      : today;
  let from = startOfWeek(baseDate);
  if (from > currentWeekStart) from = currentWeekStart;
  if (from < oldestWeekStart) from = oldestWeekStart;

  const selectedAcude = acudes.find((acude) => acude.id === selectedAcudeId);
  const selectedSlot = selectedAcude?.schedule.find(
    (slot) => slot.id === selectedSlotId,
  );
  const selectionValid = Boolean(
    selectedAcude &&
      selectedSlot &&
      isDateKey(selectedDate) &&
      selectedDate <= today &&
      selectedDate >= windowStart &&
      selectedSlot.day === weekdayOf(selectedDate),
  );

  const roster =
    selectionValid && selectedAcude && selectedSlot
      ? await attendanceRoster(selectedAcude.id, selectedSlot.id, selectedDate)
      : null;
  const scenarioName =
    selectionValid && selectedSlot?.scenarioId
      ? ((await listScenarioOptions()).find(
          (scenario) => scenario.id === selectedSlot.scenarioId,
        )?.name ?? "Escenario")
      : "Por asignar";

  const sessions = await listAttendanceSessions(user, {
    from,
    to: addDays(from, 6),
    ...(filterAcudeId ? { acudeId: filterAcudeId } : {}),
  });
  const groupedSessions = groupByDate(sessions);
  const weekHref = attendanceHref({ from, acudeId: filterAcudeId });
  const previousWeekHref = attendanceHref({
    from: addDays(from, -7),
    acudeId: filterAcudeId,
  });
  const nextWeekHref = attendanceHref({
    from: addDays(from, 7),
    acudeId: filterAcudeId,
  });

  return (
    <>
      {hasRequestedSelection && !selectionValid && (
        <div className="mb-4">
          <Alert kind="error">
            La sesión solicitada no existe, no pertenece a tus ACUDES o está fuera
            de la ventana de corrección de {ATTENDANCE_EDIT_WINDOW_DAYS} días.
          </Alert>
        </div>
      )}

      {selectionValid && roster && selectedAcude && selectedSlot ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link href={weekHref} className={secondaryButtonClass}>
              ← Volver a mis sesiones
            </Link>
            <Badge tone={roster.attendance.length > 0 ? "teal" : "amber"}>
              {roster.attendance.length > 0 ? "Guardada" : "Pendiente"}
            </Badge>
          </div>

          <section className={`${cardClass} p-5`}>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
                  Control de asistencia
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedAcude.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDateNumeric(selectedDate)} ·{" "}
                  {WEEKDAY_LABELS[selectedSlot.day]} {selectedSlot.startTime}–
                  {selectedSlot.endTime}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {selectedAcude.teacherName} · {scenarioName} ·{" "}
                  {roster.enrollments.length} inscritos activos
                </p>
              </div>
              <Link
                href={`/manager/reports?kind=attendance&acudeId=${selectedAcude.id}`}
                className={secondaryButtonClass}
              >
                Ver reporte
              </Link>
            </div>

            {roster.attendance.length > 0 && (
              <div className="mb-4">
                <Alert kind="info">
                  Esta sesión ya tiene asistencia registrada. Puedes corregirla y
                  volver a guardar.
                </Alert>
              </div>
            )}

            <AttendanceForm
              key={`${selectedAcude.id}-${selectedSlot.id}-${selectedDate}`}
              acudeId={selectedAcude.id}
              slotId={selectedSlot.id}
              date={selectedDate}
              enrollments={roster.enrollments}
              attendance={roster.attendance}
            />
          </section>

          <p className="mt-4 text-xs text-slate-500">
            La asistencia se guarda por estudiante y fecha. Si se vuelve a guardar
            la misma sesión, se actualiza el registro.
          </p>
        </>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-teal-700">
                Semana
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatDateNumeric(from)} – {formatDateNumeric(addDays(from, 6))}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {from > oldestWeekStart ? (
                <Link href={previousWeekHref} className={secondaryButtonClass}>
                  ← Semana anterior
                </Link>
              ) : (
                <span className={`${secondaryButtonClass} opacity-50`}>
                  ← Semana anterior
                </span>
              )}
              {from < currentWeekStart ? (
                <Link href={nextWeekHref} className={secondaryButtonClass}>
                  Semana siguiente →
                </Link>
              ) : (
                <span className={`${secondaryButtonClass} opacity-50`}>
                  Semana siguiente →
                </span>
              )}
            </div>
          </div>

          {acudes.length > 1 && (
            <form className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input type="hidden" name="from" value={from} />
              <select
                name="acudeId"
                defaultValue={filterAcudeId}
                className={`${selectClass} min-w-52 flex-1`}
                aria-label="Filtrar por ACUDE"
              >
                <option value="">Todos mis ACUDES</option>
                {acudes.map((acude) => (
                  <option key={acude.id} value={acude.id}>
                    {acude.name}
                  </option>
                ))}
              </select>
              <button className={buttonClass}>Filtrar</button>
              {filterAcudeId && (
                <Link
                  href={attendanceHref({ from })}
                  className={secondaryButtonClass}
                >
                  Limpiar
                </Link>
              )}
            </form>
          )}

          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {user.role === "manager" ? "Mis sesiones" : "Sesiones"}
              </h2>
              <p className="text-sm text-slate-500">
                Calculadas desde el horario de cada ACUDE. Solo se muestran clases
                hasta hoy.
              </p>
            </div>
            <Badge tone="neutral">{sessions.length}</Badge>
          </div>

          {groupedSessions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-500">
              No hay sesiones programadas en esta semana
              {filterAcudeId ? " para el ACUDE seleccionado" : ""}. Puedes revisar
              la semana anterior para corregir asistencias.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {groupedSessions.map((group) => (
                <section key={group.date} className={cardClass}>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">
                        {WEEKDAY_LABELS[weekdayOf(group.date)]}{" "}
                        {formatDateNumeric(group.date)}
                      </h3>
                      {group.date === today && <Badge tone="blue">Hoy</Badge>}
                    </div>
                    <span className="text-xs text-slate-400">
                      {group.sessions.length} sesión
                      {group.sessions.length === 1 ? "" : "es"}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {group.sessions.map((session) => (
                      <li key={session.sessionKey}>
                        <Link
                          href={sessionHref(session, from, filterAcudeId)}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {session.startTime}–{session.endTime} ·{" "}
                              {session.acudeName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {session.scenarioName} · {session.teacherName} ·{" "}
                              {session.enrolled} inscrito
                              {session.enrolled === 1 ? "" : "s"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <Badge
                              tone={session.status === "saved" ? "teal" : "amber"}
                            >
                              {session.status === "saved"
                                ? "Guardada"
                                : "Pendiente"}
                            </Badge>
                            <span className="text-xs font-semibold text-teal-700">
                              Abrir →
                            </span>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function AttendancePage(props: PageProps<"/manager/attendance">) {
  return (
    <>
      <PageHeader
        eyebrow="Asistencia"
        title="Control de asistencia"
        description="Elige una sesión real de tu horario y pasa lista. Solo se muestran clases hasta hoy; puedes corregir sesiones de las últimas dos semanas."
      />
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-2xl bg-slate-200/60"
            aria-busy
          />
        }
      >
        <AttendanceContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
