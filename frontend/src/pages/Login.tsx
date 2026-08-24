import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

type Role = 'admin' | 'team' | 'judge'

export default function Login() {
  const [searchParams] = useSearchParams()
  const initialRole = (searchParams.get('role') as Role) || 'admin'
  const [role, setRole] = useState<Role>(initialRole)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const endpoint =
      role === 'admin' ? '/api/auth/admin/login'
      : role === 'team' ? '/api/auth/team/login'
      : '/api/auth/judge/login'

    const body =
      role === 'judge' ? { password }
      : { email, password }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas')
        return
      }

      if (role === 'admin') {
        login(data.token, { id: data.user.id, email: data.user.email, name: data.user.name, role: 'admin' })
        navigate('/admin')
      } else if (role === 'team') {
        login(data.token, { team_id: data.team.id, name: data.team.name, role: 'team' })
        navigate(`/chat/team/${data.team.id}`)
      } else {
        login(data.token, { anonymous_id: data.judge.anonymous_id, role: 'judge' })
        navigate('/judge')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-6">
          El Campeonato de Sándwiches
        </h1>

        <div className="flex justify-center gap-2 mb-6">
          {(['admin', 'team', 'judge'] as Role[]).map((r) => (
            <button
              key={r}
              onClick={() => { setRole(r); setError('') }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                role === r
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {r === 'admin' ? 'Organizador' : r === 'team' ? 'Equipo' : 'Juez'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {role !== 'judge' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {role === 'admin' ? 'Correo electrónico' : 'Correo del capitán'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder={role === 'admin' ? 'admin@ejemplo.com' : 'capitan@ejemplo.com'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {role === 'judge' ? 'Contraseña de jueces' : 'Contraseña'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
