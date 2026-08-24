import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const GUEST_KEY = 'guest_access_code'

export default function LoginGuest() {
  const [code, setCode] = useState(() => localStorage.getItem(GUEST_KEY) || '')
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
    if (!code.trim()) { setError('Ingresa tu código'); return }

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/guests/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Código inválido'); return }
      login(data.user)
      window.location.href = '/chat'
    } catch {
      setError('Error de red')
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
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">Entrar como invitado</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Ingresa el código que recibiste al confirmar tu asistencia.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de acceso</label>
            <input type="text" value={code} onChange={(e) => { setCode(e.target.value); setError('') }} autoFocus
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono text-center text-lg tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="A1B2C3D4" maxLength={8} />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
