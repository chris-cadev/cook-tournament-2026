# Team Join Accept/Reject Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable team captains to accept or reject join requests from their dashboard, with email notifications to both parties.

**Architecture:** Add PATCH endpoints for accept/reject in the existing join-requests route, update the frontend request cards with interactive buttons and confirmation modal, and filter full teams from the join page.

**Tech Stack:** Node.js/Express (backend), React/Vite (frontend), SQLite (DB), Nodemailer (email)

**Spec:** `docs/superpowers/specs/2026-08-24-team-join-accept-reject-design.md`

## Global Constraints

- SQLite database, no migrations needed (schema unchanged)
- Mobile-first responsive design
- Captain-only permission for accept/reject
- Max 3 members per team
- Email via existing `sendEmail` / `markdownToHtml` utilities
- TypeScript, ESLint, existing code patterns

---

## File Structure

| File | Change | Responsibility |
|------|--------|----------------|
| `backend/src/routes/join-requests.ts` | Modify | Add PATCH accept/reject endpoints, auto-reject logic, email sending |
| `backend/src/routes/guests.ts` | Modify | Filter out full teams from list |
| `frontend/src/pages/TeamChat.tsx` | Modify | Add accept/reject buttons + confirmation modal |

---

### Task 1: Backend — Accept endpoint

**Files:**
- Modify: `backend/src/routes/join-requests.ts:77` (add before `export default`)

**Interfaces:**
- Consumes: `getDb()`, `saveDb()` from `../db.js`, `sendEmail`, `markdownToHtml` from `../email.js`, `authMiddleware` from `../middleware/auth.js`
- Produces: `PATCH /api/join-requests/:id/accept` — returns `{ success: true, accepted: { name, email }, rejected_count: number }`

- [ ] **Step 1: Add the accept endpoint**

Add this route before the `export default` line in `backend/src/routes/join-requests.ts`:

```typescript
router.patch('/:id/accept', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const requestId = Number(req.params.id)

  const reqRows = db.exec(
    'SELECT id, team_id, name, email, status FROM join_requests WHERE id = ?',
    [requestId]
  )
  if (reqRows.length === 0 || reqRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const request = {
    id: reqRows[0].values[0][0] as number,
    team_id: reqRows[0].values[0][1] as number,
    name: reqRows[0].values[0][2] as string,
    email: reqRows[0].values[0][3] as string,
    status: reqRows[0].values[0][4] as string,
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already processed' })
  }

  const teamRows = db.exec(
    'SELECT id, name, captain_email, members FROM teams WHERE id = ?',
    [request.team_id]
  )
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const team = {
    id: teamRows[0].values[0][0] as number,
    name: teamRows[0].values[0][1] as string,
    captain_email: teamRows[0].values[0][2] as string,
    members: teamRows[0].values[0][3] as string,
  }

  if (req.user?.role !== 'admin' && req.user?.team_id !== team.id) {
    return res.status(403).json({ error: 'Only the captain can manage requests' })
  }

  const members: string[] = JSON.parse(team.members || '[]')
  if (members.length >= 3) {
    return res.status(400).json({ error: 'Team is full' })
  }

  // Add member to team
  members.push(request.name)
  db.run('UPDATE teams SET members = ? WHERE id = ?', [JSON.stringify(members), team.id])

  // Update request status
  db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['accepted', request.id])

  // Auto-reject other pending requests for same team
  const otherPending = db.exec(
    'SELECT id, name, email FROM join_requests WHERE team_id = ? AND status = ? AND id != ?',
    [team.id, 'pending', request.id]
  )
  let rejectedCount = 0
  if (otherPending.length > 0 && otherPending[0].values.length > 0) {
    for (const row of otherPending[0].values) {
      const rId = row[0] as number
      const rName = row[1] as string
      const rEmail = row[2] as string

      db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['rejected', rId])

      // Send team-full email to auto-rejected requester
      const fullHtml = markdownToHtml(
        `Hola ${rName},\n\n` +
        `El equipo **${team.name}** ya alcanzó el número máximo de integrantes (3).\n\n` +
        `Te invitamos a unirte a otro equipo o crear el tuyo:\n` +
        `- [Unirse a otro equipo](/join)\n` +
        `- [Registrar equipo](/register)`
      )
      sendEmail(rEmail, `El equipo ${team.name} está completo`, fullHtml)
      rejectedCount++
    }
  }

  saveDb()

  // Email to accepted requester
  const acceptHtml = markdownToHtml(
    `¡Hola ${request.name}!\n\n` +
    `Tu solicitud para unirse al equipo **${team.name}** ha sido aceptada.\n\n` +
    `Ya puedes acceder al chat del equipo con tus credenciales.\n\n` +
    `¡Nos vemos en el torneo!`
  )
  sendEmail(request.email, `¡Bienvenido a ${team.name}!`, acceptHtml)

  // Email to captain
  const captainHtml = markdownToHtml(
    `**${request.name}** (${request.email}) ha sido aceptado(a) en tu equipo.\n\n` +
    `Ya tiene acceso al chat del equipo.`
  )
  sendEmail(team.captain_email, `${request.name} se unió a ${team.name}`, captainHtml)

  res.json({ success: true, accepted: { name: request.name, email: request.email }, rejected_count: rejectedCount })
})
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w backend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/join-requests.ts
git commit -m "feat: add join request accept endpoint with auto-reject and emails"
```

---

### Task 2: Backend — Reject endpoint

**Files:**
- Modify: `backend/src/routes/join-requests.ts` (add after accept endpoint)

**Interfaces:**
- Consumes: same as Task 1
- Produces: `PATCH /api/join-requests/:id/reject` — returns `{ success: true }`

- [ ] **Step 1: Add the reject endpoint**

Add this route after the accept endpoint:

```typescript
router.patch('/:id/reject', authMiddleware, (req: Request, res: Response) => {
  const db = getDb()
  const requestId = Number(req.params.id)

  const reqRows = db.exec(
    'SELECT id, team_id, name, email, status FROM join_requests WHERE id = ?',
    [requestId]
  )
  if (reqRows.length === 0 || reqRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Request not found' })
  }

  const request = {
    id: reqRows[0].values[0][0] as number,
    team_id: reqRows[0].values[0][1] as number,
    name: reqRows[0].values[0][2] as string,
    email: reqRows[0].values[0][3] as string,
    status: reqRows[0].values[0][4] as string,
  }

  if (request.status !== 'pending') {
    return res.status(400).json({ error: 'Request already processed' })
  }

  const teamRows = db.exec(
    'SELECT id, name, captain_email FROM teams WHERE id = ?',
    [request.team_id]
  )
  if (teamRows.length === 0 || teamRows[0].values.length === 0) {
    return res.status(404).json({ error: 'Team not found' })
  }

  const team = {
    id: teamRows[0].values[0][0] as number,
    name: teamRows[0].values[0][1] as string,
  }

  if (req.user?.role !== 'admin' && req.user?.team_id !== team.id) {
    return res.status(403).json({ error: 'Only the captain can manage requests' })
  }

  db.run('UPDATE join_requests SET status = ? WHERE id = ?', ['rejected', request.id])
  saveDb()

  // Email to rejected requester
  const rejectHtml = markdownToHtml(
    `Hola ${request.name},\n\n` +
    `Lamentablemente tu solicitud para unirse al equipo **${team.name}** no fue aceptada.\n\n` +
    `Puedes intentar unirte a otro equipo o crear el tuyo:\n` +
    `- [Unirse a otro equipo](/join)\n` +
    `- [Registrar equipo](/register)`
  )
  sendEmail(request.email, `Actualización de tu solicitud a ${team.name}`, rejectHtml)

  res.json({ success: true })
})
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w backend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/join-requests.ts
git commit -m "feat: add join request reject endpoint with email notification"
```

---

### Task 3: Backend — Filter full teams from join page

**Files:**
- Modify: `backend/src/routes/guests.ts` (the teams list endpoint)

**Interfaces:**
- Consumes: `getDb()` from `../db.js`
- Produces: Filtered team list excluding teams with 3 members

- [ ] **Step 1: Modify the guests teams endpoint at line 95**

In `backend/src/routes/guests.ts`, add `.filter(t => t.members.length < 3)` after the `.map()` on line 95:

```typescript
// Change lines 95-99 from:
const teams = rowsToArray(rows).map((t) => ({
  ...t,
  members: JSON.parse((t.members as string) || '[]'),
  open_to_join: Boolean(t.open_to_join),
}))

// To:
const teams = rowsToArray(rows).map((t) => ({
  ...t,
  members: JSON.parse((t.members as string) || '[]'),
  open_to_join: Boolean(t.open_to_join),
})).filter(t => t.members.length < 3)
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck -w backend`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/guests.ts
git commit -m "feat: filter out full teams from join page"
```

---

### Task 4: Frontend — Accept/reject buttons with confirmation modal

**Files:**
- Modify: `frontend/src/pages/TeamChat.tsx:182-209` (the join requests section)

**Interfaces:**
- Consumes: `joinRequests`, `setJoinRequests`, `isCaptain` props
- Produces: Updated request list after accept/reject, toast feedback

- [ ] **Step 1: Add accept/reject state and handlers to TeamChat**

Add state and handler functions inside the `TeamChat` component (after the existing state declarations):

```typescript
const [actionLoading, setActionLoading] = useState<number | null>(null)
const [confirmModal, setConfirmModal] = useState<{ type: 'accept' | 'reject'; request: JoinRequest } | null>(null)
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  setToast({ message, type })
  setTimeout(() => setToast(null), 3000)
}

const handleAccept = async (req: JoinRequest) => {
  setActionLoading(req.id)
  try {
    const res = await fetch(`/api/join-requests/${req.id}/accept`, { method: 'PATCH' })
    const data = await res.json()
    if (res.ok) {
      showToast(`${req.name} aceptado(a) en el equipo`)
      if (data.rejected_count > 0) {
        setTimeout(() => showToast(`${data.rejected_count} solicitud(es) rechazada(s) automáticamente`, 'success'), 1500)
      }
      fetchJoinRequests()
    } else {
      showToast(data.error || 'Error al aceptar', 'error')
    }
  } catch {
    showToast('Error de red', 'error')
  } finally {
    setActionLoading(null)
    setConfirmModal(null)
  }
}

const handleReject = async (req: JoinRequest) => {
  setActionLoading(req.id)
  try {
    const res = await fetch(`/api/join-requests/${req.id}/reject`, { method: 'PATCH' })
    const data = await res.json()
    if (res.ok) {
      showToast(`${req.name} rechazado(a)`)
      fetchJoinRequests()
    } else {
      showToast(data.error || 'Error al rechazar', 'error')
    }
  } catch {
    showToast('Error de red', 'error')
  } finally {
    setActionLoading(null)
    setConfirmModal(null)
  }
}
```

- [ ] **Step 2: Replace the request cards UI**

Replace the existing request card rendering in the `showRequests` section with:

```tsx
{showRequests && (
  <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
    <p className="text-xs font-bold text-secondary mb-2">Solicitudes para unirse al equipo</p>
    {joinRequests.map((req) => (
      <div key={req.id} className={`rounded-xl p-3 text-sm ${
        req.status === 'pending' ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50 border border-gray-100'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-secondary">{req.name}</p>
            <p className="text-xs text-gray-500">{req.email}</p>
          </div>
          {req.status === 'pending' && isCaptain ? (
            <div className="flex gap-1.5 ml-2">
              <button
                onClick={() => setConfirmModal({ type: 'accept', request: req })}
                disabled={actionLoading === req.id}
                className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === req.id ? '...' : 'Aceptar'}
              </button>
              <button
                onClick={() => setConfirmModal({ type: 'reject', request: req })}
                disabled={actionLoading === req.id}
                className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
              req.status === 'accepted' ? 'bg-green-100 text-green-700' :
              req.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {req.status === 'accepted' ? 'Aceptado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
            </span>
          )}
        </div>
        {req.message && (
          <p className="text-xs text-gray-600 mt-1 italic">"{req.message}"</p>
        )}
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Add the confirmation modal**

Add this JSX right before the closing `</div>` of the chat content wrapper (inside the `chatContent` variable), after the `</main>` tag:

```tsx
{confirmModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(null)}>
    <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
      <h3 className="font-headline font-bold text-secondary text-lg">
        {confirmModal.type === 'accept' ? 'Aceptar solicitud' : 'Rechazar solicitud'}
      </h3>
      <p className="text-sm text-gray-600">
        {confirmModal.type === 'accept'
          ? `¿Deseas aceptar a ${confirmModal.request.name} en tu equipo?`
          : `¿Deseas rechazar la solicitud de ${confirmModal.request.name}?`
        }
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => setConfirmModal(null)}
          className="flex-1 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={() => confirmModal.type === 'accept' ? handleAccept(confirmModal.request) : handleReject(confirmModal.request)}
          disabled={actionLoading !== null}
          className={`flex-1 font-bold py-2.5 rounded-xl text-white transition-colors disabled:opacity-50 text-sm ${
            confirmModal.type === 'accept' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
          }`}
        >
          {actionLoading !== null ? 'Procesando...' : confirmModal.type === 'accept' ? 'Aceptar' : 'Rechazar'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 4: Add the toast notification**

Add this right before the closing `</div>` of the outermost return in `TeamChat` (not inside `chatContent`, but at the top level of the component return):

```tsx
{toast && (
  <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
    toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
  }`}>
    {toast.message}
  </div>
)}
```

- [ ] **Step 5: Run typecheck**

Run: `npm run typecheck -w frontend`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/TeamChat.tsx
git commit -m "feat: add accept/reject buttons and confirmation modal for join requests"
```

---

### Task 5: Verify — End-to-end flow

- [ ] **Step 1: Run full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: PASS (or only pre-existing warnings)

- [ ] **Step 3: Run tests**

Run: `npm run test`
Expected: PASS

- [ ] **Step 4: Manual verification checklist**

Verify the following flows work:
1. Captain sees pending requests with Accept/Reject buttons
2. Tapping Accept opens confirmation modal
3. Confirming accept adds member to team, status changes to accepted
4. Other pending requests auto-reject with email
5. Tapping Reject opens confirmation modal
6. Confirming reject sends email to requester
7. Non-captain team member sees status badges only (no buttons)
8. Join page doesn't show teams with 3 members
