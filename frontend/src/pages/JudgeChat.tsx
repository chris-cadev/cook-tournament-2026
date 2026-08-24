import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
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

interface JudgeChatProps {
  onBack?: () => void
}

export default function JudgeChat({ onBack }: JudgeChatProps) {
  const { token, user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/chat/judge/messages?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchMessages()

    const channel = 'judge'
    socket.auth = { token }
    socket.connect()
    socket.emit('chat:join', { channel })

    const handleMessage = (data: { message: ChatMessage }) => {
      if (data.message.channel === channel) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    }

    const handleHistory = (data: { channel: string; messages: ChatMessage[] }) => {
      if (data.channel === channel && data.messages.length > 0) {
        setMessages(data.messages)
      }
    }

    socket.on('chat:message', handleMessage)
    socket.on('chat:new', handleMessage)
    socket.on('chat:history', handleHistory)

    return () => {
      socket.emit('chat:leave', { channel })
      socket.off('chat:message', handleMessage)
      socket.off('chat:new', handleMessage)
      socket.off('chat:history', handleHistory)
      socket.disconnect()
    }
  }, [token, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async (content: string, attachment?: { url: string; type: string }) => {
    if (!token) return
    const res = await fetch('/api/chat/judge/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        content: content || (attachment ? '[attachment]' : ''),
        attachment_url: attachment?.url || null,
        attachment_type: attachment?.type || null,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
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

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id?.toString() === user?.anonymous_id
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
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                        )}
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
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl opacity-90" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                        )}
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

      <ChatInput
        placeholder="Discuss entry with judges..."
        onSend={sendMessage}
        token={token}
      />
    </div>
  )
}
