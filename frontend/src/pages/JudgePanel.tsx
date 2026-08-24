import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'

interface LeaderboardEntry {
  team_id: number
  team_name: string
  sandwich_name: string
}

interface RubricData {
  categories: string[]
}

interface ScoreItem {
  category: string
  value: number
  notes?: string
}

interface ExistingScore {
  team_id: number
  team_name: string
  scores: Record<string, { value: number; notes?: string }>
}

export default function JudgePanel() {
  const { token, user, login } = useAuthStore()
  const isJudge = token && user?.role === 'judge'

  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [categories, setCategories] = useState<string[]>([])
  const [teams, setTeams] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const [scores, setScores] = useState<Record<number, Record<string, number>>>({})
  const [notes, setNotes] = useState<Record<number, Record<string, string>>>({})
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [submitMsg, setSubmitMsg] = useState<{ teamId: number; ok: boolean; msg: string } | null>(null)

  const [history, setHistory] = useState<ExistingScore[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError('')
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (!res.ok) {
        setLoginError('Contraseña inválida')
        return
      }
      const data = await res.json()
      login(data.token, { anonymous_id: data.anonymous_id, role: data.role })
    } catch {
      setLoginError('Contraseña inválida')
    } finally {
      setLoggingIn(false)
    }
  }

  const fetchData = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [rubricRes, lbRes] = await Promise.all([
        fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/scores/leaderboard'),
      ])
      if (rubricRes.ok) {
        const rubric: RubricData = await rubricRes.json()
        setCategories(rubric.categories)
      }
      if (lbRes.ok) {
        const lb = await lbRes.json()
        setTeams(lb.leaderboard.map((e: LeaderboardEntry) => ({ team_id: e.team_id, team_name: e.team_name, sandwich_name: e.sandwich_name })))
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const setScore = (teamId: number, cat: string, val: number) => {
    setScores(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], [cat]: val },
    }))
  }

  const setNote = (teamId: number, cat: string, val: string) => {
    setNotes(prev => ({
      ...prev,
      [teamId]: { ...prev[teamId], [cat]: val },
    }))
  }

  const submitTeam = async (teamId: number) => {
    if (!token) return
    setSubmitting(teamId)
    setSubmitMsg(null)
    const teamScores = categories
      .filter(cat => scores[teamId]?.[cat] != null)
      .map(cat => ({
        category: cat,
        value: scores[teamId][cat],
        notes: notes[teamId]?.[cat] || undefined,
      }))
    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ team_id: teamId, scores: teamScores }),
      })
      if (res.ok) {
        setSubmitMsg({ teamId, ok: true, msg: 'Puntuación enviada' })
      } else if (res.status === 409) {
        setSubmitMsg({ teamId, ok: false, msg: 'Ya puntuaste esta categoría' })
      } else {
        setSubmitMsg({ teamId, ok: false, msg: 'Error al enviar' })
      }
    } catch {
      setSubmitMsg({ teamId, ok: false, msg: 'Error de red' })
    } finally {
      setSubmitting(null)
    }
  }

  const fetchHistory = async () => {
    if (!token || teams.length === 0) return
    setHistoryLoading(true)
    try {
      const results = await Promise.all(
        teams.map(async (t) => {
          const res = await fetch(`/api/judges/scores/${t.team_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (!res.ok) return { team_id: t.team_id, team_name: t.team_name, scores: {} }
          const data = await res.json()
          const map: Record<string, { value: number; notes?: string }> = {}
          for (const s of data.scores || []) {
            map[s.category] = { value: s.value, notes: s.notes }
          }
          return { team_id: t.team_id, team_name: t.team_name, scores: map }
        })
      )
      setHistory(results)
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (showHistory && isJudge) fetchHistory()
  }, [showHistory, isJudge, teams])

  if (!isJudge) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <h1 className="font-headline text-2xl font-black text-secondary text-center mb-6">
            Panel de Juez
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña de juez
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            {loginError && (
              <p className="text-error text-sm text-center">{loginError}</p>
            )}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
            >
              {loggingIn ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
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
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-headline text-3xl font-black text-secondary">
            Panel de Juez
          </h1>
          <button
            onClick={() => { setShowHistory(!showHistory); if (!showHistory) fetchHistory() }}
            className="text-sm text-primary-dark hover:text-primary font-semibold"
          >
            {showHistory ? 'Ocultar historial' : 'Ver historial'}
          </button>
        </div>

        {categories.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-lg font-bold text-secondary mb-3">Rúbrica de Puntuación</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map(cat => (
                <span key={cat} className="bg-primary/10 text-primary-dark text-sm font-semibold px-3 py-1 rounded-2xl">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        )}

        {showHistory && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-headline text-lg font-bold text-secondary">Historial de Puntuaciones</h2>
            </div>
            {historyLoading ? (
              <div className="p-6 text-center text-gray-500">Cargando...</div>
            ) : history.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Sin puntuaciones registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/5">
                      <th className="text-left px-4 py-2 font-headline font-bold text-secondary">Equipo</th>
                      {categories.map(cat => (
                        <th key={cat} className="text-center px-3 py-2 font-headline font-bold text-secondary">{cat}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {history.map(h => (
                      <tr key={h.team_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-semibold">{h.team_name}</td>
                        {categories.map(cat => (
                          <td key={cat} className="px-3 py-2 text-center">
                            {h.scores[cat] ? (
                              <div>
                                <span className="font-bold">{h.scores[cat].value}</span>
                                {h.scores[cat].notes && (
                                  <p className="text-xs text-gray-400 mt-0.5">{h.scores[cat].notes}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {teams.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
            No hay equipos para puntuar.
          </div>
        ) : (
          teams.map(team => (
            <div key={team.team_id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-headline text-lg font-bold text-secondary">{team.team_name}</h3>
                  <p className="text-sm text-gray-500">{team.sandwich_name}</p>
                </div>
                {submitMsg?.teamId === team.team_id && (
                  <span className={`text-sm font-semibold ${submitMsg.ok ? 'text-tertiary' : 'text-error'}`}>
                    {submitMsg.msg}
                  </span>
                )}
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categories.map(cat => (
                    <div key={cat} className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">{cat}</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={scores[team.team_id]?.[cat] ?? ''}
                        onChange={e => setScore(team.team_id, cat, Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary text-center font-bold"
                        placeholder="1–10"
                      />
                      <input
                        type="text"
                        value={notes[team.team_id]?.[cat] ?? ''}
                        onChange={e => setNote(team.team_id, cat, e.target.value)}
                        className="w-full px-3 py-1.5 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Notas (opcional)"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => submitTeam(team.team_id)}
                    disabled={submitting === team.team_id}
                    className="bg-tertiary hover:bg-tertiary/90 text-white font-headline font-bold px-6 py-2.5 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    {submitting === team.team_id ? 'Enviando...' : 'Enviar puntuación'}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
