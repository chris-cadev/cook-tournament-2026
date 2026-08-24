import { useState, useEffect, useCallback } from 'react'
import { socket } from '../lib/socket'
import Spinner from '../components/ui/Spinner'
import { toast } from '../components/ui/Toast'

interface LeaderboardEntry {
  team_id: number
  team_name: string
  sandwich_name: string
  total_score: number
  category_scores: Record<string, number>
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  categories: string[]
  revealed: string[]
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-400 text-white font-bold text-sm shadow-sm">1°</span>
  if (rank === 2) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-400 text-white font-bold text-sm shadow-sm">2°</span>
  if (rank === 3) return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-sm shadow-sm">3°</span>
  return <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 font-bold text-sm">{rank}°</span>
}

function CategoryBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600">{label}</span>
        <span className="font-bold text-secondary">{value.toFixed(1)}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Results() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/scores/leaderboard')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  useEffect(() => {
    socket.connect()
    socket.on('score:reveal', (data: { category: string }) => {
      fetchLeaderboard()
      toast.info(`¡Categoría "${data.category}" revelada!`)
    })
    return () => {
      socket.off('score:reveal')
      socket.disconnect()
    }
  }, [fetchLeaderboard])

  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 30000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Error al cargar el leaderboard.
      </div>
    )
  }

  const { leaderboard, categories, revealed } = data
  const revealedCats = categories.filter(c => revealed.includes(c))
  const allRevealed = revealedCats.length === categories.length

  const maxPossibleScore = categories.length * 10

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <h1 className="font-headline text-4xl font-black text-secondary mb-2">
            The Crust Competition 2026
          </h1>
          <p className="text-gray-500">Leaderboard en vivo</p>
        </div>

        {!allRevealed && (
          <div className="bg-primary/10 border border-primary/30 rounded-2xl px-6 py-4 text-center">
            <p className="font-headline font-bold text-primary-dark">
              Puntuaciones siendo reveladas en vivo
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {categories.length - revealedCats.length} categorías por revelar
            </p>
          </div>
        )}

        {leaderboard.length > 0 && allRevealed && (
          <div className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border-2 border-primary/30 text-center">
            <p className="text-sm font-medium text-primary-dark uppercase tracking-wide mb-1">Campeón</p>
            <h2 className="font-headline text-3xl font-black text-secondary">{leaderboard[0].team_name}</h2>
            <p className="text-lg text-gray-600 mt-1">"{leaderboard[0].sandwich_name}"</p>
            <p className="text-2xl font-bold text-primary-dark mt-2">{leaderboard[0].total_score.toFixed(2)} pts</p>
          </div>
        )}

        {leaderboard.length > 0 ? (
          <div className="space-y-6">
            {leaderboard.map((entry, idx) => {
              const rank = idx + 1
              return (
                <div key={entry.team_id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${rank <= 3 && allRevealed ? 'border-primary/30' : 'border-gray-100'}`}>
                  <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-100">
                    <RankBadge rank={rank} />
                    <div className="flex-1">
                      <h3 className="font-headline text-lg font-bold text-secondary">{entry.team_name}</h3>
                      <p className="text-sm text-gray-500">{entry.sandwich_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-headline text-2xl font-black text-secondary">{entry.total_score.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">pts totales</p>
                    </div>
                  </div>
                  {revealedCats.length > 0 && (
                    <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {revealedCats.map(cat => (
                        <CategoryBar
                          key={cat}
                          label={cat}
                          value={entry.category_scores[cat] || 0}
                          max={10}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
            No hay equipos registrados aún.
          </div>
        )}
      </div>
    </div>
  )
}
