import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import TeamEditModal from '../../components/admin/TeamEditModal'
import Spinner from '../../components/ui/Spinner'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: 'pending' | 'confirmed' | 'disqualified'
  station: string | null
  registered_at: string
}

export default function Teams() {
  const { token, logout } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(data)
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const updateTeamStatus = async (id: number, status: string) => {
    if (!token) return
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
    if (res.ok) setTeams(prev => prev.map(t => (t.id === id ? { ...t, status: status as Team['status'] } : t)))
  }

  const deleteTeam = async (id: number) => {
    if (!token || !confirm('¿Estás seguro?')) return
    const res = await fetch(`/api/teams/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setTeams(prev => prev.filter(t => t.id !== id))
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      disqualified: 'bg-red-100 text-red-800',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      disqualified: 'Descalificado',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="font-headline text-xl font-black text-secondary">Panel de Admin</h1>
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="text-sm font-bold text-primary border-b-2 border-primary pb-0.5">Equipos</Link>
            <Link to="/admin/chat" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Chat</Link>
            <Link to="/admin/score-reveal" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Puntuaciones</Link>
            <Link to="/admin/settings" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Configuración</Link>
            <button onClick={() => { logout() }} className="text-sm font-bold text-error hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-headline text-lg font-bold text-secondary">Equipos Registrados</h2>
            <p className="text-sm text-gray-500 mt-1">{teams.length} equipos en total</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-6 py-3 font-bold text-gray-600">Nombre</th>
                  <th className="text-left px-6 py-3 font-bold text-gray-600">Sándwich</th>
                  <th className="text-left px-6 py-3 font-bold text-gray-600">Capitán</th>
                  <th className="text-left px-6 py-3 font-bold text-gray-600">Estado</th>
                  <th className="text-left px-6 py-3 font-bold text-gray-600">Estación</th>
                  <th className="text-right px-6 py-3 font-bold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-secondary">{team.name}</td>
                    <td className="px-6 py-4 text-gray-700">{team.sandwich_name}</td>
                    <td className="px-6 py-4 text-gray-700">{team.captain_email}</td>
                    <td className="px-6 py-4">{statusBadge(team.status)}</td>
                    <td className="px-6 py-4 text-gray-700">{team.station || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {team.status !== 'confirmed' && (
                          <button onClick={() => updateTeamStatus(team.id, 'confirmed')} className="px-3 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                            Confirmar
                          </button>
                        )}
                        <button onClick={() => setEditingTeam(team)} className="px-3 py-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors">
                          Editar
                        </button>
                        <button onClick={() => deleteTeam(team.id)} className="px-3 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {teams.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay equipos registrados aún.
            </div>
          )}
        </div>
      </div>

      {editingTeam && token && (
        <TeamEditModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSave={(updated) => {
            setTeams(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
            setEditingTeam(null)
          }}
          token={token}
        />
      )}
    </div>
  )
}
