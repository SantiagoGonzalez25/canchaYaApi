"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cancelFormAction, type EnrollState } from "@/app/actions";
import { Alert, dangerButtonClass } from "./ui";

const initial: EnrollState = {};

export function CancelEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(cancelFormAction, initial);

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm("¿Cancelar esta inscripción? El cupo se liberará de inmediato.")) {
          event.preventDefault();
        }
      }}
      className="flex flex-col items-start gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className={dangerButtonClass}>
        {pending ? "Cancelando..." : "Cancelar inscripción"}
      </button>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
    </form>
  );
}
