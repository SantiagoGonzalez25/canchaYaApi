"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { EnrollmentPanel } from "@/components/enrollment-panel";
import { AcudeImage } from "@/components/acude-image";
import {
  Badge,
  buttonClass,
  inputClass,
  ProgressBar,
  secondaryButtonClass,
  selectClass,
} from "@/components/ui";
import {
  addDays,
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  startOfWeek,
  WEEKDAY_LABELS,
  weekdayOf,
} from "@/lib/labels";
import type { Enrollment, LiveAcude, LiveScheduleSlot, Sex } from "@/lib/types";

interface CalendarProps {
  acudes: LiveAcude[];
  today: string;
  userSex: Sex | null;
  myEnrollments: Enrollment[];
  isStudent: boolean;
  isStaff: boolean;
  canManage: boolean;
}

interface CalendarEvent {
  acude: LiveAcude;
  slot: LiveScheduleSlot;
  date: string;
  key: string;
}

function shortDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function longDate(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function eventStyle(category: LiveAcude["category"]): React.CSSProperties {
  const color = CATEGORY_COLORS[category];
  return {
    borderLeftColor: color,
    backgroundColor: `${color}12`,
  };
}

const MOBILE_QUERY = "(max-width: 767px)";
function subscribeMobile(callback: () => void) {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const query = window.matchMedia(MOBILE_QUERY);
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", callback);
    return () => query.removeEventListener("change", callback);
  }
  query.addListener(callback);
  return () => query.removeListener(callback);
}
function mobileSnapshot() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(MOBILE_QUERY).matches
    : false;
}
function serverMobileSnapshot() {
  return false;
}

export function Calendar({
  acudes,
  today,
  userSex,
  myEnrollments,
  isStudent,
  isStaff,
  canManage,
}: CalendarProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [viewChoice, setViewChoice] = useState<"week" | "agenda" | "scenario" | null>(null);
  const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverMobileSnapshot);
  const view = viewChoice ?? (isMobile ? "agenda" : "week");
  const setView = setViewChoice;
  const [category, setCategory] = useState("");
  const [scenarioFilter, setScenarioFilter] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("");
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyMine, setOnlyMine] = useState(isStudent);
  const [selected, setSelected] = useState<{ acudeId: string; slotId: string } | null>(null);

  const enrolledAcudeIds = useMemo(
    () => new Set(myEnrollments.filter((item) => item.status === "active").map((item) => item.acudeId)),
    [myEnrollments],
  );
  const enrolledSlotIds = useMemo(
    () => new Set(myEnrollments.filter((item) => item.status === "active").map((item) => item.slotId)),
    [myEnrollments],
  );

  const scenarioOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const acude of acudes) {
      for (const slot of acude.schedule) map.set(slot.scenarioId, slot.scenarioName);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [acudes]);

  const teacherOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const acude of acudes) map.set(acude.teacherId, acude.teacherName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [acudes]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return acudes.filter((acude) => {
      if (category && acude.category !== category) return false;
      if (scenarioFilter && !acude.schedule.some((slot) => slot.scenarioId === scenarioFilter)) {
        return false;
      }
      if (teacherFilter && acude.teacherId !== teacherFilter) return false;
      if (onlyAvailable && acude.totalAvailable <= 0) return false;
      if (onlyMine && !enrolledAcudeIds.has(acude.id)) return false;
      if (term) {
        const haystack = `${acude.name} ${acude.discipline} ${acude.teacherName}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [
    acudes,
    category,
    scenarioFilter,
    teacherFilter,
    query,
    onlyAvailable,
    onlyMine,
    enrolledAcudeIds,
  ]);

  const events = useMemo(() => {
    const list: CalendarEvent[] = [];
    for (const acude of filtered) {
      for (const slot of acude.schedule) {
        if (scenarioFilter && slot.scenarioId !== scenarioFilter) continue;
        if (isStudent && onlyMine && !enrolledSlotIds.has(slot.id)) continue;
        const dayIndex = days.findIndex((date) => weekdayOf(date) === slot.day);
        if (dayIndex === -1) continue;
        const date = days[dayIndex];
        list.push({ acude, slot, date, key: `${date}-${acude.id}-${slot.id}` });
      }
    }
    return list.sort(
      (a, b) => a.date.localeCompare(b.date) || a.slot.startTime.localeCompare(b.slot.startTime),
    );
  }, [filtered, days, isStudent, onlyMine, enrolledSlotIds, scenarioFilter]);

  const scenarioColumns = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of events) map.set(event.slot.scenarioId, event.slot.scenarioName);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
  }, [events]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const date of days) map.set(date, []);
    for (const event of events) map.get(event.date)?.push(event);
    return map;
  }, [events, days]);

  const selectedAcude = selected ? acudes.find((acude) => acude.id === selected.acudeId) : null;
  const selectedSlot = selectedAcude?.schedule.find((slot) => slot.id === selected?.slotId);
  const existingEnrollment =
    selectedAcude ? myEnrollments.find((item) => item.acudeId === selectedAcude.id) ?? null : null;

  useEffect(() => {
    if (!selected) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selected]);

  const weekEnd = days[6];
  const totalAvailable = filtered.reduce((sum, acude) => sum + acude.totalAvailable, 0);
  const myCount = events.filter((event) => enrolledSlotIds.has(event.slot.id)).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className={secondaryButtonClass}
              aria-label="Semana anterior"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(today))}
              className={secondaryButtonClass}
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className={secondaryButtonClass}
              aria-label="Semana siguiente"
            >
              →
            </button>
            <input
              type="date"
              value={weekStart}
              onChange={(event) => {
                if (event.target.value) setWeekStart(startOfWeek(event.target.value));
              }}
              className={`${inputClass} w-40`}
              aria-label="Ir a una fecha"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-900">
              {shortDate(weekStart)} — {shortDate(weekEnd)}
            </p>
            <p className="text-[11px] uppercase tracking-wide text-teal-700">Semana seleccionada</p>
            <p className="text-[10px] text-slate-400">La programación se repite cada semana</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 p-1">
            <button
              type="button"
              onClick={() => setView("week")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === "week" ? "bg-teal-700 text-white" : "text-slate-600"
              }`}
            >
              Semana
            </button>
            <button
              type="button"
              onClick={() => setView("agenda")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === "agenda" ? "bg-teal-700 text-white" : "text-slate-600"
              }`}
            >
              Agenda
            </button>
            <button
              type="button"
              onClick={() => setView("scenario")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                view === "scenario" ? "bg-teal-700 text-white" : "text-slate-600"
              }`}
            >
              Por escenario
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por ACUDE, disciplina o docente..."
            className={`${inputClass} lg:min-w-56 lg:flex-1`}
            aria-label="Buscar en el calendario"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={`${selectClass} lg:w-44`}
            aria-label="Categoría"
          >
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={scenarioFilter}
            onChange={(event) => setScenarioFilter(event.target.value)}
            className={`${selectClass} lg:w-48`}
            aria-label="Escenario"
          >
            <option value="">Todos los escenarios</option>
            {scenarioOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={teacherFilter}
            onChange={(event) => setTeacherFilter(event.target.value)}
            className={`${selectClass} lg:w-48`}
            aria-label="Docente"
          >
            <option value="">Todos los docentes</option>
            {teacherOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(event) => setOnlyAvailable(event.target.checked)}
              className="accent-teal-700"
            />
            Con cupos
          </label>
          {isStudent && (
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={onlyMine}
                onChange={(event) => setOnlyMine(event.target.checked)}
                className="accent-teal-700"
              />
              Mis ACUDES
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setScenarioFilter("");
              setTeacherFilter("");
              setQuery("");
              setOnlyAvailable(false);
              setOnlyMine(false);
            }}
            className="rounded-xl px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">{events.length} franjas</span>
          <span>·</span>
          <span>{totalAvailable} cupos libres</span>
          {isStudent && (
            <>
              <span>·</span>
              <span>{myCount} de tus subgrupos</span>
            </>
          )}
          <span className="ml-auto flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <span key={key} className="inline-flex items-center gap-1">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS] }}
                />
                {label}
              </span>
            ))}
          </span>
        </div>
      </div>

      {view === "week" ? (
        <div className="calendar-scroll overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid min-w-[1020px] grid-cols-7 divide-x divide-slate-200">
            {days.map((date) => {
              const dayEvents = eventsByDay.get(date) ?? [];
              const isToday = date === today;
              return (
                <section key={date} className={isToday ? "bg-teal-50/40" : ""}>
                  <header className="border-b border-slate-200 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {WEEKDAY_LABELS[weekdayOf(date)]}
                        </p>
                        <p
                          className={`text-lg font-black ${
                            isToday ? "text-teal-700" : "text-slate-800"
                          }`}
                        >
                          {shortDate(date)}
                        </p>
                      </div>
                      {isToday && (
                        <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">
                          Hoy
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {dayEvents.length} franja(s)
                    </p>
                  </header>
                  <div className="flex min-h-[420px] flex-col gap-2 p-2.5">
                    {dayEvents.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 px-2 py-6 text-center text-[11px] text-slate-400">
                        Sin sesiones
                      </p>
                    ) : (
                      dayEvents.map((event) => {
                        const enrolled = enrolledSlotIds.has(event.slot.id);
                        const full = event.slot.available <= 0;
                        return (
                          <button
                            type="button"
                            key={event.key}
                            onClick={() =>
                              setSelected({ acudeId: event.acude.id, slotId: event.slot.id })
                            }
                            className={`rounded-xl border border-slate-200/70 border-l-4 p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                              enrolled ? "ring-2 ring-emerald-400/60" : ""
                            }`}
                            style={eventStyle(event.acude.category)}
                          >
                            <p className="text-[11px] font-black text-slate-800">
                              {event.slot.startTime}–{event.slot.endTime}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs font-bold leading-snug text-slate-900">
                              {event.acude.name}
                            </p>
                            <p className="mt-1 truncate text-[10px] text-slate-500">
                              {event.slot.scenarioName}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-1">
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                  enrolled
                                    ? "bg-emerald-100 text-emerald-700"
                                    : full
                                      ? "bg-rose-100 text-rose-700"
                                      : "bg-white/80 text-slate-600"
                                }`}
                              >
                                {enrolled
                                  ? "Inscrito"
                                  : full
                                    ? "Lleno"
                                    : `${event.slot.available} cupos`}
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {event.slot.enrolled}/{event.slot.capacity}
                              </span>
                            </div>
                            <div className="mt-1.5">
                              <ProgressBar
                                value={event.slot.occupancyPct}
                                tone={
                                  event.slot.occupancyPct >= 90
                                    ? "rose"
                                    : event.slot.occupancyPct >= 60
                                      ? "amber"
                                      : "teal"
                                }
                              />
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : view === "scenario" ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {scenarioColumns.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              No hay franjas para los filtros seleccionados.
            </p>
          ) : (
            <div className="min-w-[900px]">
              <div
                className="grid border-b border-slate-200 bg-slate-50"
                style={{
                  gridTemplateColumns: `8rem repeat(${scenarioColumns.length}, minmax(15rem, 1fr))`,
                }}
              >
                <div className="px-3 py-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Día
                </div>
                {scenarioColumns.map(([id, name]) => (
                  <div
                    key={id}
                    className="border-l border-slate-200 px-3 py-3 text-xs font-bold text-slate-700"
                  >
                    {name}
                  </div>
                ))}
              </div>
              {days.map((date) => {
                const dayEvents = eventsByDay.get(date) ?? [];
                const isToday = date === today;
                return (
                  <div
                    key={date}
                    className={`grid border-b border-slate-100 last:border-0 ${
                      isToday ? "bg-teal-50/30" : ""
                    }`}
                    style={{
                      gridTemplateColumns: `8rem repeat(${scenarioColumns.length}, minmax(15rem, 1fr))`,
                    }}
                  >
                    <div className="px-3 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {WEEKDAY_LABELS[weekdayOf(date)]}
                      </p>
                      <p
                        className={`text-sm font-black ${
                          isToday ? "text-teal-700" : "text-slate-800"
                        }`}
                      >
                        {shortDate(date)}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        {dayEvents.length} franja(s)
                      </p>
                    </div>
                    {scenarioColumns.map(([scenarioId]) => {
                      const cellEvents = dayEvents.filter(
                        (event) => event.slot.scenarioId === scenarioId,
                      );
                      return (
                        <div key={scenarioId} className="border-l border-slate-100 p-2 align-top">
                          {cellEvents.length === 0 ? (
                            <p className="px-1 py-3 text-[10px] text-slate-300">—</p>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {cellEvents.map((event) => {
                                const enrolled = enrolledSlotIds.has(event.slot.id);
                                const full = event.slot.available <= 0;
                                return (
                                  <button
                                    key={event.key}
                                    type="button"
                                    onClick={() =>
                                      setSelected({
                                        acudeId: event.acude.id,
                                        slotId: event.slot.id,
                                      })
                                    }
                                    className={`rounded-lg border border-l-4 p-2 text-left transition hover:shadow-sm ${
                                      enrolled ? "ring-2 ring-emerald-400/60" : ""
                                    }`}
                                    style={eventStyle(event.acude.category)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-[10px] font-black text-slate-800">
                                        {event.slot.startTime}–{event.slot.endTime}
                                      </p>
                                      {enrolled ? (
                                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                          Inscrito
                                        </span>
                                      ) : full ? (
                                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                          Lleno
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 text-xs font-bold leading-snug text-slate-900">
                                      {event.acude.name}
                                    </p>
                                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                                      {event.acude.teacherName}
                                    </p>
                                    <p className="mt-1 text-[9px] text-slate-400">
                                      {event.slot.enrolled}/{event.slot.capacity} inscritos
                                    </p>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          <p className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
            Cada columna es un escenario. Las franjas de la misma hora quedan lado a lado, sin
            apilarse.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {days.map((date) => {
            const dayEvents = eventsByDay.get(date) ?? [];
            if (dayEvents.length === 0) return null;
            return (
              <section key={date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <header className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-black capitalize text-slate-800">{longDate(date)}</h3>
                  <span className="text-[11px] text-slate-400">{dayEvents.length} franja(s)</span>
                </header>
                <div className="grid gap-2 md:grid-cols-2">
                  {dayEvents.map((event) => {
                    const enrolled = enrolledSlotIds.has(event.slot.id);
                    return (
                      <button
                        type="button"
                        key={event.key}
                        onClick={() =>
                          setSelected({ acudeId: event.acude.id, slotId: event.slot.id })
                        }
                        className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 border-l-4 p-3 text-left transition hover:shadow-md"
                        style={eventStyle(event.acude.category)}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800">
                            {event.slot.startTime}–{event.slot.endTime}
                          </p>
                          <p className="mt-1 truncate text-sm font-bold text-slate-900">
                            {event.acude.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {event.slot.scenarioName} · {event.acude.teacherName}
                          </p>
                        </div>
                        <Badge tone={enrolled ? "teal" : event.slot.available > 0 ? "blue" : "rose"}>
                          {enrolled ? "Inscrito" : event.slot.available > 0 ? "Con cupo" : "Lleno"}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {events.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
              {isStudent && onlyMine && myEnrollments.length === 0
                ? "Aún no tienes ACUDES inscritos. Desmarca “Mis ACUDES” para ver toda la cartelera."
                : "No hay franjas para los filtros seleccionados."}
            </p>
          )}
        </div>
      )}

      {selected && selectedAcude && selectedSlot && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${selectedAcude.name}`}
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={selectedAcude.category === "sports" ? "teal" : "violet"}>
                    {CATEGORY_LABELS[selectedAcude.category]}
                  </Badge>
                  <Badge tone="neutral">{selectedAcude.semester}</Badge>
                  {selectedAcude.status !== "published" && (
                    <Badge tone="amber">Borrador</Badge>
                  )}
                  {enrolledSlotIds.has(selectedSlot.id) && <Badge tone="teal">Inscrito</Badge>}
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-900">{selectedAcude.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {WEEKDAY_LABELS[selectedSlot.day]} {selectedSlot.startTime}–
                  {selectedSlot.endTime} · {selectedSlot.scenarioName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-full bg-slate-100 px-3 py-1 text-lg font-bold text-slate-500 hover:bg-slate-200"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            {selectedAcude.imageUrl && (
              <AcudeImage
                src={selectedAcude.imageUrl}
                name={selectedAcude.name}
                className="h-44 w-full"
              />
            )}
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <p className="text-sm leading-relaxed text-slate-600">{selectedAcude.description}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Docente
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedAcude.teacherName}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Cupo del subgrupo
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {selectedSlot.enrolled} de {selectedSlot.capacity} inscritos
                </p>
              </div>
              <div className="sm:col-span-2">
                <div className="flex gap-2">
                  <Link
                    href={
                      isStaff
                        ? `/manager/acudes/${selectedAcude.id}`
                        : `/acudes/${selectedAcude.id}`
                    }
                    className={secondaryButtonClass}
                  >
                    {isStaff ? "Ver ficha del ACUDE" : "Ver ficha completa"}
                  </Link>
                  {canManage && (
                    <Link href={`/manager/acudes/${selectedAcude.id}`} className={buttonClass}>
                      Editar ACUDE
                    </Link>
                  )}
                </div>
              </div>
              {isStudent && (
                <div className="sm:col-span-2">
                  <EnrollmentPanel
                    key={existingEnrollment?.id ?? `new-${selectedAcude.id}`}
                    acude={selectedAcude}
                    userSex={userSex}
                    existing={existingEnrollment}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
