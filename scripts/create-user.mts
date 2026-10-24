/**
 * Crea o actualiza un usuario con un rol concreto.
 *   pnpm create-user -- correo@dominio.com "Clave1234" "Nombre Apellido" student
 *   pnpm create-user -- correo@dominio.com "Clave1234" "Nombre Apellido" manager female
 *
 * La contraseña queda en el historial de la terminal; cámbiala después si es sensible.
 */
import type { Role, Sex } from "../lib/types";
import { initAdmin } from "./firebase.mts";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const [email, password, displayName, roleArg, sexArg] = args;
const roles: Role[] = ["student", "manager", "admin"];
const sexes: Sex[] = ["female", "male", "non_binary", "prefer_not_to_say"];

if (!email || !password || !displayName || !roles.includes(roleArg as Role)) {
  console.error(
    'Uso: pnpm create-user -- <correo> <contraseña> "<nombre>" <student|manager|admin> [female|male|non_binary|prefer_not_to_say]',
  );
  process.exit(1);
}
if (password.length < 6) {
  console.error("Firebase exige contraseñas de al menos 6 caracteres.");
  process.exit(1);
}
const role = roleArg as Role;
const sex = (sexes.includes(sexArg as Sex) ? sexArg : "prefer_not_to_say") as Sex;

const { auth, db } = initAdmin();
let uid: string;
try {
  const existing = await auth.getUserByEmail(email);
  uid = existing.uid;
  await auth.updateUser(uid, { password, displayName });
  console.log(`= usuario existente actualizado: ${email}`);
} catch (err) {
  if ((err as { code?: string }).code !== "auth/user-not-found") throw err;
  const created = await auth.createUser({ email, password, displayName });
  uid = created.uid;
  console.log(`+ usuario creado: ${email}`);
}

await auth.setCustomUserClaims(uid, { role, sex });
await auth.revokeRefreshTokens(uid);
const now = new Date().toISOString();
await db
  .collection("users")
  .doc(uid)
  .set(
    {
      uid,
      email,
      name: displayName,
      displayName,
      role,
      sex,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true },
  );

console.log(`✓ ${email} tiene el rol ${role}. Debe volver a iniciar sesión para refrescar el token.`);
