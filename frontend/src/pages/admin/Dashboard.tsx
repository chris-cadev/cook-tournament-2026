import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
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

export default function Dashboard() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

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

  const statusColor = (status: string) => {
    if (status === 'confirmed') return 'bg-tertiary/10 text-tertiary'
    if (status === 'disqualified') return 'bg-error/10 text-error'
    return 'bg-primary/10 text-primary-dark'
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Panel de Admin</h1>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { to: '/admin/teams', label: 'Equipos', icon: '👥', count: teams.length },
            { to: '/admin/reveal', label: 'Revelar Scores', icon: '🏆' },
            { to: '/admin/chat', label: 'Chat', icon: '💬' },
            { to: '/admin/settings', label: 'Configuración', icon: '⚙️' },
            { to: '/admin/email', label: 'Email', icon: '📧' },
            { to: '/admin/todo', label: 'To-Do', icon: '✅' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center hover:border-primary/30 transition-colors"
            >
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="font-headline font-bold text-secondary text-sm">{item.label}</p>
              {item.count !== undefined && (
                <p className="text-xs text-gray-400 mt-1">{item.count} teams</p>
              )}
            </Link>
          ))}
        </div>

        {/* Recent teams */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-secondary">Equipos Recientes</h2>
            <Link to="/admin/teams" className="text-sm text-primary-dark hover:text-primary font-medium">
              Ver todos →
            </Link>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : teams.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No hay equipos registrados</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teams.slice(0, 5).map((team) => (
                <div key={team.id} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-secondary">{team.name}</p>
                    <p className="text-xs text-gray-500">{team.sandwich_name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusColor(team.status)}`}>
                    {team.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
