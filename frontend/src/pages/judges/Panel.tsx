import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface RubricCategory {
  name: string
  description: string
}

interface Team {
  id: number
  name: string
  sandwich_name: string
}

interface ScoreInput {
  category: string
  value: number
  notes: string
}

interface ExistingScore {
  category: string
  value: number
}

export default function JudgePanel() {
  const { user, login, logout } = useAuthStore()

  // Auth gate
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Data
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [scores, setScores] = useState<ScoreInput[]>([])
  const [existingScores, setExistingScores] = useState<Set<string>>(new Set())
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Submission
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const isJudge = user?.role === 'judge'

  // Login handler
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setLoginError(data.error || 'Error de autenticación')
        return
      }
      login({ anonymous_id: data.judge.anonymous_id, role: 'judge' })
    } catch {
      setLoginError('Error de red')
    } finally {
      setLoginLoading(false)
    }
  }

  // Fetch rubric + teams after login
  useEffect(() => {
    if (!isJudge) return

    async function loadData() {
      const [rubricRes, teamsRes] = await Promise.all([
        fetch('/api/judges/rubric'),
        fetch('/api/judges/teams'),
      ])
      if (rubricRes.ok) {
        const rubricData = await rubricRes.json()
        const cats: { name: string; description: string }[] = rubricData.categories || []
        setCategories(cats)
      }
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json()
        setTeams(teamsData)
      }
    }
    loadData()
  }, [isJudge])

  // Initialize score inputs when categories change
  useEffect(() => {
    if (categories.length > 0 && scores.length === 0) {
      setScores(categories.map((c) => ({ category: c.name, value: 5, notes: '' })))
    }
  }, [categories])

  // Fetch existing scores when team is selected
  useEffect(() => {
    if (!selectedTeamId) {
      setExistingScores(new Set())
      return
    }

    async function fetchScores() {
      const res = await fetch(`/api/judges/scores/${selectedTeamId}`)
      if (res.ok) {
        const data: ExistingScore[] = await res.json()
        const mine = data.map((s) => s.category)
        setExistingScores(new Set(mine))
      }
    }
    fetchScores()
  }, [selectedTeamId, user])

  // Update a score value
  function updateScore(category: string, field: 'value' | 'notes', val: number | string) {
    setScores((prev) =>
      prev.map((s) => (s.category === category ? { ...s, [field]: val } : s))
    )
  }

  // Submit scores
  async function handleSubmit() {
    if (!selectedTeamId) return
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    const toSubmit = scores.filter((s) => !existingScores.has(s.category))

    try {
      const res = await fetch('/api/judges/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ team_id: selectedTeamId, scores: toSubmit }),
      })

      if (res.status === 409) {
        setSubmitError('Ya puntuaste esta categoría para este equipo')
        return
      }

      if (!res.ok) {
        const data = await res.json()
        setSubmitError(data.error || 'Error al enviar puntuaciones')
        return
      }

      setSubmitSuccess(true)
      // Mark submitted categories as existing
      setExistingScores((prev) => {
        const next = new Set(prev)
        toSubmit.forEach((s) => next.add(s.category))
        return next
      })
    } catch {
      setSubmitError('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  // Password gate
  if (!isJudge) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
          <h1 className="font-headline text-2xl font-black text-secondary mb-2 text-center">
            Panel de Jueces
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Ingresa la contraseña de juez para acceder
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña de juez"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            {loginError && (
              <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading || !password}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {loginLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)
  const hasExistingScores = existingScores.size > 0
  const allScored = categories.length > 0 && categories.every((c) => existingScores.has(c.name))

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-black text-secondary">Panel de Jueces</h1>
            <p className="text-sm text-gray-500 mt-1">Rúbrica y puntuación de equipos</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-error transition-colors"
          >
            Salir
          </button>
        </div>

        {/* Rubric Accordion */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-xl font-black text-secondary">Rúbrica de Puntuación</h2>
            <p className="text-sm text-gray-500 mt-1">Expande cada categoría para ver los criterios</p>
          </div>
          {categories.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">Cargando rúbrica...</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <div key={cat.name}>
                  <button
                    onClick={() =>
                      setExpandedCategory(expandedCategory === cat.name ? null : cat.name)
                    }
                    className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="font-headline font-bold text-secondary">{cat.name}</span>
                    <span
                      className={`text-gray-400 transition-transform ${
                        expandedCategory === cat.name ? 'rotate-180' : ''
                      }`}
                    >
                      ▼
                    </span>
                  </button>
                  {expandedCategory === cat.name && cat.description && (
                    <div className="px-6 pb-4 text-sm text-gray-600">{cat.description}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Score Submission */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-xl font-black text-secondary">Puntuar Equipo</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Team Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona un equipo
              </label>
              <select
                value={selectedTeamId ?? ''}
                onChange={(e) => {
                  setSelectedTeamId(e.target.value ? Number(e.target.value) : null)
                  setSubmitSuccess(false)
                  setSubmitError('')
                }}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              >
                <option value="">— Seleccionar equipo —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.sandwich_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedTeamId && (
              <>
                {hasExistingScores && (
                  <div className="bg-tertiary/10 border border-tertiary/30 text-tertiary text-sm rounded-xl px-4 py-2">
                    Ya puntuaste {existingScores.size} de {categories.length} categorías para este
                    equipo
                  </div>
                )}

                {allScored && (
                  <div className="bg-tertiary/10 border border-tertiary/30 text-tertiary text-sm rounded-xl px-4 py-2 text-center font-medium">
                    Ya puntuaste todas las categorías para este equipo
                  </div>
                )}

                {/* Score Inputs */}
                <div className="space-y-4">
                  {scores.map((score) => {
                    const disabled = existingScores.has(score.category)
                    return (
                      <div
                        key={score.category}
                        className={`border rounded-xl p-4 ${
                          disabled
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-headline font-bold text-secondary text-sm">
                            {score.category}
                            {disabled && (
                              <span className="ml-2 text-xs text-tertiary font-normal">
                                (ya puntuado)
                              </span>
                            )}
                          </label>
                          <span className="font-headline font-bold text-primary text-lg">
                            {score.value}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={10}
                          value={score.value}
                          onChange={(e) =>
                            updateScore(score.category, 'value', Number(e.target.value))
                          }
                          disabled={disabled}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-primary disabled:cursor-not-allowed"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>1</span>
                          <span>10</span>
                        </div>
                        <input
                          type="text"
                          value={score.notes}
                          onChange={(e) => updateScore(score.category, 'notes', e.target.value)}
                          disabled={disabled}
                          placeholder="Notas opcionales..."
                          className="w-full mt-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:bg-gray-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Submit */}
                <div className="space-y-3">
                  {submitSuccess && (
                    <div className="bg-tertiary/10 border border-tertiary/30 text-tertiary text-sm rounded-xl px-4 py-2">
                      Puntuaciones enviadas correctamente
                    </div>
                  )}
                  {submitError && (
                    <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">
                      {submitError}
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || allScored || existingScores.size === categories.length}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? 'Enviando...'
                      : hasExistingScores
                        ? 'Enviar puntuaciones restantes'
                        : 'Enviar puntuaciones'}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
