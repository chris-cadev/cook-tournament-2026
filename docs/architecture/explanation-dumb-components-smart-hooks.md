# Why Dumb Components, Smart Hooks

**Type:** Explanation

## The Problem

React components tend to accumulate logic. A page component starts rendering UI, then
a `useEffect` for a socket listener appears, then a `fetch` call, then state management
for optimistic updates. Before long, the component is 400 lines — half JSX, half
business logic.

This causes:
- **Duplication** — the same socket/event/cleanup pattern copy-pasted across pages
- **Fragile cleanup** — missing `socket.off` handlers, inconsistent dependency arrays
- **Impossible to test** — business logic is entangled with rendering
- **Single point of failure spread across many files** — when the pattern breaks, you fix it everywhere

## The Pattern

**Components render UI. Custom hooks hold logic.**

A custom hook like `useChat(channel)` encapsulates:
- Socket connection and lifecycle (join/leave)
- Event listeners (`chat:message`, `chat:history`, etc.)
- State management (messages array, loading)
- Side effects (polling, optimistic updates)
- Cleanup on unmount

The component calls the hook and gets back `{ messages, sendMessage, loading }`.
It renders JSX. That's it.

## Why This Works

1. **Single source of truth** — one hook, one implementation, one place to fix bugs
2. **Components become reusable** — any page can call `useChat('global')` or `useChat('team:slug')`
3. **Logic is testable** — hooks can be tested independently of rendering
4. **Cleanup is automatic** — the hook handles `socket.off`, `clearInterval`, etc. in one `useEffect` return
5. **New features are additive** — add a new event listener in the hook, all consumers get it

## When to Apply

Extract to a hook when:
- The same pattern appears in 2+ components (chat, notifications, live updates)
- A component has `useEffect` with external connections (sockets, WebSockets, SSE)
- A component manages optimistic updates with temp IDs and rollback

Don't extract when:
- The logic is truly unique to one component
- It's a one-off `fetch` call with no shared pattern
