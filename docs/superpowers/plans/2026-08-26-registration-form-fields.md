# Registration Form Fields — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add phone number fields for team members and replace equipment_needs textarea with checkboxes in the registration form, plus update backend to accept the new format.

**Architecture:** Frontend-only changes (Registration.tsx) for form fields + two backend route files for equipment_needs object handling.

**Tech Stack:** React, TypeScript, Tailwind CSS, Express, better-sqlite3

**Spec:** User-provided gap descriptions (phone fields, equipment checkboxes)

## Global Constraints

- All text in Spanish
- Use existing Tailwind classes and design conventions
- `font-headline` for headings, Material Symbols Outlined for icons
- Cards: `bg-white rounded-2xl shadow-sm border border-gray-100`
- Backward compatibility: backend must handle both string and object `equipment_needs`

---

## Task 1: Add phone fields to Registration.tsx

**Files:**
- Modify: `frontend/src/pages/Registration.tsx:8-12` (form state)
- Modify: `frontend/src/pages/Registration.tsx:45-58` (validation)
- Modify: `frontend/src/pages/Registration.tsx:60-95` (handleSubmit)
- Modify: `frontend/src/pages/Registration.tsx:144-163` (captain section UI)
- Modify: `frontend/src/pages/Registration.tsx:186-208` (members section UI)

- [ ] **Step 1: Add phone fields to form state (line 8-12)**

Add `captain_phone: ''`, `member2_phone: ''`, `member3_phone: ''` to the initial state object.

- [ ] **Step 2: Add captain_phone validation in blur and validate functions**

In `blur()` (line 30), add: `if (field === 'captain_phone' && !form.captain_phone.trim()) e.captain_phone = 'Necesitamos tu teléfono'`

In `validate()` (line 46), add: `if (!form.captain_phone.trim()) e.captain_phone = 'Necesitamos tu teléfono'`

Add `captain_phone: true` to the touched object in `validate()`.

- [ ] **Step 3: Update handleSubmit to include phone in members (line 65-69)**

Change members array to:
```typescript
const members = [
  { name: form.captain_name.trim(), email: form.captain_email.trim(), phone: form.captain_phone.trim() },
  form.member2.trim() ? { name: form.member2.trim(), email: form.member2_email.trim() || null, phone: form.member2_phone.trim() || null } : null,
  form.member3.trim() ? { name: form.member3.trim(), email: form.member3_email.trim() || null, phone: form.member3_phone.trim() || null } : null,
].filter(Boolean)
```

- [ ] **Step 4: Add captain phone input field after captain email (line 161)**

Insert after the captain email field (line 161):
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Tu teléfono *</label>
  <input type="tel" value={form.captain_phone} onChange={(e) => update('captain_phone', e.target.value)} onBlur={() => blur('captain_phone')}
    className={fieldClass('captain_phone')} placeholder="Tu teléfono *" />
  {errorMsg('captain_phone')}
</div>
```

- [ ] **Step 5: Add phone input fields for member 2 and member 3 (after each email field)**

After member2 email (line 201), add:
```tsx
{form.member2 && (
  <input type="tel" placeholder="Miembro 2 — teléfono (opcional)" value={form.member2_phone} onChange={(e) => update('member2_phone', e.target.value)}
    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50" />
)}
```

After member3 email (line 206), add similar for member3_phone.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Registration.tsx
git commit -m "feat: add phone fields to team registration form"
```

---

## Task 2: Replace equipment textarea with checkboxes

**Files:**
- Modify: `frontend/src/pages/Registration.tsx:8-12` (form state)
- Modify: `frontend/src/pages/Registration.tsx:60-95` (handleSubmit)
- Modify: `frontend/src/pages/Registration.tsx:238-250` (equipment UI section)

- [ ] **Step 1: Replace equipment_needs string with 3 booleans in form state**

Remove `equipment_needs: ''` from state. Add:
```typescript
needs_outlet: false, needs_airfryer: false, own_grill: false,
```

- [ ] **Step 2: Update handleSubmit to send equipment_needs as object (line 79)**

Replace:
```typescript
equipment_needs: form.equipment_needs.trim() || null,
```
With:
```typescript
equipment_needs: { needs_outlet: form.needs_outlet, needs_airfryer: form.needs_airfryer, own_grill: form.own_grill },
```

- [ ] **Step 3: Replace textarea section with checkboxes (lines 244-249)**

Replace the textarea block with:
```tsx
<div className="pl-8 space-y-3">
  <label className="flex items-center gap-3 cursor-pointer group">
    <input type="checkbox" checked={form.needs_outlet} onChange={(e) => update('needs_outlet', String(e.target.checked))}
      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
    <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Necesito enchufe eléctrico</span>
  </label>
  <label className="flex items-center gap-3 cursor-pointer group">
    <input type="checkbox" checked={form.needs_airfryer} onChange={(e) => update('needs_airfryer', String(e.target.checked))}
      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
    <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Necesito freidora de aire</span>
  </label>
  <label className="flex items-center gap-3 cursor-pointer group">
    <input type="checkbox" checked={form.own_grill} onChange={(e) => update('own_grill', String(e.target.checked))}
      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50 accent-primary" />
    <span className="text-sm text-gray-700 group-hover:text-secondary transition-colors">Traigo mi propia plancha</span>
  </label>
</div>
```

- [ ] **Step 4: Remove the character count paragraph (line 248)**

Delete `<p className="text-xs text-gray-400 mt-0.5">{form.equipment_needs.length}/200</p>`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Registration.tsx
git commit -m "feat: replace equipment textarea with checkboxes"
```

---

## Task 3: Update backend for equipment_needs object format

**Files:**
- Modify: `backend/src/routes/teams.ts:43` (register endpoint)
- Modify: `backend/src/routes/admin-teams.ts:33` (admin create endpoint)

- [ ] **Step 1: Update teams.ts register endpoint (line 43)**

Change the INSERT to handle both formats. Before the INSERT, add normalization:
```typescript
const equipmentJson = typeof equipment_needs === 'object' && equipment_needs !== null
  ? JSON.stringify(equipment_needs)
  : equipment_needs || null
```

Then use `equipmentJson` in the INSERT params instead of `equipment_needs || null`.

- [ ] **Step 2: Update admin-teams.ts (line 33)**

Apply the same normalization pattern before the INSERT.

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/teams.ts backend/src/routes/admin-teams.ts
git commit -m "feat: accept equipment_needs as object in registration"
```

---

## Task 4: Verify

- [ ] **Step 1: Run frontend lint/typecheck**

```bash
cd frontend && npm run lint && npm run typecheck
```

- [ ] **Step 2: Run backend lint/typecheck**

```bash
cd backend && npm run lint && npm run typecheck
```

- [ ] **Step 3: Manual smoke test**

Start dev server, navigate to registration page, verify:
- Captain phone field appears and is required
- Member phone fields appear when name is entered
- Checkboxes replace textarea
- Form submits with correct payload structure
