import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

interface Team {
  id: number
  name: string
  sandwich_name: string
}

interface ScoreEntry {
  category: string
  value: number | null
  notes: string
}

export default function JudgePanel() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [submittedTeams, setSubmittedTeams] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([rubricData, teamsData]) => {
      const cats: string[] = rubricData.categories || []
      setCategories(cats)
      setScores(cats.map(c => ({ category: c, value: null, notes: '' })))
      setTeams(teamsData || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [token])

  const selectTeam = (team: Team) => {
    setSelectedTeam(team)
    setScores(categories.map(c => ({ category: c, value: null, notes: '' })))
    setMessage(null)
  }

  const updateScore = (index: number, field: 'value' | 'notes', val: number | string | null) => {
    setScores(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: val }
      return next
    })
  }

  const handleSubmit = async () => {
    if (!selectedTeam || !token) return

    const validScores = scores.filter(s => s.value !== null && s.value >= 1 && s.value <= 10)
    if (validScores.length === 0) {
      setMessage({ type: 'error', text: 'Ingresa al menos una puntuación (1-10).' })
      return
    }

    setSubmitting(true)
    setMessage(null)
    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          team_id: selectedTeam.id,
          scores: validScores.map(s => ({
            category: s.category,
            value: s.value,
            notes: s.notes || null,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al enviar puntuaciones' })
        return
      }

      setMessage({ type: 'success', text: `Puntuaciones enviadas para ${selectedTeam.name}` })
      setSubmittedTeams(prev => new Set(prev).add(selectedTeam.id))
      setSelectedTeam(null)
    } catch {
      setMessage({ type: 'error', text: 'Error de red' })
    } finally {
      setSubmitting(false)
    }
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Panel de Jueces</h1>
        <p className="text-gray-500 mb-6">Selecciona un equipo y asigna puntuaciones por categoría.</p>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Rubric */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-3">Rúbrica de Puntuación</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map(cat => (
              <div key={cat} className="bg-secondary/5 rounded-xl p-3 text-center">
                <p className="font-headline font-bold text-secondary text-sm">{cat}</p>
                <p className="text-xs text-gray-500 mt-1">1–10 puntos</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-3">Seleccionar Equipo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {teams.map(team => (
              <button
                key={team.id}
                onClick={() => selectTeam(team)}
                disabled={submittedTeams.has(team.id)}
                className={`p-4 rounded-xl border-2 text-left transition-colors ${
                  submittedTeams.has(team.id)
                    ? 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
                    : selectedTeam?.id === team.id
                    ? 'bg-primary/5 border-primary'
                    : 'bg-white border-gray-200 hover:border-primary/50'
                }`}
              >
                <p className="font-semibold text-secondary text-sm">{team.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{team.sandwich_name}</p>
                {submittedTeams.has(team.id) && (
                  <p className="text-xs text-green-600 mt-1 font-medium">✓ Puntuado</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Score entry */}
        {selectedTeam && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-lg font-bold text-secondary mb-1">
              Puntuar: {selectedTeam.name}
            </h2>
            <p className="text-sm text-gray-500 mb-4">{selectedTeam.sandwich_name}</p>

            <div className="space-y-4">
              {scores.map((score, i) => (
                <div key={score.category} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <div className="sm:w-40">
                    <p className="font-semibold text-secondary text-sm">{score.category}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={score.value ?? ''}
                      onChange={(e) => updateScore(i, 'value', e.target.value ? Number(e.target.value) : null)}
                      className="w-20 border border-gray-300 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="1-10"
                    />
                    <input
                      type="text"
                      value={score.notes}
                      onChange={(e) => updateScore(i, 'notes', e.target.value)}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="Notas (opcional)"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar Puntuaciones'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
