import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: 'pending' | 'confirmed' | 'disqualified'
  station: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  team: Team | null
  onSaved: () => void
}

export default function TeamEditModal({ open, onClose, team, onSaved }: Props) {
  const { token } = useAuthStore()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [name, setName] = useState('')
  const [sandwichName, setSandwichName] = useState('')
  const [status, setStatus] = useState<Team['status']>('pending')
  const [station, setStation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  useEffect(() => {
    if (team) {
      setName(team.name)
      setSandwichName(team.sandwich_name)
      setStatus(team.status)
      setStation(team.station || '')
      setError('')
    }
  }, [team])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!team || !token) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          sandwich_name: sandwichName,
          status,
          station: station || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        setError(err.error || 'Error al guardar')
        return
      }
      onSaved()
      onClose()
    } catch {
      setError('Error de red — intenta de nuevo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/40 bg-transparent rounded-2xl shadow-xl p-0 max-w-lg w-full"
    >
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6">
        <h2 className="font-headline text-xl font-bold text-secondary mb-4">Editar Equipo</h2>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-xl text-sm text-error">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del equipo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del sándwich</label>
            <input
              type="text"
              value={sandwichName}
              onChange={(e) => setSandwichName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Team['status'])}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="disqualified">Descalificado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estación</label>
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="Ej: Estación A"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
