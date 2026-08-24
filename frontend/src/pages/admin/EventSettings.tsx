import { useState, useEffect } from 'react'

interface ScoringCategory {
  id: number
  name: string
  weight: number
  max_points: number
  description: string
}

export default function EventSettings() {
  const [eventDate, setEventDate] = useState('')
  const [categories, setCategories] = useState<ScoringCategory[]>([])
  const [judgePassword, setJudgePassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/config').then(r => r.json()),
      fetch('/api/judges/rubric').then(r => r.json()),
    ]).then(([config, rubric]) => {
      setEventDate(config.event_date || '')
      setCategories(rubric.categories || [])
    }).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const body: Record<string, any> = { event_date: eventDate }
      if (judgePassword) body.judge_password = judgePassword
      if (teamPassword) body.team_password = teamPassword
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setMsg('Configuración guardada')
        setJudgePassword('')
        setTeamPassword('')
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-secondary">Categorías de puntuación</h3>
        <p className="text-sm text-gray-500">Definidas en organizacion.md. Se usan para calcular las puntuaciones.</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <span className="font-medium text-sm flex-1">{cat.name}</span>
              <span className="text-xs text-gray-500">x{cat.weight}</span>
              <span className="text-xs text-gray-500">max {cat.max_points}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-secondary">Contraseñas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de juez (dejar vacío para no cambiar)</label>
            <input type="password" value={judgePassword} onChange={(e) => setJudgePassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de equipo (dejar vacío para no cambiar)</label>
            <input type="password" value={teamPassword} onChange={(e) => setTeamPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50">
        {saving ? 'Guardando...' : 'Guardar Configuración'}
      </button>
    </div>
  )
}
