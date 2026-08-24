import { useState, useEffect, useRef, useCallback } from 'react'
import { connectSocket } from '../lib/socket'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../lib/socket'

interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_anonymous_id: string | null
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
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasOlder, setHasOlder] = useState(true)
  const [uploading, setUploading] = useState(false)
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
        setHasOlder(data.messages.length === 50)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasOlder || messages.length === 0 || !token) return
    setLoadingOlder(true)
    try {
      const oldestId = messages[0].id
      const res = await fetch(`/api/chat/judge/messages?limit=50&before=${oldestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...data.messages, ...prev])
        setHasOlder(data.messages.length === 50)
      }
    } catch (err) {
      console.error('Failed to load older messages:', err)
    } finally {
      setLoadingOlder(false)
    }
  }, [loadingOlder, hasOlder, messages, token])

  useEffect(() => {
    fetchMessages()
    if (token) {
      socket.connect()
      socket.on('chat:new', (data: { message: ChatMessage }) => {
        if (data.message.channel === 'judge') {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev
            return [...prev, data.message]
          })
        }
      })
      socket.emit('chat:join', { channel: 'judge' })
    }
    return () => {
      socket.off('chat:new')
      socket.emit('chat:leave', { channel: 'judge' })
      socket.disconnect()
    }
  }, [fetchMessages, token])

  useEffect(() => {
    if (token) {
      const socket = connectSocket(token)
      socket.connect()

      socket.on('chat:message', (data: { message: ChatMessage }) => {
        if (data.message.channel === 'judge') {
          setMessages(prev => [...prev, data.message])
        }
      })

      socket.emit('chat:join', { channel: 'judge' })

      return () => {
        socket.off('chat:message')
        socket.emit('chat:leave', { channel: 'judge' })
        socket.disconnect()
      }
    }
  }, [token])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !token) return
    setSending(true)
    try {
      const res = await fetch('/api/chat/judge/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !token) return
    e.target.value = ''

    setUploading(true)
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      })
      if (!presignRes.ok) {
        const err = await presignRes.json()
        alert(err.error || 'Upload failed')
        return
      }
      const { upload_url, file_url } = await presignRes.json()
      await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      const attachmentType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : null
      const res = await fetch('/api/chat/judge/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: '', attachment_url: file_url, attachment_type: attachmentType }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, data.message])
      }
    } catch {
      alert('Upload failed')
    } finally {
      setUploading(false)
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
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {hasOlder && (
              <button
                onClick={loadOlder}
                disabled={loadingOlder}
                className="text-sm text-primary hover:underline disabled:opacity-50 self-center"
              >
                {loadingOlder ? 'Loading...' : 'Load older messages'}
              </button>
            )}
            {messages.map((msg) => {
              const isOwn = msg.sender_anonymous_id === user?.anonymous_id
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
                          <audio controls src={msg.attachment_url} className="mt-2 max-w-xs" />
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
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio controls src={msg.attachment_url} className="mt-2 max-w-xs" />
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

      {/* Input */}
      <div className="sticky bottom-0 bg-surface/90 backdrop-blur-md border-t border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-end gap-2">
          <label className={`flex items-center justify-center w-10 h-10 rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-50' : ''}`}>
            <span className="material-symbols-outlined text-gray-500 text-xl">attach_file</span>
            <input type="file" accept="image/*,audio/*" onChange={handleFileUpload} className="hidden" disabled={uploading} />
          </label>
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
