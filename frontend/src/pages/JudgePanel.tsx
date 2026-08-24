import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'

interface Team {
  id: number
  name: string
  sandwich_name: string
  status: string
}

interface Category {
  category: string
}

interface ScoresByTeam {
  [teamId: number]: { [category: string]: { value: number; notes: string } }
}

export default function JudgePanel() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [scores, setScores] = useState<ScoresByTeam>({})
  const [submitted, setSubmitted] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<number | null>(null)
  const [error, setError] = useState('')

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [teamsRes, rubricRes] = await Promise.all([
        fetch('/api/judges/teams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (teamsRes.ok) {
        const allTeams = await teamsRes.json()
        setTeams(allTeams)
      }
      if (rubricRes.ok) {
        const rubric = await rubricRes.json()
        setCategories(rubric.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const setScore = (teamId: number, category: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [category]: { ...prev[teamId]?.[category], value, notes: prev[teamId]?.[category]?.notes || '' } },
    }))
  }

  const setNotes = (teamId: number, category: string, notes: string) => {
    setScores((prev) => ({
      ...prev,
      [teamId]: { ...prev[teamId], [category]: { ...prev[teamId]?.[category], notes, value: prev[teamId]?.[category]?.value || 5 } },
    }))
  }

  const handleSubmit = async (teamId: number) => {
    const teamScores = scores[teamId]
    if (!teamScores) return

    const scoresArr = categories
      .filter((c) => teamScores[c]?.value)
      .map((c) => ({ category: c, value: teamScores[c].value, notes: teamScores[c].notes || '' }))

    if (scoresArr.length === 0) return

    setSubmitting(teamId)
    setError('')
    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ team_id: teamId, scores: scoresArr }),
      })
      if (!res.ok) {
        const data = await res.json()
        if (res.status === 409) {
          setSubmitted((prev) => new Set(prev).add(teamId))
          setError(`Ya calificaste a ${teams.find(t => t.id === teamId)?.name || 'este equipo'}.`)
        } else {
          setError(data.error || 'Submit failed')
        }
        return
      }
      setSubmitted((prev) => new Set(prev).add(teamId))
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Panel de Juez</h1>
        <p className="text-gray-500 mb-6">Califica cada sándwich en las categorías configuradas.</p>

        {error && (
          <div className={`text-sm rounded-xl px-4 py-2 mb-4 ${error.includes('Ya calificaste') ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-red-600 bg-red-50'}`}>
            {error}
          </div>
        )}

        {categories.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No scoring categories configured yet.</p>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => {
              const isSubmitted = submitted.has(team.id)
              return (
                <div key={team.id} className={`bg-white rounded-2xl shadow-sm border p-6 ${isSubmitted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-headline text-xl font-bold text-secondary">{team.name}</h2>
                      <p className="text-sm text-gray-500">{team.sandwich_name}</p>
                    </div>
                    {isSubmitted && <span className="text-sm font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full">✓ Enviado</span>}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-3 py-2 font-bold text-secondary">Categoría</th>
                          <th className="text-center px-3 py-2 font-bold text-secondary w-24">Puntos (1–10)</th>
                          <th className="text-left px-3 py-2 font-bold text-secondary">Notas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {categories.map((cat) => (
                          <tr key={cat}>
                            <td className="px-3 py-2 font-medium" title={`Califica el "${cat}" de 1 a 10 puntos`}>{cat}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                min={1}
                                max={10}
                                value={scores[team.id]?.[cat]?.value || ''}
                                onChange={(e) => setScore(team.id, cat, parseInt(e.target.value) || 1)}
                                disabled={isSubmitted}
                                className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={scores[team.id]?.[cat]?.notes || ''}
                                onChange={(e) => setNotes(team.id, cat, e.target.value)}
                                disabled={isSubmitted}
                                placeholder="Optional"
                                className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {!isSubmitted && (
                    <div className="mt-4 text-right">
                      <button
                        onClick={() => handleSubmit(team.id)}
                        disabled={submitting === team.id}
                        className="bg-primary text-white font-bold px-5 py-2 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        {submitting === team.id ? 'Enviando...' : 'Enviar Puntuación'}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            {teams.length === 0 && <p className="text-gray-500 text-center py-8">No confirmed teams yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
