import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginJudge() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }
      login({ id: data.judge.id, email: data.judge.email, name: data.judge.name, anonymous_id: data.judge.anonymous_id, role: 'judge' })
      navigate('/judge/panel')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-surface flex items-center justify-center px-4">
      {user && (
        <button onClick={handleLogout} className="absolute top-4 right-4 text-sm text-gray-400 hover:text-gray-600">
          Cerrar sesión
        </button>
      )}
      <div className="w-full max-w-sm">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">Judge Access</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Ingresa con tu email y contraseña de juez</p>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
            {loading ? 'Entrando...' : 'Acceder'}
          </button>
        </form>
        <div className="text-center mt-4 text-sm text-gray-500 space-y-1">
          <Link to="/login/team" className="hover:text-primary block">Entrar como equipo</Link>
          <Link to="/" className="hover:text-primary block">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
