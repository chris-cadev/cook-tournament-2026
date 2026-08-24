import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface InviteLink {
  id: number
  code: string
  invite_url: string
  created_by: string
  uses: number
  created_at: string
}

export default function Invites() {
  const { token } = useAuthStore()
  const [links, setLinks] = useState<InviteLink[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const fetchLinks = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/invites', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setLinks(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const createLink = async () => {
    if (!token) return
    setCreating(true)
    try {
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const link = await res.json()
        setLinks(prev => [{ ...link, uses: 0, created_at: new Date().toISOString() }, ...prev])
      }
    } finally {
      setCreating(false)
    }
  }

  const copyLink = (url: string, code: string) => {
    navigator.clipboard.writeText(url)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Enlaces de Invitación</h1>
        <p className="text-gray-500 mb-6">Genera enlaces únicos para que los invitados se registren.</p>

        <button
          onClick={createLink}
          disabled={creating}
          className="mb-6 bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
        >
          {creating ? 'Creando...' : 'Crear Nuevo Enlace'}
        </button>

        <div className="space-y-3">
          {links.map(link => (
            <div key={link.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono text-secondary truncate">{link.invite_url}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Usado {link.uses} {link.uses === 1 ? 'vez' : 'veces'} · {new Date(link.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => copyLink(link.invite_url, link.code)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                    copied === link.code
                      ? 'bg-tertiary text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {copied === link.code ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ))}
          {links.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay enlaces aún. Crea uno para empezar.</p>
          )}
        </div>
      </div>
    </div>
  )
}
