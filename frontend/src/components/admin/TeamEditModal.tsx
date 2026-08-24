import { useState } from 'react'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  members?: string
}

interface Props {
  team: Team
  onClose: () => void
  onSaved: () => void
}

export default function TeamEditModal({ team, onClose, onSaved }: Props) {
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
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status, station: station || null }),
      })
      if (res.ok) onSaved()
    } finally {
      setSaving(false)
    }
  }

  const members = team.members ? JSON.parse(team.members) : []

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline text-xl font-black text-secondary">{team.name}</h3>
        <p className="text-sm text-gray-500">Sándwich: {team.sandwich_name}</p>
        <p className="text-sm text-gray-500">Capitán: {team.captain_email}</p>
        {members.length > 0 && (
          <p className="text-sm text-gray-500">Miembros: {members.join(', ')}</p>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="pending">Pendiente</option>
            <option value="confirmed">Confirmado</option>
            <option value="disqualified">Descalificado</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estación</label>
          <input type="text" value={station} onChange={(e) => setStation(e.target.value)} placeholder="Ej: Estación A"
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
