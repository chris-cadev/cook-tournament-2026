import { useState } from 'react'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  registered_at: string
}

interface Props {
  team: Team
  onClose: () => void
  onSaved: () => void
  token: string
}

export default function TeamEditModal({ team, onClose, onSaved, token }: Props) {
  const [status, setStatus] = useState(team.status)
  const [station, setStation] = useState(team.station || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, station: station || null }),
      })
      if (res.ok) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-headline text-xl font-black text-secondary">{team.name}</h2>
        <p className="text-sm text-gray-500">{team.sandwich_name} · {team.captain_email}</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ej: Mesa 1"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-secondary transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
