import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Spinner from '../../components/ui/Spinner'

export default function EmailReminders() {
  const { token, logout } = useAuthStore()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [teams, setTeams] = useState<{ id: number; name: string; captain_email: string }[]>([])
  const [loaded, setLoaded] = useState(false)

  const fetchTeams = useCallback(async () => {
    if (!token || loaded) return
    try {
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTeams(await res.json())
    } finally { setLoaded(true) }
  }, [token, loaded])

  useEffect(() => { fetchTeams() }, [fetchTeams])

  const sendReminders = async () => {
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setResult({ ok: true, message: 'Recordatorios enviados correctamente.' })
      } else {
        const err = await res.json()
        setResult({ ok: false, message: err.error || 'Error al enviar.' })
      }
    } catch {
      setResult({ ok: false, message: 'Error de red.' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="font-headline text-xl font-black text-secondary">Panel de Admin</h1>
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Equipos</Link>
            <Link to="/admin/chat" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Chat</Link>
            <Link to="/admin/score-reveal" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Puntuaciones</Link>
            <Link to="/admin/settings" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Configuración</Link>
            <button onClick={() => { logout() }} className="text-sm font-bold text-error hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-1">Recordatorios por Email</h2>
          <p className="text-sm text-gray-500">Envía recordatorios a los capitanes de los equipos registrados.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-headline text-base font-bold text-secondary mb-4">Equipos registrados ({teams.length})</h3>
          {teams.length === 0 ? (
            <p className="text-sm text-gray-500">No hay equipos registrados.</p>
          ) : (
            <ul className="space-y-2 mb-6">
              {teams.map(t => (
                <li key={t.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-100 last:border-0">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-gray-500">{t.captain_email}</span>
                </li>
              ))}
            </ul>
          )}

          <button
            onClick={sendReminders}
            disabled={sending || teams.length === 0}
            className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar recordatorios a todos'}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${result.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {result.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
