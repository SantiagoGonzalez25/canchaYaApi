import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Calendar } from "@/components/calendar";
import { buttonClass, PageHeader, secondaryButtonClass } from "@/components/ui";
import { listLiveAcudes } from "@/lib/data/acudes";
import { listMyEnrollments } from "@/lib/data/enrollments";
import { todayKey } from "@/lib/labels";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Calendario semanal" };

async function CalendarContent() {
  const user = await requireWebUser();
  const [acudes, myEnrollments] = await Promise.all([
    listLiveAcudes(),
    user.role === "student"
      ? listMyEnrollments(user, { status: "active" })
      : Promise.resolve([]),
  ]);

  return (
    <Calendar
      acudes={acudes}
      today={todayKey()}
      userSex={user.sex}
      myEnrollments={myEnrollments}
      isStudent={user.role === "student"}
    />
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy>
      <div className="h-36 animate-pulse rounded-2xl bg-slate-200/60" />
      <div className="h-[520px] animate-pulse rounded-2xl bg-slate-200/60" />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <>
      <PageHeader
        eyebrow="Calendario"
        title="Tu semana ACUDE, de un vistazo"
        description="Navega entre semanas, filtra por categoría y abre cada franja para inscribirte o revisar la ocupación del escenario."
        actions={
          <>
            <Link href="/acudes" className={secondaryButtonClass}>
              Cartelera
            </Link>
            <Link href="/my-enrollments" className={buttonClass}>
              Mis ACUDES
            </Link>
          </>
        }
      />
      <Suspense fallback={<Skeleton />}>
        <CalendarContent />
      </Suspense>
    </>
  );
}
