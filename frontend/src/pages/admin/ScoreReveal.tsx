import { useState, useEffect } from 'react'

interface CategoryStatus {
  category: string
  revealed: boolean
}

export default function ScoreReveal() {
  const [categories, setCategories] = useState<CategoryStatus[]>([])
  const [revealedCount, setRevealedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [revealing, setRevealing] = useState<string | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
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
  }

  async function handleReveal(category: string) {
    setRevealing(category)
    try {
      const res = await fetch('/api/scores/reveal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Failed to reveal category')
        return
      }

      setCategories(prev =>
        prev.map(c => (c.category === category ? { ...c, revealed: true } : c))
      )
      setRevealedCount(prev => prev + 1)
    } catch (err) {
      console.error('Failed to reveal category:', err)
      alert('Network error — try again')
    } finally {
      setRevealing(null)
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
      <div className="max-w-3xl">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">
          Score Reveal Control
        </h1>
        <p className="text-gray-600 mb-6">
          Reveal scoring categories one at a time. Connected clients see scores appear in real-time.
        </p>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm font-medium mb-1">
            <span>{revealedCount} of {total} categories revealed</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-tertiary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Category list */}
        <div className="space-y-3">
          {categories.map(({ category, revealed }) => (
            <div
              key={category}
              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-colors ${
                revealed
                  ? 'bg-tertiary/10 border-tertiary/30'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${
                    revealed ? 'bg-tertiary' : 'bg-gray-300'
                  }`}
                />
                <span className="font-medium text-lg">{category}</span>
              </div>

              {revealed ? (
                <span className="text-sm font-medium text-tertiary px-3 py-1 bg-tertiary/10 rounded-full">
                  Revealed
                </span>
              ) : (
                <button
                  onClick={() => handleReveal(category)}
                  disabled={revealing !== null}
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {revealing === category ? 'Revealing...' : `Reveal ${category}`}
                </button>
              )}
            </div>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No scoring categories configured yet.
          </div>
        )}
      </div>
    </>
  )
}
