# CanchaYa API · ACUDES e Inscripciones

API REST y panel web administrativo para la gestión de **ACUDES** (actividades culturales, deportivas, formativas y recreativas) del Tecnológico de Antioquia (TdeA).

> **Regla de cero reservas:** este proyecto **no permite reservar escenarios**. La ocupación se deriva de las inscripciones a los subgrupos de cada ACUDE. No existe ninguna entidad ni endpoint de "reserva".

## Stack

- Next.js 16 (App Router, Route Handlers, Server Components y Server Actions)
- TypeScript estricto
- Firebase Admin SDK (Auth + Firestore)
- Zod 4 para validación
- Tailwind CSS 4
- Highcharts 12 para reportes
- Vitest para pruebas
- `server-only` en toda la capa de datos

## Puesta en marcha

```bash
pnpm install
cp .env.example .env        # completa las credenciales de Firebase
pnpm seed                   # escenarios + ACUDES
pnpm seed:demo              # + cuentas, inscripciones y asistencia de demostración
pnpm dev
```

Abre `http://localhost:3000`. La documentación interactiva está en `/api/docs`.

### Variables de entorno

| Variable | Uso |
| --- | --- |
| `FIREBASE_PROJECT_ID` | Proyecto de Firebase |
| `FIREBASE_CLIENT_EMAIL` | Cuenta de servicio |
| `FIREBASE_PRIVATE_KEY` | Llave privada (con `\n` escapados) |
| `FIREBASE_WEB_API_KEY` | Login con la API REST de Firebase Auth |

Nunca subas `.env` ni el JSON de la cuenta de servicio. Firestore debe tener reglas que nieguen todo acceso directo de clientes (`firestore.rules`).

### Cuentas demo

Solo si ejecutaste `pnpm seed:demo`:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Estudiante | `estudiante1@canchaya.demo` | `Demo1234!` |
| Estudiante | `estudiante2@canchaya.demo` … `estudiante5@canchaya.demo` | `Demo1234!` |
| Gestor | `gestor@canchaya.demo` | `Gestor1234!` |
| Admin | `admin@canchaya.demo` | `Admin1234!` |

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm dev:lan` | Servidor accesible desde la red local (app móvil) |
| `pnpm typecheck` | Genera tipos de rutas y valida TypeScript |
| `pnpm test` | Pruebas unitarias y de contrato OpenAPI |
| `pnpm lint` | ESLint |
| `pnpm build` | Build de producción |
| `pnpm seed` | Escenarios y ACUDES de ejemplo |
| `pnpm seed:demo` | Seed + cuentas/inscripciones/asistencia demo |
| `pnpm create-user -- correo "Clave1234" "Nombre" student` | Crea un usuario con rol |
| `pnpm set-role -- correo manager` | Cambia el rol (custom claim) |

## Roles

- **student**: cartelera, calendario, inscripción, ajustes, cancelación y “Mis ACUDES”.
- **manager**: CRUD de ACUDES/escenarios, panel de ocupación, asistencia, reportes y perfil institucional.
- **admin**: todo lo del gestor + creación de gestores.

El registro público **siempre** crea estudiantes. Los roles viajan como *custom claims* dentro del `idToken`.

## Endpoints

| Método | Ruta | Rol | Descripción |
| --- | --- | --- | --- |
| GET | `/api/health` | público | Estado del servicio |
| POST | `/api/auth/register` | público | Registro de estudiante (incluye sexo) |
| POST | `/api/auth/login` | público | Login; devuelve `idToken` y `refreshToken` |
| POST | `/api/auth/refresh` | público | Renueva el `idToken` |
| GET | `/api/auth/me` | autenticado | Usuario y rol |
| POST | `/api/auth/manager-register` | admin | Crea un gestor |
| GET | `/api/acudes/live?q=&category=&day=&updatedSince=` | autenticado | Cartelera en tiempo real |
| GET | `/api/acudes?status=&category=&q=&updatedSince=` | gestor/admin | Listado de gestión |
| POST | `/api/acudes` | gestor/admin | Crear ACUDE (bloquea cruces) |
| GET/PUT/DELETE | `/api/acudes/:id` | autenticado / gestor | Detalle, edición y archivado |
| GET | `/api/scenarios` | autenticado | Escenarios |
| POST/PUT/DELETE | `/api/scenarios...` | gestor/admin | CRUD de escenarios |
| GET | `/api/scenarios/occupation?date=&day=` | gestor/admin | Ocupación por escenario |
| POST | `/api/enrollments` | estudiante | Inscripción idempotente |
| GET | `/api/enrollments/me?status=&updatedSince=` | autenticado | Mis inscripciones |
| PATCH | `/api/enrollments/:id/cancel` | dueño/gestor | Cancela y libera cupo |
| GET | `/api/enrollments?...` | gestor/admin | Todas las inscripciones |
| GET/POST | `/api/attendance` | gestor/admin | Consulta y registro masivo de asistencia |
| GET | `/api/reports/enrollments` | gestor/admin | Reporte de eventos por todos los campos + fechas |
| GET | `/api/reports/attendance` | gestor/admin | Reporte de asistencia por ACUDE |
| GET | `/api/openapi.json` | público | Especificación OpenAPI 3.1 |
| GET | `/api/docs` | público | Swagger UI |

Todos los errores tienen la forma:

```json
{ "error": { "code": "NO_CAPACITY", "message": "El subgrupo ya está lleno" } }
```

## Sincronización e idempotencia

- Los listados aceptan `updatedSince` (ISO 8601) y devuelven `serverTime` capturado **antes** de consultar.
- `POST /api/enrollments` exige `clientRequestId`. El documento se identifica con `{uid}_{clientRequestId}`: reintentar devuelve la misma inscripción con estado 200.
- Cancelar es idempotente: repetir la operación no rompe nada.
- La asistencia se identifica con `{enrollmentId}_{fecha}`: guardar dos veces el mismo día actualiza.

## Reglas de negocio transaccionales

- **Cupo por subgrupo**: cada franja tiene cupo propio; se valida dentro de una transacción de Firestore.
- **Cero cruces**: un escenario y un docente no pueden tener dos ACUDES en la misma franja. Se comparan todas las franjas antes de escribir y se responde `409 SCHEDULE_CONFLICT`.
- **Sin cruces del estudiante**: no se puede inscribir dos veces al mismo ACUDE ni en franjas que se solapen.
- **Cupos**: una cancelación libera el cupo de inmediato y actualiza `currentEnrolled`.
- **Integridad del histórico**: archivar un ACUDE es borrado lógico; no se elimina la trazabilidad.

## Panel web

- **Calendario semanal** con navegación por semanas, salto a fecha, filtros por categoría/disponibilidad/mis ACUDES, vista agenda, detalle en modal, inscripción y línea de ocupación. En móvil el grid se desplaza horizontalmente.
- **Cartelera digital** con búsqueda, filtros y detalle por subgrupo.
- **Mis ACUDES** con cancelación inmediata.
- **Panel de ocupación** con estado en vivo por escenario (en curso, próxima, finalizada) y barra de ocupación.
- **Gestión de ACUDES** con editor dinámico de franjas y validación de cruces en el servidor.
- **Asistencia** con lista de inscritos, estados (asistió, tarde, ausente, excusa), notas y guardado masivo.
- **Reportes Highcharts** de eventos de inscripción y asistencia, filtrables por todos los campos del formulario y por fechas, con agrupación configurable y exportación CSV.

## Estructura

```
app/
  api/                 Route Handlers
  (auth)/              login y registro
  (app)/               dashboard, calendario, cartelera, mis ACUDES, gestión
  actions.ts           Server Actions del panel
components/            UI, calendario, formularios, gráficas
lib/
  data/                Única capa que conoce Firestore (server-only)
  domain/              Reglas puras: horarios, agenda, reportes
  services/auth.ts     Firebase Auth + sesión
  schemas.ts           Validación Zod
  types.ts             Contrato de dominio
  openapi.ts           Especificación generada desde Zod
scripts/               Seed y administración de roles
tests/                 Vitest
```

## Pruebas

```bash
pnpm test
```

Incluye esquemas Zod, manejo uniforme de errores, guard de roles, reglas de cruces, agenda, reportes y un test que compara las rutas documentadas en OpenAPI con los `route.ts` reales.

## Informe del proyecto

El detalle de lo construido, decisiones de arquitectura, verificación y limitaciones está en [`INFORME.md`](./INFORME.md).
