import { useState, useEffect } from 'react'

interface Team {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  status: 'pending' | 'confirmed' | 'disqualified'
  station: string | null
  members?: string
  equipment_needs?: string | null
}

interface TeamEditModalProps {
  team: Team
  onClose: () => void
  onSave: (updated: Partial<Team>) => void
  token: string
}

export default function TeamEditModal({ team, onClose, onSave, token }: TeamEditModalProps) {
  const [form, setForm] = useState({
    name: team.name,
    sandwich_name: team.sandwich_name,
    status: team.status,
    station: team.station || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const body: Record<string, unknown> = {}
    if (form.name !== team.name) body.name = form.name
    if (form.sandwich_name !== team.sandwich_name) body.sandwich_name = form.sandwich_name
    if (form.status !== team.status) body.status = form.status
    if (form.station !== (team.station || '')) body.station = form.station || null

    if (Object.keys(body).length === 0) {
      onClose()
      return
    }

    try {
      const res = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        onSave({ ...team, ...body } as Partial<Team>)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100">
          <h3 className="font-headline text-lg font-bold text-secondary">Editar Equipo</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sándwich</label>
            <input type="text" value={form.sandwich_name} onChange={e => setForm(prev => ({ ...prev, sandwich_name: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Team['status'] }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmado</option>
              <option value="disqualified">Descalificado</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estación</label>
            <input type="text" value={form.station} onChange={e => setForm(prev => ({ ...prev, station: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-xl transition-colors disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
