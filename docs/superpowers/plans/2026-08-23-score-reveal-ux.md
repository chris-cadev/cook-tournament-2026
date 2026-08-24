# Score Reveal UX — Fix Failing Acceptance Criteria

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 5 unchecked acceptance criteria in the score reveal and results/ceremony UI.

**Architecture:** Frontend-only changes. Add a toast notification system (Zustand store + component), add rank badges and per-category progress bars to the Results page, add a live reveal banner, and wire toasts into the admin reveal flow.

**Tech Stack:** React 18, Zustand, Tailwind CSS (existing design tokens: primary=#f59e0b, secondary=#944a23, tertiary=#006c49, surface=#fdf9e9, error=#ba1a1a, font-headline=Montserrat)

**Spec:** `/home/chris/projects/net.chrislabs/cook-tournament-2026.orchestrator-task-6-milestone-6-score-reveal-ux/ACCEPTANCE.md` (lines 252–266: Results/Ceremony and Shared UI components)

## Failing Criteria Being Fixed

| # | Section | Criterion | Current State |
|---|---------|-----------|---------------|
| 1 | Results/Ceremony | Badge shows rank (1st, 2nd, 3rd) | `Results.tsx:129` shows plain `idx + 1` number |
| 2 | Results/Ceremony | ProgressBar visualizes score per category | No per-category bars exist |
| 3 | Results/Ceremony | Alert displays "Scores being revealed live" banner | No banner when reveal is in progress |
| 4 | Admin Dashboard | Toast displays "Scores revealed!" notification broadcast | Neither `ScoreReveal.tsx` nor `Reveal.tsx` shows toast |
| 5 | Shared | Toast provides global notifications (score reveal) | No toast system exists at all |

## Global Constraints

- Spanish-only UI (no i18n framework) — user-facing strings in Spanish
- Design tokens from `tailwind.config.js`: primary (sandwich orange), secondary (crust brown), tertiary (lettuce green), surface (warm paper white), error (red)
- Extreme roundedness (`borderRadius: { '2xl': '1.5rem' }`)
- Fonts: Montserrat (headlines), Inter (body)
- No new dependencies — use existing Zustand + Tailwind only
- All files written into `src/` (frontend)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/stores/toastStore.ts` | Create | Zustand store for toast state (message, type, auto-dismiss) |
| `frontend/src/components/Toast.tsx` | Create | Toast notification UI component, reads from toastStore |
| `frontend/src/App.tsx` | Modify | Mount `<Toast />` at root level |
| `frontend/src/pages/Results.tsx` | Modify | Add rank badges, per-category progress bars, live reveal banner |
| `frontend/src/pages/admin/ScoreReveal.tsx` | Modify | Show toast on successful category reveal |
| `frontend/src/pages/admin/Reveal.tsx` | Modify | Show toast on successful category reveal |

---

### Task 1: Create Toast Zustand Store

**Files:**
- Create: `frontend/src/stores/toastStore.ts`

**Interfaces:**
- Produces: `useToastStore` with `showToast(message, type?)` action and `toasts` state array

- [ ] **Step 1: Create the toast store**

```typescript
// frontend/src/stores/toastStore.ts
import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastState {
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  dismissToast: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'info') => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },
}))
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/stores/toastStore.ts
git commit -m "feat: add toast Zustand store"
```

---

### Task 2: Create Toast UI Component

**Files:**
- Create: `frontend/src/components/Toast.tsx`

**Interfaces:**
- Consumes: `useToastStore` from `stores/toastStore.ts`
- Produces: `<Toast />` component (rendered at root)

- [ ] **Step 1: Create the Toast component**

```tsx
// frontend/src/components/Toast.tsx
import { useToastStore } from '../stores/toastStore'

const typeStyles: Record<string, string> = {
  success: 'bg-tertiary text-white',
  error: 'bg-error text-white',
  info: 'bg-secondary text-white',
}

export default function Toast() {
  const { toasts, dismissToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${typeStyles[toast.type]} px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between gap-3 animate-slide-in`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-white/80 hover:text-white flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Add slide-in animation to Tailwind config**

Modify `frontend/tailwind.config.js` to add keyframes and animation:

```javascript
// Add to theme.extend:
keyframes: {
  'slide-in': {
    '0%': { transform: 'translateX(100%)', opacity: '0' },
    '100%': { transform: 'translateX(0)', opacity: '1' },
  },
},
animation: {
  'slide-in': 'slide-in 0.3s ease-out',
},
```

- [ ] **Step 3: Mount Toast in App.tsx**

Add `<Toast />` inside `<BrowserRouter>` in `frontend/src/App.tsx`:

```tsx
import Toast from './components/Toast'

// Inside <BrowserRouter>, add <Toast /> as first child:
<BrowserRouter>
  <Toast />
  <Routes>
    ...
  </Routes>
</BrowserRouter>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Toast.tsx frontend/tailwind.config.js frontend/src/App.tsx
git commit -m "feat: add toast notification component with slide-in animation"
```

---

### Task 3: Add Rank Badges to Results Page

**Files:**
- Modify: `frontend/src/pages/Results.tsx`

**Interfaces:**
- Consumes: leaderboard data (existing)

- [ ] **Step 1: Add rank badge helper and update table row**

In `frontend/src/pages/Results.tsx`, replace the rank cell (line 129) with styled badges for 1st/2nd/3rd:

```tsx
// Add helper function before the component:
function rankBadge(idx: number) {
  if (idx === 0) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-white font-bold text-sm shadow-sm">1°</span>
  if (idx === 1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400 text-white font-bold text-sm shadow-sm">2°</span>
  if (idx === 2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-sm shadow-sm">3°</span>
  return <span className="font-bold text-gray-400">{idx + 1}</span>
}
```

Replace `<td className="px-4 py-3 font-bold text-gray-400">{idx + 1}</td>` with:

```tsx
<td className="px-4 py-3">{rankBadge(idx)}</td>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Results.tsx
git commit -m "feat: add styled rank badges (1st gold, 2nd silver, 3rd bronze) to results"
```

---

### Task 4: Add Per-Category Progress Bars and Live Banner to Results Page

**Files:**
- Modify: `frontend/src/pages/Results.tsx`

**Interfaces:**
- Consumes: leaderboard data with `category_scores` and `revealed` arrays (existing from `/api/scores/leaderboard`)

- [ ] **Step 1: Add per-category score bar component**

Add this helper function in `Results.tsx`:

```tsx
function CategoryBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = max > 0 ? (score / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-600 w-24 text-right">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-secondary w-10 text-right">{score.toFixed(1)}</span>
    </div>
  )
}
```

- [ ] **Step 2: Add score bar section below the leaderboard table**

After the `</table>` closing tag (inside the `{leaderboard.length > 0 ? (...) : (...)}` block), add:

```tsx
{/* Per-category score visualization for 1st place */}
{leaderboard.length > 0 && revealedCats.length > 0 && (
  <div className="mt-6 p-4 bg-white rounded-2xl border border-gray-100">
    <h3 className="font-headline text-sm font-bold text-secondary mb-3 uppercase tracking-wide">
      Desglose por Categoría — {leaderboard[0].team_name}
    </h3>
    <div className="space-y-2">
      {revealedCats.map((cat) => (
        <CategoryBar
          key={cat}
          label={cat}
          score={leaderboard[0].category_scores[cat] ?? 0}
          max={10}
        />
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Add "Scores being revealed live" banner**

Before the leaderboard table (after the winner spotlight), add:

```tsx
{/* Live reveal banner */}
{revealedCats.length > 0 && revealedCats.length < categories.length && (
  <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl flex items-center gap-3">
    <span className="w-3 h-3 rounded-full bg-primary animate-pulse flex-shrink-0" />
    <p className="text-sm font-semibold text-primary-dark">
      Puntuaciones siendo reveladas en vivo — {revealedCats.length} de {categories.length} categorías reveladas
    </p>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Results.tsx
git commit -m "feat: add per-category progress bars and live reveal banner to results"
```

---

### Task 5: Wire Toasts into Admin Reveal Pages

**Files:**
- Modify: `frontend/src/pages/admin/ScoreReveal.tsx`
- Modify: `frontend/src/pages/admin/Reveal.tsx`

**Interfaces:**
- Consumes: `useToastStore` from `stores/toastStore.ts` (created in Task 1)

- [ ] **Step 1: Add toast to ScoreReveal.tsx**

In `frontend/src/pages/admin/ScoreReveal.tsx`:

1. Add import: `import { useToastStore } from '../../stores/toastStore'`
2. Inside the component, add: `const { showToast } = useToastStore()`
3. In `handleReveal()`, after `setRevealedCount(prev => prev + 1)` (line 57), add:

```typescript
showToast(`¡Categoría "${category}" revelada!`, 'success')
```

- [ ] **Step 2: Add toast to Reveal.tsx**

In `frontend/src/pages/admin/Reveal.tsx`:

1. Add import: `import { useToastStore } from '../../stores/toastStore'`
2. Inside the component, add: `const { showToast } = useToastStore()`
3. In `handleConfirmReveal()`, after `setRevealedCount(prev => prev + 1)` (line 100), add:

```typescript
showToast(`¡Categoría "${confirmCategory}" revelada!`, 'success')
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/admin/ScoreReveal.tsx frontend/src/pages/admin/Reveal.tsx
git commit -m "feat: show toast notification on score reveal"
```

---

### Task 6: Verify Build

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 2: Run Vite build**

```bash
cd frontend && npx vite build
```

- [ ] **Step 3: Fix any errors and commit if needed**

---

## Spec Coverage Check

| Acceptance Criterion | Task |
|---------------------|------|
| Badge shows rank (1st, 2nd, 3rd) | Task 3 |
| ProgressBar visualizes score per category | Task 4 |
| Alert displays "Scores being revealed live" banner | Task 4 |
| Toast displays "Scores revealed!" notification broadcast | Task 5 |
| Toast provides global notifications (score reveal) | Tasks 1+2 (system), Task 5 (wiring) |
