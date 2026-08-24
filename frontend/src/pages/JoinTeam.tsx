import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  members: string[]
  status: string
}

export default function JoinTeam() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Team | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch('/api/guests/teams')
      .then((r) => r.json())
      .then((data) => { setTeams(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSend = async () => {
    if (!selected) return
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Tu nombre es requerido'
    if (!email.trim()) errs.email = 'Tu email es requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Email inválido'
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSending(true)
    setErrors({})
    try {
      const res = await fetch('/api/join-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: selected.id,
          name: name.trim(),
          email: email.trim(),
          message: message.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErrors({ submit: data.error }); return }
      setSent(true)
    } catch {
      setErrors({ submit: 'Error de red' })
    } finally {
      setSending(false)
    }
  }

  const fieldClass = (field: string) =>
    `w-full border rounded-xl px-3 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
    }`

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-gray-400">Cargando equipos...</p>
      </div>
    )
  }

  if (teams.length === 0) {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <p className="text-3xl mb-3">🧑‍🍳</p>
            <h1 className="font-headline text-2xl font-black text-secondary mb-2">No hay equipos abiertos</h1>
            <p className="text-sm text-gray-500 mb-6">Ningún equipo ha abierto su registro para nuevos integrantes. Puedes crear el tuyo.</p>
            <Link to="/register" className="bg-secondary hover:bg-secondary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl inline-block transition-colors">
              Registrar equipo
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-surface py-8 px-4">
        <div className="max-w-lg mx-auto text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-3">
            <p className="text-3xl">✉️</p>
            <h1 className="font-headline text-2xl font-black text-secondary">Solicitud enviada</h1>
            <p className="text-sm text-gray-500">
              El capitán de <strong>{selected?.name}</strong> recibió tu solicitud con tu nombre y email.
            </p>
            <Link to="/" className="inline-block mt-2 bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors">
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
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-2">Unirme a un equipo</h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Elige un equipo y envía tu solicitud al capitán.</p>

        <div className="space-y-3">
          {teams.map((team) => (
            <button key={team.id} onClick={() => { setSelected(team); setErrors({}) }}
              className={`w-full text-left bg-white rounded-2xl shadow-sm border-2 p-4 transition-colors ${
                selected?.id === team.id ? 'border-primary' : 'border-gray-100 hover:border-gray-200'
              }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-headline font-bold text-secondary">{team.name}</p>
                  {team.sandwich_name && <p className="text-sm text-gray-500">"{team.sandwich_name}"</p>}
                </div>
                <span className="text-xs bg-primary/10 text-primary-dark px-2 py-1 rounded-lg font-medium">
                  {team.members.length}/3
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {team.members.join(' · ')}
              </p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline font-bold text-secondary">Solicitar unirse a {selected.name}</h2>

            {errors.submit && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{errors.submit}</p>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className={fieldClass('name')} placeholder="Ej: María López" />
              {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tu email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className={fieldClass('email')} placeholder="maria@ejemplo.com" />
              {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje <span className="text-gray-400">(opcional)</span></label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={300}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Cuéntales sobre ti, tu experiencia..." />
              <p className="text-xs text-gray-400 mt-0.5">{message.length}/300</p>
            </div>

            <button onClick={handleSend} disabled={sending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
              {sending ? 'Enviando...' : 'Enviar solicitud'}
            </button>
          </div>
        )}

        <div className="text-center mt-6 text-sm text-gray-500">
          <Link to="/" className="hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
