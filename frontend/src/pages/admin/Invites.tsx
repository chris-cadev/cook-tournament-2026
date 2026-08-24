import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Invite {
  id: number
  code: string
  created_by: string
  role: string
  team_id: number | null
  used_by: string | null
  used_at: string | null
  created_at: string
}

export default function Invites() {
  const { token } = useAuthStore()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [inviteRole, setInviteRole] = useState('guest')
  const [lastCreated, setLastCreated] = useState<{ code: string; url: string } | null>(null)

  const fetchInvites = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/invites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setInvites(data)
      }
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchInvites()
  }, [fetchInvites])

  const createInvite = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: inviteRole }),
      })
      if (res.ok) {
        const data = await res.json()
        setLastCreated({ code: data.code, url: data.invite_url })
        fetchInvites()
      }
    } catch (err) {
      console.error('Failed to create invite:', err)
    } finally {
      setCreating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-black text-secondary">Invitaciones</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-600">Genera enlaces únicos para invitar participantes al evento.</p>

        <div className="flex items-center gap-3">
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="guest">Invitado / Espectador</option>
            <option value="team">Cocinero (Equipo)</option>
          </select>
          <button
            onClick={createInvite}
            disabled={creating}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {creating ? 'Creando...' : 'Crear Enlace'}
          </button>
        </div>

        {lastCreated && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <p className="text-sm font-medium text-green-700">Enlace creado:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white border border-green-200 rounded-lg px-3 py-2 break-all">{lastCreated.url}</code>
              <button
                onClick={() => copyToClipboard(lastCreated.url)}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors whitespace-nowrap"
              >
                Copiar
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-headline text-lg font-bold text-secondary">Invitaciones Generadas</h3>
        </div>
        {invites.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">No hay invitaciones aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Código</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Rol</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Creado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invites.map((invite) => (
                  <tr key={invite.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs">{invite.code}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        invite.role === 'team' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {invite.role === 'team' ? 'Cocinero' : 'Invitado'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      {invite.used_at ? (
                        <span className="text-xs text-gray-500">Usado por {invite.used_by}</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">Disponible</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-gray-500">{formatDate(invite.created_at)}</td>
                    <td className="px-6 py-3">
                      {!invite.used_at && (
                        <button
                          onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.code}`)}
                          className="text-primary hover:text-primary-dark text-xs font-medium"
                        >
                          Copiar enlace
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
