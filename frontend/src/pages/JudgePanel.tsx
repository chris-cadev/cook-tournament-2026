import { useState, useEffect, FormEvent } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useToast } from '../components/ui/Toast'

interface Category {
  name: string
  description?: string
  max?: number
}

interface Team {
  id: number
  name: string
  sandwich_name: string
}

export default function JudgePanel() {
  const { token, user, login, logout } = useAuthStore()
  const { toast } = useToast()
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [scores, setScores] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState<number | null>(null)

  const isAuthed = !!token && user?.role === 'judge'

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setAuthError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAuthError(data.error || 'Contraseña inválida')
        return
      }
      login(data.token, { anonymous_id: data.judge.anonymous_id, role: 'judge' })
    } catch {
      setAuthError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthed) return
    const headers = { Authorization: `Bearer ${token}` }

    fetch('/api/judges/rubric', { headers })
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
      .catch(() => {})

    fetch('/api/teams', { headers: { ...headers, 'Content-Type': 'application/json' } })
      .then(r => {
        if (!r.ok) return []
        return r.json()
      })
      .then(d => {
        if (Array.isArray(d)) setTeams(d)
      })
      .catch(() => {})

    fetch('/api/scores/leaderboard')
      .then(r => r.json())
      .then(() => {})
      .catch(() => {})
  }, [isAuthed, token])

  async function handleSubmitScores(teamId: number) {
    setSubmitting(teamId)
    try {
      const scoresPayload = categories
        .filter(c => scores[`${teamId}:${c.name}`] !== undefined)
        .map(c => ({
          category: c.name,
          value: scores[`${teamId}:${c.name}`],
          notes: notes[`${teamId}:${c.name}`] || undefined,
        }))

      if (scoresPayload.length === 0) {
        toast('No hay puntuaciones para enviar', 'error')
        return
      }

      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ team_id: teamId, scores: scoresPayload }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast(data.error || 'Error al enviar', 'error')
        return
      }

      const newSubmitted = { ...submitted }
      categories.forEach(c => { newSubmitted[`${teamId}:${c.name}`] = true })
      setSubmitted(newSubmitted)
      toast('¡Puntuaciones enviadas!', 'success')
    } catch {
      toast('Error de conexión', 'error')
    } finally {
      setSubmitting(null)
    }
  }

  // Access gate
  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="font-headline text-3xl font-black text-secondary text-center mb-6">
            Acceso de Jueces
          </h1>
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de jueces</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {authError && (
              <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">{authError}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-headline text-3xl font-black text-secondary">Panel de Juez</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {user?.anonymous_id}</p>
          </div>
          <button onClick={logout} className="text-sm font-medium text-gray-500 hover:text-error transition-colors">
            Cerrar sesión
          </button>
        </div>

        {/* Rubric */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-headline text-xl font-bold text-secondary mb-3">Rúbrica de Puntuación</h2>
          <div className="grid gap-2">
            {categories.map(c => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span className="text-gray-500">1–10</span>
              </div>
            ))}
          </div>
        </div>

        {/* Score entry */}
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-headline font-bold text-secondary">{team.name}</h3>
                  <p className="text-sm text-gray-500">{team.sandwich_name}</p>
                </div>
                {submitted[`${team.id}:${categories[0]?.name}`] && (
                  <span className="text-xs font-medium text-tertiary bg-tertiary/10 px-3 py-1 rounded-full">Enviado</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {categories.map(c => {
                  const key = `${team.id}:${c.name}`
                  const isScored = submitted[key]
                  return (
                    <div key={c.name}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">{c.name}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        disabled={isScored}
                        value={scores[key] ?? ''}
                        onChange={e => setScores({ ...scores, [key]: Math.min(10, Math.max(1, Number(e.target.value))) })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                      />
                      <input
                        type="text"
                        disabled={isScored}
                        placeholder="Notas (opcional)"
                        value={notes[key] ?? ''}
                        onChange={e => setNotes({ ...notes, [key]: e.target.value })}
                        className="w-full border border-gray-300 rounded-xl px-3 py-1.5 text-xs mt-1 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-gray-50"
                      />
                    </div>
                  )
                })}
              </div>

              {!submitted[`${team.id}:${categories[0]?.name}`] && (
                <button
                  onClick={() => handleSubmitScores(team.id)}
                  disabled={submitting === team.id}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {submitting === team.id ? 'Enviando...' : 'Enviar puntuación'}
                </button>
              )}
            </div>
          ))}

          {teams.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
              No hay equipos registrados aún.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
