import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Badge,
  buttonClass,
  cardClass,
  PageHeader,
  ProgressBar,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";
import { getOccupation } from "@/lib/data/occupation";
import {
  addDays,
  formatDate,
  isDateKey,
  SCENARIO_STATUS_LABELS,
  SCENARIO_TYPE_LABELS,
  todayKey,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import type { OccupationSession, SessionPhase } from "@/lib/types";
import { requireWebStaff } from "@/lib/web/session";

export const metadata: Metadata = { title: "Panel de ocupación" };

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const PHASE_LABEL: Record<SessionPhase, string> = {
  in_session: "En curso",
  upcoming: "Próxima",
  finished: "Finalizada",
  scheduled: "Programada",
};

const PHASE_TONE: Record<SessionPhase, "teal" | "amber" | "neutral" | "blue"> = {
  in_session: "teal",
  upcoming: "amber",
  finished: "neutral",
  scheduled: "blue",
};

function SessionRow({ session }: { session: OccupationSession }) {
  return (
    <li
      className={`rounded-xl border p-3 ${
        session.phase === "in_session"
          ? "border-teal-300 bg-teal-50/70"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-slate-800">
            {session.startTime}–{session.endTime}
          </p>
          <p className="mt-1 truncate text-sm font-bold text-slate-900">{session.acudeName}</p>
          <p className="text-[11px] text-slate-500">{session.teacherName}</p>
        </div>
        <Badge tone={PHASE_TONE[session.phase]}>{PHASE_LABEL[session.phase]}</Badge>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {session.enrolled}/{session.capacity} inscritos
        </span>
        <span>{session.occupancyPct}%</span>
      </div>
      <div className="mt-1">
        <ProgressBar
          value={session.occupancyPct}
          tone={session.occupancyPct >= 90 ? "rose" : session.occupancyPct >= 60 ? "amber" : "teal"}
        />
      </div>
    </li>
  );
}

async function OccupationContent({
  searchParams,
}: {
  searchParams: PageProps<"/manager/occupation">["searchParams"];
}) {
  await requireWebStaff();
  const params = await searchParams;
  const requestedDate = first(params.date);
  const date = isDateKey(requestedDate) ? requestedDate : todayKey();
  const occupation = await getOccupation(date);
  const inSession = occupation.scenarios.flatMap((item) =>
    item.current ? [item.current] : [],
  );
  const free = occupation.scenarios.filter((item) => !item.current).length;
  const sessions = occupation.scenarios.reduce((sum, item) => sum + item.sessions.length, 0);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Link
            href={`/manager/occupation?date=${addDays(date, -1)}`}
            className={secondaryButtonClass}
            aria-label="Día anterior"
          >
            ←
          </Link>
          <Link href="/manager/occupation" className={secondaryButtonClass}>
            Hoy
          </Link>
          <Link
            href={`/manager/occupation?date=${addDays(date, 1)}`}
            className={secondaryButtonClass}
            aria-label="Día siguiente"
          >
            →
          </Link>
          <form action="/manager/occupation" method="get" className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              aria-label="Fecha del panel"
            />
            <button className={buttonClass}>Ver</button>
          </form>
        </div>
        <div className="text-right">
          <p className="text-sm font-black capitalize text-slate-900">{formatDate(date)}</p>
          <p className="text-[11px] uppercase tracking-wide text-teal-700">
            {WEEKDAY_LABELS[occupation.day]}
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Escenarios" value={occupation.scenarios.length} icon="🏟️" />
        <StatCard
          label="En uso ahora"
          value={inSession.length}
          tone={inSession.length > 0 ? "amber" : "teal"}
          icon="🟢"
        />
        <StatCard label="Libres" value={free} tone="blue" icon="⚪" />
        <StatCard label="Franjas del día" value={sessions} tone="violet" icon="🕒" />
      </div>

      <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50/70 p-4 text-sm text-teal-900">
        <p className="font-bold">Trazabilidad sin reservas</p>
        <p className="mt-1 text-xs leading-relaxed text-teal-800">
          La ocupación se calcula con los ACUDES publicados y sus inscripciones activas. Un escenario
          aparece ocupado únicamente porque un grupo tiene una franja programada, nunca por una
          reserva individual.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {occupation.scenarios.map((item) => (
          <section key={item.scenario.id} className={`${cardClass} flex flex-col p-4`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">{item.scenario.name}</h2>
                <p className="text-[11px] text-slate-500">
                  {SCENARIO_TYPE_LABELS[item.scenario.type]} · {item.scenario.location}
                </p>
              </div>
              <Badge
                tone={
                  item.scenario.status === "available"
                    ? "teal"
                    : item.scenario.status === "maintenance"
                      ? "amber"
                      : "neutral"
                }
              >
                {SCENARIO_STATUS_LABELS[item.scenario.status]}
              </Badge>
            </div>

            {item.current && (
              <div className="mt-3 rounded-xl bg-teal-700 p-3 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wide text-teal-100">
                  En uso ahora
                </p>
                <p className="mt-0.5 text-sm font-bold">{item.current.acudeName}</p>
                <p className="text-[11px] text-teal-100">
                  {item.current.startTime}–{item.current.endTime} · {item.current.teacherName}
                </p>
              </div>
            )}

            <div className="mt-3 flex-1">
              {item.sessions.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">
                  Libre todo el día
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {item.sessions.map((session) => (
                    <SessionRow key={`${session.slotId}-${session.acudeId}`} session={session} />
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500">
              <span>{item.enrolledToday} inscritos hoy</span>
              {item.next && <span>Próxima: {item.next.startTime}</span>}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

export default function OccupationPage(props: PageProps<"/manager/occupation">) {
  return (
    <>
      <PageHeader
        eyebrow="Gestión · Tiempo real"
        title="Panel de ocupación"
        description="Qué grupo ACUDE usa cada escenario, en qué franja y con cuántos inscritos. La trazabilidad que antes no existía."
        actions={
          <>
            <Link href="/manager/reports" className={secondaryButtonClass}>
              Reportes
            </Link>
            <Link href="/calendar" className={buttonClass}>
              Calendario semanal
            </Link>
          </>
        }
      />
      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-200/60" aria-busy />}
      >
        <OccupationContent searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
