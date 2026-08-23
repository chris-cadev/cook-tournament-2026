# SPEC.md — Sandwich Championship & Birthday Platform

## Product Overview

A single-event web platform that coordinates a sandwich-making competition and birthday party for 20–30 people (6 cook teams, 3 judges, and guests). It replaces scattered WhatsApp groups, paper scorecards, and manual coordination with one central hub for registration, real-time chat, scoring, and event logistics.

The platform serves three distinct phases: pre-event preparation (team registration, hype building), day-of execution (live scoring, chat coordination), and results (score reveals, ceremony). The host manages everything through an admin dashboard; no developer intervention is needed.

Built for a one-shot celebration, the system is intentionally single-event with no multi-tenancy, no user accounts (password-based role access), and no external integrations beyond email and analytics. Delivered as Docker containers for self-hosted deployment.

---

## Goals

### Business Goals
- Eliminate coordination friction for the host (no more juggling WhatsApp, emails, and paper)
- Build pre-event engagement and hype through a landing page and global chat
- Provide judges a digital rubric and scoring interface (replace paper scorecards)
- Deliver real-time score reveals with suspense mechanics during the ceremony

### User Goals
- **Host:** Configure and run the event without technical knowledge; monitor teams, chats, and scores from one dashboard
- **Teams:** Register quickly, coordinate prep, access their private channel, and see their station assignment
- **Judges:** Access scoring rubric, score sandwiches independently in real-time, chat privately with other judges
- **Guests:** Get event info, join the global chat, feel included pre-event and day-of

### Non-Goals
- Multi-event support or SaaS tenancy
- OAuth or full user account system
- Video upload or streaming
- Native mobile apps
- Payment processing or ticketing
- Offline/PWA support
- Advanced analytics UI (Umami handles this externally)
- Internationalization framework (single language: Spanish)
- Automated bracket/tournament logic (simple sum scoring)
- External calendar integration
- Push notifications

---

## User Personas

### The Host (Admin)
- Single person organizing the event, not a developer
- Needs: full control over teams, chats, scores; simple UI
- Workflow: configure event → share URL → manage teams → monitor chats → reveal scores → view results
- Access: fixed admin credentials (email + password)

### Cook Team Captain
- 2–3 person teams, captain registers on behalf of the team
- Needs: event info, team registration, private team chat, prep checklist, station assignment
- Workflow: receive URL → register team → coordinate in team chat → prep → cook
- Access: captain email + team password (shared among team members)

### Judge
- Tasting panel member, scores independently
- Needs: scoring rubric, digital score entry, private judge chat, tasting schedule
- Workflow: receive URL → enter judge password → review rubric → score sandwiches → chat with judges
- Access: single global judge password (no individual accounts)

### Guest / Public Attendee
- Friends, family, birthday attendees
- Needs: event info, schedule, global chat participation
- Workflow: visit landing page → read event info → join global chat → attend event
- Access: no login for landing page and global chat; optional for private chats

---

## Functional Requirements

### Must Have

| ID | Feature | Description |
|----|---------|-------------|
| F1 | Landing Page | Public page with event countdown, rules, schedule, and host info |
| F2 | Team Registration | Form for teams to register: team name, sandwich name, member names, equipment needs, captain email |
| F3 | Judge Access Gate | Password-protected entry for judges to access rubric and scoring |
| F4 | Global Chat | Real-time public chat channel, no auth required, anyone can join |
| F5 | Cook Team Chat | Private real-time chat per team, only team members + host can access |
| F6 | Judge Chat | Private real-time chat for judges + host |
| F7 | Admin Dashboard | Host panel: view registered teams, moderate all chats, manage event settings |
| F8 | Score Entry | Judges enter scores per sandwich across defined categories |
| F9 | Score Reveal | Host reveals scores one category at a time via WebSocket push to all connected clients |
| F10 | Final Results | Display final scores and rankings after all categories revealed |
| F11 | Docker Deployment | Single `docker-compose.yml` that spins up all services |

### Should Have

| ID | Feature | Description |
|----|---------|-------------|
| F12 | Email Engine | Send automated reminder emails to teams (Nodemailer + Gmail SMTP) |
| F13 | Invite/Referral | Unique invite links for guests to share with others |
| F14 | Image Upload in Chat | Upload photos via presigned URLs to MinIO, display in chat |
| F15 | Audio Upload in Chat | Upload short audio messages in chat (team coordination) |
| F16 | Admin To-Do List | Markdown-based to-do list for host event planning |
| F17 | Umami Analytics | Embedded tracking script for page views |

### Could Have

| ID | Feature | Description |
|----|---------|-------------|
| F18 | Team Prep Checklist | Per-team checklist for ingredients, equipment, timing |
| F19 | Station Assignment | Admin assigns physical stations to teams |
| F20 | Countdown Widget | Prominent countdown timer visible to all users |

---

## Data Models

### User (Host)
```
User {
  id: integer (PK)
  email: string (unique)
  password_hash: string
  name: string
  role: "admin"
  created_at: datetime
}
```

### Team
```
Team {
  id: integer (PK)
  name: string
  sandwich_name: string
  captain_email: string
  password_hash: string
  members: string (JSON array of member names)
  equipment_needs: string (nullable)
  station: string (nullable)
  status: "pending" | "confirmed" | "disqualified"
  registered_at: datetime
}
```

### Judge
```
Judge {
  id: integer (PK)
  anonymous_id: string (unique, generated on first login, e.g. "judge_1", "judge_2")
  name: string (nullable, optional display name)
  accessed_at: datetime
}
```
Note: Judges are not pre-registered. They authenticate with a single global password. On first login, a stable `anonymous_id` is generated and stored in the JWT. This ID is used for score attribution (stable across re-logins) and is anonymized in public leaderboard responses. No persistent user accounts.

### Score
```
Score {
  id: integer (PK)
  team_id: integer (FK → Team)
  judge_anonymous_id: string (stable anonymous ID from Judge model, identifies which judge scored)
  category: string (e.g., "Taste", "Presentation", "Creativity")
  value: integer (1-10)
  notes: string (nullable)
  submitted_at: datetime
}
```
Unique constraint: (team_id, judge_anonymous_id, category) — one score per judge per team per category.

### ChatMessage
```
ChatMessage {
  id: integer (PK)
  channel: "global" | "team:{team_id}" | "judge"
  sender_name: string
  sender_role: "admin" | "team" | "judge" | "guest"
  content: string
  attachment_url: string (nullable)
  attachment_type: "image" | "audio" (nullable)
  created_at: datetime
}
```

### EventConfig
```
EventConfig {
  id: integer (PK, always 1)
  event_date: datetime
  event_title: string
  event_description: string (markdown)
  rules: string (markdown)
  scoring_categories: string (JSON array, e.g., ["Taste", "Presentation", "Creativity"])
  judge_password: string (hashed)
  team_password: string (hashed)
  landing_page_content: string (markdown)
  updated_at: datetime
}
```

### Relationships
- **Team → ChatMessage:** One-to-many (team channel messages)
- **Team → Score:** One-to-many (scores per team)
- **Score → Judge:** Many-to-one (via judge_anonymous_id, not FK — judges are ephemeral)
- **EventConfig:** Singleton (one row)
- **ChatMessage.channel:** Polymorphic (global, team-specific, judge)

---

## API Contracts

### Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/auth/admin/login` | POST | None | Host login with email + password → JWT |
| `POST /api/auth/team/login` | POST | None | Team login with captain email + team password → JWT |
| `POST /api/auth/judge/login` | POST | None | Judge login with global password → JWT |

#### `POST /api/auth/admin/login`
```json
// Request
{ "email": "string", "password": "string" }
// Response 200
{ "token": "string (JWT)", "user": { "id": 1, "email": "string", "role": "admin" } }
// Response 401
{ "error": "Invalid credentials" }
```

#### `POST /api/auth/team/login`
```json
// Request
{ "email": "string", "password": "string" }
// Response 200
{ "token": "string (JWT)", "team": { "id": 1, "name": "string", "role": "team" } }
// Response 401
{ "error": "Invalid credentials" }
```

#### `POST /api/auth/judge/login`
```json
// Request
{ "password": "string" }
// Response 200
{ "token": "string (JWT)", "role": "judge" }
// Response 401
{ "error": "Invalid password" }
```

### Event Config (Admin only)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/config` | GET | Public | Get event config (public fields only) |
| `PUT /api/config` | PUT | Admin | Update event config |

#### `GET /api/config`
```json
// Response 200
{
  "event_date": "2026-09-15T18:00:00Z",
  "event_title": "string",
  "event_description": "string (markdown)",
  "rules": "string (markdown)",
  "scoring_categories": ["Taste", "Presentation", "Creativity"],
  "landing_page_content": "string (markdown)"
}
```

#### `PUT /api/config`
```json
// Request (all fields optional)
{
  "event_date": "datetime",
  "event_title": "string",
  "event_description": "string",
  "rules": "string",
  "scoring_categories": ["string"],
  "judge_password": "string (plain, hashed on save)",
  "team_password": "string (plain, hashed on save)",
  "landing_page_content": "string"
}
// Response 200
{ "ok": true }
```

### Teams

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/teams/register` | POST | None | Register a new team |
| `GET /api/teams` | GET | Admin | List all teams |
| `GET /api/teams/:id` | GET | Admin/Team(self) | Get team details |
| `PUT /api/teams/:id` | PUT | Admin | Update team (status, station) |
| `DELETE /api/teams/:id` | DELETE | Admin | Delete a team |

#### `POST /api/teams/register`
```json
// Request
{
  "name": "string (team name)",
  "sandwich_name": "string",
  "captain_email": "string",
  "password": "string (team password)",
  "members": ["string"],
  "equipment_needs": "string (optional)"
}
// Response 201
{ "id": 1, "name": "string", "status": "pending" }
// Response 409
{ "error": "Team name already taken" }
```

#### `GET /api/teams`
```json
// Response 200
[
  {
    "id": 1,
    "name": "string",
    "sandwich_name": "string",
    "captain_email": "string",
    "members": ["string"],
    "station": "string | null",
    "status": "pending",
    "registered_at": "datetime"
  }
]
```

### Judges

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/judges/rubric` | GET | Judge | Get scoring rubric (categories + descriptions) |
| `POST /api/judges/scores` | POST | Judge | Submit scores for a team |
| `GET /api/judges/scores/:teamId` | GET | Judge/Admin | Get scores for a team |

#### `POST /api/judges/scores`
```json
// Request
{
  "team_id": 1,
  "scores": [
    { "category": "Taste", "value": 8, "notes": "Great flavor balance" },
    { "category": "Presentation", "value": 7, "notes": "" },
    { "category": "Creativity", "value": 9, "notes": "Unique combination" }
  ]
}
// Response 200
{ "ok": true }
// Response 409
{ "error": "Already scored this team" }
```

#### `GET /api/judges/scores/:teamId`
```json
// Response 200 (admin sees all judge scores with anonymous_id; judge sees only own)
[
  {
    "judge_anonymous_id": "judge_1",
    "category": "Taste",
    "value": 8,
    "notes": "string"
  }
]
```

### Score Reveal (Admin)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/scores/reveal` | POST | Admin | Reveal scores for a category (pushes via WS) |
| `GET /api/scores/leaderboard` | GET | Public | Get aggregated leaderboard |

#### `POST /api/scores/reveal`
```json
// Request
{ "category": "Taste" }
// Response 200
{ "ok": true, "revealed_category": "Taste" }
// Side effect: broadcasts "score:reveal" event via Socket.io
```

#### `GET /api/scores/leaderboard`
```json
// Response 200
// total_score = sum of all category averages across all judges (computed from all submitted scores,
// regardless of reveal status). Revealed field controls what the public UI displays.
[
  {
    "team_id": 1,
    "team_name": "string",
    "sandwich_name": "string",
    "total_score": 24,
    "category_scores": { "Taste": 8, "Presentation": 7, "Creativity": 9 },
    "revealed": { "Taste": true, "Presentation": false, "Creativity": false }
  }
]
```

### Chat

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `GET /api/chat/:channel/messages` | GET | Auth (varies by channel) | Get message history |
| `POST /api/chat/:channel/messages` | POST | Auth (varies by channel) | Post a message (REST fallback) |
| `DELETE /api/chat/:channel/messages/:messageId` | DELETE | Admin | Delete a message (moderation) |

Channel access rules:
- `global`: Anyone (no auth)
- `team:{id}`: Team members of that team + admin (validated via JWT `team_id` claim matching the channel's team ID)
- `judge`: Judges + admin (validated via JWT `role` claim)

WebSocket events (Socket.io):
- `chat:join { channel }` — join a room
- `chat:message { channel, content, attachment_url?, attachment_type? }` — send message
- `chat:history { messages: [...] }` — initial load
- `chat:new { message: {...} }` — incoming message broadcast

### File Upload

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/upload/presign` | POST | Auth | Get presigned URL for MinIO upload |

#### `POST /api/upload/presign`
```json
// Request
{ "filename": "string", "content_type": "image/jpeg" }
// Response 200
{ "upload_url": "string (presigned PUT URL)", "file_url": "string (public GET URL)" }
```

---

## UI Components

### Landing Page
| Component | Purpose |
|-----------|---------|
| Navbar | Site title, nav links (Rules, Register, Chat) |
| Hero | Event title, date, countdown timer |
| Card | Event rules summary, schedule overview |
| Breadcrumb | Home → Rules / Register / Chat |
| Button | "Register Your Team" CTA, "Join Global Chat" |
| Footer | Host info, event date |

### Team Registration
| Component | Purpose |
|-----------|---------|
| Input | Team name, sandwich name, captain email, password |
| Input (repeated) | Member name fields (2–3) |
| Textarea | Equipment needs (optional) |
| Button | Submit registration |
| Alert | Success/error feedback after submission |
| Toast | "Team registered!" confirmation |

### Judge Access
| Component | Purpose |
|-----------|---------|
| Modal | Password gate overlay on judge page |
| Input | Password field |
| Button | Submit password |
| Card | Scoring rubric display (categories, descriptions, scale) |
| Table | Score entry grid (teams × categories) |
| Input | Score value (1–10 per category) |
| Textarea | Optional notes per score |
| Button | Submit scores |
| Alert | "Already scored" warning |

### Chat (Global, Team, Judge)
| Component | Purpose |
|-----------|---------|
| List | Message list (scrollable, auto-scroll to bottom) |
| Input | Message text input |
| Button | Send message |
| Avatar | Sender name + role badge |
| Badge | Role indicator (Admin, Team, Judge, Guest) |
| Button | Attach image/audio (opens file picker) |
| Spinner | Loading indicator for message history |
| Tabs | Switch between chat channels (admin view) |

### Admin Dashboard
| Component | Purpose |
|-----------|---------|
| Navbar | Dashboard title, nav (Teams, Chat, Scores, Settings) |
| Table | Team list with status, station, actions |
| Badge | Team status (pending/confirmed/disqualified) |
| Modal | Edit team details, assign station |
| Tabs | Switch between dashboard sections |
| Card | Score reveal control panel |
| Button | "Reveal [Category]" per unrevealed category |
| ProgressBar | Percentage of categories revealed |
| List | Chat moderation view (all channels) |
| Button | Delete message (moderation) |
| Accordion | Event config editor (rules, schedule, categories) |
| Textarea | Markdown editor for event content |
| Toast | "Scores revealed!" notification broadcast |

### Results / Ceremony
| Component | Purpose |
|-----------|---------|
| Table | Final leaderboard with all scores |
| Badge | Rank (1st, 2nd, 3rd) |
| Card | Winner spotlight (team name, sandwich, total score) |
| ProgressBar | Score visualization per category |
| Alert | "Scores being revealed live" banner |

### Shared
| Component | Purpose |
|-----------|---------|
| Spinner | Loading state for all async operations |
| Toast | Global notifications (new message, score reveal) |
| Tooltip | Hover info on score categories, team details |
| Dropdown | Admin action menu (edit, delete, assign) |
| Pagination | Team list, message history (if >50 items) |

---

## User Experience

### Entry Points
1. **Shared URL:** Host shares the landing page URL via WhatsApp/email to all participants
2. **Team Registration Link:** Host sends to potential teams (or they find it on the landing page)
3. **Judge Link:** Host shares the judge page URL + global judge password via private message
4. **Global Chat:** Accessible from the landing page, no auth required

### Core Flow

#### Pre-Event
1. Host logs in, configures event (date, rules, categories, passwords)
2. Host shares landing page URL
3. Guests visit landing page, read rules, join global chat
4. Teams visit registration form, enter details, register
5. Host reviews teams in dashboard, confirms or adjusts
6. Host shares judge link + password with judges
7. Judges access rubric, familiarize with scoring categories

#### Day-Of
1. Everyone visits landing page → sees countdown or live schedule
2. Teams access their team chat to coordinate
3. Judges access scoring interface
4. Host monitors dashboard
5. Competition happens (offline)
6. Judges score each sandwich (submit scores per team)
7. Host reveals scores one category at a time via dashboard
8. All clients see real-time score reveal (WebSocket push)
9. After all categories revealed, final leaderboard displays
10. Ceremony / winners announced

#### Chat Parallel Flow
- Global chat: banter, hype, food pics (continuous)
- Team chats: ingredient coordination, timing (per team)
- Judge chat: discuss tasting order, coordinate (judge-only)

### Edge Cases
- **Team registers with taken name:** Error message, prompt to choose another
- **Judge tries to score same team twice:** "Already scored" alert, prevent duplicate
- **Judge submits invalid score (outside 1–10):** Client-side validation + server rejection
- **Chat message with no auth:** Global chat allows it; team/judge channels reject
- **Host reveals already-revealed category:** Button disabled, no-op
- **Network disconnect during score reveal:** Next connection receives current state via REST poll
- **MinIO unavailable:** Image/audio upload fails gracefully, message still sends without attachment
- **SQLite locked (concurrent writes):** WAL mode enabled, retry logic on backend

---

## Technical Decisions

### Architecture
- **Monorepo:** `frontend/` (React + Vite) and `backend/` (Node.js + Express) in one repo
- **API Style:** REST for CRUD operations, Socket.io for real-time (chat + score reveals)
- **Database:** SQLite via `better-sqlite3` — single file, no external DB server, WAL mode for concurrent reads
- **Migrations:** Simple up/down SQL scripts in `backend/migrations/`, run on server start
- **Seeding:** Admin account bootstrapped via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) on first start if no admin exists in DB
- **No ORM:** Raw SQL with `better-sqlite3` — SQLite is simple enough, no need for Prisma/TypeORM overhead

### Frontend
- **Framework:** React 18 with Vite
- **State Management:** Zustand — lightweight, no boilerplate, fits the scale
- **Styling:** Tailwind CSS — utility-first, fast implementation, matches design system
- **Routing:** React Router v6
- **Real-time:** Socket.io client for chat and score reveals

### Backend
- **Runtime:** Node.js with Express
- **Auth:** JWT (stateless, works with Socket.io, simple for SPA)
- **File Upload:** Presigned URLs direct to MinIO (backend generates, frontend uploads)
- **Email:** Nodemailer with Gmail SMTP (simple for single event)
- **WebSocket:** Socket.io server (same Express instance)

### Infrastructure
- **Storage:** MinIO (S3-compatible, self-hosted) for images and audio
- **Containerization:** Docker Compose — `frontend` (nginx), `backend` (Node.js), `minio` services
- **Analytics:** Umami cloud (umami.is) — external, just embed tracking script
- **Deployment:** Single server, `docker compose up` starts all services

### Tradeoffs Considered
| Choice | Considered | Why This Won |
|--------|-----------|--------------|
| SQLite over PostgreSQL | PostgreSQL for robustness | Single event, 20–30 users, no need for external DB server |
| JWT over sessions | Session-based auth | Stateless, works with Socket.io, simpler for SPA |
| Zustand over Redux | Redux for structure | Zustand is lighter, no boilerplate, fits this scale |
| Tailwind over CSS Modules | CSS Modules for encapsulation | Tailwind is faster to implement, matches design system tokens |
| Presigned URLs over proxy | Proxy through backend | Reduces backend load, MinIO handles uploads directly |
| Nodemailer over SendGrid | SendGrid for reliability | Nodemailer is simpler, Gmail SMTP is free and sufficient |
| Socket.io over native WS | Raw WebSocket | Socket.io handles reconnection, rooms, broadcasting out of the box |

---

## Technical Constraints

### Known Integrations
- **MinIO:** S3-compatible object storage for file uploads (images, audio in chat)
- **Gmail SMTP:** Email sending via Nodemailer (requires app password)
- **Umami:** Cloud analytics (script embed only, no API integration)

### Required Environment Variables
- `ADMIN_EMAIL` — Host admin email (used for bootstrap + login)
- `ADMIN_PASSWORD` — Host admin password (hashed on first start)
- `MINIO_ENDPOINT` — MinIO server URL
- `MINIO_ACCESS_KEY` — MinIO access key
- `MINIO_SECRET_KEY` — MinIO secret key
- `JWT_SECRET` — Secret for signing JWTs
- `SMTP_HOST` — Gmail SMTP host (smtp.gmail.com)
- `SMTP_USER` — Gmail address
- `SMTP_PASS` — Gmail app password

### Performance Requirements
- **Concurrent users:** 30 max (all event participants)
- **Chat latency:** <500ms message delivery (local network expected)
- **Score reveal:** <1s broadcast to all connected clients
- **Page load:** <2s on mobile 3G (landing page is mostly static)

### Security Requirements
- **Auth:** JWT with short expiry (24h), role-based access control
- **Passwords:** Hashed with bcrypt (team passwords, admin password, judge password)
- **Chat:** Channel-based access control (server validates on every message)
- **File upload:** Presigned URLs with expiry (15 min), content-type validation
- **SQL Injection:** Parameterized queries only (better-sqlite3 enforces this)
- **XSS:** React escapes by default; sanitize any markdown content rendered as HTML
- **CORS:** Restricted to frontend origin

### Data Constraints
- **SQLite:** Single file, no external server. WAL mode for concurrent reads. Suitable for 30 users.
- **No backups needed:** Single event, data is ephemeral. Docker volume persistence is sufficient.
- **Storage:** MinIO local disk, no cloud storage. Sufficient for chat images/audio.

### Language
- **Primary:** Spanish (event docs are in Spanish, UI strings in Spanish)

---

## Success Metrics

### Pre-Event
- **Team registration rate:** All 6 team slots filled before event date
- **Landing page visits:** 30+ unique visitors (all attendees visited)
- **Global chat activity:** 50+ messages in global chat before event day

### Day-Of
- **Chat uptime:** 99%+ during event hours
- **Score entry completion:** All judges score all teams
- **Score reveal latency:** <1s from admin click to all clients
- **Zero data loss:** No lost chat messages or scores

### Post-Event
- **Host satisfaction:** Host completes event without manual coordination fallback
- **No paper scorecards:** All scoring done digitally
- **Deployment success:** Docker Compose starts all services with one command

### Technical
- **Build size:** Frontend bundle <500KB gzipped
- **Database size:** <10MB after full event
- **Docker image:** Total stack <1GB
