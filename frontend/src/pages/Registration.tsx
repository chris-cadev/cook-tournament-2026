import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Registration() {
  const [form, setForm] = useState({
    name: '', sandwich_name: '', captain_email: '', password: '',
    member1: '', member2: '', member3: '', equipment_needs: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const members = [form.member1, form.member2, form.member3].filter(Boolean)
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sandwich_name: form.sandwich_name,
          captain_email: form.captain_email,
          password: form.password,
          members,
          equipment_needs: form.equipment_needs || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }
      setSuccess(true)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="text-4xl mb-4">🎉</div>
            <h1 className="font-headline text-2xl font-black text-secondary mb-2">¡Equipo Registrado!</h1>
            <p className="text-gray-500 text-sm mb-6">Tu equipo está pendiente de confirmación por el organizador.</p>
            <Link to="/" className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl inline-block transition-colors">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">Registro de Equipo</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Completa los datos de tu equipo para participar</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input type="text" value={form.sandwich_name} onChange={(e) => update('sandwich_name', e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input type="email" value={form.captain_email} onChange={(e) => update('captain_email', e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <p className="text-xs text-gray-400 mt-1">Comparte esta contraseña con todos los miembros del equipo</p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Miembros del equipo (2–3)</label>
            <div className="space-y-2">
              <input type="text" placeholder="Miembro 1" value={form.member1} onChange={(e) => update('member1', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input type="text" placeholder="Miembro 2" value={form.member2} onChange={(e) => update('member2', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              <input type="text" placeholder="Miembro 3 (opcional)" value={form.member3} onChange={(e) => update('member3', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipo / material adicional (opcional)</label>
            <textarea value={form.equipment_needs} onChange={(e) => update('equipment_needs', e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej: Necesitamos extensión eléctrica extra..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
            {loading ? 'Registrando...' : 'Registrar Equipo'}
          </button>
        </form>

        <div className="text-center mt-4 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
