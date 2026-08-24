import { useState, useEffect, useCallback } from 'react'
import TeamEditModal from '../../components/admin/TeamEditModal'

interface Team {
  id: number
  slug: string
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

export default function Teams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Team | null>(null)

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams')
      if (res.ok) setTeams(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const handleDelete = async (slug: string) => {
    if (!confirm('¿Eliminar este equipo?')) return
    await fetch(`/api/teams/${slug}`, {
      method: 'DELETE',
    })
    setTeams((t) => t.filter((x) => x.slug !== slug))
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      disqualified: 'bg-red-100 text-red-700',
    }
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      confirmed: 'Confirmado',
      disqualified: 'Descalificado',
    }
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando equipos...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-black text-secondary">Equipos ({teams.length})</h2>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">No hay equipos registrados aún.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/5 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Equipo</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Sándwich</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Capitán</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Estación</th>
                  <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-semibold">{team.name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{team.sandwich_name}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{team.captain_email}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(team.status)}</td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{team.station || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setEditing(team)} className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors" title="Editar">
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button onClick={() => handleDelete(team.slug)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Eliminar">
                          <span className="material-symbols-outlined text-lg">delete</span>
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

      {editing && (
        <TeamEditModal
          open
          team={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchTeams() }}
        />
      )}
    </div>
  )
}
