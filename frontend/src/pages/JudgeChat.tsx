import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
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

interface JudgeChatProps {
  onBack?: () => void
}

export default function JudgeChat({ onBack }: JudgeChatProps) {
  const { token, user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const channel = 'judge'

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!token) return

    socket.auth = { token }
    socket.connect()

    socket.emit('chat:join', { channel })

    socket.on('chat:history', (data: { channel: string; messages: ChatMessage[] }) => {
      if (data.channel === channel) {
        setMessages(data.messages)
        setLoading(false)
      }
    })

    socket.on('chat:new', (data: { message: ChatMessage }) => {
      if (data.message.channel === channel) {
        setMessages(prev => [...prev, data.message])
      }
    })

    socket.on('chat:error', (data: { error: string }) => {
      console.error('Chat error:', data.error)
    })

    return () => {
      socket.emit('chat:leave', { channel })
      socket.off('chat:history')
      socket.off('chat:new')
      socket.off('chat:error')
      socket.disconnect()
    }
  }, [token, channel])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !token) return
    setSending(true)
    try {
      socket.emit('chat:send', { channel, content: newMessage.trim() })
      setNewMessage('')
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

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-secondary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <span className="material-symbols-outlined text-primary">timer</span>
        <div>
          <h1 className="font-headline text-xl font-black text-secondary">Judges Secure Comms</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-green-600 text-sm">lock</span>
            Private channel
          </p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_name === user?.anonymous_id
              return (
                <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-bold text-gray-600 text-xs">{msg.sender_name}</span>
                        <span className="text-gray-400 text-xs">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 text-gray-900 shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-gray-400 text-xs">{formatTime(msg.created_at)}</span>
                        <span className="font-bold text-primary text-xs">You</span>
                      </div>
                      <div className="bg-primary text-white border-2 border-primary rounded-2xl rounded-tr-sm p-3 shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <div className="sticky bottom-0 bg-surface/90 backdrop-blur-md border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <textarea
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
            placeholder="Discuss entry with judges..."
            rows={1}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary-dark active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
