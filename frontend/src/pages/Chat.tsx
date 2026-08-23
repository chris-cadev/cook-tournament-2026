import { useState, useEffect, useRef, useCallback } from 'react'
import { socket } from '../lib/socket'

interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
  created_at: string
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [senderName, setSenderName] = useState(() => localStorage.getItem('chat_name') || '')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    socket.connect()

    socket.on('chat:message', (data: { message: ChatMessage }) => {
      if (data.message.channel === 'global') {
        setMessages(prev => [...prev, data.message])
      }
    })

    socket.emit('chat:join', { channel: 'global' })

    return () => {
      socket.off('chat:message')
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

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return
    if (!senderName.trim()) {
      alert('Please enter your name first.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/chat/global/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender_name: senderName.trim(), content: newMessage.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        localStorage.setItem('chat_name', senderName.trim())
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
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
        {/* Header */}
        <header className="sticky top-0 z-10 bg-surface border-b border-gray-200 px-4 py-3">
          <h1 className="font-headline text-2xl font-black text-secondary">Global Chat</h1>
          <p className="text-sm text-gray-500">Public channel — everyone can see this</p>
        </header>

        {/* Name input (if not set) */}
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

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
          ) : (
            <div className="flex flex-col gap-3">
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
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        {/* Input */}
        <div className="sticky bottom-0 bg-surface border-t border-gray-200 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
              placeholder="Type a message..."
              rows={1}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || !senderName.trim()}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
