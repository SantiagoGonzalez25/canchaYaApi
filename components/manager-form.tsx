"use client";

import { useActionState, useEffect, useRef } from "react";
import { createManagerAction, type FormState } from "@/app/actions";
import { SEX_LABELS } from "@/lib/labels";
import { Alert, buttonClass, Field, inputClass, selectClass } from "./ui";

const initial: FormState = {};

export function ManagerForm() {
  const [state, action, pending] = useActionState(createManagerAction, initial);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3">
      <Field label="Nombre completo">
        <input name="displayName" required minLength={2} maxLength={80} className={inputClass} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Correo institucional">
          <input name="email" type="email" required className={inputClass} />
        </Field>
        <Field label="Contraseña temporal" hint="Mínimo 6 caracteres.">
          <input
            name="password"
            type="password"
            required
            minLength={6}
            maxLength={72}
            autoComplete="new-password"
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Sexo">
          <select name="sex" required defaultValue="" className={selectClass}>
            <option value="" disabled>
              Selecciona...
            </option>
            {Object.entries(SEX_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Teléfono (opcional)">
          <input name="phone" type="tel" maxLength={30} className={inputClass} />
        </Field>
      </div>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.ok && <Alert kind="ok">{state.ok}</Alert>}
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Creando..." : "Crear perfil de profesor"}
      </button>
    </form>
  );
}
