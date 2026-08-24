import { useState, useEffect, useCallback } from 'react'
import { socket } from '../lib/socket'

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

  const rankBadge = (idx: number) => {
    if (idx === 0) return <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">🥇 1st</span>
    if (idx === 1) return <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full">🥈 2nd</span>
    if (idx === 2) return <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">🥉 3rd</span>
    return <span className="text-gray-400 text-sm font-bold">#{idx + 1}</span>
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-headline text-4xl font-black text-secondary mb-2 text-center">
          The Crust Competition 2026
        </h1>
        <p className="text-gray-500 text-center mb-8">Live Leaderboard</p>

        {/* Live banner */}
        {!allRevealed && leaderboard.some(e => e.total_score > 0) && (
          <div className="mb-6 p-4 bg-primary/10 border-2 border-primary/30 rounded-2xl text-center animate-pulse">
            <p className="font-headline font-bold text-primary-dark">
              🔴 Scores being revealed live — {revealedCats.length}/{categories.length} categories shown
            </p>
          </div>
        )}

        {/* Winner spotlight */}
        {allRevealed && leaderboard.length > 0 && (
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
                      {cat}
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
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium">{entry.category_scores[cat]?.toFixed(1) ?? '—'}</span>
                          {entry.category_scores[cat] != null && (
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${(entry.category_scores[cat] / 10) * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
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
      </div>
    </div>
  )
}
