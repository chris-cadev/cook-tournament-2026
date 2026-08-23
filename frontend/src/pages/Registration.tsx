import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface FormData {
  name: string
  sandwich_name: string
  captain_email: string
  password: string
  members: string[]
  equipment_needs: string
}

export default function Registration() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({
    name: '',
    sandwich_name: '',
    captain_email: '',
    password: '',
    members: ['', ''],
    equipment_needs: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const updateMember = (index: number, value: string) => {
    const members = [...form.members]
    members[index] = value
    setForm(prev => ({ ...prev, members }))
  }

  const addMember = () => {
    if (form.members.length < 3) {
      setForm(prev => ({ ...prev, members: [...prev.members, ''] }))
    }
  }

  const removeMember = (index: number) => {
    if (form.members.length > 2) {
      setForm(prev => ({ ...prev, members: prev.members.filter((_, i) => i !== index) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.sandwich_name || !form.captain_email || !form.password) {
      setError('Completa todos los campos obligatorios.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          sandwich_name: form.sandwich_name,
          captain_email: form.captain_email,
          password: form.password,
          members: form.members.filter(m => m.trim()),
          equipment_needs: form.equipment_needs || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar equipo')
        return
      }

      navigate('/team/login')
    } catch {
      setError('Error de red — intenta de nuevo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Registrar Equipo</h1>
        <p className="text-gray-500 mb-8">Completa los datos de tu equipo para inscribirte en la competencia.</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Datos del Equipo</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ej: Los Panaderos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
              <input
                type="text"
                value={form.sandwich_name}
                onChange={(e) => updateField('sandwich_name', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ej: El Rey del BBQ"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Capitán</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
              <input
                type="email"
                value={form.captain_email}
                onChange={(e) => updateField('captain_email', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="capitan@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Mínimo 4 caracteres"
              />
              <p className="text-xs text-gray-400 mt-1">Comparte esta contraseña con todos los miembros del equipo.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-lg font-bold text-secondary">Miembros</h2>
              {form.members.length < 3 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="text-sm text-primary font-medium hover:text-primary-dark"
                >
                  + Agregar miembro
                </button>
              )}
            </div>

            {form.members.map((member, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(i, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={`Miembro ${i + 1}`}
                />
                {form.members.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <p className="text-xs text-gray-400">Mínimo 2, máximo 3 miembros por equipo.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Equipamento</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Necesidades especiales (opcional)</label>
              <textarea
                value={form.equipment_needs}
                onChange={(e) => updateField('equipment_needs', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                placeholder="Ej: Necesitamos acceso a electricidad extra para una freidora..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registrando...' : 'Registrar Equipo'}
          </button>
        </form>
      </div>
    </div>
  )
}
