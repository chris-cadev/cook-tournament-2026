import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

interface Team {
  id: number
  name: string
  sandwich_name: string
}

interface ScoreEntry {
  category: string
  value: number
  notes: string
}

interface ExistingScore {
  team_id: number
  category: string
  value: number
  notes: string | null
}

export default function JudgePanel() {
  const { token, user } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [existingScores, setExistingScores] = useState<ExistingScore[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      const [teamsRes, rubricRes] = await Promise.all([
        fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (teamsRes.ok) setTeams(await teamsRes.json())
      if (rubricRes.ok) {
        const data = await rubricRes.json()
        setCategories(data.categories || [])
      }
    } catch {
      addToast('Error al cargar datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [token, addToast])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!selectedTeam || !token) return
    fetch(`/api/judges/scores/${selectedTeam}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setExistingScores(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [selectedTeam, token])

  useEffect(() => {
    if (categories.length > 0 && selectedTeam) {
      const existing = existingScores.filter((s) => s.team_id === selectedTeam)
      setScores(
        categories.map((cat) => {
          const ex = existing.find((e) => e.category === cat)
          return { category: cat, value: ex?.value || 5, notes: ex?.notes || '' }
        })
      )
    }
  }, [categories, selectedTeam, existingScores])

  const updateScore = (category: string, field: 'value' | 'notes', val: number | string) => {
    setScores((prev) =>
      prev.map((s) => (s.category === category ? { ...s, [field]: val } : s))
    )
  }

  const isAlreadyScored = (category: string) => {
    return existingScores.some((s) => s.team_id === selectedTeam && s.category === category)
  }

  const handleSubmit = async () => {
    if (!selectedTeam || !token) return
    const unscored = scores.filter((s) => !isAlreadyScored(s.category))
    if (unscored.length === 0) {
      addToast('Ya puntuaste este equipo', 'info')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ team_id: selectedTeam, scores: unscored }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Error al enviar puntuaciones', 'error')
        return
      }
      addToast('Puntuaciones enviadas!', 'success')
      // Refresh existing scores
      const refresh = await fetch(`/api/judges/scores/${selectedTeam}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (refresh.ok) setExistingScores(await refresh.json())
    } catch {
      addToast('Error de red', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Panel de Juez</h1>
        <p className="text-gray-500 mb-6">Selecciona un equipo y puntúa cada categoría del 1 al 10</p>

        {/* Team selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar Equipo</label>
          <select
            value={selectedTeam || ''}
            onChange={(e) => setSelectedTeam(parseInt(e.target.value, 10))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">-- Selecciona un equipo --</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.sandwich_name}
              </option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <>
            {/* Scoring grid */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-headline text-lg font-bold text-secondary">Puntuación</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {scores.map((score) => {
                  const alreadyScored = isAlreadyScored(score.category)
                  return (
                    <div key={score.category} className="px-6 py-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-secondary">{score.category}</span>
                        {alreadyScored && (
                          <span className="text-xs font-medium text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                            Ya puntuado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={score.value}
                          onChange={(e) => updateScore(score.category, 'value', parseInt(e.target.value))}
                          disabled={alreadyScored}
                          className="flex-1 accent-primary"
                        />
                        <span className="font-headline text-2xl font-black text-primary w-8 text-center">
                          {score.value}
                        </span>
                      </div>
                      <textarea
                        value={score.notes}
                        onChange={(e) => updateScore(score.category, 'notes', e.target.value)}
                        disabled={alreadyScored}
                        placeholder="Notas opcionales..."
                        rows={1}
                        className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-50"
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || scores.every((s) => isAlreadyScored(s.category))}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Enviar Puntuaciones'}
            </button>
          </>
        )}

        {teams.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
            No hay equipos registrados aún.
          </div>
        )}
      </div>
    </div>
  )
}
