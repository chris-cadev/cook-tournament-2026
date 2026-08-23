# BRAINSTORM: Sandwich Championship & Birthday Platform

## Problem Statement

A host is organizing a sandwich competition + birthday party for ~20-30 people (6 teams of up to 3, 3 judges, and guests). Today, coordinating this event means scattered WhatsApp groups, paper scorecards, no central info hub, and zero pre-event engagement. Guests don't know what to bring, teams can't coordinate, judges have no digital rubric, and the host manually tracks everything.

**Why it matters:** The event is a one-shot celebration. Bad coordination = confused guests, disorganized teams, and a host buried in logistics instead of enjoying their birthday. A single web platform eliminates the friction and builds hype before the event even starts.

**Who feels this pain:** The host (organizer) most acutely — they're juggling emails, WhatsApp messages, supply lists, and score tallying while trying to host a party. Teams feel it too: they don't know the rules clearly, can't find the schedule, and have no easy way to coordinate.

---

## Target Users

### Primary: The Host (Admin)
- Single person organizing the event
- Needs full control: manage teams, moderate chats, reveal scores, track budget
- Not a developer — UI must be dead simple
- Access: admin login (fixed credentials)

### Secondary: Cook Teams (up to 6)
- 2-3 people per team, register via a shared team password
- Need: event info, their own private chat, prep checklists, station assignment
- Access: team captain email + team password

### Tertiary: Judges (3)
- Tasting panel with scoring rubrics
- Need: private judge chat, scoring interface, rubric reference
- Access: single global password (no individual accounts)

### Quaternary: Guests / Public
- Friends, family, birthday attendees
- Need: event info, schedule, global chat, invite others
- Access: no login for landing/global chat; optional for private chats

---

## Core Workflow

### 1. Pre-Event (Weeks Before)
```
Host → Configures event (date, time, rules, email templates)
Host → Shares landing page URL with everyone
Teams → Register via form (team name, sandwich name, members, equipment needs)
Judges → Access secret page, enter password, get rubric + judge chat
Host → Sends reminder emails (automated or manual via email engine)
Guests → Visit landing page, join global chat, get hyped
```

### 2. Day-Of Event
```
Everyone → Checks landing page for countdown/schedule
Host → Monitors dashboard (teams registered, chat activity, scores)
Teams → Access their dashboard (prep countdown, crew list, ingredient manifest)
Judges → Access rubric panel, score sandwiches in real-time
Host → Reveals scores one category at a time (suspense mechanic)
Everyone → Sees final results, ceremony
```

### 3. Chat Flows (parallel, real-time)
```
Global Chat: Anyone can join, no auth. General banter, hype, food pics.
Cook Chat: Team-only private channel. Coordinate ingredients, timing.
Judge Chat: Judges + admin only. Discuss scores, coordinate tasting order.
```

---

## Constraints & Decisions

### Hard Constraints
| Constraint | Detail |
|------------|--------|
| **SQLite** | Single-file DB, no external DB server. Good for this scale. |
| **Node.js + Express** | Backend runtime. Already decided. |
| **React + Vite** | Frontend. Already decided. |
| **Socket.io** | Real-time chats. Non-negotiable for the chat UX. |
| **MinIO** | S3-compatible object storage for images/audio. Self-hosted. |
| **Mobile-first** | Primary audience is on phones at the event. Desktop is secondary. |
| **Docker** | Final deliverable includes Docker containers for all services. |
| **Spanish** | The event docs are in Spanish; the UI should likely be bilingual or Spanish-first. |
| **Single event** | This is a one-time event platform, not SaaS. No multi-tenancy needed. |

### Early Decisions to Make
| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Auth strategy** | JWT vs sessions | JWT — simpler for SPA, stateless, works with Socket.io |
| **File upload flow** | Presigned URLs (direct to MinIO) vs proxy through backend | Presigned URLs — reduces backend load, per PRD recommendation |
| **Email sending** | Nodemailer vs SendGrid API | Nodemailer with Gmail SMTP — simplest for a single event |
| **State management** | Context vs Zustand vs Redux | Zustand — lightweight, no boilerplate, fits React well |
| **CSS approach** | Tailwind vs CSS modules vs styled-components | Tailwind — matches the design system's utility-first feel, fast to implement |
| **Score reveal mechanic** | WS push vs polling vs SSE | WS (Socket.io) — already using it for chats, reuse the connection |
| **Database seeding** | Script vs admin panel | Admin panel — host configures everything through the UI |
| **Umami integration** | Self-hosted vs cloud | Cloud (umami.is) — less infra, free tierenough for one event |

### Architecture Decisions
- **Monorepo vs separate repos:** Monorepo with `frontend/` and `backend/` directories. One Docker Compose file at root. Simpler for a single developer.
- **API style:** REST for CRUD + Socket.io for real-time. No need for GraphQL at this scale.
- **Database migrations:** Simple migration scripts (up/down) in `backend/migrations/`. No ORM migration tools needed for SQLite.

---

## Non-Goals

| What | Why Not |
|------|---------|
| **Multi-event support** | Single event. No tenant isolation, no event switching. |
| **User accounts with OAuth** | Overkill. Simple password-based access per role. |
| **Real-time score collaboration between judges** | Judges score independently. No shared editing. |
| **Video upload/streaming** | PRD explicitly forbids video in chats. |
| **Mobile apps** | PWA at most. Native apps are absurd for a one-day event. |
| **Payment processing** | No entry fees, no ticketing. Free event. |
| **Advanced analytics dashboard** | Umami handles this externally. No custom analytics UI. |
| **Internationalization (i18n)** | Single language (Spanish or bilingual). No i18n framework. |
| **Offline support** | Event is at a venue with WiFi. No need for service workers. |
| **Automated sandwich bracket/tournament logic** | Scoring is simple sum. No bracket elimination. |
| **Integration with external calendar (Google Calendar)** | Overkill. The countdown IS the calendar. |
| **Push notifications** | Email + chat are sufficient notification channels. |

---

## Design System Summary

The design system ("The Crust & Competition System") is defined but NOT the source of truth — it's a visual guide.

**Key tokens:**
- **Primary:** Sandwich Orange `#855300` / `#f59e0b` — CTAs, energy
- **Secondary:** Crust Brown `#944a23` — text, structure
- **Tertiary:** Lettuce Green `#006c49` — success states
- **Background:** Warm Paper White `#fdf9e9` — not pure white, reduces eye strain
- **Typography:** Montserrat 800-900 for headlines, Inter for body
- **Shape:** Extreme roundedness (`rounded-2xl` = 1.5rem) — "soft bread" feel
- **Elevation:** Tonal layers + low-contrast outlines, not heavy shadows

**Mobile:** 4-column grid, 16px margins, 48px min touch targets
**Desktop:** 12-column grid, max 1200px width

---

## Scope Summary

**MVP (must ship):**
1. Landing page with countdown
2. Team registration form
3. Judge access (password gate)
4. Three chat channels (global, cooks, judges) with real-time messaging
5. Admin dashboard (team management, chat moderation)
6. Score entry + reveal mechanic
7. Docker deployment

**Phase 2 (nice to have, after MVP works):**
- Email engine (automated reminders)
- Invite/referral system
- MinIO image/audio uploads in chats
- Admin to-do list (markdown editor)
- Umami analytics integration

**The PRD is comprehensive. The design system is detailed. The organization doc is the truth source for event rules. This brainstorm anchors the build.**
