import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import TeamEditModal from '../../components/admin/TeamEditModal'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  disqualified: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  disqualified: 'Descalificado',
}

export default function Teams() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Team | null>(null)

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTeams(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const handleDelete = async (team: Team) => {
    if (!token || !confirm(`¿Eliminar equipo "${team.name}"?`)) return
    await fetch(`/api/teams/${team.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchTeams()
  }

  const handleConfirm = async (team: Team) => {
    if (!token) return
    await fetch(`/api/teams/${team.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: 'confirmed' }),
    })
    fetchTeams()
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
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Equipos</h1>
        <p className="text-gray-500 mb-6">{teams.length} equipos registrados</p>

        {teams.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            No hay equipos registrados aún.
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/5 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Sándwich</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden lg:table-cell">Capitán</th>
                    <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Estación</th>
                    <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map(team => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-secondary">{team.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{team.sandwich_name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{team.captain_email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColors[team.status] || 'bg-gray-100 text-gray-600'}`}>
                          {statusLabels[team.status] || team.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{team.station || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {team.status === 'pending' && (
                            <button
                              onClick={() => handleConfirm(team)}
                              className="text-green-600 hover:bg-green-50 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                            >
                              Confirmar
                            </button>
                          )}
                          <button
                            onClick={() => setEditing(team)}
                            className="text-primary hover:bg-primary/10 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(team)}
                            className="text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
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
          </div>
        )}
      </div>

      {editing && token && (
        <TeamEditModal
          team={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchTeams() }}
          token={token}
        />
      )}
    </div>
  )
}
