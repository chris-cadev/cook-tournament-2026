import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

export default function Registration() {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sandwich_name: '',
    captain_email: '',
    password: '',
    members: ['', ''],
    equipment_needs: '',
  })

  const update = (field: string, value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateMember = (index: number, value: string) => {
    const members = [...form.members]
    members[index] = value
    update('members', members)
  }

  const addMember = () => {
    if (form.members.length < 3) {
      update('members', [...form.members, ''])
    }
  }

  const removeMember = (index: number) => {
    if (form.members.length > 2) {
      update('members', form.members.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.sandwich_name || !form.captain_email || !form.password) {
      addToast('Completa todos los campos requeridos', 'error')
      return
    }

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
        addToast(data.error || 'Error al registrar', 'error')
        return
      }

      addToast('Equipo registrado!', 'success')
      navigate('/')
    } catch {
      addToast('Error de red', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">
          Registro de Equipo
        </h1>
        <p className="text-gray-500 text-center mb-8">Registra tu equipo para la competencia</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Los Tripanadores"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input
              type="text"
              value={form.sandwich_name}
              onChange={(e) => update('sandwich_name', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="El Reina del Sur"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input
              type="email"
              value={form.captain_email}
              onChange={(e) => update('captain_email', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="capitan@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Comparte con tu equipo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Miembros del equipo</label>
            {form.members.map((member, i) => (
              <div key={i} className="flex gap-2 mb-2">
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
                    className="text-gray-400 hover:text-error px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {form.members.length < 3 && (
              <button
                type="button"
                onClick={addMember}
                className="text-sm text-primary-dark hover:text-primary font-medium"
              >
                + Agregar miembro
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipo / Utensilios (opcional)</label>
            <textarea
              value={form.equipment_needs}
              onChange={(e) => update('equipment_needs', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              placeholder="Describe qué equipo o utensilios necesitas..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Equipo'}
          </button>
        </form>
      </div>
    </div>
  )
}
