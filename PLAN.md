# PLAN.md — Sandwich Championship & Birthday Platform

Implementation plan for the Sandwich Championship & Birthday Platform. Greenfield build — monorepo with React+Vite frontend and Node.js+Express backend, SQLite, Socket.io, MinIO, Docker Compose.

---

## Milestone 1: Project Scaffolding & Infrastructure

Set up the monorepo, build tooling, Docker Compose, and development environment. Everything else depends on this.

### Initialize monorepo with frontend and backend directories

Create root `package.json` with workspace scripts. Create `frontend/` (React 18 + Vite + TypeScript) and `backend/` (Node.js + Express + TypeScript). Add `.gitignore`, `.env.example` with all required env vars.

### Set up Docker Compose with all services

Create `docker-compose.yml` with three services: `frontend` (nginx), `backend` (Node.js), `minio` (S3-compatible). Add `Dockerfile` per service. Include volume mounts for SQLite DB and MinIO data.

### Set up backend Express server with SQLite

Initialize Express with TypeScript, install `better-sqlite3`, create `backend/src/db.ts` connection module with WAL mode. Add `GET /api/health` endpoint.

### Create database migration runner

Create `backend/migrations/` directory and `backend/src/migrate.ts` that discovers and runs `.sql` files on server start. Create `001_initial.sql` with all table schemas (User, Team, Judge, Score, ChatMessage, EventConfig).

### Seed admin account from environment variables

Create `backend/src/seed.ts` — on first start, if no User row exists, hash `ADMIN_PASSWORD` and insert admin row using `ADMIN_EMAIL`. Run automatically after migrations.

### Set up frontend build tooling and design tokens

Configure Vite with proxy to backend (`/api` → `localhost:3001`). Set up Tailwind with Crust & Competition design tokens (sandwich orange, crust brown, lettuce green, warm paper white, Montserrat/Inter fonts, extreme roundedness). Add React Router v6 with base routes.

### Set up Socket.io server and client

Install `socket.io` on backend, attach to Express HTTP server. Create `frontend/src/lib/socket.ts` with Socket.io client singleton. Verify with a ping/pong test.

**Deliverable:** Running Docker Compose stack with frontend dev server, backend API, SQLite database with tables, and working WebSocket connection.

---

## Milestone 2: Authentication & Access Control

Implement all three auth flows (admin, team, judge) with JWT. This gates every subsequent feature.

### Implement admin login endpoint

`POST /api/auth/admin/login` — validate email+password against seeded admin row using bcrypt. Return JWT with `{ id, email, role: "admin" }` payload, 24h expiry.

### Implement team login endpoint

`POST /api/auth/team/login` — validate captain_email + team password against Team row. Return JWT with `{ team_id, name, role: "team" }`.

### Implement judge login endpoint

`POST /api/auth/judge/login` — validate against single `judge_password` from EventConfig. On first login, generate `anonymous_id` (e.g., "judge_1"), store in DB, include in JWT. Return JWT with `{ anonymous_id, role: "judge" }`.

### Create JWT auth middleware

`backend/src/middleware/auth.ts` — extract and verify JWT from `Authorization: Bearer` header. Attach decoded payload to `req.user`. Create `requireRole(...roles)` higher-order middleware.

### Build admin login page

`frontend/src/pages/LoginAdmin.tsx` — email + password form. Store JWT in localStorage, redirect to admin dashboard on success.

### Build team login page

`frontend/src/pages/LoginTeam.tsx` — email + password form. Store JWT in localStorage, redirect to team dashboard on success.

### Build judge login page

`frontend/src/pages/LoginJudge.tsx` — password-only form. Store JWT in localStorage, redirect to judge panel on success.

### Create Zustand auth store

`frontend/src/stores/authStore.ts` — manage current user state (token, role, user info). Persist to localStorage. Provide `login`, `logout`, `isAuthenticated` actions.

### Create protected route component

`frontend/src/components/ProtectedRoute.tsx` — checks JWT existence and role, redirects to appropriate login if unauthorized. Wrap all dashboard/judge routes in router config.

**Deliverable:** All three roles can log in, receive JWTs, and are redirected to role-appropriate pages. Unauthorized access redirects to login.

---

## Milestone 3: Event Configuration & Landing Page

Host configures the event; public sees the landing page with countdown, rules, and registration link.

### Implement GET /api/config (public)

Returns non-sensitive fields: event_date, event_title, event_description, rules, scoring_categories, landing_page_content. No auth required.

### Implement PUT /api/config (admin)

Update all EventConfig fields. Hash judge_password and team_password on save. Admin auth required.

### Build admin event config editor

`frontend/src/pages/admin/EventSettings.tsx` — form to edit event_date, title, description (markdown textarea), rules (markdown textarea), scoring_categories (list editor), landing_page_content. Calls `PUT /api/config`.

### Build landing page hero with countdown

`frontend/src/pages/LandingPage.tsx` — Navbar with site title and nav links, Hero section with event title and live countdown timer to `event_date` from config. Fetch config from `GET /api/config`.

### Build landing page content sections

Extend LandingPage with Card for rules summary, "Register Your Team" CTA button, "Join Global Chat" button, Footer with host info and event date.

### Create shared UI components

`frontend/src/components/ui/` — Navbar (site title, nav links), Footer (host info, event date), Toast (global notifications via Zustand), Spinner (loading state). Apply design tokens.

**Deliverable:** Host can configure event details. Public landing page displays event info with live countdown. Shared UI foundation in place.

---

## Milestone 4: Team Registration

Teams register through the public form; host manages registrations in dashboard.

### Implement POST /api/teams/register

Validate required fields, check unique team name (409 on conflict), hash team password with bcrypt, insert Team row with `status: "pending"`. Return `{ id, name, status }`.

### Build team registration form

`frontend/src/pages/Registration.tsx` — fields: team name, sandwich name, captain email, password, member name inputs (2–3), equipment needs textarea. Client-side validation. Success toast + redirect on submit.

### Implement GET /api/teams (admin list)

Return all teams with id, name, sandwich_name, captain_email, members, station, status, registered_at. Admin auth required.

### Implement GET /api/teams/:id (admin/self)

Return single team detail. Admin can access any team; team role can only access own team (validate JWT team_id).

### Implement PUT /api/teams/:id (admin)

Update team fields (status, station, etc.). Admin auth required.

### Implement DELETE /api/teams/:id (admin)

Delete team row. Admin auth required.

### Build admin team management table

`frontend/src/pages/admin/Teams.tsx` — table with columns: name, sandwich, captain, members, status badge, station, actions dropdown (confirm, edit, delete).

### Build admin team edit modal

`frontend/src/components/admin/TeamEditModal.tsx` — modal for editing team details, changing status, assigning station. Calls `PUT /api/teams/:id`.

**Deliverable:** Teams can register. Host sees all teams in dashboard and can confirm, edit, or delete them.

---

## Milestone 5: Global Chat

Real-time public chat channel with no auth required.

### Implement GET /api/chat/global/messages

Return paginated message history for global channel. No auth required. Support `?limit` and `?before` query params.

### Implement POST /api/chat/global/messages

Create new chat message in global channel. Accept sender_name, content. No auth required.

### Implement DELETE /api/chat/global/messages/:messageId

Delete a message by ID. Admin auth required. Used for moderation.

### Implement Socket.io chat room events

`backend/src/chat.ts` — handle `chat:join { channel }`, `chat:message { channel, content }`. Validate channel access. Broadcast `chat:new` to room. Emit `chat:history` on join.

### Build global chat UI

`frontend/src/pages/Chat.tsx` — message list (auto-scroll, sender name + role badge), text input, send button. Socket.io connection for real-time. Fetch history on mount.

**Deliverable:** Anyone can open global chat, send messages, and see real-time updates. Admin can delete messages.

---

## Milestone 6: Team & Judge Private Chats

Private chat channels for teams and judges, with access control.

### Implement team chat channel access validation

Extend chat middleware: `team:{id}` channels check JWT `team_id` matches channel ID. Admin has access to all channels.

### Implement GET /api/chat/team/:teamId/messages

Return paginated message history for a team channel. Team members of that team + admin only.

### Implement POST /api/chat/team/:teamId/messages

Create message in team channel. Same access rules as GET.

### Implement GET /api/chat/judge/messages

Return paginated message history for judge channel. Judges + admin only.

### Implement POST /api/chat/judge/messages

Create message in judge channel. Same access rules as GET.

### Build team chat UI

`frontend/src/pages/TeamChat.tsx` — message list/input pattern, scoped to team channel. Shows team name in header. Accessible from team dashboard.

### Build judge chat UI

`frontend/src/pages/JudgeChat.tsx` — message list/input pattern, scoped to judge channel. Accessible from judge panel.

### Build admin chat moderation view

`frontend/src/pages/admin/ChatModeration.tsx` — tabs to switch between global, per-team, and judge channels. View all messages, delete any.

**Deliverable:** Teams have private chat. Judges have private chat. Admin can view and moderate all channels.

---

## Milestone 7: Judge Scoring Interface

Judges access rubric, score sandwiches, view submitted scores.

### Implement GET /api/judges/rubric

Return `scoring_categories` from EventConfig. Judge auth required.

### Implement POST /api/judges/scores

Validate team_id exists, category is in rubric, value is 1–10. Enforce unique constraint (team_id + judge_anonymous_id + category). Return 409 if already scored. Judge auth required.

### Implement GET /api/judges/scores/:teamId

Return scores for a team. Admin sees all judge scores with anonymous_id; judge sees only own scores. Auth required.

### Build judge access gate page

`frontend/src/pages/JudgeAccess.tsx` — password input, submit, store JWT, redirect to scoring panel. Skip gate if already authenticated.

### Build judge scoring UI

`frontend/src/pages/JudgePanel.tsx` — rubric display card, score entry table (teams as rows, categories as columns, 1–10 input per cell), optional notes textarea, submit button. "Already scored" alert on duplicate attempt.

### Build judge score history view

Extend JudgePanel with read-only view of scores already submitted by this judge. Shows per-team, per-category breakdown with notes.

**Deliverable:** Judges can enter, submit, and view their scores. Duplicate submissions are prevented.

---

## Milestone 8: Score Reveal & Leaderboard

The ceremony mechanic — host reveals scores one category at a time via WebSocket push.

### Implement GET /api/scores/leaderboard

Compute per-team total_score (sum of category averages across all judges), per-category averages. Include `revealed` map. Public, no auth.

### Implement POST /api/scores/reveal

Mark a category as revealed in EventConfig (store revealed categories as JSON). Broadcast `score:reveal { category, scores }` via Socket.io. Admin auth required.

### Build score reveal control panel

`frontend/src/pages/admin/ScoreReveal.tsx` — list of categories with reveal status, "Reveal [Category]" button per unrevealed category, progress bar showing percentage revealed.

### Build public leaderboard/results page

`frontend/src/pages/Results.tsx` — table with team names, sandwich names, total score, category scores (only shown if revealed). Winner spotlight card for 1st place. Socket.io listener for real-time updates.

### Add score reveal Socket.io broadcast

`backend/src/scores.ts` — on reveal, emit `score:reveal` event to all connected sockets. Frontend leaderboard listens and updates UI in real-time. Fallback: REST poll on reconnect.

**Deliverable:** Host reveals categories one by one. All connected clients see scores appear in real-time. Final leaderboard displays after all categories revealed.

---

## Milestone 9: File Uploads (Images & Audio in Chat)

Enable image and audio attachments in chat via MinIO presigned URLs.

### Set up MinIO client connection

`backend/src/minio.ts` — MinIO client initialization from env vars. Health check function.

### Implement POST /api/upload/presign

Generate presigned PUT URL with 15-min expiry. Validate content-type against allowed list (image/*, audio/*). Return `{ upload_url, file_url }`. Auth required.

### Extend chat message schema with attachment fields

Add `attachment_url` and `attachment_type` columns to ChatMessage. Update migration, REST endpoints, and Socket.io events to accept optional attachment data.

### Add file upload UI to chat components

`frontend/src/components/ChatInput.tsx` — attach button opens file picker, uploads to presigned URL, sends message with attachment_url. Display inline images and audio players in message list.

### Add MinIO graceful degradation

If MinIO is unavailable, disable attach button with tooltip. Messages without attachments still send. Log upload failures.

**Deliverable:** Users can upload images and audio in chat. Attachments display inline. Graceful fallback when MinIO is down.

---

## Milestone 10: Email Engine & Final Polish

Automated reminder emails, analytics, admin utilities, and deployment validation.

### Implement email sending service

`backend/src/email.ts` — Nodemailer transport with Gmail SMTP config. `POST /api/admin/send-reminders` (admin) — sends reminder email to all registered team captains.

### Build admin email send interface

`frontend/src/pages/admin/EmailReminders.tsx` — preview of email content, "Send to all teams" button, success/failure feedback.

### Add Umami analytics script embed

Add Umami tracking script to `index.html` (configurable via env var `UMAMI_WEBSITE_ID`). Skip if not set.

### Build admin to-do list

`frontend/src/pages/admin/ToDo.tsx` — markdown textarea persisted to EventConfig or local storage. No real-time sync needed.

### Validate full Docker Compose deployment

Test end-to-end: Docker Compose up → admin login → configure event → team registers → judge scores → admin reveals → leaderboard displays. Verify all Socket.io events. Check frontend bundle <500KB gzipped.

**Deliverable:** Email reminders work. Analytics tracked. Admin can manage to-do list. Full flow validated in Docker.

---

## Milestone 11: Could-Have Features

Optional features that add value but are not critical. Build after core is stable.

### Team prep checklist

`frontend/src/pages/TeamChecklist.tsx` — per-team checklist (ingredients, equipment, timing) stored in Team record. Toggleable checkboxes. Editable by team members.

### Enhanced station assignment

Add station list management (add/remove stations) and assignment UI in admin team table. Already partially in Milestone 4.

### Persistent countdown widget

Enhance landing page countdown to be a sticky/persistent widget visible across pages when event is approaching (within 24h).

**Deliverable:** Optional features available if time permits. Core platform is complete without them.
