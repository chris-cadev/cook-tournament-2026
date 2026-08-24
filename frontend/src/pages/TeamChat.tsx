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

interface TeamChatProps {
  teamId: number
  teamName: string
  onBack?: () => void
}

export default function TeamChat({ teamId, teamName, onBack }: TeamChatProps) {
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
      const res = await fetch(`/api/chat/team/${teamId}/messages?limit=50`, {
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
  }, [teamId, token])

  useEffect(() => {
    fetchMessages()

    const channel = `team:${teamId}`
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
  }, [teamId, token, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async (content: string, attachment?: { url: string; type: string }) => {
    if (!token) return
    const res = await fetch(`/api/chat/team/${teamId}/messages`, {
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
        <div>
          <h1 className="font-headline text-xl font-black text-secondary">{teamName}</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Private Chat
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
              const isOwn = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <span className="text-xs font-bold text-gray-600 ml-2">{msg.sender_name}</span>
                      <div className="bg-white text-gray-900 p-3 rounded-xl rounded-bl-none shadow-sm border border-gray-100">
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
                      <div className="bg-primary text-white p-3 rounded-xl rounded-br-none shadow-sm">
                        {msg.content}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
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
        placeholder={`Message ${teamName}...`}
        onSend={sendMessage}
        token={token}
      />
    </div>
  )
}
