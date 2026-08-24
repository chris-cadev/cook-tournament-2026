import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from '../components/ui/Toast'

export default function Register() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [sandwichName, setSandwichName] = useState('')
  const [captainEmail, setCaptainEmail] = useState('')
  const [password, setPassword] = useState('')
  const [members, setMembers] = useState(['', ''])
  const [equipmentNeeds, setEquipmentNeeds] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const addMember = () => {
    if (members.length < 3) setMembers([...members, ''])
  }

  const updateMember = (i: number, val: string) => {
    const next = [...members]
    next[i] = val
    setMembers(next)
  }

  const removeMember = (i: number) => {
    if (members.length > 2) setMembers(members.filter((_, idx) => idx !== i))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim() || !sandwichName.trim() || !captainEmail.trim() || !password.trim()) {
      setError('Todos los campos obligatorios deben estar completos')
      return
    }

    const filledMembers = members.filter((m) => m.trim())
    if (filledMembers.length < 2) {
      setError('Se necesitan al menos 2 miembros en el equipo')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/teams/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sandwich_name: sandwichName.trim(),
          captain_email: captainEmail.trim(),
          password: password.trim(),
          members: filledMembers.map((m) => m.trim()),
          equipment_needs: equipmentNeeds.trim(),
        }),
      })

      if (res.status === 409) {
        setError('Ya existe un equipo con ese nombre')
        return
      }

      if (!res.ok) {
        setError('Error al registrar el equipo. Intenta de nuevo.')
        return
      }

      setSuccess(true)
      toast.success('¡Equipo registrado!')
      setTimeout(() => navigate('/'), 2000)
    } catch {
      setError('Error de conexión. Verifica tu red.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md w-full text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h2 className="font-headline text-2xl font-black text-secondary">¡Equipo registrado!</h2>
          <p className="text-gray-600">Tu equipo está pendiente de aprobación. Serás redirigido al inicio.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-headline text-4xl font-black text-secondary">Registrar Equipo</h1>
          <p className="text-gray-500 mt-2">Completa los datos de tu equipo para participar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error rounded-2xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-1">Nombre del equipo *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-1">Nombre del sándwich *</label>
            <input
              type="text"
              value={sandwichName}
              onChange={(e) => setSandwichName(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-1">Email del capitán *</label>
            <input
              type="email"
              value={captainEmail}
              onChange={(e) => setCaptainEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-1">Contraseña *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-2">Miembros del equipo *</label>
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Miembro ${i + 1}`}
                    value={m}
                    onChange={(e) => updateMember(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {members.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeMember(i)}
                      className="text-error hover:text-error/80 text-sm px-3"
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
                className="mt-2 text-sm text-primary-dark hover:text-primary font-medium"
              >
                + Agregar miembro
              </button>
            )}
          </div>

          <div>
            <label className="block font-headline font-bold text-secondary text-sm mb-1">Equipo / materiales necesarios</label>
            <textarea
              value={equipmentNeeds}
              onChange={(e) => setEquipmentNeeds(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Ej: Necesitamos enchufe extra, micrófono..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {loading ? 'Registrando...' : 'Registrar equipo'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login/team" className="text-primary-dark hover:text-primary font-semibold">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
