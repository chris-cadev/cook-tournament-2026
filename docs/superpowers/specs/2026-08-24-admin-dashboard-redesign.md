# Admin Dashboard Redesign

## Overview

Rediseño del panel de administración del Cook Tournament 2026. Cambios en 6 áreas: creación manual de equipos, simplificación de configuración, gestión de jueces como usuarios, categorías de puntuación semilla, tareas CRUD persistidas, y email con tracking + scheduling.

## 1. Teams — Creación manual por admin

### Behavior

- Botón "Crear equipo" en `Teams.tsx` abre un modal con formulario completo: nombre del equipo, nombre del sándwich, email del capitán, miembros (array), equipo necesario, y contraseña.
- El admin crea el equipo directamente con status `confirmed` y se genera un `access_code` automáticamente.
- Se reutiliza `TeamEditModal.tsx` extendiéndolo para soportar modo "crear" (actualmente solo edita status/station).

### API

- `POST /api/admin/teams` — crea equipo como admin (requiere role admin). Reusa la lógica de `POST /api/teams/register` pero sin requerir password del capitán (el admin asigna una).

### Files

- `frontend/src/pages/admin/Teams.tsx` — agregar botón + modal
- `frontend/src/components/admin/TeamEditModal.tsx` — extender con modo crear
- `backend/src/routes/teams.ts` — nuevo endpoint `POST /admin/teams`

---

## 2. Settings — Simplificar

### Behavior

- Eliminar del UI: `event_title`, `event_description`, `rules`, `landing_page_content`.
- Hardcodear `event_title` como "The Crust Competition 2026" en el frontend donde se necesite.
- Mantener `event_date` con persistencia en DB y seed: `2026-10-10T14:00` (Oct 10, 2026 2pm).
- El endpoint GET `/api/config` sigue devolviendo `event_date` pero los campos eliminados se ignoran en el UI.

### Seed

- `event_date` se inserta como `2026-10-10T14:00:00` en el seed si no existe.
- Las categorías de puntuación se insertan en una tabla normalizada (ver sección 4).

### Files

- `frontend/src/pages/admin/EventSettings.tsx` — simplificar
- `backend/src/routes/config.ts` — quitar campos obsoletos del PUT
- `backend/src/seed.ts` — agregar seed de fecha + categorías

---

## 3. Jueces — Como usuarios

### Behavior

- Los jueces se crean como usuarios con `role: 'judge'` en la tabla `users`.
- Cada juez tiene `name`, `email`, `password_hash`.
- El admin los crea desde el dashboard, se genera la contraseña automáticamente, se muestra una vez al admin.
- Se agrega campo `anonymous_id` a `users` para compatibilidad con el sistema de scores actual.

### Audit trail

- La tabla `scores` ya tiene `judge_anonymous_id` y `submitted_at`.
- Se agrega vista admin que muestra: juez → equipo → categoría → valor → timestamp.

### Schema

```sql
-- Migración: agregar anonymous_id a users
ALTER TABLE users ADD COLUMN anonymous_id TEXT;
```

### API

- `GET /api/admin/judges` — listar jueces
- `POST /api/admin/judges` — crear juez (genera password, retorna plaintext una vez)
- `PUT /api/admin/judges/:id` — actualizar juez
- `DELETE /api/admin/judges/:id` — eliminar juez

### Password handling

- El admin crea un juez con `POST /api/admin/judges` enviando `name` y `email`.
- El backend genera una contraseña aleatoria (12 chars, alfanumérica), la hashea con bcrypt, y la guarda en `password_hash`.
- El backend retorna la contraseña en texto plano **una sola vez** en la respuesta del POST. El admin debe copiarla y compartirla con el juez.
- No hay forma de recuperar la contraseña después — solo regenerarla con `PUT /api/admin/judges/:id/regenerate-password`.

### Files

- Nuevo componente `frontend/src/pages/admin/Judges.tsx`
- `backend/src/routes/judges.ts` — CRUD de jueces admin

---

## 4. Scores — Categorías semilla
### Seed data (desde organizacion.md)

| Categoría    | Ponderación | Pts. Máximos | Descripción                                           |
| ------------ | ----------- | ------------ | ----------------------------------------------------- |
| Sabor        | x2          | 20           | Balance de sabores, sazón, nivel de delicia general   |
| Textura      | x1          | 10           | Frescura del pan, crujiente, consistencia del relleno |
| Creatividad  | x1          | 10           | Combinaciones originales, técnicas ingeniosas         |
| Presentación | x1          | 10           | Emplatado, color, limpieza, atractivo visual          |
| Bonificación | opcional    | +2           | Pan casero, pepinillos caseros, ingrediente "salvaje" |

### Schema

```sql
CREATE TABLE scoring_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  weight REAL NOT NULL DEFAULT 1.0,
  max_points INTEGER NOT NULL DEFAULT 10,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### Behavior

- Las categorías se insertan en el seed.
- El tab de ScoreReveal lee de `scoring_categories` en lugar del JSON de `event_config`.
- El sistema de ponderación se aplica al calcular el leaderboard: `weighted_score = avg_score * weight`. Sabor tiene weight=2, los demás weight=1. Bonificación tiene weight=1 pero max_points=2 (solo se asigna si el juez la puntúa).
- El endpoint `GET /api/scores/leaderboard` se modifica para hacer JOIN con `scoring_categories` y aplicar weights.

### Files

- `backend/src/seed.ts` — insertar categorías
- `backend/src/routes/scores.ts` — usar tabla normalizada + weights
- `backend/src/routes/judges.ts` — rubrica lee de tabla normalizada
- `frontend/src/pages/admin/ScoreReveal.tsx` — sin cambios significativos

---

## 5. Tasks — CRUD persistido

### Schema

```sql
CREATE TABLE admin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',  -- pending | in_progress | completed
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

### Behavior

- Tabla CRUD: título, descripción, estado (pending/in_progress/completed), timestamps.
- Historial de tareas completadas visible.
- El admin puede crear, editar, cambiar estado, y eliminar tareas.

### API

- `GET /api/admin/tasks` — listar tareas
- `POST /api/admin/tasks` — crear tarea
- `PUT /api/admin/tasks/:id` — actualizar tarea
- `DELETE /api/admin/tasks/:id` — eliminar tarea

### Files

- Nuevo componente `frontend/src/pages/admin/AdminTasks.tsx`
- Nuevo archivo `backend/src/routes/admin-tasks.ts`

---

## 6. Email — Tracking + Scheduling

### Schema

```sql
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  opened_at TEXT,
  open_count INTEGER DEFAULT 0
);

CREATE TABLE email_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_filter TEXT NOT NULL,  -- 'all_teams' | 'all_judges' | JSON array of IDs
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending | sent | failed
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Pixel tracking

- Endpoint `GET /api/email/pixel/:logId` devuelve un GIF 1x1 transparente (35 bytes).
- Al recibir request, actualiza `opened_at` (si es primera vez) e incrementa `open_count`.
- Envía evento a Umami vía HTTP POST (fire-and-forget): `{ name: "email_opened", data: { template_id, recipient } }`.

### Email scheduling

- UI: selector de template, destinatarios (all_teams / all_judges / específicos), fecha/hora de envío.
- Backend: `setInterval` cada 60s revisa `email_schedules` donde `status = 'pending'` y `scheduled_at <= now()`.
- Al enviar: crea registro en `email_logs`, incluye pixel tracking URL en el HTML del email.

### Templates

- Mantener sistema actual de templates con más tipos:
  - `team-reminder` — recordatorio de preparación
  - `general-announcement` — anuncio general
  - `judge-reminder` — recordatorio para jueces
  - `custom` — template personalizado

### Files

- `frontend/src/pages/admin/EmailReminders.tsx` — extender con scheduling + logs
- `backend/src/routes/email.ts` — agregar endpoints de scheduling + pixel
- `backend/src/email.ts` — inyectar pixel en HTML

---

## Migration summary

Una sola migración `014_admin_dashboard_redesign.sql` con:

```sql
-- Judges as users
ALTER TABLE users ADD COLUMN anonymous_id TEXT;

-- Scoring categories
CREATE TABLE scoring_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  weight REAL NOT NULL DEFAULT 1.0,
  max_points INTEGER NOT NULL DEFAULT 10,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Admin tasks
CREATE TABLE admin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Email tracking
CREATE TABLE email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  opened_at TEXT,
  open_count INTEGER DEFAULT 0
);

CREATE TABLE email_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_filter TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
```

La tabla existente `todo_items` se depreca — el componente ToDo.tsx se reemplaza por AdminTasks.tsx que usa `admin_tasks`. La tabla `todo_items` se puede eliminar en una migración futura si no hay datos importantes.

## Seed summary

`backend/src/seed.ts` se extiende con:

1. Fecha del evento: `2026-10-10T14:00:00` (hora local, sin timezone suffix — es presencial)
2. Categorías de puntuación (5 registros en tabla `scoring_categories`)
3. Categorías de puntuación también en `event_config.scoring_categories` como JSON (compatibilidad con endpoints existentes直到 que todos los clientes lean de la tabla normalizada)

## Testing

- Verificar que el seed se ejecuta correctamente al iniciar la DB.
- Verificar CRUD de equipos por admin.
- Verificar que las categorías aparecen en ScoreReveal.
- Verificar que los jueces se crean como usuarios y pueden autenticarse.
- Verificar que las tareas CRUD funcionan.
- Verificar que el pixel tracking registra aperturas.
- Verificar que el scheduler ejecuta emails programados.
