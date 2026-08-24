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

  // Fallback: poll every 30s
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

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="font-headline text-4xl font-black text-secondary mb-2 text-center">
          The Crust Competition 2026
        </h1>
        <p className="text-gray-500 text-center mb-8">Live Leaderboard</p>

        {/* Live reveal banner */}
        {revealedCats.length > 0 && revealedCats.length < categories.length && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <p className="text-sm font-medium text-blue-700">
              Scores being revealed live — {revealedCats.length} of {categories.length} categories shown
            </p>
          </div>
        )}

        {/* Winner spotlight */}
        {leaderboard.length > 0 && revealedCats.length === categories.length && (
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
                    <th key={cat} className="text-right px-4 py-3 font-headline font-bold text-secondary text-sm" title={`Score average for "${cat}"`}>
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
                      idx === 0 && revealedCats.length === categories.length
                        ? 'bg-primary/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-3 font-bold">
                      {idx < 3 ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                          idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                          idx === 1 ? 'bg-gray-300 text-gray-700' :
                          'bg-amber-600 text-amber-100'
                        }`}>
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-gray-400">{idx + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold" title={`${entry.team_name} — "${entry.sandwich_name}"`}>{entry.team_name}</div>
                      <div className="text-sm text-gray-500 sm:hidden">{entry.sandwich_name}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{entry.sandwich_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-lg">
                      {entry.total_score.toFixed(2)}
                    </td>
                    {revealedCats.map(cat => {
                      const score = entry.category_scores[cat]
                      const maxScore = 10
                      const pct = score != null ? Math.min((score / maxScore) * 100, 100) : 0
                      return (
                        <td key={cat} className="px-4 py-3 text-right text-sm">
                          {score != null ? (
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-medium">{score.toFixed(1)}</span>
                              <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          ) : '—'}
                        </td>
                      )
                    })}
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

        {revealedCats.length < categories.length && (
          <p className="text-center text-sm text-gray-400 mt-6">
            {categories.length - revealedCats.length} categories yet to be revealed
          </p>
        )}
      </div>
    </div>
  )
}
