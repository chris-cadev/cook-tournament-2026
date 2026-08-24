# Plan: Fix Failing ACCEPTANCE.md Criteria

## Failing Criteria Identified

### 1. Frontend build broken — missing `.env` file (BUILD BLOCKER)
**AC reference:** F11 (Docker Deployment), Technical Decisions
**Root cause:** `vite.config.ts:7` calls `process.loadEnvFile(path.resolve(__dirname, '../.env'))` which throws `ENOENT` when `.env` doesn't exist. `npm run build` fails.
**Fix:** Make the env file load optional — wrap in try/catch or check existence first.

### 2. Socket.io client never sends auth token (REAL-TIME BROKEN)
**AC reference:** F4 (Global Chat), F6 (Judge Chat), F9 (Score Reveal), Chat Socket.io events
**Root cause:** `frontend/src/lib/socket.ts` connects without passing `auth.token`. Server `socket.ts:44-56` requires `socket.handshake.auth.token` and rejects connections without it. Result: all Socket.io events silently fail — global chat has no real-time, score reveal has no real-time push.
**Fix:** Update `socket.ts` client to pass the JWT token from authStore on connect. Use `socket.io` `auth` option. Update connection lifecycle to reconnect with token when auth state changes.

### 3. Leaderboard leaks unrevealed scores (SECURITY / AC VIOLATION)
**AC reference:** F9 (Score Reveal), F10 (Final Results)
**Root cause:** `backend/src/routes/scores.ts:50-57` — `total_score` is computed as sum of ALL category averages including unrevealed ones. Public API returns this. Anyone can see final rankings before reveal.
**Fix:** Compute `total_score` only from revealed categories in the leaderboard endpoint.

### 4. ProtectedRoute redirects to nonexistent `/login` route
**AC reference:** F3 (Judge Access Gate), auth flow
**Root cause:** `ProtectedRoute.tsx:13` navigates to `/login` when unauthenticated. No `/login` route exists — the catch-all `*` renders `<Results />`. User sees leaderboard instead of login page.
**Fix:** Change redirect to `/` (landing page) or add a proper `/login` route.

### 5. Judge & Team chat use REST polling, not Socket.io (REAL-TIME MISSING)
**AC reference:** F5 (Cook Team Chat), F6 (Judge Chat) — "Real-time chat"
**Root cause:** `JudgeChat.tsx` and `TeamChat.tsx` only poll every 30s via `setInterval`. They don't use Socket.io at all. Only `Chat.tsx` (global) uses Socket.io.
**Fix:** Add Socket.io join/message/leave lifecycle to `JudgeChat.tsx` and `TeamChat.tsx`, matching the pattern in `Chat.tsx`.

---

## Implementation Plan

### Step 1: Fix vite.config.ts env loading
**File:** `frontend/vite.config.ts`
- Wrap `process.loadEnvFile()` in try/catch so build doesn't fail when `.env` is missing.

### Step 2: Fix Socket.io client auth
**File:** `frontend/src/lib/socket.ts`
- Import `useAuthStore` and pass token via `auth: { token }` option.
- Since the store is Zustand (hook-based), use `useAuthStore.getState()` for non-component context.
- Export a function to reconnect with updated token.

**File:** `frontend/src/pages/Chat.tsx`
- Update socket connection to pass auth token.

**File:** `frontend/src/pages/Results.tsx`
- Update socket connection to pass auth token.

### Step 3: Fix leaderboard score leak
**File:** `backend/src/routes/scores.ts`
- In `GET /leaderboard`, compute `total_score` as sum of averages for **revealed** categories only, not all categories.

### Step 4: Fix ProtectedRoute redirect
**File:** `frontend/src/components/ProtectedRoute.tsx`
- Change `/login` redirect to `/` (landing page has login links for all roles).

### Step 5: Add Socket.io to JudgeChat and TeamChat
**File:** `frontend/src/pages/JudgeChat.tsx`
- Add Socket.io connect, `chat:join` for `judge` channel, listen for `chat:message`, `chat:leave` on cleanup.

**File:** `frontend/src/pages/TeamChat.tsx`
- Add Socket.io connect, `chat:join` for `team:{teamId}` channel, listen for `chat:message`, `chat:leave` on cleanup.

### Step 6: Verify
- `npm run typecheck` passes
- `npm run build` passes (with and without `.env`)
- Manual review of Socket.io auth flow
- Manual review of leaderboard total_score computation
