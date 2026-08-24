import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Registration() {
  const [teamName, setTeamName] = useState('')
  const [sandwichName, setSandwichName] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [password, setPassword] = useState('')
  const [members, setMembers] = useState(['', '', ''])
  const [equipmentNeeds, setEquipmentNeeds] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [registeredTeam, setRegisteredTeam] = useState<{ id: number; name: string } | null>(null)

  function updateMember(index: number, value: string) {
    setMembers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  function addMember() {
    if (members.length < 3) setMembers((prev) => [...prev, ''])
  }

  function removeMember(index: number) {
    if (members.length > 2) setMembers((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const validMembers = members.filter((m) => m.trim())
    if (validMembers.length < 2) {
      setError('Debe haber al menos 2 miembros')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName,
          sandwich_name: sandwichName,
          captain_email: captainEmail,
          password,
          members: validMembers,
          equipment_needs: equipmentNeeds || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al registrar equipo')
        return
      }
      setSuccess(true)
      setRegisteredTeam({ id: data.id, name: data.name })
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }

  if (success && registeredTeam) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h1 className="font-headline text-2xl font-black text-secondary mb-2">
            ¡Equipo registrado!
          </h1>
          <p className="text-gray-600 mb-6">
            <strong>{registeredTeam.name}</strong> ha sido registrado exitosamente.
            El organizador revisará tu inscripción pronto.
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
          <Link to="/" className="text-sm text-primary hover:underline">← Volver al inicio</Link>
        </div>
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">
          Registro de Equipo
        </h1>
        <p className="text-gray-500 mb-8">
          Completa los datos de tu equipo para participar en el campeonato
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo *</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej: Los Panaderos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich *</label>
            <input
              type="text"
              value={sandwichName}
              onChange={(e) => setSandwichName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej: El Triple Jamón"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email del capitán *</label>
            <input
              type="email"
              value={captainEmail}
              onChange={(e) => setCaptainEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="capitan@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña del equipo *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Comparte esta contraseña con tu equipo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Miembros del equipo *</label>
            {members.map((member, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMember(i, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder={`Miembro ${i + 1}`}
                />
                {members.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeMember(i)}
                    className="text-error hover:bg-error/10 px-3 rounded-xl transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {members.length < 3 && (
              <button
                type="button"
                onClick={addMember}
                className="text-sm text-primary hover:underline"
              >
                + Agregar miembro
              </button>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipamiento especial (opcional)</label>
            <textarea
              value={equipmentNeeds}
              onChange={(e) => setEquipmentNeeds(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej: Necesitamos enchufe extra para la plancha"
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
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar Equipo'}
          </button>
        </form>
      </div>
    </div>
  )
}
