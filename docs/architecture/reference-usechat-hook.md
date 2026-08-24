# useChat Hook Reference

**Type:** Reference

## Import

```typescript
import { useChat, ChatMessage } from '../lib/useChat'
```

## Signature

```typescript
function useChat(channel: string, options?: UseChatOptions): UseChatResult
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | Yes | Socket room name. Examples: `'global'`, `'team:slug'`, `'judge'` |
| `options` | `UseChatOptions` | No | Configuration object |

### UseChatOptions

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `pollingInterval` | `number` | `undefined` (disabled) | Milliseconds between polling fallback fetches. Set to `30000` for 30s polling. |

## Return Value

| Field | Type | Description |
|-------|------|-------------|
| `messages` | `ChatMessage[]` | Array of messages in the channel |
| `loading` | `boolean` | `true` while initial fetch is in progress |
| `guestName` | `string \| null` | Assigned guest name (only for `'global'` channel) |
| `messagesEndRef` | `React.RefObject<HTMLDivElement>` | Ref to attach to bottom of message list for auto-scroll |
| `scrollToBottom` | `() => void` | Manually scroll to bottom |
| `sendMessage` | `(content, senderName, senderRole, senderId?, attachment?) => Promise<void>` | Send a message with optimistic update |
| `loadOlder` | `(beforeId: number) => Promise<void>` | Fetch messages older than `beforeId` |

### sendMessage Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `content` | `string` | Yes | Message text |
| `senderName` | `string` | Yes | Display name for the sender |
| `senderRole` | `string` | Yes | Role: `'admin'`, `'team'`, `'judge'`, `'guest'` |
| `senderId` | `number \| null` | No | User ID for own-message detection |
| `attachment` | `{ url: string; type: string }` | No | File attachment (image or audio) |

## ChatMessage Interface

```typescript
interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
  attachment_url: string | null
  attachment_type: string | null
  created_at: string
}
```

## Socket Events Handled

| Event | Direction | Description |
|-------|-----------|-------------|
| `chat:join` | Emit | Joins the socket room on mount |
| `chat:leave` | Emit | Leaves the room on unmount |
| `chat:message` | Listen | Incoming message from another user |
| `chat:new` | Listen | Duplicate listener for incoming messages |
| `chat:history` | Listen | Initial message history after joining |
| `chat:guest-name` | Listen | Guest name assignment (global channel only) |

## Files

- Hook: `frontend/src/lib/useChat.ts`
- Socket client: `frontend/src/lib/socket.ts`
- Shared input: `frontend/src/components/ChatInput.tsx`
- Backend socket: `backend/src/socket.ts`
