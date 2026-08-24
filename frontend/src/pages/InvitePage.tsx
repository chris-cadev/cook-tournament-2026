import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const [status, setStatus] = useState<'loading' | 'valid' | 'used' | 'not-found'>('loading')
  const [inviteInfo, setInviteInfo] = useState<{ role: string; team_id: number | null } | null>(null)
  const [showRsvpForm, setShowRsvpForm] = useState(false)
  const [rsvpName, setRsvpName] = useState('')
  const [rsvpEmail, setRsvpEmail] = useState('')
  const [rsvpNumPeople, setRsvpNumPeople] = useState('')
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpError, setRsvpError] = useState('')
  const [rsvpSuccess, setRsvpSuccess] = useState(false)

  useEffect(() => {
    if (!code) return
    fetch(`/api/auth/invite/${code}`)
      .then((r) => {
        if (r.status === 404) return setStatus('not-found')
        if (r.status === 400) return setStatus('used')
        return r.json()
      })
      .then((data) => {
        if (data?.code) {
          setInviteInfo(data)
          setStatus('valid')
        }
      })
      .catch(() => setStatus('not-found'))
  }, [code])

  const handleAccept = async () => {
    if (!code) return
    if (inviteInfo?.role === 'team') {
      window.location.href = '/register'
      return
    }
    setShowRsvpForm(true)
  }

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code) return
    setRsvpError('')
    setRsvpSubmitting(true)

    try {
      const rsvpRes = await fetch('/api/guests/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rsvpName,
          email: rsvpEmail,
          num_people: rsvpNumPeople ? Number(rsvpNumPeople) : 0,
          invite_code: code,
        }),
      })

      if (!rsvpRes.ok) {
        const err = await rsvpRes.json()
        setRsvpError(err.error || 'Error al registrar')
        return
      }

      const rsvpData = await rsvpRes.json()

      await fetch(`/api/auth/invite/${code}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: rsvpName }),
      })

      const loginRes = await fetch('/api/guests/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_code: rsvpData.access_code }),
      })

      if (loginRes.ok) {
        window.location.href = '/chat'
      } else {
        window.location.href = '/login/guest'
      }
    } catch {
      setRsvpError('Error de conexión')
    } finally {
      setRsvpSubmitting(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-4">
          {status === 'valid' && !showRsvpForm && (
            <>
              <span className="material-symbols-outlined text-5xl text-primary">mail</span>
              <h1 className="font-headline text-2xl font-black text-secondary">¡Has sido invitado!</h1>
              <p className="text-sm text-gray-500">
                {inviteInfo?.role === 'team'
                  ? 'Este enlace te invita a registrar tu equipo de cocina.'
                  : 'Este enlace te invita a participar como espectador del evento.'}
              </p>
              <button
                onClick={handleAccept}
                className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors"
              >
                {inviteInfo?.role === 'team' ? 'Registrar Equipo' : 'Aceptar Invitación'}
              </button>
            </>
          )}

          {status === 'valid' && showRsvpForm && (
            <>
              <span className="material-symbols-outlined text-5xl text-primary">person_add</span>
              <h1 className="font-headline text-2xl font-black text-secondary">Regístrate</h1>
              <p className="text-sm text-gray-500">Completa tus datos para confirmar tu asistencia.</p>

              <form onSubmit={handleRsvpSubmit} className="space-y-3 text-left">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    value={rsvpName}
                    onChange={(e) => setRsvpName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={rsvpEmail}
                    onChange={(e) => setRsvpEmail(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número de personas</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={rsvpNumPeople}
                    onChange={(e) => setRsvpNumPeople(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="1"
                  />
                </div>

                {rsvpError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{rsvpError}</p>
                )}

                <button
                  type="submit"
                  disabled={rsvpSubmitting}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
                >
                  {rsvpSubmitting ? 'Registrando...' : 'Confirmar Asistencia'}
                </button>
              </form>
            </>
          )}

          {rsvpSuccess && (
            <>
              <span className="material-symbols-outlined text-5xl text-green-500">check_circle</span>
              <h1 className="font-headline text-2xl font-black text-secondary">¡Registro exitoso!</h1>
              <p className="text-sm text-gray-500">Redirigiendo al chat...</p>
            </>
          )}

          {status === 'used' && (
            <>
              <span className="material-symbols-outlined text-5xl text-gray-400">check_circle</span>
              <h1 className="font-headline text-2xl font-black text-secondary">Invitación ya utilizada</h1>
              <p className="text-sm text-gray-500">Este enlace de invitación ya fue utilizado.</p>
            </>
          )}

          {status === 'not-found' && (
            <>
              <span className="material-symbols-outlined text-5xl text-gray-400">error</span>
              <h1 className="font-headline text-2xl font-black text-secondary">Invitación no válida</h1>
              <p className="text-sm text-gray-500">Este enlace de invitación no existe o ha expirado.</p>
            </>
          )}
        </div>

        <Link to="/" className="text-sm text-gray-500 hover:text-primary">← Volver al inicio</Link>
      </div>
    </div>
  )
}
