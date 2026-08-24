import { useState, useEffect, useRef, useCallback } from 'react'
import { socket } from '../lib/socket'
import ChatInput from '../components/ChatInput'

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

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [senderName, setSenderName] = useState(() => localStorage.getItem('chat_name') || '')
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/global/messages?limit=50')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setHasMore(data.messages.length === 50)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadOlder = async () => {
    if (messages.length === 0) return
    try {
      const res = await fetch(`/api/chat/global/messages?limit=50&before=${messages[0].id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages.length > 0) {
          setMessages((prev) => [...data.messages, ...prev])
          setHasMore(data.messages.length === 50)
        } else {
          setHasMore(false)
        }
      }
    } catch (err) {
      console.error('Failed to load older messages:', err)
    }
  }

  useEffect(() => {
    fetchMessages()
    socket.connect()

    socket.on('chat:message', (data: { message: ChatMessage }) => {
      if (data.message.channel === 'global') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    })

    socket.on('chat:new', (data: { message: ChatMessage }) => {
      if (data.message.channel === 'global') {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    })

    socket.on('chat:history', (data: { channel: string; messages: ChatMessage[] }) => {
      if (data.channel === 'global' && data.messages.length > 0) {
        setMessages(data.messages)
      }
    })

    socket.emit('chat:join', { channel: 'global' })

    return () => {
      socket.off('chat:message')
      socket.off('chat:new')
      socket.off('chat:history')
      socket.emit('chat:leave', { channel: 'global' })
      socket.disconnect()
    }
  }, [fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const sendMessage = async (content: string, attachment?: { url: string; type: string }) => {
    if (!senderName.trim()) {
      alert('Please enter your name first.')
      return
    }

    const res = await fetch('/api/chat/global/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_name: senderName.trim(),
        content: content || (attachment ? '[attachment]' : ''),
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      localStorage.setItem('chat_name', senderName.trim())
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      team: 'bg-blue-100 text-blue-700',
      judge: 'bg-purple-100 text-purple-700',
      guest: 'bg-gray-100 text-gray-600',
    }
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors[role] || colors.guest}`}>
        {role}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <header className="sticky top-0 z-10 bg-surface border-b border-gray-200 px-4 py-3">
          <h1 className="font-headline text-2xl font-black text-secondary">Global Chat</h1>
          <p className="text-sm text-gray-500">Public channel — everyone can see this</p>
        </header>

        {!senderName && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Your display name</label>
            <input
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full max-w-xs border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
          ) : (
            <div className="flex flex-col gap-3">
              {hasMore && (
                <button onClick={loadOlder}
                  className="self-center text-xs text-gray-400 hover:text-primary py-2 transition-colors">
                  Cargar mensajes anteriores
                </button>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-dark">
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-secondary">{msg.sender_name}</span>
                      {roleBadge(msg.sender_role)}
                      <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-gray-800 text-sm break-words">{msg.content}</p>
                    {msg.attachment_url && msg.attachment_type === 'image' && (
                      <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl shadow-sm" />
                    )}
                    {msg.attachment_url && msg.attachment_type === 'audio' && (
                      <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <ChatInput
          placeholder="Type a message..."
          onSend={sendMessage}
          disabled={!senderName.trim()}
        />
      </div>
    </div>
  )
}
