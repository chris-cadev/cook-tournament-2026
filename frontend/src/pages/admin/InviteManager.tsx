import { useState, useEffect } from 'react'

interface InviteCode {
  id: number
  code: string
  created_by: string
  role: string
  uses: number
  created_at: string
}

export default function InviteManager() {
  const [invites, setInvites] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const authHeaders = { 'Content-Type': 'application/json' }

  useEffect(() => { fetchInvites() }, [])

  async function fetchInvites() {
    try {
      const res = await fetch('/api/invites', { headers: authHeaders })
      if (res.ok) setInvites(await res.json())
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setLoading(false)
    }
  }

  async function generateInvite(role: string) {
    setGenerating(true)
    try {
      const res = await fetch('/api/invites/generate', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ role }),
      })
      if (res.ok) {
        await fetchInvites()
      }
    } catch (err) {
      console.error('Failed to generate invite:', err)
    } finally {
      setGenerating(false)
    }
  }

  async function deleteInvite(id: number) {
    try {
      await fetch(`/api/invites/${id}`, { method: 'DELETE', headers: authHeaders })
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Failed to delete invite:', err)
    }
  }

  function copyLink(code: string) {
    const url = `${window.location.origin}/?ref=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Invitaciones</h1>
        <p className="text-gray-600 mb-6">Genera enlaces únicos para invitar personas al evento.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { role: 'guest', label: 'Invitar Invitado', desc: 'Acceso al chat global y landing page' },
            { role: 'team', label: 'Invitar Equipo', desc: 'Link de registro para nuevos equipos' },
            { role: 'judge', label: 'Invitar Juez', desc: 'Acceso al panel de puntuación' },
          ].map(opt => (
            <button
              key={opt.role}
              onClick={() => generateInvite(opt.role)}
              disabled={generating}
              className="bg-white rounded-2xl border-2 border-gray-200 p-4 text-left hover:border-primary transition-colors disabled:opacity-50"
            >
              <p className="font-headline font-bold text-secondary text-sm">{opt.label}</p>
              <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
            </button>
          ))}
        </div>

        {invites.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay invitaciones creadas aún.</div>
        ) : (
          <div className="space-y-3">
            {invites.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border-2 border-gray-200 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase">{inv.role}</span>
                    <span className="text-xs text-gray-400">{inv.uses} usos</span>
                  </div>
                  <p className="text-sm font-mono text-gray-600 truncate">{inv.code}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyLink(inv.code)}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copiedCode === inv.code ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={() => deleteInvite(inv.id)}
                    className="px-3 py-1.5 text-xs font-medium text-error hover:bg-error/10 rounded-lg transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
