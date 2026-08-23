# ACCEPTANCE.md — Sandwich Championship & Birthday Platform

## Product Overview

- [ ] Platform is a single-event web application for 20–30 people (6 cook teams, 3 judges, guests)
- [ ] Serves three phases: pre-event, day-of, results
- [ ] Host manages everything through an admin dashboard
- [ ] No multi-tenancy, no password-based user accounts, no external integrations beyond email and analytics
- [ ] Delivered as Docker containers for self-hosted deployment

---

## Goals

### Business Goals

- [ ] Host no longer juggles WhatsApp, emails, and paper for coordination
- [ ] Landing page and global chat build pre-event engagement
- [ ] Judges use a digital rubric and scoring interface instead of paper scorecards
- [ ] Real-time score reveals with suspense mechanics during the ceremony

### User Goals

- [ ] Host can configure and run the event without technical knowledge
- [ ] Host can monitor teams, chats, and scores from one dashboard
- [ ] Teams can register quickly, coordinate prep, access private channel, and see station assignment
- [ ] Judges can access scoring rubric, score independently in real-time, and chat privately with other judges
- [ ] Guests can get event info, join global chat, and feel included pre-event and day-of

### Non-Goals

- [ ] Platform does not support multi-event or SaaS tenancy
- [ ] Platform does not implement OAuth or full user account system
- [ ] Platform does not support video upload or streaming
- [ ] Platform does not provide native mobile apps
- [ ] Platform does not handle payment processing or ticketing
- [ ] Platform does not support offline/PWA functionality
- [ ] Platform does not include advanced analytics UI (Umami handles externally)
- [ ] Platform is single-language: Spanish only (no i18n framework)
- [ ] Platform uses simple sum scoring (no automated bracket/tournament logic)
- [ ] Platform does not integrate with external calendars
- [ ] Platform does not support push notifications

---

## User Personas

### The Host (Admin)

- [ ] Single person organizing the event, not a developer
- [ ] Can configure event, share URL, manage teams, monitor chats, reveal scores, view results
- [ ] Logs in with fixed admin credentials (email + password)

### Cook Team Captain

- [ ] Teams consist of 2–3 people; captain registers on behalf of the team
- [ ] Can receive URL, register team, coordinate in team chat, prep, cook
- [ ] Logs in with captain email + team password (shared among team members)

### Judge

- [ ] Tasting panel member who scores independently
- [ ] Can receive URL, enter judge password, review rubric, score sandwiches, chat with judges
- [ ] Authenticates with a single global judge password (no individual accounts)

### Guest / Public Attendee

- [ ] Friends, family, birthday attendees
- [ ] Can visit landing page, read event info, join global chat, attend event
- [ ] No login required for landing page and global chat; optional for private chats

---

## Functional Requirements

### Must Have

- [ ] **F1 — Landing Page:** Public page displays event countdown, rules, schedule, and host info
- [ ] **F2 — Team Registration:** Form captures team name, sandwich name, member names, equipment needs, captain email
- [ ] **F3 — Judge Access Gate:** Password-protected entry for judges to access rubric and scoring
- [ ] **F4 — Global Chat:** Real-time public chat channel with no auth required; anyone can join
- [ ] **F5 — Cook Team Chat:** Private real-time chat per team; only team members + host can access
- [ ] **F6 — Judge Chat:** Private real-time chat for judges + host
- [ ] **F7 — Admin Dashboard:** Host panel shows registered teams, moderates all chats, manages event settings
- [ ] **F8 — Score Entry:** Judges enter scores per sandwich across defined categories
- [ ] **F9 — Score Reveal:** Host reveals scores one category at a time via WebSocket push to all connected clients
- [ ] **F10 — Final Results:** Final scores and rankings display after all categories revealed
- [ ] **F11 — Docker Deployment:** Single `docker-compose.yml` spins up all services

### Should Have

- [ ] **F12 — Email Engine:** Automated reminder emails sent to teams via Nodemailer + Gmail SMTP
- [ ] **F13 — Invite/Referral:** Unique invite links for guests to share with others
- [ ] **F14 — Image Upload in Chat:** Photos uploaded via presigned URLs to MinIO and displayed in chat
- [ ] **F15 — Audio Upload in Chat:** Short audio messages uploaded in chat for team coordination
- [ ] **F16 — Admin To-Do List:** Markdown-based to-do list for host event planning
- [ ] **F17 — Umami Analytics:** Embedded tracking script for page views

### Could Have

- [ ] **F18 — Team Prep Checklist:** Per-team checklist for ingredients, equipment, timing
- [ ] **F19 — Station Assignment:** Admin assigns physical stations to teams
- [ ] **F20 — Countdown Widget:** Prominent countdown timer visible to all users

---

## Data Models

### User (Host)

- [ ] User record has `id` (integer PK), `email` (string unique), `password_hash` (string), `name` (string), `role` ("admin"), `created_at` (datetime)

### Team

- [ ] Team record has `id` (integer PK), `name` (string), `sandwich_name` (string), `captain_email` (string), `password_hash` (string), `members` (JSON array of strings), `equipment_needs` (string nullable), `station` (string nullable), `status` ("pending" | "confirmed" | "disqualified"), `registered_at` (datetime)

### Judge

- [ ] Judge record has `id` (integer PK), `anonymous_id` (string unique, generated on first login, e.g. "judge_1"), `name` (string nullable), `accessed_at` (datetime)
- [ ] Judges are not pre-registered; authenticated with a single global password
- [ ] First login generates a stable `anonymous_id` stored in the JWT
- [ ] `anonymous_id` used for score attribution (stable across re-logins) and anonymized in public leaderboard responses
- [ ] No persistent user accounts for judges

### Score

- [ ] Score record has `id` (integer PK), `team_id` (FK → Team), `judge_anonymous_id` (string), `category` (string), `value` (integer 1–10), `notes` (string nullable), `submitted_at` (datetime)
- [ ] Unique constraint enforced on `(team_id, judge_anonymous_id, category)` — one score per judge per team per category

### ChatMessage

- [ ] ChatMessage record has `id` (integer PK), `channel` ("global" | "team:{team_id}" | "judge"), `sender_name` (string), `sender_role` ("admin" | "team" | "judge" | "guest"), `content` (string), `attachment_url` (string nullable), `attachment_type` ("image" | "audio" nullable), `created_at` (datetime)

### EventConfig

- [ ] EventConfig is a singleton (one row) with `id` (PK always 1), `event_date` (datetime), `event_title` (string), `event_description` (markdown string), `rules` (markdown string), `scoring_categories` (JSON array, e.g. ["Taste", "Presentation", "Creativity"]), `judge_password` (hashed string), `team_password` (hashed string), `landing_page_content` (markdown string), `updated_at` (datetime)

### Relationships

- [ ] Team → ChatMessage: One-to-many (team channel messages)
- [ ] Team → Score: One-to-many (scores per team)
- [ ] Score → Judge: Many-to-one (via `judge_anonymous_id`, not FK — judges are ephemeral)
- [ ] EventConfig: Singleton (one row)
- [ ] ChatMessage.channel: Polymorphic (global, team-specific, judge)

---

## API Contracts

### Authentication

- [ ] `POST /api/auth/admin/login` accepts `{ email, password }`, returns `{ token (JWT), user: { id, email, role } }` on success, `{ error: "Invalid credentials" }` on failure
- [ ] `POST /api/auth/team/login` accepts `{ email, password }`, returns `{ token (JWT), team: { id, name, role } }` on success, `{ error: "Invalid credentials" }` on failure
- [ ] `POST /api/auth/judge/login` accepts `{ password }`, returns `{ token (JWT), role: "judge" }` on success, `{ error: "Invalid password" }` on failure

### Event Config (Admin only)

- [ ] `GET /api/config` is public and returns `event_date`, `event_title`, `event_description`, `rules`, `scoring_categories`, `landing_page_content`
- [ ] `PUT /api/config` requires admin auth and accepts all fields optional; `judge_password` and `team_password` are hashed on save; returns `{ ok: true }`

### Teams

- [ ] `POST /api/teams/register` requires no auth and accepts team registration fields; returns 201 with `{ id, name, status: "pending" }`, or 409 if team name already taken
- [ ] `GET /api/teams` requires admin auth and returns array of all teams
- [ ] `GET /api/teams/:id` requires admin auth or matching team (self) and returns team details
- [ ] `PUT /api/teams/:id` requires admin auth and allows updating team status and station
- [ ] `DELETE /api/teams/:id` requires admin auth and deletes a team

### Judges

- [ ] `GET /api/judges/rubric` requires judge auth and returns scoring categories and descriptions
- [ ] `POST /api/judges/scores` requires judge auth and accepts `{ team_id, scores: [{ category, value, notes }] }`; returns `{ ok: true }`, or 409 if already scored
- [ ] `GET /api/judges/scores/:teamId` requires judge or admin auth; admin sees all judge scores with anonymous_id; judge sees only own scores

### Score Reveal (Admin)

- [ ] `POST /api/scores/reveal` requires admin auth and accepts `{ category }`; returns `{ ok: true, revealed_category }`; broadcasts `score:reveal` event via Socket.io
- [ ] `GET /api/scores/leaderboard` is public and returns team leaderboard with `total_score`, `category_scores`, and `revealed` flags

### Chat

- [ ] `GET /api/chat/:channel/messages` returns message history; channel access: `global` (no auth), `team:{id}` (team members + admin), `judge` (judges + admin)
- [ ] `POST /api/chat/:channel/messages` posts a message (REST fallback); channel access rules apply
- [ ] `DELETE /api/chat/:channel/messages/:messageId` requires admin auth
- [ ] Socket.io events: `chat:join`, `chat:message`, `chat:history`, `chat:new` work correctly

### File Upload

- [ ] `POST /api/upload/presign` requires auth and accepts `{ filename, content_type }`; returns `{ upload_url, file_url }`

---

## UI Components

### Landing Page

- [ ] Navbar displays site title and nav links (Rules, Register, Chat)
- [ ] Hero shows event title, date, and countdown timer
- [ ] Card displays event rules summary and schedule overview
- [ ] Breadcrumb shows Home → Rules / Register / Chat
- [ ] Button displays "Register Your Team" CTA and "Join Global Chat"
- [ ] Footer shows host info and event date

### Team Registration

- [ ] Input fields for team name, sandwich name, captain email, password
- [ ] Repeated input fields for 2–3 member names
- [ ] Textarea for optional equipment needs
- [ ] Submit registration button
- [ ] Alert shows success/error feedback after submission
- [ ] Toast displays "Team registered!" confirmation

### Judge Access

- [ ] Modal shows password gate overlay on judge page
- [ ] Input for password field
- [ ] Submit password button
- [ ] Card displays scoring rubric (categories, descriptions, scale)
- [ ] Table shows score entry grid (teams × categories)
- [ ] Input for score value (1–10 per category)
- [ ] Textarea for optional notes per score
- [ ] Submit scores button
- [ ] Alert displays "Already scored" warning

### Chat (Global, Team, Judge)

- [ ] Message list is scrollable with auto-scroll to bottom
- [ ] Message text input field
- [ ] Send message button
- [ ] Avatar displays sender name + role badge
- [ ] Badge shows role indicator (Admin, Team, Judge, Guest)
- [ ] Button attaches image/audio (opens file picker)
- [ ] Spinner shows loading indicator for message history
- [ ] Tabs switch between chat channels (admin view)

### Admin Dashboard

- [ ] Navbar shows dashboard title and nav (Teams, Chat, Scores, Settings)
- [ ] Table lists teams with status, station, actions
- [ ] Badge displays team status (pending/confirmed/disqualified)
- [ ] Modal edits team details and assigns station
- [ ] Tabs switch between dashboard sections
- [ ] Card shows score reveal control panel
- [ ] Button displays "Reveal [Category]" per unrevealed category
- [ ] ProgressBar shows percentage of categories revealed
- [ ] List shows chat moderation view (all channels)
- [ ] Button deletes message (moderation)
- [ ] Accordion opens event config editor (rules, schedule, categories)
- [ ] Textarea provides markdown editor for event content
- [ ] Toast displays "Scores revealed!" notification broadcast

### Results / Ceremony

- [ ] Table displays final leaderboard with all scores
- [ ] Badge shows rank (1st, 2nd, 3rd)
- [ ] Card shows winner spotlight (team name, sandwich, total score)
- [ ] ProgressBar visualizes score per category
- [ ] Alert displays "Scores being revealed live" banner

### Shared

- [ ] Spinner shows loading state for all async operations
- [ ] Toast provides global notifications (new message, score reveal)
- [ ] Tooltip shows hover info on score categories and team details
- [ ] Dropdown provides admin action menu (edit, delete, assign)
- [ ] Pagination handles team list and message history (if >50 items)

---

## User Experience

### Entry Points

- [ ] Host shares landing page URL via WhatsApp/email to all participants
- [ ] Team registration link available on landing page or sent by host
- [ ] Judge link + global judge password shared via private message by host
- [ ] Global chat accessible from landing page with no auth required

### Core Flow — Pre-Event

- [ ] Host logs in and configures event (date, rules, categories, passwords)
- [ ] Host shares landing page URL
- [ ] Guests visit landing page, read rules, join global chat
- [ ] Teams visit registration form, enter details, register
- [ ] Host reviews teams in dashboard, confirms or adjusts
- [ ] Host shares judge link + password with judges
- [ ] Judges access rubric and familiarize with scoring categories

### Core Flow — Day-Of

- [ ] Everyone visits landing page and sees countdown or live schedule
- [ ] Teams access team chat to coordinate
- [ ] Judges access scoring interface
- [ ] Host monitors dashboard
- [ ] Competition happens (offline)
- [ ] Judges score each sandwich (submit scores per team)
- [ ] Host reveals scores one category at a time via dashboard
- [ ] All clients see real-time score reveal (WebSocket push)
- [ ] After all categories revealed, final leaderboard displays
- [ ] Ceremony / winners announced

### Chat Parallel Flow

- [ ] Global chat supports banter, hype, food pics (continuous)
- [ ] Team chats support ingredient coordination and timing (per team)
- [ ] Judge chat supports tasting order discussion and coordination (judge-only)

### Edge Cases

- [ ] Team registering with taken name shows error message and prompts to choose another
- [ ] Judge trying to score same team twice shows "Already scored" alert and prevents duplicate
- [ ] Judge submitting invalid score (outside 1–10) rejected by client-side validation and server
- [ ] Chat message with no auth: global chat allows it; team/judge channels reject
- [ ] Host revealing already-revealed category: button disabled, no-op
- [ ] Network disconnect during score reveal: next connection receives current state via REST poll
- [ ] MinIO unavailable: image/audio upload fails gracefully, message still sends without attachment
- [ ] SQLite locked (concurrent writes): WAL mode enabled, retry logic on backend

---

## Technical Decisions

### Architecture

- [ ] Monorepo with `frontend/` (React + Vite) and `backend/` (Node.js + Express)
- [ ] REST API for CRUD operations, Socket.io for real-time (chat + score reveals)
- [ ] SQLite via `better-sqlite3` — single file, no external DB server, WAL mode
- [ ] Migrations via simple up/down SQL scripts in `backend/migrations/`, run on server start
- [ ] Admin account bootstrapped via environment variables on first start if no admin exists
- [ ] No ORM — raw SQL with `better-sqlite3`

### Frontend

- [ ] React 18 with Vite
- [ ] Zustand for state management
- [ ] Tailwind CSS for styling
- [ ] React Router v6 for routing
- [ ] Socket.io client for chat and score reveals

### Backend

- [ ] Node.js with Express
- [ ] JWT for auth (stateless, works with Socket.io, simple for SPA)
- [ ] Presigned URLs direct to MinIO for file upload (backend generates, frontend uploads)
- [ ] Nodemailer with Gmail SMTP for email
- [ ] Socket.io server on same Express instance

### Infrastructure

- [ ] MinIO (S3-compatible, self-hosted) for images and audio
- [ ] Docker Compose with `frontend` (nginx), `backend` (Node.js), `minio` services
- [ ] Umami cloud analytics via embedded tracking script only
- [ ] Single server deployment via `docker compose up`

---

## Technical Constraints

### Known Integrations

- [ ] MinIO used for file uploads (images, audio in chat)
- [ ] Gmail SMTP used for email sending via Nodemailer (requires app password)
- [ ] Umami cloud used for analytics (script embed only, no API integration)

### Required Environment Variables

- [ ] `ADMIN_EMAIL` — Host admin email (used for bootstrap + login)
- [ ] `ADMIN_PASSWORD` — Host admin password (hashed on first start)
- [ ] `MINIO_ENDPOINT` — MinIO server URL
- [ ] `MINIO_ACCESS_KEY` — MinIO access key
- [ ] `MINIO_SECRET_KEY` — MinIO secret key
- [ ] `JWT_SECRET` — Secret for signing JWTs
- [ ] `SMTP_HOST` — Gmail SMTP host (smtp.gmail.com)
- [ ] `SMTP_USER` — Gmail address
- [ ] `SMTP_PASS` — Gmail app password

### Performance Requirements

- [ ] Supports up to 30 concurrent users
- [ ] Chat message delivery latency < 500ms (local network expected)
- [ ] Score reveal broadcasts to all connected clients in < 1s
- [ ] Page load < 2s on mobile 3G (landing page mostly static)

### Security Requirements

- [ ] JWT with short expiry (24h) and role-based access control
- [ ] Passwords hashed with bcrypt (team passwords, admin password, judge password)
- [ ] Channel-based access control validated by server on every chat message
- [ ] Presigned URLs with 15 min expiry and content-type validation
- [ ] Parameterized queries only (better-sqlite3 enforces this)
- [ ] React escapes by default; markdown content rendered as HTML is sanitized
- [ ] CORS restricted to frontend origin

### Data Constraints

- [ ] SQLite stored as single file with WAL mode for concurrent reads
- [ ] No backups needed; Docker volume persistence is sufficient for single event
- [ ] MinIO local disk used for storage; sufficient for chat images/audio

### Language

- [ ] Primary language is Spanish (event docs and UI strings in Spanish)

---

## Success Metrics

### Pre-Event

- [ ] All 6 team slots filled before event date
- [ ] 30+ unique landing page visitors (all attendees visited)
- [ ] 50+ messages in global chat before event day

### Day-Of

- [ ] Chat uptime 99%+ during event hours
- [ ] All judges score all teams
- [ ] Score reveal latency < 1s from admin click to all clients
- [ ] Zero data loss (no lost chat messages or scores)

### Post-Event

- [ ] Host completes event without manual coordination fallback
- [ ] All scoring done digitally (no paper scorecards)
- [ ] Docker Compose starts all services with one command

### Technical

- [ ] Frontend bundle < 500KB gzipped
- [ ] Database size < 10MB after full event
- [ ] Total Docker stack < 1GB
