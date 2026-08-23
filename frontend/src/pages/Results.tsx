import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { socket } from '../lib/socket'
import Tooltip from '../components/Tooltip'

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

const rankBadge = (idx: number) => {
  if (idx === 0) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-yellow-400 text-white text-xs font-black">1</span>
  if (idx === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-400 text-white text-xs font-black">2</span>
  if (idx === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-600 text-white text-xs font-black">3</span>
  return <span className="text-gray-400 font-bold text-sm">{idx + 1}</span>
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

    socket.on('score:reveal', () => {
      fetchLeaderboard()
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
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Failed to load leaderboard.
      </div>
    )
  }

  const { leaderboard, categories, revealed } = data
  const revealedCats = categories.filter(c => revealed.includes(c))
  const allRevealed = revealedCats.length === categories.length
  const maxScore = 10

  const categoryMax: Record<string, number> = {}
  for (const entry of leaderboard) {
    for (const cat of categories) {
      const val = entry.category_scores[cat] || 0
      if (val > (categoryMax[cat] || 0)) categoryMax[cat] = val
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Live banner */}
        {!allRevealed && revealedCats.length > 0 && (
          <div className="mb-6 flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-2xl px-4 py-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            <p className="text-sm font-semibold text-primary-dark">
              Puntuaciones siendo reveladas en vivo
            </p>
          </div>
        )}

        <h1 className="font-headline text-4xl font-black text-secondary mb-2 text-center">
          The Crust Competition 2026
        </h1>
        <p className="text-gray-500 text-center mb-8">Live Leaderboard</p>

        {/* Winner spotlight */}
        {leaderboard.length > 0 && allRevealed && (
          <div className="mb-8 p-6 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border-2 border-primary/30 text-center">
            <p className="text-sm font-medium text-primary-dark uppercase tracking-wide mb-1">
              🏆 Champion
            </p>
            <h2 className="font-headline text-3xl font-black text-secondary">
              {leaderboard[0].team_name}
            </h2>
            <p className="text-lg text-gray-600 mt-1">
              "{leaderboard[0].sandwich_name}"
            </p>
            <p className="text-2xl font-bold text-primary-dark mt-2">
              {leaderboard[0].total_score.toFixed(2)} pts
            </p>
          </div>
        )}

        {/* Category progress bars */}
        {revealedCats.length > 0 && (
          <div className="mb-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-lg font-bold text-secondary mb-4">Progreso por Categoría</h2>
            <div className="space-y-3">
              {revealedCats.map(cat => (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <Tooltip content={`Puntuación promedio por equipo en ${cat}`}>
                      <span className="font-medium text-gray-700 cursor-help">{cat}</span>
                    </Tooltip>
                    <span className="text-gray-500">{categoryMax[cat]?.toFixed(1) || 0} / {maxScore}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${((categoryMax[cat] || 0) / maxScore) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard table */}
        {leaderboard.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <thead>
                <tr className="bg-secondary/5 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary">#</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Team</th>
                  <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Sandwich</th>
                  <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Total</th>
                  {revealedCats.map(cat => (
                    <th key={cat} className="text-right px-4 py-3 font-headline font-bold text-secondary text-sm">
                      <Tooltip content={`Promedio de ${cat}`}>
                        <span className="cursor-help">{cat}</span>
                      </Tooltip>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => (
                  <tr
                    key={entry.team_id}
                    className={`border-b border-gray-100 last:border-0 ${
                      idx === 0 && allRevealed
                        ? 'bg-primary/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3">{rankBadge(idx)}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{entry.team_name}</div>
                      <div className="text-sm text-gray-500 sm:hidden">{entry.sandwich_name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{entry.sandwich_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      {entry.total_score.toFixed(2)}
                    </td>
                    {revealedCats.map(cat => (
                      <td key={cat} className="px-4 py-3 text-right text-sm">
                        {entry.category_scores[cat]?.toFixed(1) ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
            No teams registered yet.
          </div>
        )}

        {!allRevealed && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {categories.length - revealedCats.length} categories yet to be revealed
          </p>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-secondary transition-colors">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
