import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Registration() {
  const [name, setName] = useState('')
  const [sandwichName, setSandwichName] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [password, setPassword] = useState('')
  const [members, setMembers] = useState(['', ''])
  const [equipmentNeeds, setEquipmentNeeds] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const addMember = () => {
    if (members.length < 3) setMembers([...members, ''])
  }

  const removeMember = (idx: number) => {
    if (members.length > 2) setMembers(members.filter((_, i) => i !== idx))
  }

  const updateMember = (idx: number, val: string) => {
    const next = [...members]
    next[idx] = val
    setMembers(next)
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
          name,
          sandwich_name: sandwichName,
          captain_email: captainEmail,
          password,
          members: members.filter(Boolean),
          equipment_needs: equipmentNeeds || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrar')
        return
      }
      setSuccess(true)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-4xl mb-4">🎉</p>
          <h1 className="font-headline text-2xl font-black text-secondary mb-2">¡Equipo registrado!</h1>
          <p className="text-gray-600 mb-6">
            Tu equipo <strong>{name}</strong> ha sido registrado exitosamente. El organizador revisará tu inscripción pronto.
          </p>
          <Link
            to="/"
            className="inline-block bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="text-sm text-primary hover:underline">← Volver al Inicio</Link>
          <h1 className="font-headline text-3xl font-black text-secondary mt-2">Registro de Equipo</h1>
          <p className="text-gray-500 mt-1">Completa los datos de tu equipo para inscribirse en la competencia.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input
              type="text"
              value={sandwichName}
              onChange={e => setSandwichName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input
              type="email"
              value={captainEmail}
              onChange={e => setCaptainEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Comparte esta contraseña con los miembros de tu equipo.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Miembros del equipo</label>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={m}
                    onChange={e => updateMember(i, e.target.value)}
                    placeholder={`Miembro ${i + 1}`}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMember(i)}
                      className="text-gray-400 hover:text-error px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {members.length < 3 && (
              <button
                type="button"
                onClick={addMember}
                className="text-sm text-primary hover:underline mt-2"
              >
                + Agregar miembro
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Necesidades de equipo (opcional)</label>
            <textarea
              value={equipmentNeeds}
              onChange={e => setEquipmentNeeds(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej: Necesitamos acceso a enchufe..."
            />
          </div>

          {error && <p className="text-error text-sm text-center">{error}</p>}

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
