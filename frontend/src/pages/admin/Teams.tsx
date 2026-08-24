import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

export default function Teams() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editStation, setEditStation] = useState('')

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTeams(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  async function handleUpdate() {
    if (!editingTeam || !token) return
    try {
      const res = await fetch(`/api/teams/${editingTeam.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: editStatus, station: editStation || null }),
      })
      if (res.ok) {
        setEditingTeam(null)
        fetchTeams()
      }
    } catch (err) {
      console.error('Failed to update team:', err)
    }
  }

  async function handleDelete(id: number) {
    if (!token || !confirm('¿Eliminar este equipo?')) return
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) fetchTeams()
    } catch (err) {
      console.error('Failed to delete team:', err)
    }
  }

  function statusBadge(status: string) {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      disqualified: 'bg-red-100 text-red-800',
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Equipos Registrados</h1>
        <p className="text-gray-500 mb-6">{teams.length} equipos</p>

        {teams.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
            No hay equipos registrados aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <thead>
                <tr className="bg-secondary/5 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Sándwich</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Capitán</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden lg:table-cell">Estación</th>
                  <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-sm text-gray-500 sm:hidden">{team.sandwich_name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{team.sandwich_name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{team.captain_email}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(team.status)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{team.station || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {team.status === 'pending' && (
                          <button
                            onClick={async () => {
                              if (!token) return
                              await fetch(`/api/teams/${team.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ status: 'confirmed' }),
                              })
                              fetchTeams()
                            }}
                            className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1 rounded-lg transition-colors"
                          >
                            Confirmar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingTeam(team)
                            setEditStatus(team.status)
                            setEditStation(team.station || '')
                          }}
                          className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded-lg transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(team.id)}
                          className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1 rounded-lg transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Edit Modal */}
        {editingTeam && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
              <h2 className="font-headline text-xl font-bold text-secondary mb-4">
                Editar: {editingTeam.name}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="disqualified">Descalificado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estación</label>
                  <input
                    type="text"
                    value={editStation}
                    onChange={(e) => setEditStation(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Ej: Mesa 1"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setEditingTeam(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-semibold py-2 rounded-xl transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
