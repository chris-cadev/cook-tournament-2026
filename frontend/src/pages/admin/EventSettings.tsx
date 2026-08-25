import { useState, useEffect } from 'react'

export default function EventSettings() {
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => setEventDate(data.event_date || ''))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_date: eventDate }),
      })
      if (res.ok) {
        setMsg('Configuración guardada')
      } else {
        setMsg('Error al guardar')
      }
    } catch {
      setMsg('Error de red')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-black text-secondary">Configuración del Evento</h2>

      {msg && (
        <div className={`text-sm p-3 rounded-xl ${msg.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento</label>
          <input type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  )
}
