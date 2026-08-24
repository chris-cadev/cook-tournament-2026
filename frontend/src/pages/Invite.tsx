import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function Invite() {
  const { code } = useParams<{ code: string }>()
  const [invite, setInvite] = useState<{ code: string; message: string | null; uses: number } | null>(null)
  const [error, setError] = useState(false)
  const [tracked, setTracked] = useState(false)

  useEffect(() => {
    if (!code) return
    fetch(`/api/invites/${code}`)
      .then(r => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then(data => {
        setInvite(data)
        fetch(`/api/invites/${code}/track`, { method: 'POST' })
          .then(() => setTracked(true))
          .catch(() => {})
      })
      .catch(() => setError(true))
  }, [code])

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="font-headline text-4xl font-black text-secondary">Invitación no válida</h1>
          <p className="text-gray-600">Este enlace de invitación no existe o ha expirado.</p>
          <Link to="/" className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-2xl">
            Ir al inicio
          </Link>
        </div>
      </div>
    )
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center space-y-6">
        <div className="text-5xl">🥪</div>
        <h1 className="font-headline text-3xl font-black text-secondary">
          ¡Te invitamos!
        </h1>
        {invite.message && (
          <p className="text-gray-600">{invite.message}</p>
        )}
        <p className="text-sm text-gray-500">
          Has sido invitado al Campeonato de Sándwiches 2026
        </p>
        <div className="space-y-3">
          <Link
            to="/"
            className="block bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors"
          >
            Ver el evento
          </Link>
          <Link
            to="/register"
            className="block bg-secondary/10 hover:bg-secondary/20 text-secondary font-headline font-semibold px-6 py-3 rounded-2xl transition-colors"
          >
            Registrar tu equipo
          </Link>
          <Link
            to="/chat"
            className="block bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-headline font-semibold px-6 py-3 rounded-2xl transition-colors"
          >
            Unirse al chat
          </Link>
        </div>
        {tracked && (
          <p className="text-xs text-gray-400">¡Gracias por venir!</p>
        )}
      </div>
    </div>
  )
}
