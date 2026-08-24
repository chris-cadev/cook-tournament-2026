import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../lib/socket'
import { uploadFile } from '../lib/upload'
import Spinner from '../components/ui/Spinner'

interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
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
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingAttachment, setPendingAttachment] = useState<{ file_url: string; attachment_type: 'image' | 'audio' } | null>(null)

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
    socket.connect()
    socket.on('chat:history', (data: { channel: string; messages: ChatMessage[] }) => {
      if (data.channel === `team:${teamId}`) {
        setMessages(data.messages)
        setLoading(false)
      }
    })

    socket.on('chat:new', (data: { message: ChatMessage }) => {
      if (data.message.channel === `team:${teamId}`) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    })
    socket.emit('chat:join', { channel: `team:${teamId}` })

    return () => {
      socket.off('chat:history')
      socket.off('chat:new')
      socket.emit('chat:leave', { channel: `team:${teamId}` })
      socket.disconnect()
    }
  }, [fetchMessages, teamId])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || sending || !token) return
    setSending(true)
    try {
      const body: Record<string, unknown> = {
        content: newMessage.trim() || (pendingAttachment ? '[Attachment]' : ''),
      }
      if (pendingAttachment) {
        body.attachment_url = pendingAttachment.file_url
        body.attachment_type = pendingAttachment.attachment_type
      }

      const res = await fetch(`/api/chat/team/${teamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        setPendingAttachment(null)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadFile(file, token)
    if (result) {
      setPendingAttachment(result)
    }
    e.target.value = ''
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
        <div>
          <h1 className="font-headline text-xl font-black text-secondary">{teamName}</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Private Chat
          </p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="sm" /></div>
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
                        {(msg as any).attachment_url && (msg as any).attachment_type === 'image' && (
                          <img src={(msg as any).attachment_url} alt="attachment" className="mt-2 rounded-xl max-h-48 object-cover" />
                        )}
                        {(msg as any).attachment_url && (msg as any).attachment_type === 'audio' && (
                          <audio src={(msg as any).attachment_url} controls className="mt-2 w-full max-w-xs" />
                        )}
                      </div>
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <div className="bg-primary text-white p-3 rounded-xl rounded-br-none shadow-sm">
                        {msg.content}
                        {(msg as any).attachment_url && (msg as any).attachment_type === 'image' && (
                          <img src={(msg as any).attachment_url} alt="attachment" className="mt-2 rounded-xl max-h-48 object-cover" />
                        )}
                        {(msg as any).attachment_url && (msg as any).attachment_type === 'audio' && (
                          <audio src={(msg as any).attachment_url} controls className="mt-2 w-full max-w-xs" />
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

      {/* Input */}
        <div className="sticky bottom-0 bg-surface border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*,audio/*" onChange={handleFileSelect} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 text-gray-500 hover:text-secondary hover:bg-gray-100 rounded-xl transition-colors"
            title="Attach image or audio"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" /></svg>
          </button>
          {pendingAttachment && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary-dark text-xs px-3 py-1.5 rounded-xl">
              {pendingAttachment.attachment_type === 'image' ? '📷' : '🎵'} Attached
              <button onClick={() => setPendingAttachment(null)} className="hover:text-error">✕</button>
            </div>
          )}
          <textarea
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
            placeholder={`Message ${teamName}...`}
            rows={1}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !pendingAttachment) || sending}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
