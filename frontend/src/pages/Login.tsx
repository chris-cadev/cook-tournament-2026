import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

type LoginType = 'admin' | 'team' | 'judge'

export default function Login() {
  const [searchParams] = useSearchParams()
  const initial = (searchParams.get('as') as LoginType) || 'admin'
  const [loginType, setLoginType] = useState<LoginType>(initial)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let url = ''
      let body: Record<string, string> = {}

      if (loginType === 'admin') {
        url = '/api/auth/admin/login'
        body = { email, password }
      } else if (loginType === 'team') {
        url = '/api/auth/team/login'
        body = { email, password }
      } else {
        url = '/api/auth/judge/login'
        body = { password }
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast(data.error || 'Login failed', 'error')
        return
      }

      if (loginType === 'admin') {
        login(data.token, { id: data.user.id, email: data.user.email, role: 'admin', name: data.user.name })
        navigate('/admin')
      } else if (loginType === 'team') {
        login(data.token, { team_id: data.team.id, name: data.team.name, role: 'team' })
        navigate(`/chat/team/${data.team.id}`)
      } else {
        login(data.token, { anonymous_id: data.judge.anonymous_id, role: 'judge' })
        navigate('/judge')
      }

      addToast('Bienvenido!', 'success')
    } catch {
      addToast('Error de red', 'error')
    } finally {
      setLoading(false)
    }
  }

  const tabs: { key: LoginType; label: string }[] = [
    { key: 'admin', label: 'Admin' },
    { key: 'team', label: 'Equipo' },
    { key: 'judge', label: 'Juez' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-8">Iniciar Sesión</h1>

        {/* Role tabs */}
        <div className="flex bg-white rounded-2xl border border-gray-200 p-1 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLoginType(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                loginType === tab.key
                  ? 'bg-primary text-white'
                  : 'text-gray-500 hover:text-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {loginType !== 'judge' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="tu@email.com"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {loginType === 'judge' ? 'Contraseña del juez' : 'Contraseña'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
            />
          </div>
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
