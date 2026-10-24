import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listLiveAcudes } from "@/lib/data/acudes";
import { listEnrollments } from "@/lib/data/enrollments";
import { getOccupation } from "@/lib/data/occupation";
import { attendanceReport, enrollmentReport } from "@/lib/data/reports";
import { listScenarios } from "@/lib/data/scenarios";
import { sessionsNow, upcomingSessions } from "@/lib/domain/agenda";
import {
  CATEGORY_LABELS,
  formatDate,
  todayKey,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { requireWebUser } from "@/lib/web/session";
import type { AuthUser, LiveAcude } from "@/lib/types";
import {
  Badge,
  buttonClass,
  cardClass,
  EmptyState,
  PageHeader,
  ProgressBar,
  secondaryButtonClass,
  StatCard,
} from "@/components/ui";

export const metadata: Metadata = { title: "Panel" };

function SessionRow({
  acude,
  slot,
  date,
  enrolled,
}: {
  acude: LiveAcude;
  slot: { day: string; startTime: string; endTime: string; scenarioName: string };
  date: string;
  enrolled?: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-800">{acude.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {WEEKDAY_LABELS[slot.day as keyof typeof WEEKDAY_LABELS]} {slot.startTime}–
          {slot.endTime} · {slot.scenarioName}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(date)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge tone="teal">{CATEGORY_LABELS[acude.category]}</Badge>
        {enrolled !== undefined && (
          <span className="text-xs text-slate-500">{enrolled} inscritos</span>
        )}
      </div>
    </li>
  );
}

async function StudentDashboard({ user }: { user: AuthUser }) {
  const [enrollments, acudes] = await Promise.all([
    listEnrollments({ userId: user.uid, status: "active" }),
    listLiveAcudes(),
  ]);
  const now = sessionsNow(acudes);
  const upcoming = upcomingSessions(acudes, new Date(), 6);
  const availableSlots = acudes.reduce((sum, acude) => sum + acude.totalAvailable, 0);
  const enrolledAcudeIds = new Set(enrollments.map((item) => item.acudeId));
  const recommended = acudes
    .filter((acude) => !enrolledAcudeIds.has(acude.id))
    .filter((acude) => acude.totalAvailable > 0)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow={`Hola, ${user.name.split(" ")[0]}`}
        title="Tu agenda ACUDE"
        description="Inscripciones activas, próximas sesiones y cupos disponibles en un solo lugar."
        actions={
          <>
            <Link href="/calendar" className={secondaryButtonClass}>
              Ver calendario
            </Link>
            <Link href="/acudes" className={buttonClass}>
              Explorar cartelera
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Mis ACUDES activos"
          value={enrollments.length}
          hint="Inscripciones vigentes"
          icon="🎓"
        />
        <StatCard
          label="ACUDES en cartelera"
          value={acudes.length}
          hint="Oferta publicada"
          icon="📋"
          tone="blue"
        />
        <StatCard
          label="Cupos libres"
          value={availableSlots}
          hint="En todos los subgrupos"
          icon="🟢"
          tone="violet"
        />
        <StatCard
          label="Ahora mismo"
          value={now.length}
          hint={now.length > 0 ? "Sesiones en curso" : "No hay sesiones en curso"}
          icon="⏱️"
          tone={now.length > 0 ? "amber" : "teal"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Próximas sesiones</h2>
            <Link href="/calendar" className="text-xs font-semibold text-teal-700 hover:underline">
              Calendario completo →
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState
              title="Sin sesiones programadas"
              description="Cuando te inscribas a un ACUDE, sus franjas aparecerán aquí."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {upcoming.map((item) => (
                <SessionRow
                  key={`${item.acude.id}-${item.slot.id}`}
                  acude={item.acude}
                  slot={item.slot}
                  date={item.date}
                  enrolled={item.slot.enrolled}
                />
              ))}
            </ul>
          )}
        </section>

        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Mis inscripciones</h2>
            <Link
              href="/my-enrollments"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Gestionar →
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <EmptyState
              title="Aún no tienes ACUDES"
              description="Inscríbete desde la cartelera o desde el calendario semanal."
              action={
                <Link href="/acudes" className={buttonClass}>
                  Ver cartelera
                </Link>
              }
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {enrollments.slice(0, 4).map((enrollment) => (
                <li key={enrollment.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{enrollment.acudeName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {WEEKDAY_LABELS[enrollment.day]} {enrollment.startTime}–{enrollment.endTime} ·{" "}
                    {enrollment.scenarioName}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-teal-700">
                    Inscrito el {formatDate(enrollment.enrolledAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recomendados para ti</h2>
          <Link href="/acudes" className="text-xs font-semibold text-teal-700 hover:underline">
            Ver todos →
          </Link>
        </div>
        {recommended.length === 0 ? (
          <EmptyState
            title="No hay cupos nuevos por ahora"
            description="Revisa la cartelera más tarde; los cupos se liberan cuando alguien cancela."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recommended.map((acude) => (
              <Link
                key={acude.id}
                href={`/acudes/${acude.id}`}
                className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-teal-300`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone={acude.category === "sports" ? "teal" : "violet"}>
                    {CATEGORY_LABELS[acude.category]}
                  </Badge>
                  <span className="text-xs font-semibold text-slate-500">
                    {acude.totalAvailable} cupos
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-slate-900 group-hover:text-teal-800">
                  {acude.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{acude.description}</p>
                <p className="mt-3 text-xs font-medium text-slate-600">
                  {acude.schedule.length} subgrupo(s) · {acude.teacherName}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

async function StaffDashboard({ user }: { user: AuthUser }) {
  const [occupation, acudes, activeEnrollments, scenarios, report, attendance] =
    await Promise.all([
      getOccupation(todayKey()),
      listLiveAcudes(),
      listEnrollments({ status: "active" }),
      listScenarios(),
      enrollmentReport({ groupBy: "date" }),
      attendanceReport({ groupBy: "acude" }),
    ]);
  const now = occupation.scenarios.flatMap((item) => (item.current ? [item.current] : []));
  const free = occupation.scenarios.filter((item) => !item.current).length;
  const next = occupation.scenarios
    .flatMap((item) => (item.next ? [item.next] : []))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 6);
  const upcoming = upcomingSessions(acudes, new Date(), 6);

  return (
    <>
      <PageHeader
        eyebrow={`${user.role === "admin" ? "Administración" : "Gestión"} · ${formatDate(todayKey())}`}
        title="Panel de ocupación y trazabilidad"
        description="Estado en vivo de los escenarios, subgrupos publicados y eventos de inscripción."
        actions={
          <>
            <Link href="/manager/reports" className={secondaryButtonClass}>
              Ver reportes
            </Link>
            <Link href="/manager/acudes/new" className={buttonClass}>
              Nuevo ACUDE
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sesiones en curso"
          value={now.length}
          hint={`${free} escenarios libres ahora`}
          icon="🟢"
          tone={now.length > 0 ? "amber" : "teal"}
        />
        <StatCard
          label="ACUDES publicados"
          value={acudes.length}
          hint={`${scenarios.length} escenarios registrados`}
          icon="🏟️"
          tone="blue"
        />
        <StatCard
          label="Inscripciones activas"
          value={activeEnrollments.length}
          hint={`${report.summary.active} activas en 30 días`}
          icon="🎓"
          tone="violet"
        />
        <StatCard
          label="Asistencia media"
          value={`${attendance.summary.attendanceRate}%`}
          hint={`${attendance.summary.total} registros de asistencia`}
          icon="📊"
          tone="rose"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Escenarios ahora</h2>
            <Link
              href="/manager/occupation"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Panel completo →
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {occupation.scenarios.slice(0, 8).map((item) => (
              <li key={item.scenario.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-slate-800">{item.scenario.name}</p>
                  <Badge tone={item.current ? "teal" : "neutral"}>
                    {item.current ? "Ocupado" : "Libre"}
                  </Badge>
                </div>
                {item.current ? (
                  <div className="mt-2">
                    <p className="truncate text-xs font-medium text-slate-600">
                      {item.current.acudeName}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.current.startTime}–{item.current.endTime} ·{" "}
                      {item.current.teacherName}
                    </p>
                    <div className="mt-2">
                      <ProgressBar
                        value={item.current.occupancyPct}
                        tone={item.current.occupancyPct >= 90 ? "rose" : "teal"}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    {item.next
                      ? `Próximo: ${item.next.acudeName} ${item.next.startTime}`
                      : "Sin sesiones programadas hoy"}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className="mb-4 text-lg font-bold text-slate-900">Próximas sesiones de hoy</h2>
          {next.length === 0 ? (
            <EmptyState
              title="No quedan sesiones hoy"
              description="Revisa el calendario o la programación de la semana."
            />
          ) : (
            <ul className="flex flex-col gap-2">
              {next.map((session) => (
                <li
                  key={`${session.acudeId}-${session.slotId}`}
                  className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
                >
                  <span className="rounded-lg bg-white px-2 py-1 text-xs font-bold text-teal-700 shadow-sm">
                    {session.startTime}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {session.acudeName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {session.teacherName} · {session.enrolled}/{session.capacity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 p-3">
            <p className="text-xs font-semibold text-teal-800">Semana en curso</p>
            <p className="mt-1 text-xs text-teal-700">
              {upcoming.length > 0
                ? `${upcoming.length} franjas próximas en ${acudes.length} ACUDES publicados.`
                : "No hay franjas próximas."}
            </p>
            <Link href="/calendar" className="mt-2 inline-block text-xs font-bold text-teal-800 underline">
              Abrir calendario semanal
            </Link>
          </div>
        </section>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Gestionar ACUDES", "Crea grupos, horarios y cupos.", "/manager/acudes", "🗂️"],
          ["Ocupación", "Trazabilidad por escenario.", "/manager/occupation", "🏟️"],
          ["Asistencia", "Registra el uso real.", "/manager/attendance", "✅"],
          ["Reportes", "Eventos y asistencia con Highcharts.", "/manager/reports", "📈"],
        ].map(([title, text, href, icon]) => (
          <Link
            key={href as string}
            href={href as string}
            className={`${cardClass} group p-4 transition hover:border-teal-300`}
          >
            <span className="text-xl" aria-hidden>
              {icon}
            </span>
            <p className="mt-2 text-sm font-bold text-slate-800 group-hover:text-teal-800">
              {title}
            </p>
            <p className="mt-1 text-xs text-slate-500">{text}</p>
          </Link>
        ))}
      </section>
    </>
  );
}

async function DashboardContent() {
  const user = await requireWebUser();
  if (user.role === "student") return <StudentDashboard user={user} />;
  return <StaffDashboard user={user} />;
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="h-20 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
