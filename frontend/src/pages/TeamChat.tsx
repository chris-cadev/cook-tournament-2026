import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useChat } from '../lib/useChat'
import ChatInput from '../components/ChatInput'

interface JoinRequest {
  id: number
  team_id: number
  name: string
  email: string
  message: string | null
  status: string
  created_at: string
}

interface TeamChatProps {
  teamSlug: string
  teamName: string
  members?: { name: string; email: string | null }[]
  isCaptain?: boolean
  embedded?: boolean
  joinRequests?: JoinRequest[]
  setJoinRequests?: (reqs: JoinRequest[]) => void
  showRequests?: boolean
  setShowRequests?: (show: boolean) => void
  onBack?: () => void
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function TeamChat({
  teamSlug, teamName, members = [], isCaptain, embedded,
  joinRequests: externalRequests, setJoinRequests: setExternalRequests,
  showRequests: externalShow, setShowRequests: setExternalShow,
  onBack
}: TeamChatProps) {
  const { user } = useAuthStore()
  const channel = `team:${teamSlug}`
  const { messages, loading, messagesEndRef, sendMessage } = useChat(channel)

  const [internalRequests, setInternalRequests] = useState<JoinRequest[]>([])
  const [internalShow, setInternalShow] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [confirmModal, setConfirmModal] = useState<{ type: 'accept' | 'reject'; request: JoinRequest } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const joinRequests = externalRequests ?? internalRequests
  const setJoinRequests = setExternalRequests ?? setInternalRequests
  const showRequests = externalShow ?? internalShow
  const setShowRequests = setExternalShow ?? setInternalShow

  const fetchJoinRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/join-requests/${teamSlug}`)
      if (res.ok) {
        const data = await res.json()
        setJoinRequests(data)
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch join requests:', err)
    }
  }, [teamSlug, setJoinRequests])

  useEffect(() => {
    if (!embedded) fetchJoinRequests()
  }, [fetchJoinRequests, embedded])

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAccept = async (req: JoinRequest) => {
    setActionLoading(req.id)
    try {
      const res = await fetch(`/api/join-requests/${req.id}/accept`, { method: 'PATCH' })
      const data = await res.json()
      if (res.ok) {
        showToast(`${req.name} aceptado(a) en el equipo`)
        if (data.rejected_count > 0) {
          setTimeout(() => showToast(`${data.rejected_count} solicitud(es) rechazada(s) automáticamente`, 'success'), 1500)
        }
        fetchJoinRequests()
      } else {
        showToast(data.error || 'Error al aceptar', 'error')
      }
    } catch {
      showToast('Error de red', 'error')
    } finally {
      setActionLoading(null)
      setConfirmModal(null)
    }
  }

  const handleReject = async (req: JoinRequest) => {
    setActionLoading(req.id)
    try {
      const res = await fetch(`/api/join-requests/${req.id}/reject`, { method: 'PATCH' })
      const data = await res.json()
      if (res.ok) {
        showToast(`${req.name} rechazado(a)`)
        fetchJoinRequests()
      } else {
        showToast(data.error || 'Error al rechazar', 'error')
      }
    } catch {
      showToast('Error de red', 'error')
    } finally {
      setActionLoading(null)
      setConfirmModal(null)
    }
  }

  const senderName = members.find(m => m.email === user?.email)?.name || user?.name || teamName
  const pendingRequests = joinRequests.filter(r => r.status === 'pending')

  const handleSend = async (content: string, attachment?: { url: string; type: string }) => {
    await sendMessage(content, senderName, user?.role || 'team', user?.id ?? null, attachment)
  }

  const chatContent = (
    <>
      {showRequests && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2">
          <p className="text-xs font-bold text-secondary mb-2">Solicitudes para unirse al equipo</p>
          {joinRequests.map((req) => (
            <div key={req.id} className={`rounded-xl p-3 text-sm ${
              req.status === 'pending' ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50 border border-gray-100'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-secondary">{req.name}</p>
                  <p className="text-xs text-gray-500">{req.email}</p>
                </div>
                {req.status === 'pending' && isCaptain ? (
                  <div className="flex gap-1.5 ml-2">
                    <button
                      onClick={() => setConfirmModal({ type: 'accept', request: req })}
                      disabled={actionLoading === req.id}
                      className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {actionLoading === req.id ? '...' : 'Aceptar'}
                    </button>
                    <button
                      onClick={() => setConfirmModal({ type: 'reject', request: req })}
                      disabled={actionLoading === req.id}
                      className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${
                    req.status === 'accepted' ? 'bg-green-100 text-green-700' :
                    req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {req.status === 'accepted' ? 'Aceptado' : req.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                  </span>
                )}
              </div>
              {req.message && (
                <p className="text-xs text-gray-600 mt-1 italic">"{req.message}"</p>
              )}
            </div>
          ))}
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Aún no hay mensajes. ¡Empieza la conversación!</div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {messages.filter(Boolean).map((msg) => {
              const isOwn = msg.sender_id === user?.id
              const senderIsCaptain = msg.sender_role === 'team' && isCaptain
              return (
                <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <span className="text-xs font-bold text-gray-600 ml-2 flex items-center gap-1">
                        {msg.sender_name}
                        {senderIsCaptain && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary-dark text-[10px] font-bold">
                            Capitán
                          </span>
                        )}
                      </span>
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
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        Tú{isCaptain && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded bg-primary/10 text-primary-dark font-bold">
                            Capitán
                          </span>
                        )}
                      </span>
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

      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-secondary text-lg">
              {confirmModal.type === 'accept' ? 'Aceptar solicitud' : 'Rechazar solicitud'}
            </h3>
            <p className="text-sm text-gray-600">
              {confirmModal.type === 'accept'
                ? `¿Deseas aceptar a ${confirmModal.request.name} en tu equipo?`
                : `¿Deseas rechazar la solicitud de ${confirmModal.request.name}?`
              }
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => confirmModal.type === 'accept' ? handleAccept(confirmModal.request) : handleReject(confirmModal.request)}
                disabled={actionLoading !== null}
                className={`flex-1 font-bold py-2.5 rounded-xl text-white transition-colors disabled:opacity-50 text-sm ${
                  confirmModal.type === 'accept' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {actionLoading !== null ? 'Procesando...' : confirmModal.type === 'accept' ? 'Aceptar' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatInput
        placeholder={`Mensaje a ${teamName}...`}
        onSend={handleSend}
      />
    </>
  )

  if (embedded) return chatContent

  return (
    <div className="min-h-screen bg-surface flex flex-col">
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
            Chat privado del equipo
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <button onClick={() => setShowRequests(!showRequests)}
            className="relative bg-primary/10 text-primary-dark px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
            🤝 {pendingRequests.length} solicitud{pendingRequests.length > 1 ? 'es' : ''}
          </button>
        )}
      </header>

      {chatContent}

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
