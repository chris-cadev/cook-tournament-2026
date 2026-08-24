import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'
import TeamEditModal from '../../components/admin/TeamEditModal'
import AdminNavbar from '../../components/admin/AdminNavbar'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

function ActionDropdown({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
        ⋮
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-xl shadow-lg z-10 py-1">
          <button onClick={() => { onEdit(); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Edit</button>
          <button onClick={() => { onDelete(); setOpen(false) }} className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  )
}

export default function Teams() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Team | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 50

  const fetchTeams = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setTeams(await res.json())
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Delete this team?')) return
    const res = await fetch(`/api/teams/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) setTeams((t) => t.filter((x) => x.id !== id))
  }

  const handleSaved = () => { setEditing(null); fetchTeams() }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-green-100 text-green-700',
      disqualified: 'bg-red-100 text-red-700',
    }
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[status] || colors.pending}`} title={`Status: ${status}`}>{status}</span>
  }

  const totalPages = Math.ceil(teams.length / pageSize)
  const pagedTeams = teams.slice(page * pageSize, (page + 1) * pageSize)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminNavbar />
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Teams</h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/5 border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-bold text-secondary">Name</th>
                  <th className="text-left px-4 py-3 font-bold text-secondary">Sandwich</th>
                  <th className="text-left px-4 py-3 font-bold text-secondary">Captain</th>
                  <th className="text-center px-4 py-3 font-bold text-secondary">Status</th>
                  <th className="text-left px-4 py-3 font-bold text-secondary">Station</th>
                  <th className="text-right px-4 py-3 font-bold text-secondary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedTeams.map((team) => (
                  <tr key={team.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium" title={`Captain: ${team.captain_email}`}>{team.name}</td>
                    <td className="px-4 py-3 text-gray-600">{team.sandwich_name}</td>
                    <td className="px-4 py-3 text-gray-600">{team.captain_email}</td>
                    <td className="px-4 py-3 text-center">{statusBadge(team.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{team.station || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <ActionDropdown onEdit={() => setEditing(team)} onDelete={() => handleDelete(team.id)} />
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No teams registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Prev</button>
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {editing && <TeamEditModal team={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />}
    </div>
  )
}
