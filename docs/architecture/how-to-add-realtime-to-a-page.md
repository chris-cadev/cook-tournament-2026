# How to Add Real-Time Chat to a New Page

**Type:** How-to guide

## Prerequisites

- The `useChat` hook exists at `frontend/src/lib/useChat.ts`
- The `ChatInput` component exists at `frontend/src/components/ChatInput.tsx`
- Backend socket handler is set up at `backend/src/socket.ts`

## Steps

### 1. Create the page component

```tsx
import { useChat } from '../lib/useChat'
import { useAuthStore } from '../stores/authStore'
import ChatInput from '../components/ChatInput'

export default function MyChat({ onBack }: { onBack?: () => void }) {
  const { user } = useAuthStore()
  const { messages, loading, messagesEndRef, sendMessage } = useChat('my-channel')

  const handleSend = async (content: string, attachment?: { url: string; type: string }) => {
    await sendMessage(content, user?.name || 'Anonymous', user?.role || 'guest', user?.id, attachment)
  }

  return (
    <div>
      <header>My Chat</header>
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div>Loading...</div>
        ) : messages.length === 0 ? (
          <div>No messages yet.</div>
        ) : (
          messages.map(msg => <div key={msg.id}>{msg.sender_name}: {msg.content}</div>
        )}
        <div ref={messagesEndRef} />
      </main>
      <ChatInput placeholder="Type a message..." onSend={handleSend} />
    </div>
  )
}
```

### 2. Register the channel in backend access control

Add your channel to `validateChannelAccess` in `backend/src/socket.ts`:

```typescript
if (channel === 'my-channel') {
  return user.role === 'admin' || user.role === 'team'
}
```

### 3. Add a REST endpoint (optional)

If you want HTTP POST fallback, add a route in `backend/src/routes/chat.ts`.
The socket handler already broadcasts to the room, so messages sent via HTTP
appear in real-time for everyone connected.

### 4. Configure polling (optional)

Pass `pollingInterval` to `useChat` for a safety net:

```typescript
const { messages, ... } = useChat('my-channel', { pollingInterval: 30000 })
```

## What the Hook Handles

- Socket connection and `chat:join` on mount
- Event listeners for `chat:message`, `chat:new`, `chat:history`
- Optimistic updates (temp ID, replace with server response)
- `chat:leave` and `socket.off` cleanup on unmount
- Initial message fetch via REST
- Polling fallback (if configured)

You don't need to write any of that. Just call the hook.
