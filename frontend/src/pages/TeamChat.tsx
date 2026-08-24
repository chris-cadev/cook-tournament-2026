import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../lib/socket'

interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
  attachment_url?: string
  attachment_type?: string
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
  const [uploading, setUploading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    if (token) {
      socket.auth = { token }
      socket.connect()
      socket.emit('chat:join', { channel: `team:${teamId}` })

      socket.on('chat:message', (data: { message: ChatMessage }) => {
        if (data.message.channel === `team:${teamId}`) {
          setMessages((prev) => [...prev, data.message])
        }
      })

      return () => {
        socket.off('chat:message')
        socket.emit('chat:leave', { channel: `team:${teamId}` })
        socket.disconnect()
      }
    }
  }, [fetchMessages, teamId, token])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const sendMessage = async (attachmentUrl?: string, attachmentType?: string) => {
    if ((!newMessage.trim() && !attachmentUrl) || sending || !token) return
    setSending(true)
    try {
      const body: Record<string, string> = { content: newMessage.trim() }
      if (attachmentUrl) {
        body.attachment_url = attachmentUrl
        body.attachment_type = attachmentType || 'image'
      }
      const res = await fetch(`/api/chat/team/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev, data.message])
        setNewMessage('')
      }
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    if (!isImage && !isAudio) { alert('Solo se permiten archivos de imagen o audio.'); return }

    setUploading(true)
    try {
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
      })
      if (!presignRes.ok) { alert('Error al obtener URL de subida'); return }
      const { upload_url, file_url } = await presignRes.json()
      const uploadRes = await fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!uploadRes.ok) { alert('Error al subir archivo'); return }
      await sendMessage(file_url, isImage ? 'image' : 'audio')
    } catch { alert('Error al subir archivo') }
    finally { setUploading(false) }
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
        <div className="flex-1">
          <h1 className="font-headline text-xl font-black text-secondary">{teamName}</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Private Chat
          </p>
        </div>
        <Link to="/team/checklist" className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors" title="Checklist">
          <span className="material-symbols-outlined">checklist</span>
        </Link>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mx-auto mb-2" />
            Loading messages...
          </div>
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
                          <audio controls src={msg.attachment_url} className="mt-2 max-w-xs" />
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
                          <audio controls src={msg.attachment_url} className="mt-2 max-w-xs" />
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
          <input ref={fileInputRef} type="file" accept="image/*,audio/*" onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors disabled:opacity-50"
            title="Adjuntar imagen o audio"
          >
            <span className="material-symbols-outlined">attach_file</span>
          </button>
          <textarea
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
            placeholder={uploading ? 'Subiendo archivo...' : `Message ${teamName}...`}
            rows={1}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending || uploading}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
