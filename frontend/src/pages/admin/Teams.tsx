import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import Navbar from '../../components/Navbar'

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
  const addToast = useToastStore((s) => s.addToast)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Team | null>(null)
  const [editForm, setEditForm] = useState({ status: '', station: '' })

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTeams(await res.json())
    } catch {
      console.error('Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const openEdit = (team: Team) => {
    setEditing(team)
    setEditForm({ status: team.status, station: team.station || '' })
  }

  const saveEdit = async () => {
    if (!editing || !token) return
    try {
      const res = await fetch(`/api/teams/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        addToast('Equipo actualizado', 'success')
        setEditing(null)
        fetchTeams()
      }
    } catch {
      addToast('Error al actualizar', 'error')
    }
  }

  const deleteTeam = async (id: number) => {
    if (!token || !confirm('Eliminar este equipo?')) return
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        addToast('Equipo eliminado', 'success')
        fetchTeams()
      }
    } catch {
      addToast('Error al eliminar', 'error')
    }
  }

  const statusColor = (status: string) => {
    if (status === 'confirmed') return 'bg-tertiary/10 text-tertiary'
    if (status === 'disqualified') return 'bg-error/10 text-error'
    return 'bg-primary/10 text-primary-dark'
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Gestión de Equipos</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay equipos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-secondary/5 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Sándwich</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden lg:table-cell">Capitán</th>
                    <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                    <th className="text-center px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Estación</th>
                    <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map((team) => (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-secondary">{team.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{team.sandwich_name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{team.captain_email}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(team.status)}`}>
                          {team.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500 hidden md:table-cell">
                        {team.station || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(team)}
                          className="text-primary-dark hover:text-primary text-xs font-bold mr-2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="text-gray-400 hover:text-error text-xs font-bold"
                        >
                          Eliminar
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

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">
              Editar: {editing.name}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                  value={editForm.station}
                  onChange={(e) => setEditForm((p) => ({ ...p, station: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej: Mesa 1"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-gray-600 font-medium rounded-xl hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
