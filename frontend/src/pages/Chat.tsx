import { useState } from 'react'
import { useChat } from '../lib/useChat'
import { useAuthStore } from '../stores/authStore'
import ChatInput from '../components/ChatInput'

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function roleBadge(role: string, senderId: number | null) {
  const isRegisteredGuest = role === 'guest' && senderId !== null
  const config: Record<string, { label: string; className: string }> = {
    admin: { label: 'Admin', className: 'bg-red-100 text-red-700 ring-1 ring-red-200' },
    judge: { label: 'Juez', className: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200' },
    team: { label: 'Cook', className: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200' },
    guest: isRegisteredGuest
      ? { label: 'Asistente', className: 'bg-green-100 text-green-700 ring-1 ring-green-200' }
      : { label: 'Anónimo', className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
  }
  const { label, className } = config[role] || config.guest
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  )
}

export default function Chat() {
  const { user } = useAuthStore()
  const { messages, loading, guestName, messagesEndRef, sendMessage, loadOlder } = useChat('global', { pollingInterval: 30000 })

  const [chatName, setChatName] = useState(() => {
    if (user) return user.name || user.email || ''
    return guestName || ''
  })
  const [editingName, setEditingName] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const handleSend = async (content: string, attachment?: { url: string; type: string }) => {
    if (!chatName.trim()) return
    await sendMessage(content, chatName.trim(), user?.role || 'guest', user?.id || user?.team_id || null, attachment)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        <header className="sticky top-0 z-10 bg-surface border-b border-gray-200 px-4 py-3">
          <h1 className="font-headline text-2xl font-black text-secondary">Global Chat</h1>
          <p className="text-sm text-gray-500">Canal público — todos pueden ver esto</p>
        </header>

        {user ? (
          <div className="px-4 py-2 border-b flex items-center gap-3 bg-green-50 border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-700">Conectado como:</span>
            {editingName ? (
              <>
                <input
                  type="text"
                  value={chatName}
                  onChange={(e) => setChatName(e.target.value)}
                  className="flex-1 max-w-xs border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                />
                <button
                  onClick={() => setEditingName(false)}
                  className="text-xs font-semibold text-primary-dark bg-primary/10 px-3 py-1.5 rounded-xl hover:bg-primary/20 transition-colors"
                >
                  Guardar
                </button>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-secondary">{chatName}</span>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-gray-400 hover:text-primary transition-colors"
                >
                  Editar
                </button>
              </>
            )}
            {roleBadge(user.role, user.id || null)}
          </div>
        ) : (
          <div className={`px-4 py-2 border-b flex items-center gap-3 ${chatName.trim() ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            {chatName.trim() && <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />}
            <label className="text-sm font-medium text-gray-700 flex-shrink-0">Nombre:</label>
            <input
              type="text"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              placeholder="Escribe tu nombre..."
              autoFocus
              className="flex-1 max-w-xs border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {chatName.trim() && (
              <span className="text-xs text-green-700">✓ Listo</span>
            )}
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando mensajes...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No hay mensajes aún. ¡Empieza la conversación!</div>
          ) : (
            <div className="flex flex-col gap-3">
              {hasMore && (
                <button onClick={() => messages.length > 0 && loadOlder(messages[0].id)}
                  className="self-center text-xs text-gray-400 hover:text-primary py-2 transition-colors">
                  Cargar mensajes anteriores
                </button>
              )}
              {messages.filter(Boolean).map((msg) => (
                <div key={msg.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-primary-dark">
                      {msg.sender_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-secondary">{msg.sender_name}</span>
                      {roleBadge(msg.sender_role, msg.sender_id)}
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
          placeholder="Escribe un mensaje..."
          onSend={handleSend}
          disabled={!chatName.trim()}
        />
      </div>
    </div>
  )
}
