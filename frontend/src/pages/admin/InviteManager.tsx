import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Spinner from '../../components/ui/Spinner'

interface Invite {
  id: number
  code: string
  message: string | null
  created_by: string | null
  uses: number
  created_at: string
}

export default function InviteManager() {
  const { token, logout } = useAuthStore()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [created, setCreated] = useState<{ code: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchInvites = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/invites', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setInvites(await res.json())
    } finally { setLoading(false) }
  }, [token])

  useEffect(() => { fetchInvites() }, [fetchInvites])

  const generateInvite = async () => {
    if (!token) return
    const res = await fetch('/api/invites/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: message || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      const url = `${window.location.origin}/invite/${data.code}`
      setCreated({ code: data.code, url })
      setMessage('')
      fetchInvites()
    }
  }

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const baseUrl = window.location.origin

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="font-headline text-xl font-black text-secondary">Panel de Admin</h1>
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Equipos</Link>
            <Link to="/admin/chat" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Chat</Link>
            <Link to="/admin/score-reveal" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Puntuaciones</Link>
            <Link to="/admin/settings" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Configuración</Link>
            <button onClick={() => { logout() }} className="text-sm font-bold text-error hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-1">Invitaciones</h2>
          <p className="text-sm text-gray-500">Genera enlaces únicos para invitar personas al evento.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-headline text-base font-bold text-secondary">Generar nueva invitación</h3>
          <input
            type="text"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Mensaje opcional (ej: ¡Te esperamos!)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={generateInvite}
            className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Generar enlace
          </button>

          {created && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-green-800">Invitación creada:</p>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white px-3 py-1.5 rounded-lg border border-green-200 flex-1 truncate">{created.url}</code>
                <button
                  onClick={() => copyUrl(created.url)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-headline text-base font-bold text-secondary mb-4">Invitaciones existentes</h3>
          {loading ? (
            <Spinner />
          ) : invites.length === 0 ? (
            <p className="text-sm text-gray-500">No hay invitaciones aún.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 font-medium text-gray-500">Código</th>
                    <th className="text-left py-2 font-medium text-gray-500">Mensaje</th>
                    <th className="text-center py-2 font-medium text-gray-500">Usos</th>
                    <th className="text-left py-2 font-medium text-gray-500">Creado</th>
                    <th className="text-right py-2 font-medium text-gray-500">Enlace</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invites.map(inv => (
                    <tr key={inv.id}>
                      <td className="py-2 font-mono text-xs">{inv.code}</td>
                      <td className="py-2 text-gray-600">{inv.message || '—'}</td>
                      <td className="py-2 text-center">{inv.uses}</td>
                      <td className="py-2 text-gray-500 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => copyUrl(`${baseUrl}/invite/${inv.code}`)}
                          className="text-primary hover:text-primary-dark text-xs font-bold"
                        >
                          {copied ? 'Copiado' : 'Copiar enlace'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
