import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

export default function InvitePage() {
  const { code } = useParams<{ code: string }>()
  const [status, setStatus] = useState<'loading' | 'valid' | 'used' | 'not-found'>('loading')
  const [inviteInfo, setInviteInfo] = useState<{ role: string; team_id: number | null } | null>(null)

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
    try {
      const res = await fetch(`/api/auth/invite/${code}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Invitado' }),
      })
      if (res.ok) {
        if (inviteInfo?.role === 'team') {
          window.location.href = '/register'
        } else {
          window.location.href = '/chat'
        }
      }
    } catch {}
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
          {status === 'valid' && (
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
                {inviteInfo?.role === 'team' ? 'Registrar Equipo' : 'Unirse al Chat'}
              </button>
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
