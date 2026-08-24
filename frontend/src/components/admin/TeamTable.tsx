import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../Modal'
import TeamEditModal from './TeamEditModal'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: 'pending' | 'confirmed' | 'disqualified'
  station: string | null
}

const statusStyles: Record<Team['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  disqualified: 'bg-red-100 text-red-800',
}

const statusLabels: Record<Team['status'], string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  disqualified: 'Descalificado',
}

export default function TeamTable() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchTeams = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(Array.isArray(data) ? data : data.teams || [])
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

  const handleDelete = async () => {
    if (!deletingTeam || !token) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/teams/${deletingTeam.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTeams(prev => prev.filter(t => t.id !== deletingTeam.id))
        setDeletingTeam(null)
      }
    } catch (err) {
      console.error('Failed to delete team:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary/5 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
              <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Capitán</th>
              <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Estado</th>
              <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Estación</th>
              <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {teams.map(team => (
              <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-semibold text-secondary">{team.name}</div>
                  <div className="text-xs text-gray-500 md:hidden">{team.sandwich_name}</div>
                </td>
                <td className="px-4 py-3 text-gray-600">{team.captain_email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[team.status]}`}>
                    {statusLabels[team.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{team.station || '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingTeam(team)}
                    className="text-primary hover:bg-primary/10 px-2 py-1 rounded-lg text-xs font-medium transition-colors mr-1"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => setDeletingTeam(team)}
                    className="text-error hover:bg-error/10 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {teams.length === 0 && (
          <div className="text-center py-8 text-gray-500">No hay equipos registrados.</div>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {teams.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-2xl">No hay equipos registrados.</div>
        ) : (
          teams.map(team => (
            <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-headline font-bold text-secondary">{team.name}</h3>
                  <p className="text-xs text-gray-500">{team.sandwich_name}</p>
                </div>
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusStyles[team.status]}`}>
                  {statusLabels[team.status]}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1">{team.captain_email}</p>
              <p className="text-sm text-gray-500 mb-3">Estación: {team.station || '—'}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingTeam(team)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-xl transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => setDeletingTeam(team)}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-error bg-error/10 hover:bg-error/20 rounded-xl transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <TeamEditModal
        open={editingTeam !== null}
        onClose={() => setEditingTeam(null)}
        team={editingTeam}
        onSaved={fetchTeams}
      />

      <Modal
        open={deletingTeam !== null}
        onClose={() => setDeletingTeam(null)}
        onConfirm={handleDelete}
        title="Eliminar equipo"
        message={`¿Estás seguro de eliminar "${deletingTeam?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </>
  )
}
