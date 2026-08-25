import { useState, useEffect } from 'react'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  members: string[]
  station: string | null
  registered_at: string
  scored?: boolean
}

interface RubricCategory {
  name: string
  weight: number
  max_points: number
  description: string
}

interface ScoreEntry {
  category: string
  value: number
  notes: string
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function teamLetter(index: number): string {
  return LETTERS[index] || `${index + 1}`
}

export default function JudgePanel() {
  const [teams, setTeams] = useState<Team[]>([])
  const [rubric, setRubric] = useState<RubricCategory[]>([])
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null)
  const [scores, setScores] = useState<ScoreEntry[]>([])
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [msg, setMsg] = useState('')
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/judges/teams').then((r) => r.json()),
      fetch('/api/judges/rubric').then((r) => r.json()),
    ]).then(([teamsData, rubricData]) => {
      setTeams(teamsData)
      setRubric(rubricData.categories || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedTeam) return
    fetch(`/api/judges/scores/${selectedTeam}`)
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, boolean> = {}
        data.forEach((s: { category: string }) => {
          map[s.category] = true
        })
        setSubmitted(map)
        setScores(rubric.map((c) => ({ category: c.name, value: 5, notes: '' })))
        setConfirming(false)
      })
  }, [selectedTeam])

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
        headers: { 'Content-Type': 'application/json' },
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
      setConfirming(false)
      const newSubmitted = { ...submitted }
      scores.forEach((s) => { newSubmitted[s.category] = true })
      setSubmitted(newSubmitted)
      setTeams((prev) => prev.map((t) => t.id === selectedTeam ? { ...t, scored: true } : t))
    } catch {
      setMsg('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  const pendingCategories = rubric.filter((c) => !submitted[c.name])
  const selectedTeamData = teams.find((t) => t.id === selectedTeam)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-black text-secondary">Panel de Juez</h1>
          <p className="text-gray-500 text-sm mt-1">Revisa los equipos y puntúa cada categoría</p>
        </div>

        {/* Rubric reference — always visible */}
        {rubric.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-lg font-bold text-secondary mb-3">Rúbrica de puntuación</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {rubric.map((cat) => (
                <div key={cat.name} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-gray-800">{cat.name}</span>
                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium">{cat.max_points} pts</span>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-gray-500 leading-relaxed">{cat.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team cards grid */}
        <div>
          <h2 className="font-headline text-lg font-bold text-secondary mb-3">Equipos confirmados</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team, i) => {
              const isSelected = team.id === selectedTeam
              return (
                <button
                  key={team.id}
                  onClick={() => { setSelectedTeam(isSelected ? null : team.id); setMsg(''); setConfirming(false) }}
                  className={`text-left rounded-2xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-white font-headline font-black text-sm">
                      {teamLetter(i)}
                    </span>
                    {team.scored && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                        ✓ Puntuado
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline font-bold text-secondary text-sm leading-tight mb-0.5">{team.name}</h3>
                  <p className="text-xs text-gray-500 italic mb-2">{team.sandwich_name}</p>
                  <div className="text-xs text-gray-600 space-y-0.5">
                    <p><span className="font-medium text-gray-700">Capitán:</span> {team.captain_email}</p>
                    {team.members.length > 0 && (
                      <p><span className="font-medium text-gray-700">Miembros:</span> {team.members.join(', ')}</p>
                    )}
                    {team.station && (
                      <p><span className="font-medium text-gray-700">Estación:</span> {team.station}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Scoring section */}
        {selectedTeamData && (
          <>
            {msg && (
              <div className={`text-sm p-3 rounded-xl ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {msg}
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-headline text-lg font-bold text-secondary mb-4">
                Puntuar: {selectedTeamData.name}
              </h2>
              <div className="space-y-4">
                {rubric.map((cat) => (
                  <div key={cat.name} className={`p-4 rounded-xl border ${submitted[cat.name] ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{cat.name}</span>
                      {submitted[cat.name] && <span className="text-xs font-medium text-green-600">✓ Enviado</span>}
                    </div>
                    {cat.description && (
                      <p className="text-xs text-gray-500 mb-2">{cat.description}</p>
                    )}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-8">Malo</span>
                      <input type="range" min={1} max={cat.max_points} step={1}
                        value={scores.find((s) => s.category === cat.name)?.value || 5}
                        onChange={(e) => updateScore(cat.name, 'value', parseInt(e.target.value))}
                        disabled={submitted[cat.name]}
                        className="flex-1 accent-primary" />
                      <span className="text-xs text-gray-400 w-12 text-right">Excelente</span>
                      <span className="font-headline text-xl font-black text-secondary w-8 text-center">
                        {scores.find((s) => s.category === cat.name)?.value || 5}
                      </span>
                    </div>
                    <textarea placeholder="Notas (opcional)" rows={2}
                      value={scores.find((s) => s.category === cat.name)?.notes || ''}
                      onChange={(e) => updateScore(cat.name, 'notes', e.target.value)}
                      disabled={submitted[cat.name]}
                      className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:bg-green-50" />
                  </div>
                ))}
              </div>
            </div>

            {!confirming ? (
              <button onClick={() => pendingCategories.length > 0 && setConfirming(true)}
                disabled={submitting || pendingCategories.length === 0}
                className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? 'Enviando...' : pendingCategories.length === 0 ? 'Todas las categorías enviadas' : `Enviar ${pendingCategories.length} categoría(s)`}
              </button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
                <p className="text-sm text-yellow-800 font-medium">⚠️ ¿Confirmar envío? Las puntuaciones no se pueden modificar después.</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirming(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
                    {submitting ? 'Enviando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
