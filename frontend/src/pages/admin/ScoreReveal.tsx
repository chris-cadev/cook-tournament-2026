import { useState, useEffect } from 'react'

interface ScoringCategory {
  id: number
  name: string
  weight: number
  max_points: number
  description: string
}

interface CategoryStatus {
  category: ScoringCategory
  revealed: boolean
}

export default function ScoreReveal() {
  const [categories, setCategories] = useState<CategoryStatus[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState<string | null>(null)
  const [dramaticReveal, setDramaticReveal] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [scoresPublic, setScoresPublic] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const [configRes, rubricRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/judges/rubric'),
      ])
      const config = await configRes.json()
      const rubric = await rubricRes.json()
      const revealed: string[] = config.revealed_categories || []
      const cats: ScoringCategory[] = rubric.categories || []

      setCategories(cats.map(c => ({ category: c, revealed: revealed.includes(c.name) })))
      setRevealedCount(revealed.length)
      setScoresPublic(config.scores_public === true)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePublic() {
    setToggling(true)
    try {
      const res = await fetch('/api/scores/toggle-public', { method: 'POST' })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setScoresPublic(data.scores_public)
    } catch {
      alert('Error al cambiar visibilidad')
    } finally {
      setToggling(false)
    }
  }

  async function handleReveal(category: ScoringCategory) {
    setDramaticReveal(category.name)
    setCountdown(3)

    // Countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(r => setTimeout(r, 800))
    }

    // Dramatic pause
    setCountdown(0)
    await new Promise(r => setTimeout(r, 500))

    // Reveal
    setRevealing(category.name)
    try {
      const res = await fetch('/api/scores/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: category.name }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to reveal')
        setDramaticReveal(null)
        return
      }

      setCategories(prev =>
        prev.map(c => (c.category.name === category.name ? { ...c, revealed: true } : c))
      )
      setRevealedCount(prev => prev + 1)

      // Hold the dramatic reveal for a moment
      await new Promise(r => setTimeout(r, 1500))
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to reveal:', err)
      alert('Network error — try again')
    } finally {
      setRevealing(null)
      setDramaticReveal(null)
    }
  }

  const total = categories.length
  const progress = total > 0 ? (revealedCount / total) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <>
      {/* Dramatic overlay */}
      {dramaticReveal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="text-center space-y-4">
            {countdown > 0 ? (
              <div className="animate-pulse">
                <span className="font-headline text-9xl font-black text-white">{countdown}</span>
              </div>
            ) : (
              <div className="animate-bounce">
                <span className="font-headline text-5xl font-black text-white block mb-4">
                  🏆 {dramaticReveal}
                </span>
                <span className="font-headline text-2xl text-tertiary font-bold">
                  {revealing ? '¡REVELANDO!' : '¡REVELADO!'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="font-headline text-3xl font-black text-secondary mb-2">
            Control de Puntuación
          </h1>
          <p className="text-gray-600">
            Categorías de puntuación definidas en organizacion.md. Revela una a una para generar tensión.
          </p>
        </div>

        {/* Master toggle */}
        <div className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
          scoresPublic ? 'bg-tertiary/10 border-tertiary/30' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${scoresPublic ? 'bg-tertiary' : 'bg-gray-300'}`} />
            <div>
              <span className="font-medium text-lg">Puntuaciones públicas</span>
              <span className={`ml-2 text-sm font-bold ${scoresPublic ? 'text-tertiary' : 'text-gray-400'}`}>
                {scoresPublic ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`px-5 py-2.5 font-headline font-bold rounded-xl transition-colors disabled:opacity-50 ${
              scoresPublic
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}
          >
            {toggling ? '...' : scoresPublic ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>

        {/* Categories reference */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
          <h3 className="font-headline text-lg font-bold text-secondary">Categorías</h3>
          {categories.map(({ category, revealed }) => (
            <div key={category.name} className="flex items-center gap-3 text-sm">
              <span className={`font-medium ${revealed ? 'text-tertiary' : 'text-gray-700'}`}>{category.name}</span>
              <span className="text-gray-400">x{category.weight}</span>
              <span className="text-gray-400">max {category.max_points}</span>
              {revealed && <span className="text-tertiary text-xs font-bold">✓</span>}
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>{revealedCount} de {total} categorías reveladas</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-tertiary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Reveal buttons */}
        <div className="space-y-3">
          {categories.map(({ category, revealed }) => (
            <div
              key={category.name}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                revealed
                  ? 'bg-tertiary/10 border-tertiary/30'
                  : 'bg-white border-gray-200 hover:border-primary/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${revealed ? 'bg-tertiary' : 'bg-gray-300'}`} />
                <div>
                  <span className="font-medium text-lg">{category.name}</span>
                  <span className="text-gray-400 text-sm ml-2">x{category.weight}</span>
                </div>
              </div>

              {revealed ? (
                <span className="text-sm font-medium text-tertiary px-3 py-1 bg-tertiary/10 rounded-full">
                  Revelado
                </span>
              ) : (
                <button
                  onClick={() => handleReveal(category)}
                  disabled={revealing !== null || dramaticReveal !== null}
                  className="px-5 py-2.5 bg-primary text-white font-headline font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Revelar {category.name}
                </button>
              )}
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay categorías configuradas.
          </div>
        )}
      </div>
    </>
  )
}
