import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function JudgeAccess() {
  const { token, user } = useAuthStore()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  useEffect(() => {
    if (token && user?.role === 'judge') {
      navigate('/judge/panel')
    }
  }, [token, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Contraseña incorrecta')
        return
      }
      login(data.token, { anonymous_id: data.judge.anonymous_id, role: 'judge' })
      navigate('/judge/panel')
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="text-center mb-4">
            <span className="material-symbols-outlined text-4xl text-primary">gavel</span>
          </div>
          <h1 className="font-headline text-2xl font-black text-secondary text-center mb-1">Acceso de Juez</h1>
          <p className="text-gray-500 text-center mb-6 text-sm">Ingresa la contraseña proporcionada por el organizador</p>

          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl mb-4">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoFocus
              placeholder="Contraseña de juez"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
              {loading ? 'Verificando...' : 'Acceder al Panel'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
