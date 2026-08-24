import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

export default function JudgeAccess() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/judge/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        addToast(data.error || 'Contraseña incorrecta', 'error')
        return
      }
      login(data.token, { anonymous_id: data.judge.anonymous_id, role: 'judge' })
      addToast('Bienvenido, juez!', 'success')
      navigate('/judge/score')
    } catch {
      addToast('Error de red', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-12">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">
          Acceso de Jueces
        </h1>
        <p className="text-gray-500 text-center mb-8">Ingresa la contraseña de juez para acceder al panel de puntuación</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de juez</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="••••••••"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar al Panel de Juez'}
          </button>
        </form>
      </div>
    </div>
  )
}
