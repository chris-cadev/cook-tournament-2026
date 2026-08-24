import { useState, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/Toast'

export default function Registration() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [sandwichName, setSandwichName] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [password, setPassword] = useState('')
  const [members, setMembers] = useState(['', ''])
  const [equipmentNeeds, setEquipmentNeeds] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          sandwich_name: sandwichName,
          captain_email: captainEmail,
          password,
          members: members.filter(m => m.trim()),
          equipment_needs: equipmentNeeds || null,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al registrar')
        return
      }

      toast('¡Equipo registrado!', 'success')
      navigate('/login?role=team')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  function addMember() {
    if (members.length < 3) setMembers([...members, ''])
  }

  function removeMember() {
    if (members.length > 2) setMembers(members.slice(0, -1))
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary">&larr; Inicio</Link>
        </div>

        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Registrar Equipo</h1>
        <p className="text-gray-500 mb-6">Completa los datos de tu equipo para inscribirte en el campeonato.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Ej: Los Panaderos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input
              type="text"
              required
              value={sandwichName}
              onChange={e => setSandwichName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Ej: El Reina del Fuego"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input
              type="email"
              required
              value={captainEmail}
              onChange={e => setCaptainEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="capitan@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Mínimo 4 caracteres"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Miembros del equipo</label>
              <div className="flex gap-2">
                {members.length < 3 && (
                  <button type="button" onClick={addMember} className="text-xs text-primary font-medium hover:text-primary-dark">+ Agregar</button>
                )}
                {members.length > 2 && (
                  <button type="button" onClick={removeMember} className="text-xs text-error font-medium hover:text-error/80">- Quitar</button>
                )}
              </div>
            </div>
            {members.map((m, i) => (
              <input
                key={i}
                type="text"
                value={m}
                onChange={e => {
                  const next = [...members]
                  next[i] = e.target.value
                  setMembers(next)
                }}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary mb-2"
                placeholder={`Miembro ${i + 1}`}
              />
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Necesidades de equipo (opcional)</label>
            <textarea
              value={equipmentNeeds}
              onChange={e => setEquipmentNeeds(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Ej: Necesitamos enchufe extra, plancha grande..."
            />
          </div>

          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-2">{error}</div>
          )}

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
