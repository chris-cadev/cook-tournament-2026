import { useState } from 'react'

interface Team {
  id: number
  slug: string
  name: string
  sandwich_name: string
  captain_email: string
  status: string
  station: string | null
  members?: string | string[]
}

interface Props {
  open: boolean
  mode: 'edit' | 'create'
  team?: Team | null
  onClose: () => void
  onSaved: () => void
}

export default function TeamEditModal({ open, mode, team, onClose, onSaved }: Props) {
  const [name, setName] = useState(team?.name || '')
  const [sandwichName, setSandwichName] = useState(team?.sandwich_name || '')
  const [captainEmail, setCaptainEmail] = useState(team?.captain_email || '')
  const [password, setPassword] = useState('')
  const parsedMembers = Array.isArray(team?.members)
    ? team.members
    : team?.members
      ? JSON.parse(team.members)
      : []
  const [members, setMembers] = useState(parsedMembers.join(', '))
  const [equipmentNeeds, setEquipmentNeeds] = useState('')
  const [status, setStatus] = useState(team?.status || 'pending')
  const [station, setStation] = useState(team?.station || '')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    try {
      if (mode === 'create') {
        const res = await fetch('/api/admin/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            sandwich_name: sandwichName.trim(),
            captain_email: captainEmail.trim(),
            password: password || undefined,
            members: members ? members.split(',').map((m: string) => m.trim()).filter(Boolean) : [],
            equipment_needs: equipmentNeeds.trim() || null,
          }),
        })
        if (res.ok) onSaved()
      } else {
        if (!team) return
        const res = await fetch(`/api/teams/${team.slug}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, station: station || null }),
        })
        if (res.ok) onSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline text-xl font-black text-secondary">
          {mode === 'create' ? 'Crear Equipo' : team?.name}
        </h3>

        {mode === 'create' ? (
          <>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del equipo"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={sandwichName} onChange={(e) => setSandwichName(e.target.value)} placeholder="Nombre del sándwich"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="email" value={captainEmail} onChange={(e) => setCaptainEmail(e.target.value)} placeholder="Email del capitán"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (dejar vacío para auto-generar)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={members} onChange={(e) => setMembers(e.target.value)} placeholder="Miembros (separados por coma)"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="text" value={equipmentNeeds} onChange={(e) => setEquipmentNeeds(e.target.value)} placeholder="Equipo necesario"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">Sándwich: {team?.sandwich_name}</p>
            <p className="text-sm text-gray-500">Capitán: {team?.captain_email}</p>
            {team?.members && parsedMembers.length > 0 && (
              <p className="text-sm text-gray-500">Miembros: {parsedMembers.join(', ')}</p>
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
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
