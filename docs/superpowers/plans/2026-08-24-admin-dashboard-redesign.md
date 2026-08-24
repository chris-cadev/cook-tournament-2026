# Admin Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the admin dashboard with 6 areas: admin team creation, simplified settings, judges as users, scoring category seeds, persistent task CRUD, and email tracking + scheduling.

**Architecture:** SQLite with sql.js, Express backend, React frontend. Single migration adds 4 new tables + 1 column. Seed populates event date and scoring categories. Backend adds admin routes for judges/tasks/email. Frontend replaces/simplifies existing tabs.

**Tech Stack:** sql.js, Express, React, TypeScript, bcrypt, jsonwebtoken, nodemailer

**Spec:** `docs/superpowers/specs/2026-08-24-admin-dashboard-redesign.md`

## Global Constraints

- SQLite via sql.js (WASM), file-based persistence at `backend/data/tournament.db`
- JWT auth with `authMiddleware` + `requireRole('admin')` for all admin endpoints
- `saveDb()` must be called after any write operation
- Frontend uses Tailwind CSS, Material Symbols icons, existing component patterns
- All new API routes mount under `/api/admin/` prefix

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `backend/src/migrations/014_admin_dashboard_redesign.sql` | Create | DB schema changes |
| `backend/src/seed.ts` | Modify | Seed event date + scoring categories |
| `backend/src/routes/admin-judges.ts` | Create | Judge CRUD endpoints |
| `backend/src/routes/admin-tasks.ts` | Create | Task CRUD endpoints |
| `backend/src/routes/admin-teams.ts` | Create | Admin team creation endpoint |
| `backend/src/routes/email.ts` | Modify | Add scheduling + pixel endpoints |
| `backend/src/email.ts` | Modify | Inject tracking pixel in HTML |
| `backend/src/index.ts` | Modify | Mount new routes |
| `frontend/src/pages/admin/Teams.tsx` | Modify | Add "Crear equipo" button |
| `frontend/src/components/admin/TeamEditModal.tsx` | Modify | Extend with create mode |
| `frontend/src/pages/admin/EventSettings.tsx` | Modify | Simplify UI |
| `frontend/src/pages/admin/Judges.tsx` | Create | Judges management UI |
| `frontend/src/pages/admin/AdminTasks.tsx` | Create | Tasks CRUD UI |
| `frontend/src/pages/admin/EmailReminders.tsx` | Modify | Add scheduling + logs |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Modify | Add Judges tab |

---

### Task 1: Database Migration

**Files:**
- Create: `backend/src/migrations/014_admin_dashboard_redesign.sql`

- [ ] **Step 1: Create migration file**

```sql
-- Judges as users: add anonymous_id column
ALTER TABLE users ADD COLUMN anonymous_id TEXT;

-- Scoring categories (normalized)
CREATE TABLE IF NOT EXISTS scoring_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  weight REAL NOT NULL DEFAULT 1.0,
  max_points INTEGER NOT NULL DEFAULT 10,
  description TEXT DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Admin tasks
CREATE TABLE IF NOT EXISTS admin_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  opened_at TEXT,
  open_count INTEGER DEFAULT 0
);

-- Email schedules
CREATE TABLE IF NOT EXISTS email_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL,
  recipient_filter TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed')),
  created_at TEXT DEFAULT (datetime('now'))
);
```

- [ ] **Step 2: Verify migration runs**

Run: `cd backend && npx tsx src/index.ts` — check console for `Migration applied: 014_admin_dashboard_redesign.sql`

- [ ] **Step 3: Commit**

```bash
git add backend/src/migrations/014_admin_dashboard_redesign.sql
git commit -m "feat: add admin dashboard redesign migration"
```

---

### Task 2: Seed Event Date + Scoring Categories

**Files:**
- Modify: `backend/src/seed.ts`

**Interfaces:**
- Produces: `seedEventConfig()` function called after `seedAdmin()`

- [ ] **Step 1: Extend seed.ts**

Add after `seedAdmin()`:

```typescript
export function seedEventConfig() {
  const db = getDb()

  // Seed event date if empty
  const configRows = db.exec('SELECT event_date FROM event_config WHERE id = 1')
  const hasDate = configRows.length > 0 && configRows[0].values[0][0]
  if (!hasDate) {
    db.run("UPDATE event_config SET event_date = '2026-10-10T14:00:00' WHERE id = 1")
    console.log('Event date seeded: 2026-10-10T14:00:00')
  }

  // Seed scoring categories
  const catRows = db.exec('SELECT COUNT(*) as cnt FROM scoring_categories')
  const count = catRows.length > 0 ? (catRows[0].values[0][0] as number) : 0
  if (count === 0) {
    const categories = [
      { name: 'Sabor', weight: 2, max_points: 20, description: 'Balance de sabores, sazón, nivel de delicia general', sort_order: 1 },
      { name: 'Textura', weight: 1, max_points: 10, description: 'Frescura del pan, crujiente, consistencia del relleno', sort_order: 2 },
      { name: 'Creatividad', weight: 1, max_points: 10, description: 'Combinaciones originales, técnicas ingeniosas', sort_order: 3 },
      { name: 'Presentación', weight: 1, max_points: 10, description: 'Emplatado, color, limpieza, atractivo visual', sort_order: 4 },
      { name: 'Bonificación', weight: 1, max_points: 2, description: 'Pan casero, pepinillos caseros, ingrediente salvaje', sort_order: 5 },
    ]
    for (const c of categories) {
      db.run(
        'INSERT INTO scoring_categories (name, weight, max_points, description, sort_order) VALUES (?, ?, ?, ?, ?)',
        [c.name, c.weight, c.max_points, c.description, c.sort_order]
      )
    }
    console.log('Scoring categories seeded: 5 categories')
  }

  // Sync to event_config.scoring_categories for backward compat
  const syncedRows = db.exec('SELECT name FROM scoring_categories ORDER BY sort_order')
  if (syncedRows.length > 0) {
    const names = syncedRows[0].values.map(r => r[0] as string)
    db.run('UPDATE event_config SET scoring_categories = ? WHERE id = 1', [JSON.stringify(names)])
  }

  saveDb()
}
```

- [ ] **Step 2: Call seedEventConfig in index.ts**

In `backend/src/index.ts`, add `seedEventConfig` to the import from `./seed.js` and call it after `seedAdmin()`.

- [ ] **Step 3: Verify**

Run: `cd backend && npx tsx src/index.ts` — check console for seed messages.

- [ ] **Step 4: Commit**

```bash
git add backend/src/seed.ts backend/src/index.ts
git commit -m "feat: seed event date and scoring categories"
```

---

### Task 3: Backend — Admin Judges Route

**Files:**
- Create: `backend/src/routes/admin-judges.ts`
- Modify: `backend/src/index.ts` (mount route)

**Interfaces:**
- Produces: CRUD endpoints at `/api/admin/judges`

- [ ] **Step 1: Create admin-judges.ts**

```typescript
import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

// GET /api/admin/judges — list judges
router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec(
    "SELECT id, email, name, anonymous_id, created_at FROM users WHERE role = 'judge' ORDER BY name"
  )
  res.json(rowsToArray(rows))
})

// POST /api/admin/judges — create judge
router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, email } = req.body
  if (!name || !email) {
    return res.status(400).json({ error: 'name and email required' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE email = ?', [email])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Email already registered' })
  }

  // Generate random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hash = bcrypt.hashSync(password, 10)
  const anonymous_id = crypto.randomBytes(8).toString('hex')

  db.run(
    'INSERT INTO users (email, password_hash, name, role, anonymous_id) VALUES (?, ?, ?, ?, ?)',
    [email, hash, name, 'judge', anonymous_id]
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  const id = idRows[0].values[0][0]

  // Return password only this one time
  res.status(201).json({ id, email, name, anonymous_id, password })
})

// PUT /api/admin/judges/:id — update judge
router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, email } = req.body
  const db = getDb()

  const existing = db.exec('SELECT id FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Judge not found' })
  }

  db.run(
    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
    [name || null, email || null, req.params.id]
  )
  saveDb()
  res.json({ ok: true })
})

// POST /api/admin/judges/:id/regenerate-password
router.post('/:id/regenerate-password', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  const existing = db.exec('SELECT id FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Judge not found' })
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let password = ''
  for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))

  const hash = bcrypt.hashSync(password, 10)
  db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id])
  saveDb()

  res.json({ password })
})

// DELETE /api/admin/judges/:id
router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM users WHERE id = ? AND role = ?', [req.params.id, 'judge'])
  saveDb()
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Mount route in index.ts**

Add: `import adminJudgesRoutes from './routes/admin-judges.js'` and `app.use('/api/admin/judges', adminJudgesRoutes)`

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/admin-judges.ts backend/src/index.ts
git commit -m "feat: add admin judges CRUD route"
```

---

### Task 4: Backend — Admin Tasks Route

**Files:**
- Create: `backend/src/routes/admin-tasks.ts`
- Modify: `backend/src/index.ts` (mount route)

- [ ] **Step 1: Create admin-tasks.ts**

```typescript
import { Router, Request, Response } from 'express'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'

const router = Router()

function rowsToArray(rows: any[]): Record<string, any>[] {
  if (rows.length === 0) return []
  return rows[0].values.map((vals: any[]) => {
    const obj: Record<string, any> = {}
    rows[0].columns.forEach((c: string, i: number) => (obj[c] = vals[i]))
    return obj
  })
}

// GET /api/admin/tasks
router.get('/', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM admin_tasks ORDER BY created_at DESC')
  res.json(rowsToArray(rows))
})

// POST /api/admin/tasks
router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { title, description } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const db = getDb()
  db.run(
    'INSERT INTO admin_tasks (title, description) VALUES (?, ?)',
    [title, description || '']
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  res.status(201).json({ id: idRows[0].values[0][0] })
})

// PUT /api/admin/tasks/:id
router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { title, description, status } = req.body
  const db = getDb()

  const existing = db.exec('SELECT id FROM admin_tasks WHERE id = ?', [req.params.id])
  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: 'Task not found' })
  }

  const updates: string[] = []
  const values: any[] = []

  if (title !== undefined) { updates.push('title = ?'); values.push(title) }
  if (description !== undefined) { updates.push('description = ?'); values.push(description) }
  if (status !== undefined) {
    updates.push('status = ?')
    values.push(status)
    if (status === 'completed') {
      updates.push("completed_at = datetime('now')")
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

  updates.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.run(`UPDATE admin_tasks SET ${updates.join(', ')} WHERE id = ?`, values)
  saveDb()
  res.json({ ok: true })
})

// DELETE /api/admin/tasks/:id
router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run('DELETE FROM admin_tasks WHERE id = ?', [req.params.id])
  saveDb()
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Mount route in index.ts**

Add: `import adminTasksRoutes from './routes/admin-tasks.js'` and `app.use('/api/admin/tasks', adminTasksRoutes)`

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/admin-tasks.ts backend/src/index.ts
git commit -m "feat: add admin tasks CRUD route"
```

---

### Task 5: Backend — Admin Teams Route

**Files:**
- Create: `backend/src/routes/admin-teams.ts`
- Modify: `backend/src/index.ts` (mount route)

- [ ] **Step 1: Create admin-teams.ts**

```typescript
import { Router, Request, Response } from 'express'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { getDb, saveDb } from '../db.js'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import { slugify } from '../team-utils.js'

const router = Router()

// POST /api/admin/teams — create team as admin
router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, sandwich_name, captain_email, password, members, equipment_needs, open_to_join } = req.body

  if (!name || !captain_email || !password) {
    return res.status(400).json({ error: 'name, captain_email, and password required' })
  }

  const db = getDb()
  const existing = db.exec('SELECT id FROM teams WHERE name = ?', [name])
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: 'Team name already taken' })
  }

  const slug = slugify(name)
  const slugExists = db.exec('SELECT id FROM teams WHERE slug = ?', [slug])
  if (slugExists.length > 0 && slugExists[0].values.length > 0) {
    return res.status(409).json({ error: 'Team slug already taken' })
  }

  const hash = bcrypt.hashSync(password, 10)
  const accessCode = crypto.randomBytes(4).toString('hex').toUpperCase()

  db.run(
    `INSERT INTO teams (name, slug, sandwich_name, captain_email, password_hash, members, equipment_needs, access_code, open_to_join, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    [name, slug, sandwich_name || '', captain_email, hash, JSON.stringify(members || []), equipment_needs || null, accessCode, open_to_join ? 1 : 0]
  )
  saveDb()

  const idRows = db.exec('SELECT last_insert_rowid() as id')
  res.status(201).json({ id: idRows[0].values[0][0], slug, name, access_code: accessCode })
})

export default router
```

- [ ] **Step 2: Mount route in index.ts**

Add: `import adminTeamsRoutes from './routes/admin-teams.js'` and `app.use('/api/admin/teams', adminTeamsRoutes)`

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/admin-teams.ts backend/src/index.ts
git commit -m "feat: add admin team creation route"
```

---

### Task 6: Backend — Email Tracking + Scheduling

**Files:**
- Modify: `backend/src/routes/email.ts`
- Modify: `backend/src/email.ts`
- Modify: `backend/src/index.ts` (add scheduler)

**Interfaces:**
- Consumes: existing `sendEmail()`, `loadTemplates()`, `markdownToHtml()`
- Produces: pixel endpoint, schedule endpoints, cron scheduler

- [ ] **Step 1: Add pixel + schedule endpoints to email.ts**

Add to `backend/src/routes/email.ts`:

```typescript
// GET /api/email/pixel/:logId — tracking pixel
router.get('/pixel/:logId', (req: Request, res: Response) => {
  const db = getDb()
  const logId = req.params.logId

  db.run(
    "UPDATE email_logs SET open_count = open_count + 1, opened_at = COALESCE(opened_at, datetime('now')) WHERE id = ?",
    [logId]
  )
  saveDb()

  // Fire-and-forget Umami event
  const umamiUrl = process.env.UMAMI_URL
  const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID
  if (umamiUrl && umamiWebsiteId) {
    const logRows = db.exec('SELECT template_id, recipient_email FROM email_logs WHERE id = ?', [logId])
    if (logRows.length > 0 && logRows[0].values.length > 0) {
      const templateId = logRows[0].values[0][0]
      const recipient = logRows[0].values[0][1]
      fetch(`${umamiUrl}/api/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.UMAMI_API_KEY || ''}` },
        body: JSON.stringify({
          name: 'email_opened',
          data: { template_id: templateId, recipient },
          website_id: umamiWebsiteId,
        }),
      }).catch(() => {})
    }
  }

  // Return 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  res.set({ 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' })
  res.send(pixel)
})

// GET /api/admin/email/schedules
router.get('/schedules', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM email_schedules ORDER BY scheduled_at DESC')
  // ... rowsToArray helper
  res.json(rowsToArray(rows))
})

// POST /api/admin/email/schedules
router.post('/schedules', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { template_id, recipient_filter, scheduled_at } = req.body
  if (!template_id || !recipient_filter || !scheduled_at) {
    return res.status(400).json({ error: 'template_id, recipient_filter, and scheduled_at required' })
  }

  const db = getDb()
  db.run(
    'INSERT INTO email_schedules (template_id, recipient_filter, scheduled_at) VALUES (?, ?, ?)',
    [template_id, recipient_filter, scheduled_at]
  )
  saveDb()
  res.status(201).json({ ok: true })
})

// DELETE /api/admin/email/schedules/:id
router.delete('/schedules/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const db = getDb()
  db.run("DELETE FROM email_schedules WHERE id = ? AND status = 'pending'", [req.params.id])
  saveDb()
  res.json({ ok: true })
})

// GET /api/admin/email/logs
router.get('/logs', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const db = getDb()
  const rows = db.exec('SELECT * FROM email_logs ORDER BY sent_at DESC')
  res.json(rowsToArray(rows))
})
```

- [ ] **Step 2: Add pixel injection to email.ts**

In `backend/src/email.ts`, modify `sendEmail` to accept an optional `logId` param and inject the pixel:

```typescript
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  logId?: number,
): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) return { ok: false, error: 'SMTP not configured' }
  try {
    let finalHtml = html
    if (logId) {
      const pixelUrl = `${process.env.API_URL || 'http://localhost:3001'}/api/email/pixel/${logId}`
      finalHtml += `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`
    }
    await t.sendMail({ from: process.env.SMTP_USER, to, subject, html: finalHtml })
    return { ok: true }
  } catch (err: any) {
    console.error('Email send error:', err)
    return { ok: false, error: err?.message || 'Send failed' }
  }
}
```

- [ ] **Step 3: Add email scheduler to index.ts**

Add in `backend/src/index.ts` after `start()`:

```typescript
// Email scheduler — check every 60s
import { getDb } from './db.js'
import { sendEmail, markdownToHtml, loadTemplates } from './email.js'

setInterval(async () => {
  try {
    const db = getDb()
    const rows = db.exec("SELECT id, template_id, recipient_filter FROM email_schedules WHERE status = 'pending' AND scheduled_at <= datetime('now')")
    if (rows.length === 0 || rows[0].values.length === 0) return

    const templates = loadTemplates()
    for (const row of rows[0].values) {
      const [scheduleId, templateId, recipientFilter] = row
      const template = templates.find(t => t.id === templateId)
      if (!template) {
        db.run("UPDATE email_schedules SET status = 'failed' WHERE id = ?", [scheduleId])
        continue
      }

      // Resolve recipients
      let recipientEmails: string[] = []
      if (recipientFilter === 'all_teams') {
        const teamRows = db.exec('SELECT captain_email FROM teams')
        if (teamRows.length > 0) recipientEmails = teamRows[0].values.map(r => r[0] as string)
      } else if (recipientFilter === 'all_judges') {
        const judgeRows = db.exec("SELECT email FROM users WHERE role = 'judge'")
        if (judgeRows.length > 0) recipientEmails = judgeRows[0].values.map(r => r[0] as string)
      }

      let sent = 0, failed = 0
      for (const email of recipientEmails) {
        // Create log entry
        db.run('INSERT INTO email_logs (template_id, recipient_email) VALUES (?, ?)', [templateId, email])
        const logIdRows = db.exec('SELECT last_insert_rowid() as id')
        const logId = logIdRows[0].values[0][0] as number

        const vars = { team_name: '', captain_name: '', captain_email: email, event_title: 'The Crust Competition 2026', event_date: '' }
        const subject = template.subject.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`)
        const htmlBody = markdownToHtml(template.body.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key as keyof typeof vars] ?? `{{${key}}}`))

        const result = await sendEmail(email, subject, htmlBody, logId)
        result.ok ? sent++ : failed++
      }

      db.run("UPDATE email_schedules SET status = 'sent' WHERE id = ?", [scheduleId])
    }
    saveDb()
  } catch (err) {
    console.error('Email scheduler error:', err)
  }
}, 60_000)
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/email.ts backend/src/email.ts backend/src/index.ts
git commit -m "feat: add email tracking pixel and scheduling"
```

---

### Task 7: Frontend — Simplify EventSettings

**Files:**
- Modify: `frontend/src/pages/admin/EventSettings.tsx`

- [ ] **Step 1: Rewrite EventSettings.tsx**

Remove: event_title, event_description, rules, landing_page_content fields. Keep: event_date + scoring categories (read from API, display with weights). Keep: judge/team password section.

The component should:
1. Fetch config from `/api/config` and categories from `/api/judges/rubric`
2. Show only `event_date` input
3. Show scoring categories as read-only chips (seeded from DB)
4. Keep password management section
5. Save via PUT `/api/config`

- [ ] **Step 2: Verify UI renders correctly**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/EventSettings.tsx
git commit -m "feat: simplify event settings tab"
```

---

### Task 8: Frontend — Judges Management

**Files:**
- Create: `frontend/src/pages/admin/Judges.tsx`
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Create Judges.tsx**

CRUD table with: name, email, created_at. Actions: create (modal with name + email, shows generated password once), edit, delete, regenerate password.

- [ ] **Step 2: Add tab to AdminDashboard.tsx**

Add `{ key: 'judges', label: 'Jueces', icon: 'gavel' }` to tabs array and render `<Judges />`.

- [ ] **Step 3: Verify**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/Judges.tsx frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat: add judges management tab"
```

---

### Task 9: Frontend — Admin Team Creation

**Files:**
- Modify: `frontend/src/pages/admin/Teams.tsx`
- Modify: `frontend/src/components/admin/TeamEditModal.tsx`

- [ ] **Step 1: Extend TeamEditModal with create mode**

Add props: `mode: 'edit' | 'create'`. In create mode, show all fields (name, sandwich_name, captain_email, password, members, equipment_needs). In edit mode, keep current behavior (status, station).

- [ ] **Step 2: Add "Crear equipo" button to Teams.tsx**

Button opens modal in create mode. On save, POST to `/api/admin/teams`.

- [ ] **Step 3: Verify**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/Teams.tsx frontend/src/components/admin/TeamEditModal.tsx
git commit -m "feat: add admin team creation"
```

---

### Task 10: Frontend — Admin Tasks

**Files:**
- Create: `frontend/src/pages/admin/AdminTasks.tsx`
- Modify: `frontend/src/pages/admin/AdminDashboard.tsx`

- [ ] **Step 1: Create AdminTasks.tsx**

CRUD table: title, description, status (badge), created_at, completed_at. Actions: create (modal), edit status, delete. Filter by status.

- [ ] **Step 2: Replace ToDo tab in AdminDashboard.tsx**

Change the todo tab to render `<AdminTasks />` instead of `<ToDo />`. Keep the `ToDo` component file for backwards compat but don't render it.

- [ ] **Step 3: Verify**

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminTasks.tsx frontend/src/pages/admin/AdminDashboard.tsx
git commit -m "feat: replace todo tab with admin tasks CRUD"
```

---

### Task 11: Frontend — Email Scheduling + Logs

**Files:**
- Modify: `frontend/src/pages/admin/EmailReminders.tsx`

- [ ] **Step 1: Extend EmailReminders.tsx**

Add sections:
1. Send email: template selector + recipient selector + send button
2. Schedule email: template + recipient + datetime picker + schedule button
3. Scheduled emails: table with status, cancel button
4. Email logs: table with template, recipient, sent_at, opened_at, open_count

- [ ] **Step 2: Verify**

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/EmailReminders.tsx
git commit -m "feat: add email scheduling and logs"
```

---

### Task 12: Final Verification

- [ ] **Step 1: Start backend, verify no errors**

```bash
cd backend && npx tsx src/index.ts
```

- [ ] **Step 2: Start frontend, verify no build errors**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: Manual smoke test**

Verify each tab loads: Teams, Settings, Judges, Scores, Chat, Tasks, Email, Invites

- [ ] **Step 4: Final commit if any fixes needed**
