# Design: Team Join Request Accept/Reject

## Problem

The team dashboard shows pending join requests, but captains have no way to accept or reject them. Requesters receive no feedback on their request status beyond the initial submission confirmation.

## Goals

1. Captains can accept or reject join requests from their team dashboard
2. Accepting a request automatically adds the person to the team's member list
3. Both captain and requester receive email notifications on accept/reject
4. When a team reaches 3 members, remaining pending requests are auto-rejected with email
5. The join page filters out full teams
6. Confirmation modal prevents accidental actions (HCI: error prevention)

## Non-Goals

- No admin-level accept/reject (captain-only flow)
- No "pending member" registration flow — acceptance is immediate
- No undo after accept/reject

## Backend Changes

### New Endpoints in `join-requests.ts`

#### `PATCH /api/join-requests/:id/accept`

Auth: `authMiddleware` — only the team captain (or admin) can accept.

Logic:
1. Fetch the join request by ID; verify status is `pending`
2. Fetch the team; verify requester is captain or admin
3. Check `members.length < 3`; return 400 if full
4. Append the requester's name to `teams.members` JSON array
5. Update `join_requests.status` to `accepted`
6. Find all other `pending` requests for the same `team_id`
7. Update those to `status = 'rejected'`
8. Send emails:
   - To requester: "You've been accepted to {team.name}!" with login link
   - To captain: "{name} has joined your team!"
   - To each auto-rejected requester: "The team is now full" with link to `/join` to try another team
9. Save DB

Response: `{ success: true, accepted: { name, email }, rejected_count: number }`

#### `PATCH /api/join-requests/:id/reject`

Auth: `authMiddleware` — captain or admin only.

Logic:
1. Fetch the join request; verify status is `pending`
2. Fetch the team; verify requester is captain or admin
3. Update `join_requests.status` to `rejected`
4. Send email to requester: "Your request to join {team.name} was not accepted"
5. Save DB

Response: `{ success: true }`

### Modified Endpoint: `/api/guests/teams`

Filter out teams where member count >= 3:
```sql
SELECT ... FROM teams WHERE open_to_join = 1
```
Filter in JS: only include teams where `JSON.parse(members).length < 3`

### Validation Rules

| Rule | Response |
|------|----------|
| Request ID not found | 404 `{ error: 'Request not found' }` |
| Request status not `pending` | 400 `{ error: 'Request already processed' }` |
| Team not found | 404 `{ error: 'Team not found' }` |
| Not captain or admin | 403 `{ error: 'Only the captain can manage requests' }` |
| Team already has 3 members | 400 `{ error: 'Team is full' }` |

## Frontend Changes

### `TeamChat.tsx` — Join Requests Panel

Replace the current request cards (which only show status badges) with interactive cards:

**For pending requests (captain only):**
- Show name, email, optional message
- Two buttons: **Accept** (green) and **Reject** (red/outline)
- Buttons disabled while processing
- Tap opens confirmation modal

**For processed requests:**
- Show status badge (accepted = green, rejected = red)
- No action buttons

**Confirmation Modal:**
- Title: "Aceptar solicitud" or "Rechazar solicitud"
- Body: "¿Deseas aceptar a {name} en tu equipo?" / "¿Deseas rechazar la solicitud de {name}?"
- Two buttons: Confirm (primary) and Cancel (secondary)
- Backdrop click and X button to cancel

### `JoinTeam.tsx` — Filter Full Teams

The `/api/guests/teams` endpoint change handles this. No frontend changes needed for filtering (the endpoint already returns the right teams).

### HCI Principles Applied

| Principle | Implementation |
|-----------|---------------|
| Feedback | Toast on success, loading spinners on buttons |
| Error prevention | Confirmation modal before accept/reject |
| Consistency | Uses existing button styles, colors, modal patterns |
| Visibility | Status badges remain visible after action |
| User control | Cancel modal, reject always available |
| Recognition over recall | Requester name/email displayed, no IDs |

## Email Templates

### Accept — to requester

Subject: `¡Bienvenido a {team.name}!`

Body (markdown):
```
¡Hola {name}!

Tu solicitud para unirse al equipo **{team.name}** ha sido aceptada.

Ya puedes acceder al chat del equipo con tus credenciales.

¡Nos vemos en el torneo!
```

### Accept — to captain

Subject: `{name} se unió a {team.name}`

Body:
```
{name} ({email}) ha sido aceptado(a) en tu equipo.

Ya tiene acceso al chat del equipo.
```

### Reject — to requester

Subject: `Actualización de tu solicitud a {team.name}`

Body:
```
Hola {name},

Lamentablemente tu solicitud para unirse al equipo **{team.name}** no fue aceptada.

Puedes intentar unirte a otro equipo o crear el tuyo:
[Unirse a otro equipo](/join) | [Registrar equipo](/register)
```

### Auto-reject (team full) — to requester

Subject: `El equipo {team.name} está completo`

Body:
```
Hola {name},

El equipo **{team.name}** ya alcanzó el número máximo de integrantes (3).

Te invitamos a unirte a otro equipo o crear el tuyo:
[Unirse a otro equipo](/join) | [Registrar equipo](/register)
```

## Files Modified

| File | Change |
|------|--------|
| `backend/src/routes/join-requests.ts` | Add PATCH accept/reject endpoints, auto-reject logic, emails |
| `backend/src/routes/guests.ts` | Filter out full teams from list |
| `frontend/src/pages/TeamChat.tsx` | Add accept/reject buttons + confirmation modal |
| `backend/src/migrations/013_*.sql` | Not needed (schema unchanged) |

## Testing

- Accept request: team members grows, requester gets accepted badge, status changes
- Reject request: status changes to rejected, requester notified
- Accept on full team: returns 400, no DB change
- Auto-reject: other pending requests become rejected with email sent
- Join page: teams with 3 members not shown
- Unauthorized: non-captain gets 403
- Idempotency: accepting already-processed request returns 400
