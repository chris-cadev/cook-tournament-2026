import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import { socket } from '../../lib/socket'
import Navbar from '../../components/Navbar'

interface CategoryStatus {
  category: string
  revealed: boolean
}

interface LeaderboardEntry {
  team_id: number
  team_name: string
  sandwich_name: string
  total_score: number
  category_scores: Record<string, number>
}



export default function Reveal() {
  const { token } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const [categories, setCategories] = useState<CategoryStatus[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [confirmCategory, setConfirmCategory] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [animatingCategory, setAnimatingCategory] = useState<string | null>(null)
  const [animationProgress, setAnimationProgress] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      const config = await res.json()
      const cats: string[] = config.scoring_categories || []
      const revealed: string[] = config.revealed_categories || []
      setCategories(cats.map(c => ({ category: c, revealed: revealed.includes(c) })))
      setRevealedCount(revealed.length)
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/scores/leaderboard')
      const data: LeaderboardEntry[] = await res.json()
      setLeaderboard(data)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
    fetchLeaderboard()
  }, [fetchConfig, fetchLeaderboard])

  useEffect(() => {
    socket.connect()
    socket.on('score:reveal', () => {
      fetchLeaderboard()
      fetchConfig()
    })
    return () => {
      socket.off('score:reveal')
      socket.disconnect()
    }
  }, [fetchLeaderboard, fetchConfig])

  const nextUnrevealed = categories.find(c => !c.revealed)

  async function handleConfirmReveal() {
    if (!confirmCategory) return
    setRevealing(true)
    setConfirmCategory(null)
    try {
      const res = await fetch('/api/scores/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ category: confirmCategory }),
      })
      if (!res.ok) {
        const err = await res.json()
        addToast(err.error || 'Error al revelar categoría', 'error')
        return
      }
      setCategories(prev =>
        prev.map(c => (c.category === confirmCategory ? { ...c, revealed: true } : c))
      )
      setRevealedCount(prev => prev + 1)
      setAnimatingCategory(confirmCategory)
      setAnimationProgress(0)
      addToast(`Puntuación revelada: ${confirmCategory}`, 'success')
    } catch (err) {
      console.error('Failed to reveal category:', err)
      addToast('Error de red — intenta de nuevo', 'error')
    } finally {
      setRevealing(false)
    }
  }

  useEffect(() => {
    if (!animatingCategory) return
    const duration = 2500
    const steps = 50
    const increment = 100 / steps
    const interval = duration / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= 100) {
        setAnimationProgress(100)
        clearInterval(timer)
        setTimeout(() => {
          setAnimatingCategory(null)
          setAnimationProgress(0)
          fetchLeaderboard()
        }, 500)
      } else {
        setAnimationProgress(current)
      }
    }, interval)
    return () => clearInterval(timer)
  }, [animatingCategory, fetchLeaderboard])

  const total = categories.length
  const progress = total > 0 ? (revealedCount / total) * 100 : 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">
          Control de Revelación de Puntuaciones
        </h1>
        <p className="text-gray-600 mb-6">
          Revela las categorías una por una. Los clientes conectados verán los resultados en tiempo real.
        </p>

        {/* Progress bar */}
        <div className="mb-8">
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

        {/* Reveal animation overlay */}
        {animatingCategory && (
          <div className="mb-8 p-6 bg-white rounded-2xl border-2 border-primary/30 shadow-lg">
            <p className="text-sm font-medium text-primary-dark uppercase tracking-wide mb-2">
              Revelando: {animatingCategory}
            </p>
            <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full transition-all ease-out"
                style={{ width: `${animationProgress}%`, transitionDuration: '50ms' }}
              />
            </div>
            <p className="text-right text-sm font-bold text-secondary mt-1">
              {Math.round(animationProgress)}%
            </p>
          </div>
        )}

        {/* Category list */}
        <div className="space-y-3">
          {categories.map(({ category, revealed }) => {
            const isNext = nextUnrevealed?.category === category
            return (
              <div
                key={category}
                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
                  revealed
                    ? 'bg-tertiary/10 border-tertiary/30'
                    : isNext
                    ? 'bg-white border-primary/30'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      revealed
                        ? 'bg-tertiary text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {revealed ? 'Revelada' : 'Oculta'}
                  </span>
                  <span className="font-medium text-lg">{category}</span>
                </div>

                {revealed ? (
                  <span className="text-sm font-medium text-tertiary px-3 py-1 bg-tertiary/10 rounded-full">
                    ✓
                  </span>
                ) : isNext ? (
                  <button
                    onClick={() => setConfirmCategory(category)}
                    disabled={revealing || animatingCategory !== null}
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Revelar
                  </button>
                ) : (
                  <span className="text-xs text-gray-400">Esperando</span>
                )}
              </div>
            )
          })}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay categorías configuradas aún.
          </div>
        )}

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <div className="mt-10">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Clasificación</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/5 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary text-sm">#</th>
                    <th className="text-left px-4 py-3 font-headline font-bold text-secondary text-sm">Equipo</th>
                    <th className="text-right px-4 py-3 font-headline font-bold text-secondary text-sm">Total</th>
                    {categories.filter(c => c.revealed).map(c => (
                      <th key={c.category} className="text-right px-4 py-3 font-headline font-bold text-secondary text-xs">
                        {c.category}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.team_id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{entry.team_name}</div>
                        <div className="text-xs text-gray-500">{entry.sandwich_name}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-bold">{entry.total_score.toFixed(2)}</td>
                      {categories.filter(c => c.revealed).map(c => (
                        <td key={c.category} className="px-4 py-3 text-right text-sm">
                          {entry.category_scores[c.category]?.toFixed(1) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation modal */}
      {confirmCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-2">
              ¿Revelar categoría?
            </h2>
            <p className="text-gray-600 mb-6">
              ¿Revelar categoría <strong>{confirmCategory}</strong>? Todos los clientes conectados verán los resultados en tiempo real.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmCategory(null)}
                className="px-4 py-2 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmReveal}
                disabled={revealing}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {revealing ? 'Revelando...' : 'Revelar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
