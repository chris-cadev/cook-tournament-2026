import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'

interface Team {
  id: number
  name: string
  sandwich_name: string
}

interface Category {
  category: string
  weight: string
  max: number | string
  desc: string
}

interface ScoredCategory {
  category: string
  value: number
  notes: string
}

export default function JudgePanel() {
  const { token } = useAuthStore()
  const [teams, setTeams] = useState<Team[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [scores, setScores] = useState<ScoredCategory[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [submittedScores, setSubmittedScores] = useState<Record<number, Record<string, { value: number; notes: string }>>>()

  useEffect(() => {
    Promise.all([
      fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/judges/rubric', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([teamsData, rubricData]) => {
      setTeams(teamsData)
      setCategories(rubricData.categories || [])
    }).finally(() => setLoading(false))
  }, [token])

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/judges/scores/${selectedTeam}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: any[]) => {
        const map: Record<number, Record<string, { value: number; notes: string }>> = {}
        for (const s of data) {
          if (!map[s.team_id]) map[s.team_id] = {}
          map[s.team_id][s.category] = { value: s.value, notes: s.notes || '' }
        }
        setSubmittedScores(map)
        setScores(categories.map(c => ({ category: c, value: 5, notes: '' })))
      })
  }, [selectedTeam, token, categories])

  const handleScoreChange = (category: string, field: 'value' | 'notes', val: string | number) => {
    setScores(prev => prev.map(s =>
      s.category === category ? { ...s, [field]: val } : s
    ))
  }

  const handleSubmit = async () => {
    if (!selectedTeam) return
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
          team_id: selectedTeam,
          scores: scores.map(s => ({ category: s.category, value: s.value, notes: s.notes || undefined })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Error al enviar puntuaciones' })
        return
      }
      setMessage({ type: 'success', text: '¡Puntuaciones enviadas!' })
      setSelectedTeam(null)
      setScores([])
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const alreadyScored = selectedTeam && submittedScores?.[selectedTeam]

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Panel de Juez</h1>
        <p className="text-gray-500 mb-6">Selecciona un equipo y puntúa cada categoría.</p>

        {message && (
          <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
            message.type === 'success' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
          }`}>
            {message.text}
          </div>
        )}

        {/* Team selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Selecciona equipo</label>
          <select
            value={selectedTeam ?? ''}
            onChange={e => setSelectedTeam(Number(e.target.value) || null)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">— Seleccionar equipo —</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.sandwich_name})</option>
            ))}
          </select>
        </div>

        {selectedTeam && (
          <>
            {alreadyScored ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-headline text-xl font-bold text-secondary mb-4">Puntuaciones ya enviadas para este equipo</h2>
                <div className="space-y-2">
                  {categories.map(cat => {
                    const s = alreadyScored[cat]
                    return (
                      <div key={cat} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="font-medium">{cat}</span>
                        <span className="text-lg font-bold text-secondary">{s?.value ?? '—'}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary/5 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Categoría</th>
                        <th className="text-center px-4 py-3 font-headline font-bold text-secondary w-24">Puntuación (1-10)</th>
                        <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scores.map(s => (
                        <tr key={s.category} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold">{s.category}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={s.value}
                              onChange={e => handleScoreChange(s.category, 'value', Number(e.target.value))}
                              className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <input
                              type="text"
                              value={s.notes}
                              onChange={e => handleScoreChange(s.category, 'notes', e.target.value)}
                              placeholder="Opcional"
                              className="w-full border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Enviando...' : 'Enviar Puntuaciones'}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {teams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay equipos registrados aún.
          </div>
        )}
      </div>
    </div>
  )
}
