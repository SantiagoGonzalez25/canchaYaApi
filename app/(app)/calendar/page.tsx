import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Calendar } from "@/components/calendar";
import { PageHeader, secondaryButtonClass } from "@/components/ui";
import { listLiveAcudes } from "@/lib/data/acudes";
import { listMyEnrollments } from "@/lib/data/enrollments";
import { SEMESTER_LABEL, todayKey } from "@/lib/labels";
import { requirePageUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Calendario semanal" };

async function CalendarContent() {
  const user = await requirePageUser();
  const [acudes, myEnrollments] = await Promise.all([
    listLiveAcudes(user.role === "manager" ? { teacherId: user.uid } : {}),
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
      canManage={user.role === "admin"}
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
        title="Calendario semanal de ACUDES"
        description={`${SEMESTER_LABEL}. Consulta las franjas, filtra por categoría y abre cada sesión para inscribirte o revisar su ocupación.`}
        actions={
          <Link href="/acudes" className={secondaryButtonClass}>
            Cartelera
          </Link>
        }
      />
      <Suspense fallback={<Skeleton />}>
        <CalendarContent />
      </Suspense>
    </>
  );
}
