import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listLiveAcudes } from "@/lib/data/acudes";
import { listEnrollments } from "@/lib/data/enrollments";
import { getOccupation } from "@/lib/data/occupation";
import { attendanceReport, enrollmentReport } from "@/lib/data/reports";
import { listScenarios } from "@/lib/data/scenarios";
import { upcomingSessions } from "@/lib/domain/agenda";
import {
  CATEGORY_LABELS,
  formatDate,
  todayKey,
  WEEKDAY_LABELS,
} from "@/lib/labels";
import { requirePageUser } from "@/lib/web/session";
import type { AuthUser } from "@/lib/types";
import { ReportChart } from "@/components/report-chart";
import { AcudeImage } from "@/components/acude-image";
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

async function StudentDashboard({ user }: { user: AuthUser }) {
  const [enrollments, acudes] = await Promise.all([
    listEnrollments({ userId: user.uid, status: "active" }),
    listLiveAcudes(),
  ]);
  const upcoming = upcomingSessions(acudes, new Date(), 1);
  const next = upcoming[0];
  const enrolledAcudeIds = new Set(enrollments.map((item) => item.acudeId));
  const recommended = acudes
    .filter((acude) => !enrolledAcudeIds.has(acude.id))
    .filter((acude) => acude.totalAvailable > 0)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow={`Hola, ${user.name.split(" ")[0]}`}
        title="Mi panel"
        actions={
          <>
            <Link href="/calendar" className={secondaryButtonClass}>
              Calendario
            </Link>
            <Link href="/acudes" className={buttonClass}>
              Cartelera
            </Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Mi próximo ACUDE</h2>
          </div>
          {next ? (
            <div className="grid gap-4 p-5 sm:grid-cols-[10rem_1fr]">
              <AcudeImage
                src={next.acude.imageUrl}
                name={next.acude.name}
                className="h-32 w-full rounded-xl sm:h-full"
              />
              <div className="flex flex-col">
                <Badge tone={next.acude.category === "sports" ? "teal" : "violet"}>
                  {CATEGORY_LABELS[next.acude.category]}
                </Badge>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{next.acude.name}</h3>
                <p className="mt-1 text-sm text-slate-600">
                  {WEEKDAY_LABELS[next.slot.day]} {next.slot.startTime}–{next.slot.endTime}
                </p>
                <p className="text-sm text-slate-500">
                  {next.slot.scenarioName} · {next.acude.teacherName}
                </p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(next.date)}</p>
                <Link
                  href={`/acudes/${next.acude.id}`}
                  className="mt-4 text-sm font-semibold text-teal-700 hover:underline"
                >
                  Ver ficha del ACUDE
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5">
              <EmptyState
                title="No tienes una próxima sesión"
                description="Inscríbete a un ACUDE para ver aquí tu siguiente clase."
                action={
                  <Link href="/acudes" className={buttonClass}>
                    Ver cartelera
                  </Link>
                }
              />
            </div>
          )}
        </section>

        <section className={`${cardClass} p-5`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Mis ACUDES</h2>
            <Link
              href="/my-enrollments"
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              Gestionar
            </Link>
          </div>
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no tienes inscripciones activas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id}>
                  <Link
                    href={`/acudes/${enrollment.acudeId}`}
                    className="block rounded-xl bg-slate-50 p-3 transition hover:bg-teal-50"
                  >
                    <p className="text-sm font-semibold text-slate-800">{enrollment.acudeName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {WEEKDAY_LABELS[enrollment.day]} {enrollment.startTime}–{enrollment.endTime}
                    </p>
                    <p className="mt-1 text-xs font-medium text-teal-700">Ver ficha</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">ACUDES con cupos</h2>
          <Link href="/acudes" className="text-xs font-semibold text-teal-700 hover:underline">
            Ver todos
          </Link>
        </div>
        {recommended.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No hay cupos nuevos por ahora.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {recommended.map((acude) => (
              <Link
                key={acude.id}
                href={`/acudes/${acude.id}`}
                className={`${cardClass} group p-4 transition hover:-translate-y-0.5 hover:border-teal-300`}
              >
                <AcudeImage
                  src={acude.imageUrl}
                  name={acude.name}
                  className="mb-3 h-28 w-full rounded-lg"
                />
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
                <p className="mt-1 text-xs text-slate-500">{acude.teacherName}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

async function StaffDashboard({ user }: { user: AuthUser }) {
  const teacherId = user.role === "manager" ? user.uid : undefined;
  const [occupation, acudes, activeEnrollments, scenarios, report, attendance] =
    await Promise.all([
      getOccupation(todayKey(), undefined, new Date(), teacherId),
      listLiveAcudes(teacherId ? { teacherId } : {}),
      listEnrollments({ status: "active", ...(teacherId ? { teacherId } : {}) }),
      listScenarios(),
      enrollmentReport({ groupBy: "date", ...(teacherId ? { teacherId } : {}) }),
      attendanceReport({ groupBy: "acude", ...(teacherId ? { teacherId } : {}) }),
    ]);
  const now = occupation.scenarios.flatMap((item) => (item.current ? [item.current] : []));
  const free = occupation.scenarios.filter((item) => !item.current).length;
  const next = occupation.scenarios
    .flatMap((item) => (item.next ? [item.next] : []))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 6);
  const upcoming = upcomingSessions(acudes, new Date(), 6);
  const reportAcudes = [...new Set(report.rows.map((row) => row.acude))].filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow={`${user.role === "admin" ? "Administración" : "Gestión"} · ${formatDate(todayKey())}`}
        title="Panel de gestión de ACUDES"
        description="Estado de los escenarios, subgrupos publicados e inscripciones activas."
        actions={
          <>
            <Link href="/manager/reports" className={secondaryButtonClass}>
              Ver reportes
            </Link>
            {user.role === "admin" && (
              <Link href="/manager/acudes/new" className={buttonClass}>
                Nuevo ACUDE
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sesiones en curso"
          value={now.length}
          hint={`${free} escenarios libres ahora`}
          tone={now.length > 0 ? "amber" : "teal"}
        />
        <StatCard
          label="ACUDES publicados"
          value={acudes.length}
          hint={`${scenarios.length} escenarios registrados`}
          tone="blue"
        />
        <StatCard
          label="Inscripciones activas"
          value={activeEnrollments.length}
          hint={`${report.summary.active} activas en 30 días`}
          tone="violet"
        />
        <StatCard
          label="Asistencia media"
          value={`${attendance.summary.attendanceRate}%`}
          hint={`${attendance.summary.total} registros de asistencia`}
          tone="rose"
        />
      </div>

      <section className={`${cardClass} mt-6 p-5`}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Inscripciones por fecha</h2>
            <p className="text-xs text-slate-500">Últimos 30 días</p>
            {reportAcudes.length > 0 && (
              <p className="mt-1 max-w-2xl text-xs font-medium text-slate-600">
                ACUDES con actividad: {reportAcudes.join(" · ")}
              </p>
            )}
          </div>
          <Link
            href="/manager/reports?kind=enrollments"
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            Abrir reporte
          </Link>
        </div>
        {report.summary.total > 0 ? (
          <ReportChart report={report} height={300} />
        ) : (
          <EmptyState
            title="Sin eventos de inscripción"
            description="Cuando existan inscripciones en el período, aparecerán en esta gráfica."
          />
        )}
      </section>

      <div
        className={
          user.role === "admin"
            ? "mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]"
            : "mt-6 grid gap-6"
        }
      >
        {user.role === "admin" && (
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
            {occupation.scenarios.length === 0 ? (
              <EmptyState
                title="No hay escenarios registrados"
                description="Crea los escenarios institucionales para poder programar ACUDES."
                action={
                  <Link href="/manager/scenarios" className={buttonClass}>
                    Gestionar escenarios
                  </Link>
                }
              />
            ) : (
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
            )}
          </section>
        )}

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
          [
            user.role === "admin" ? "Gestionar ACUDES" : "Mi ACUDE",
            user.role === "admin"
              ? "Crea grupos, horarios y cupos."
              : "Consulta el ACUDE que tienes asignado.",
            "/manager/acudes",
          ],
          ["Ocupación", "Consulta los grupos por escenario.", "/manager/occupation"],
          ["Asistencia", "Registra la asistencia de cada subgrupo.", "/manager/attendance"],
          ["Reportes", "Consulta eventos y asistencia.", "/manager/reports"],
        ]
          .filter(([, , href]) => user.role === "admin" || href !== "/manager/occupation")
          .map(([title, text, href]) => (
          <Link
            key={href}
            href={href}
            className={`${cardClass} group p-4 transition hover:border-teal-300`}
          >
            <p className="text-sm font-bold text-slate-800 group-hover:text-teal-800">{title}</p>
            <p className="mt-1 text-xs text-slate-500">{text}</p>
          </Link>
        ))}
      </section>
    </>
  );
}

async function DashboardContent() {
  const user = await requirePageUser();
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
