import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/ui/Toast'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

export default function AdminTeams() {
  const { token } = useAuthStore()
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Team | null>(null)
  const [editStation, setEditStation] = useState('')
  const [editStatus, setEditStatus] = useState('')

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setTeams(await res.json())
    } catch {
      toast('Error al cargar equipos', 'error')
    } finally {
      setLoading(false)
    }
  }, [token, toast])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  async function handleUpdate() {
    if (!editing || !token) return
    try {
      const res = await fetch(`/api/teams/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: editStatus, station: editStation || null }),
      })
      if (res.ok) {
        toast('Equipo actualizado', 'success')
        setEditing(null)
        fetchTeams()
      }
    } catch {
      toast('Error al actualizar', 'error')
    }
  }

  async function handleDelete(id: number) {
    if (!token || !confirm('¿Eliminar este equipo?')) return
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        toast('Equipo eliminado', 'success')
        fetchTeams()
      }
    } catch {
      toast('Error al eliminar', 'error')
    }
  }

  function statusColor(s: string) {
    if (s === 'confirmed') return 'bg-tertiary/10 text-tertiary'
    if (s === 'disqualified') return 'bg-error/10 text-error'
    return 'bg-primary/10 text-primary'
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Equipos Registrados</h1>
        <p className="text-gray-500 mb-6">{teams.length} equipo(s) registrado(s)</p>

        {teams.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">No hay equipos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-sm">
              <thead>
                <tr className="bg-secondary/5 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Sándwich</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden lg:table-cell">Capitán</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Estación</th>
                  <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{t.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{t.sandwich_name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{t.captain_email}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">{t.station || '—'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => { setEditing(t); setEditStation(t.station || ''); setEditStatus(t.status) }}
                        className="text-primary hover:text-primary-dark text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-error hover:text-error/80 text-xs font-medium"
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

        {editing && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
            <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <h2 className="font-headline text-xl font-bold text-secondary">Editar: {editing.name}</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  onChange={e => setEditStation(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Ej: Mesa 1"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button onClick={handleUpdate} className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark text-sm">Guardar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
