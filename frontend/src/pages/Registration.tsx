import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useToastStore } from '../stores/toastStore'

export default function Registration() {
  const [form, setForm] = useState({
    name: '', sandwich_name: '', captain_email: '', password: '',
    members: ['', ''], equipment_needs: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const addToast = useToastStore((s) => s.add)

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const setMember = (i: number, val: string) => {
    const m = [...form.members]
    m[i] = val
    setForm((f) => ({ ...f, members: m }))
  }

  const addMember = () => {
    if (form.members.length < 3) setForm((f) => ({ ...f, members: [...f.members, ''] }))
  }

  const removeMember = (i: number) => {
    if (form.members.length > 2) setForm((f) => ({ ...f, members: f.members.filter((_, j) => j !== i) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          members: form.members.filter((m) => m.trim()),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Registration failed')
        return
      }
      setSuccess(true)
      addToast('¡Equipo Registrado!', 'success')
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    const referralUrl = `${window.location.origin}/register?ref=${encodeURIComponent(form.name)}`
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="font-headline text-2xl font-black text-secondary mb-2">¡Equipo Registrado!</h1>
          <p className="text-gray-600 text-sm mb-4">Tu equipo está pendiente de confirmación por el organizador.</p>
          <div className="bg-gray-50 rounded-xl p-3 mb-6">
            <p className="text-xs text-gray-500 mb-1">Comparte este enlace para invitar:</p>
            <p className="text-sm font-mono text-secondary break-all">{referralUrl}</p>
          </div>
          <Link to="/" className="inline-block bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-primary-dark transition-colors">
            Volver al inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6 text-center">Registrar Equipo</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input value={form.sandwich_name} onChange={(e) => set('sandwich_name', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input type="email" value={form.captain_email} onChange={(e) => set('captain_email', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miembros del equipo (2–3) *</label>
            <div className="space-y-2">
              {form.members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    value={m}
                    onChange={(e) => setMember(i, e.target.value)}
                    placeholder={`Miembro ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    required
                  />
                  {form.members.length > 2 && (
                    <button type="button" onClick={() => removeMember(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
                  )}
                </div>
              ))}
            </div>
            {form.members.length < 3 && (
              <button type="button" onClick={addMember} className="mt-2 text-sm text-primary hover:underline">+ Agregar miembro</button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipamiento que necesitan (opcional)</label>
            <textarea value={form.equipment_needs} onChange={(e) => set('equipment_needs', e.target.value)} rows={2} className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
          </div>

          <button type="submit" disabled={loading} className="w-full bg-primary text-white font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50">
            {loading ? 'Registrando...' : 'Registrar Equipo'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          <Link to="/" className="text-primary hover:underline">Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
