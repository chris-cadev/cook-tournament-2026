import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

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

export default function JudgePanel() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ]).then(([teamsData, rubric]) => {
      setTeams(teamsData.filter((t: Team & { status: string }) => t.status === 'confirmed'))
      setCategories(rubric.categories || [])
    }).finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/judges/scores/${selectedTeam}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, boolean> = {}
        data.forEach((s: { category: string; judge_anonymous_id: string }) => {
          map[s.category] = true
        })
        setSubmitted(map)
        setScores(categories.map((c) => ({ category: c, value: 5, notes: '' })))
      })
  }, [selectedTeam, token, categories])

  const updateScore = (category: string, field: 'value' | 'notes', val: number | string) => {
    setScores((prev) => prev.map((s) => s.category === category ? { ...s, [field]: val } : s))
  }

  const handleSubmit = async () => {
    if (!selectedTeam) return
    setSubmitting(true)
    setMsg('')
    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          team_id: selectedTeam,
          scores: scores.filter((s) => !submitted[s.category]),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg(data.error || 'Error al enviar')
        return
      }
      setMsg('¡Puntuaciones enviadas!')
      const newSubmitted = { ...submitted }
      scores.forEach((s) => { newSubmitted[s.category] = true })
      setSubmitted(newSubmitted)
    } catch {
      setMsg('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-black text-secondary">Panel de Juez</h1>
          <p className="text-gray-500 text-sm mt-1">Selecciona un equipo y puntúa cada categoría</p>
        </div>

        {/* Team selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar equipo</label>
          <select value={selectedTeam || ''} onChange={(e) => setSelectedTeam(parseInt(e.target.value, 10))}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">-- Selecciona un equipo --</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name} — {t.sandwich_name}</option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <>
            {msg && (
              <div className={`text-sm p-3 rounded-xl ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {msg}
              </div>
            )}

            {/* Rubric */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-headline text-lg font-bold text-secondary mb-4">Rubrica de puntuación</h2>
              <div className="space-y-4">
                {categories.map((cat) => (
                  <div key={cat} className={`p-4 rounded-xl border ${submitted[cat] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{cat}</span>
                      {submitted[cat] && <span className="text-xs font-medium text-green-600">Enviado</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <input type="range" min={1} max={10} step={1}
                        value={scores.find((s) => s.category === cat)?.value || 5}
                        onChange={(e) => updateScore(cat, 'value', parseInt(e.target.value))}
                        disabled={submitted[cat]}
                        className="flex-1 accent-primary" />
                      <span className="font-headline text-xl font-black text-secondary w-8 text-center">
                        {scores.find((s) => s.category === cat)?.value || 5}
                      </span>
                    </div>
                    <input type="text" placeholder="Notas (opcional)"
                      value={scores.find((s) => s.category === cat)?.notes || ''}
                      onChange={(e) => updateScore(cat, 'notes', e.target.value)}
                      disabled={submitted[cat]}
                      className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-green-50" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleSubmit} disabled={submitting || categories.every((c) => submitted[c])}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? 'Enviando...' : 'Enviar Puntuaciones'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
