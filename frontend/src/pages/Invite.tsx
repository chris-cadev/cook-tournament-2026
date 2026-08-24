import { useState } from 'react'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

export default function Invite() {
  const { addToast } = useToastStore()
  const [name, setName] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const createInvite = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referrer_name: name.trim() || 'Guest' }),
      })
      const data = await res.json()
      setInviteUrl(data.url)
    } catch {
      addToast('Error al crear enlace', 'error')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl)
    addToast('¡Enlace copiado!', 'success')
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Invitar Amigos</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm mb-4">
            Crea un enlace único para invitar a otros al evento. Cada clic es registrado.
          </p>

          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre (opcional)"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={createInvite}
              disabled={loading}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Enlace'}
            </button>
          </div>

          {inviteUrl && (
            <div className="p-4 rounded-xl bg-tertiary/10 border border-tertiary/20">
              <p className="text-sm font-medium text-secondary mb-2">Tu enlace de invitación:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:bg-secondary/90 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
