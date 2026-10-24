/**
 * Siembra los escenarios y ACUDES institucionales del TdeA.
 *
 *   pnpm seed               → crea lo que falte sin pisar contadores existentes
 *   pnpm seed -- --reset    → reescribe escenarios/ACUDES y recalcula contadores
 *   pnpm seed -- --demo     → crea cuentas demo, inscripciones y asistencia
 *
 * Las cuentas demo son SOLO para la sustentación del proyecto. Cámbialas o
 * bórralas antes de publicar en producción.
 */
import type {
  Acude,
  AcudeCategory,
  AttendanceRecord,
  AttendanceStatus,
  Enrollment,
  Scenario,
  ScheduleSlot,
  Sex,
  Weekday,
} from "../lib/types";
import { initAdmin, dateKey, isoDaysAgo, todayKey } from "./firebase.mts";

const { auth, db } = initAdmin();
const reset = process.argv.includes("--reset");
const demo = process.argv.includes("--demo");
const NOW = new Date().toISOString();
const SEMESTER = "2026-2";

const scenarios: Scenario[] = [
  {
    id: "coliseo",
    name: "Coliseo institucional",
    type: "gym",
    status: "available",
    location: "Campus Robledo · Bloque 10",
    capacity: 500,
    description: "Coliseo cubierto con maderamen para fútbol sala, baloncesto y voleibol.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cancha-multiple",
    name: "Cancha múltiple",
    type: "court",
    status: "available",
    location: "Campus Robledo · Zona deportiva",
    capacity: 80,
    description: "Cancha descubierta para baloncesto, voleibol y microfútbol.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "cancha-futbol",
    name: "Campo de fútbol",
    type: "field",
    status: "available",
    location: "Campus Robledo · Zona verde",
    capacity: 120,
    description: "Campo de grama para fútbol y actividades de bienestar al aire libre.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "salon-danza",
    name: "Salón de danza y movimiento",
    type: "room",
    status: "available",
    location: "Campus Robledo · Bloque 10",
    capacity: 40,
    description: "Salón con espejos, barra y sonido para danza, yoga y expresión corporal.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "salon-cultural",
    name: "Salón de expresión cultural",
    type: "room",
    status: "available",
    location: "Campus Robledo · Bloque 10",
    capacity: 50,
    description: "Salón versátil para danza folclórica, ajedrez y talleres formativos.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "piscina",
    name: "Piscina institucional",
    type: "pool",
    status: "available",
    location: "Campus Robledo · Bloque 11",
    capacity: 30,
    description: "Piscina semiolímpica con carriles para natación formativa.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "auditorio",
    name: "Auditorio principal",
    type: "auditorium",
    status: "available",
    location: "Campus Robledo · Bloque 1",
    capacity: 250,
    description: "Auditorio con tarima, sonido y proyección para teatro y música.",
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "gimnasio",
    name: "Gimnasio de acondicionamiento",
    type: "gym",
    status: "maintenance",
    location: "Campus Robledo · Bloque 10",
    capacity: 60,
    description: "Zona de fuerza y acondicionamiento. En mantenimiento programado.",
    createdAt: NOW,
    updatedAt: NOW,
  },
];

function slot(
  id: string,
  day: Weekday,
  startTime: string,
  endTime: string,
  scenarioId: string,
): ScheduleSlot {
  return { id, day, startTime, endTime, scenarioId };
}

interface AcudeSeed {
  id: string;
  name: string;
  description: string;
  category: AcudeCategory;
  discipline: string;
  teacherId: string;
  teacherName: string;
  scenarioId: string;
  schedule: ScheduleSlot[];
  maxCapacity: number;
  status: "published" | "draft";
  imageUrl: string | null;
  requirements: string;
}

const acudesSeed: AcudeSeed[] = [
  {
    id: "futsal-formativo",
    name: "Fútbol sala formativo y representativo",
    description:
      "Taller de técnica individual, táctica colectiva y acondicionamiento aeróbico orientado a la integración estudiantil y la preselección institucional.",
    category: "sports",
    discipline: "Fútbol sala",
    teacherId: "teacher-carlos-restrepo",
    teacherName: "Lic. Carlos Mario Restrepo",
    scenarioId: "coliseo",
    schedule: [
      slot("futsal-tue", "tuesday", "14:00", "16:00", "coliseo"),
      slot("futsal-thu", "thursday", "14:00", "16:00", "coliseo"),
    ],
    maxCapacity: 25,
    status: "published",
    imageUrl: null,
    requirements: "Carné TdeA, calzado de suela lisa e hidratación personal.",
  },
  {
    id: "danza-contemporanea",
    name: "Danza contemporánea y expresión corporal",
    description:
      "Laboratorio de movimiento consciente, improvisación y exploración coreográfica para el equilibrio, la flexibilidad y la presencia escénica.",
    category: "cultural",
    discipline: "Danza contemporánea",
    teacherId: "teacher-mateo-saldarriaga",
    teacherName: "Prof. Mateo Saldarriaga",
    scenarioId: "salon-danza",
    schedule: [
      slot("danza-cont-tue", "tuesday", "16:00", "18:00", "salon-danza"),
      slot("danza-cont-thu", "thursday", "16:00", "18:00", "salon-danza"),
    ],
    maxCapacity: 20,
    status: "published",
    imageUrl: null,
    requirements: "Ropa elástica, medias de danza o pies descalzos.",
  },
  {
    id: "danza-folclorica",
    name: "Danza folclórica y expresión tradicional",
    description:
      "Rescate de las danzas típicas colombianas (cumbia, currulao, bambuco) para fortalecer la memoria cultural, el ritmo y la expresión corporal.",
    category: "cultural",
    discipline: "Danza folclórica",
    teacherId: "teacher-maria-morales",
    teacherName: "Prof. María Elena Morales",
    scenarioId: "salon-cultural",
    schedule: [
      slot("folclor-mon", "monday", "14:00", "16:00", "salon-cultural"),
      slot("folclor-wed", "wednesday", "14:00", "16:00", "salon-cultural"),
    ],
    maxCapacity: 22,
    status: "published",
    imageUrl: null,
    requirements: "Ropa cómoda y pañuelo tradicional para las prácticas.",
  },
  {
    id: "teatro-institucional",
    name: "Teatro y montaje escénico",
    description:
      "Entrenamiento de voz, cuerpo e improvisación orientado al montaje de una obra de fin de semestre.",
    category: "cultural",
    discipline: "Teatro",
    teacherId: "teacher-laura-gomez",
    teacherName: "Prof. Laura Gómez",
    scenarioId: "auditorio",
    schedule: [
      slot("teatro-wed", "wednesday", "16:00", "18:00", "auditorio"),
      slot("teatro-fri", "friday", "16:00", "18:00", "auditorio"),
    ],
    maxCapacity: 30,
    status: "published",
    imageUrl: null,
    requirements: "Ropa cómoda y disponibilidad para el montaje final.",
  },
  {
    id: "natacion-formativa",
    name: "Natación formativa",
    description:
      "Aprendizaje y perfeccionamiento de estilos, respiración y seguridad acuática con acompañamiento docente.",
    category: "sports",
    discipline: "Natación",
    teacherId: "teacher-andres-velez",
    teacherName: "Lic. Andrés Vélez",
    scenarioId: "piscina",
    schedule: [
      slot("natacion-mon", "monday", "07:00", "09:00", "piscina"),
      slot("natacion-wed", "wednesday", "07:00", "09:00", "piscina"),
    ],
    maxCapacity: 18,
    status: "published",
    imageUrl: null,
    requirements: "Vestido de baño, gorro, gafas y certificado de aptitud física.",
  },
  {
    id: "baloncesto-formativo",
    name: "Baloncesto formativo",
    description:
      "Fundamentos técnicos, lectura de juego y preparación física para la selección institucional.",
    category: "sports",
    discipline: "Baloncesto",
    teacherId: "teacher-julian-ospina",
    teacherName: "Lic. Julián Ospina",
    scenarioId: "cancha-multiple",
    schedule: [
      slot("baloncesto-tue", "tuesday", "10:00", "12:00", "cancha-multiple"),
      slot("baloncesto-thu", "thursday", "10:00", "12:00", "cancha-multiple"),
    ],
    maxCapacity: 24,
    status: "published",
    imageUrl: null,
    requirements: "Calzado deportivo y balón propio opcional.",
  },
  {
    id: "ajedrez-estrategia",
    name: "Ajedrez y pensamiento estratégico",
    description:
      "Taller de táctica, aperturas y análisis de partidas para fortalecer la concentración y la toma de decisiones.",
    category: "training",
    discipline: "Ajedrez",
    teacherId: "teacher-ricardo-pena",
    teacherName: "Prof. Ricardo Peña",
    scenarioId: "salon-cultural",
    schedule: [slot("ajedrez-fri", "friday", "10:00", "12:00", "salon-cultural")],
    maxCapacity: 20,
    status: "published",
    imageUrl: null,
    requirements: "Tablero propio opcional. Se prestan tableros institucionales.",
  },
  {
    id: "yoga-bienestar",
    name: "Yoga y bienestar integral",
    description:
      "Práctica de posturas, respiración y relajación para manejar el estrés académico y mejorar la energía diaria.",
    category: "recreational",
    discipline: "Yoga",
    teacherId: "teacher-sofia-ramirez",
    teacherName: "Prof. Sofía Ramírez",
    scenarioId: "salon-danza",
    schedule: [
      slot("yoga-mon", "monday", "06:00", "07:30", "salon-danza"),
      slot("yoga-wed", "wednesday", "06:00", "07:30", "salon-danza"),
    ],
    maxCapacity: 25,
    status: "published",
    imageUrl: null,
    requirements: "Colchoneta o toalla personal y ropa cómoda.",
  },
  {
    id: "musica-ensamble",
    name: "Ensamble musical institucional",
    description:
      "Práctica de repertorio latinoamericano y montaje de presentaciones para los eventos de Bienestar.",
    category: "cultural",
    discipline: "Música",
    teacherId: "teacher-daniel-castano",
    teacherName: "Prof. Daniel Castaño",
    scenarioId: "auditorio",
    schedule: [slot("musica-tue", "tuesday", "10:00", "12:00", "auditorio")],
    maxCapacity: 30,
    status: "published",
    imageUrl: null,
    requirements: "Instrumento propio si lo tienes; audición informal en la primera sesión.",
  },
  {
    id: "senderismo-ambiental",
    name: "Senderismo y conciencia ambiental",
    description:
      "Recorridos por los alrededores del campus para promover la actividad física, el trabajo en equipo y el cuidado del entorno.",
    category: "recreational",
    discipline: "Senderismo",
    teacherId: "teacher-camilo-arango",
    teacherName: "Prof. Camilo Arango",
    scenarioId: "cancha-futbol",
    schedule: [slot("senderismo-sat", "saturday", "08:00", "11:00", "cancha-futbol")],
    maxCapacity: 30,
    status: "published",
    imageUrl: null,
    requirements: "Calzado de caminata, hidratación y bloqueador solar.",
  },
  {
    id: "fotografia-creativa",
    name: "Fotografía creativa (borrador)",
    description:
      "Taller de composición, luz y narrativa visual. Este ACUDE queda en borrador para demostrar la gestión de estados.",
    category: "training",
    discipline: "Fotografía",
    teacherId: "teacher-natalia-cruz",
    teacherName: "Prof. Natalia Cruz",
    scenarioId: "salon-cultural",
    schedule: [slot("foto-sun", "sunday", "09:00", "11:00", "salon-cultural")],
    maxCapacity: 15,
    status: "draft",
    imageUrl: null,
    requirements: "Cámara o celular con cámara.",
  },
];

function toAcude(seed: AcudeSeed): Acude {
  return {
    ...seed,
    currentEnrolled: 0,
    slotEnrolled: {},
    semester: SEMESTER,
    attendanceMin: 80,
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function seedScenarios() {
  for (const scenario of scenarios) {
    const ref = db.collection("scenarios").doc(scenario.id);
    const exists = (await ref.get()).exists;
    if (exists && !reset) {
      console.log(`= escenario existente: ${scenario.name}`);
      continue;
    }
    await ref.set(scenario, { merge: true });
    console.log(`${exists ? "~" : "+"} escenario: ${scenario.name}`);
  }
}

async function seedAcudes() {
  for (const seed of acudesSeed) {
    const ref = db.collection("acudes").doc(seed.id);
    const exists = (await ref.get()).exists;
    if (exists && !reset) {
      console.log(`= ACUDE existente: ${seed.name}`);
      continue;
    }
    await ref.set(toAcude(seed), { merge: true });
    console.log(`${exists ? "~" : "+"} ACUDE: ${seed.name}`);
  }
}

async function recomputeCounts() {
  const snap = await db.collection("enrollments").where("status", "==", "active").get();
  const counts = new Map<string, number>();
  const slotCounts = new Map<string, Record<string, number>>();
  for (const doc of snap.docs) {
    const data = doc.data() as Enrollment;
    counts.set(data.acudeId, (counts.get(data.acudeId) ?? 0) + 1);
    const current = slotCounts.get(data.acudeId) ?? {};
    current[data.slotId] = (current[data.slotId] ?? 0) + 1;
    slotCounts.set(data.acudeId, current);
  }
  const acudes = await db.collection("acudes").get();
  for (const doc of acudes.docs) {
    await doc.ref.set(
      {
        currentEnrolled: counts.get(doc.id) ?? 0,
        slotEnrolled: slotCounts.get(doc.id) ?? {},
        updatedAt: NOW,
      },
      { merge: true },
    );
  }
}

// ───────────────────────────── Demo ─────────────────────────────

interface DemoUser {
  key: string;
  email: string;
  password: string;
  name: string;
  role: "student" | "manager" | "admin";
  sex: Sex;
}

const demoUsers: DemoUser[] = [
  {
    key: "admin",
    email: "admin@canchaya.demo",
    password: "Admin1234!",
    name: "Administrador CanchaYa",
    role: "admin",
    sex: "prefer_not_to_say",
  },
  {
    key: "manager",
    email: "gestor@canchaya.demo",
    password: "Gestor1234!",
    name: "Gestor de ACUDES",
    role: "manager",
    sex: "female",
  },
  {
    key: "s1",
    email: "estudiante1@canchaya.demo",
    password: "Demo1234!",
    name: "Valentina Ríos",
    role: "student",
    sex: "female",
  },
  {
    key: "s2",
    email: "estudiante2@canchaya.demo",
    password: "Demo1234!",
    name: "Santiago Herrera",
    role: "student",
    sex: "male",
  },
  {
    key: "s3",
    email: "estudiante3@canchaya.demo",
    password: "Demo1234!",
    name: "Mariana Cárdenas",
    role: "student",
    sex: "female",
  },
  {
    key: "s4",
    email: "estudiante4@canchaya.demo",
    password: "Demo1234!",
    name: "Alejandro Muñoz",
    role: "student",
    sex: "male",
  },
  {
    key: "s5",
    email: "estudiante5@canchaya.demo",
    password: "Demo1234!",
    name: "Camila Ospina",
    role: "student",
    sex: "non_binary",
  },
];

async function upsertDemoUsers(): Promise<Map<string, { uid: string; user: DemoUser }>> {
  const result = new Map<string, { uid: string; user: DemoUser }>();
  for (const user of demoUsers) {
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(user.email);
      uid = existing.uid;
      await auth.updateUser(uid, { password: user.password, displayName: user.name });
      console.log(`= usuario existente: ${user.email}`);
    } catch {
      const created = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
      });
      uid = created.uid;
      console.log(`+ usuario: ${user.email}`);
    }
    await auth.setCustomUserClaims(uid, { role: user.role, sex: user.sex });
    await db
      .collection("users")
      .doc(uid)
      .set(
        {
          uid,
          email: user.email,
          name: user.name,
          displayName: user.name,
          role: user.role,
          sex: user.sex,
          phone: null,
          documentId: null,
          createdAt: NOW,
          updatedAt: NOW,
        },
        { merge: true },
      );
    result.set(user.key, { uid, user });
  }
  return result;
}

interface DemoEnrollment {
  userKey: string;
  acudeId: string;
  slotId: string;
  status: "active" | "canceled";
  daysAgo: number;
}

const demoEnrollments: DemoEnrollment[] = [
  { userKey: "s1", acudeId: "futsal-formativo", slotId: "futsal-tue", status: "active", daysAgo: 24 },
  { userKey: "s1", acudeId: "danza-folclorica", slotId: "folclor-mon", status: "active", daysAgo: 21 },
  { userKey: "s2", acudeId: "danza-contemporanea", slotId: "danza-cont-tue", status: "active", daysAgo: 20 },
  { userKey: "s2", acudeId: "natacion-formativa", slotId: "natacion-mon", status: "active", daysAgo: 18 },
  { userKey: "s3", acudeId: "teatro-institucional", slotId: "teatro-wed", status: "active", daysAgo: 17 },
  { userKey: "s3", acudeId: "ajedrez-estrategia", slotId: "ajedrez-fri", status: "active", daysAgo: 15 },
  { userKey: "s4", acudeId: "baloncesto-formativo", slotId: "baloncesto-tue", status: "active", daysAgo: 14 },
  { userKey: "s4", acudeId: "yoga-bienestar", slotId: "yoga-mon", status: "active", daysAgo: 12 },
  { userKey: "s5", acudeId: "musica-ensamble", slotId: "musica-tue", status: "active", daysAgo: 10 },
  { userKey: "s5", acudeId: "senderismo-ambiental", slotId: "senderismo-sat", status: "active", daysAgo: 8 },
  { userKey: "s1", acudeId: "teatro-institucional", slotId: "teatro-fri", status: "canceled", daysAgo: 26 },
  { userKey: "s2", acudeId: "baloncesto-formativo", slotId: "baloncesto-thu", status: "canceled", daysAgo: 23 },
  { userKey: "s3", acudeId: "yoga-bienestar", slotId: "yoga-wed", status: "canceled", daysAgo: 19 },
];

async function seedDemoEnrollments(users: Map<string, { uid: string; user: DemoUser }>) {
  const acudes = new Map(acudesSeed.map((acude) => [acude.id, acude]));
  const batch = db.batch();
  const created: Enrollment[] = [];

  for (const item of demoEnrollments) {
    const account = users.get(item.userKey);
    const acude = acudes.get(item.acudeId);
    const slot = acude?.schedule.find((entry) => entry.id === item.slotId);
    if (!account || !acude || !slot) continue;
    const scenario = scenarios.find((entry) => entry.id === slot.scenarioId)!;
    const enrolledAt = isoDaysAgo(item.daysAgo);
    const id = `${account.uid}_seed-${acude.id}-${slot.id}`;
    const enrollment: Enrollment = {
      id,
      acudeId: acude.id,
      acudeName: acude.name,
      userId: account.uid,
      userEmail: account.user.email,
      userName: account.user.name,
      userSex: account.user.sex,
      slotId: slot.id,
      day: slot.day,
      startTime: slot.startTime,
      endTime: slot.endTime,
      scenarioId: slot.scenarioId,
      scenarioName: scenario.name,
      category: acude.category,
      discipline: acude.discipline,
      teacherId: acude.teacherId,
      teacherName: acude.teacherName,
      status: item.status,
      clientRequestId: `seed-${acude.id}-${slot.id}`,
      enrolledAt,
      enrolledOn: dateKey(new Date(enrolledAt)),
      canceledAt:
        item.status === "canceled" ? isoDaysAgo(Math.max(1, item.daysAgo - 2)) : null,
      updatedAt: enrolledAt,
    };
    batch.set(db.collection("enrollments").doc(id), enrollment, { merge: true });
    created.push(enrollment);
  }
  await batch.commit();
  return created.filter((item) => item.status === "active");
}

const DAY_INDEX: Record<Weekday, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function pastDatesForDay(day: Weekday, count: number): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  for (let index = 0; index < 45 && dates.length < count; index += 1) {
    if (cursor.getDay() === DAY_INDEX[day]) dates.push(todayKey(-index));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

async function seedDemoAttendance(
  enrollments: Enrollment[],
  adminUid: string,
) {
  const batch = db.batch();
  const statuses: AttendanceStatus[] = ["present", "present", "present", "late", "absent", "excused"];
  let total = 0;
  enrollments.forEach((enrollment, enrollmentIndex) => {
    const dates = pastDatesForDay(enrollment.day, 3);
    dates.forEach((date, sessionIndex) => {
      const status = statuses[(enrollmentIndex + sessionIndex) % statuses.length];
      const id = `${enrollment.id}_${date}`;
      const record: AttendanceRecord = {
        id,
        acudeId: enrollment.acudeId,
        acudeName: enrollment.acudeName,
        slotId: enrollment.slotId,
        enrollmentId: enrollment.id,
        userId: enrollment.userId,
        userName: enrollment.userName,
        userSex: enrollment.userSex,
        category: enrollment.category,
        discipline: enrollment.discipline,
        teacherId: enrollment.teacherId,
        teacherName: enrollment.teacherName,
        scenarioId: enrollment.scenarioId,
        scenarioName: enrollment.scenarioName,
        day: enrollment.day,
        startTime: enrollment.startTime,
        endTime: enrollment.endTime,
        date,
        status,
        notes: status === "excused" ? "Excusa médica presentada." : "",
        recordedBy: adminUid,
        recordedAt: `${date}T16:30:00.000Z`,
        updatedAt: `${date}T16:30:00.000Z`,
      };
      batch.set(db.collection("attendance").doc(id), record, { merge: true });
      total += 1;
    });
  });
  await batch.commit();
  console.log(`+ ${total} registros de asistencia demo`);
}

async function runDemo() {
  console.log("\nCreando cuentas y datos demo...");
  const users = await upsertDemoUsers();
  const active = await seedDemoEnrollments(users);
  console.log(`+ ${active.length} inscripciones activas demo`);
  const adminUid = users.get("admin")?.uid ?? "seed";
  await seedDemoAttendance(active, adminUid);
  await recomputeCounts();
  console.log("\nCuentas demo:");
  for (const user of demoUsers) {
    console.log(`  ${user.email} / ${user.password} (${user.role})`);
  }
}

await seedScenarios();
await seedAcudes();
await recomputeCounts();
if (demo) await runDemo();

console.log("\nListo. Para crear usuarios manualmente:");
console.log('  pnpm create-user -- correo@dominio.com "Clave1234" "Nombre" student');
console.log('  pnpm create-user -- correo@dominio.com "Clave1234" "Nombre" manager');
console.log("Para datos de demostración completos: pnpm seed -- --demo");
