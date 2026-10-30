"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/actions";
import { SEX_LABELS } from "@/lib/labels";
import { Alert, buttonClass, Field, inputClass, selectClass } from "./ui";

const initial: FormState = {};

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState(
    mode === "login" ? loginAction : registerAction,
    initial,
  );
  const isLogin = mode === "login";

  return (
    <form action={action} className="flex flex-col gap-4">
      {!isLogin && (
        <>
          <Field label="Nombre completo">
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className={inputClass}
              placeholder="Ana María Restrepo"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sexo" hint="Se guarda en tu perfil y en cada inscripción.">
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
              <input
                name="phone"
                type="tel"
                maxLength={30}
                autoComplete="tel"
                className={inputClass}
                placeholder="300 000 0000"
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Correo institucional">
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
          placeholder="nombre@correo.edu.co"
        />
      </Field>
      <Field
        label="Contraseña"
        hint={isLogin ? undefined : "Mínimo 6 caracteres (requisito de Firebase)."}
      >
        <input
          name="password"
          type="password"
          required
          minLength={isLogin ? 1 : 6}
          maxLength={72}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className={inputClass}
          placeholder="••••••••"
        />
      </Field>

      {state.error && <Alert kind="error">{state.error}</Alert>}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Procesando..." : isLogin ? "Iniciar sesión" : "Crear cuenta de estudiante"}
      </button>

      <p className="text-center text-sm text-slate-600">
        {isLogin ? (
          <>
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-semibold text-teal-700 underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-teal-700 underline">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
