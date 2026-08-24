import { useState, useEffect } from 'react'

interface Config {
  event_date: string
  event_title: string
  event_description: string
  rules: string
  scoring_categories: string[]
  landing_page_content: string
}

export default function EventSettings() {
  const [config, setConfig] = useState<Config>({
    event_date: '', event_title: '', event_description: '', rules: '',
    scoring_categories: [], landing_page_content: '',
  })
  const [judgePassword, setJudgePassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          event_date: data.event_date || '',
          event_title: data.event_title || '',
          event_description: data.event_description || '',
          rules: data.rules || '',
          scoring_categories: data.scoring_categories || [],
          landing_page_content: data.landing_page_content || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const body: Record<string, any> = { ...config }
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

  const addCategory = () => {
    if (newCategory.trim() && !config.scoring_categories.includes(newCategory.trim())) {
      setConfig((c) => ({ ...c, scoring_categories: [...c.scoring_categories, newCategory.trim()] }))
      setNewCategory('')
    }
  }

  const removeCategory = (cat: string) => {
    setConfig((c) => ({ ...c, scoring_categories: c.scoring_categories.filter((x) => x !== cat) }))
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del evento</label>
            <input type="text" value={config.event_title} onChange={(e) => setConfig((c) => ({ ...c, event_title: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento</label>
            <input type="datetime-local" value={config.event_date} onChange={(e) => setConfig((c) => ({ ...c, event_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (markdown)</label>
          <textarea value={config.event_description} onChange={(e) => setConfig((c) => ({ ...c, event_description: e.target.value }))} rows={4}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (markdown)</label>
          <textarea value={config.rules} onChange={(e) => setConfig((c) => ({ ...c, rules: e.target.value }))} rows={4}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contenido landing page (markdown)</label>
          <textarea value={config.landing_page_content} onChange={(e) => setConfig((c) => ({ ...c, landing_page_content: e.target.value }))} rows={4}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-secondary">Categorías de puntuación</h3>
        <div className="flex flex-wrap gap-2">
          {config.scoring_categories.map((cat) => (
            <span key={cat} className="bg-primary/10 text-primary-dark px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
              {cat}
              <button onClick={() => removeCategory(cat)} className="text-primary-dark/50 hover:text-red-500 ml-1">&times;</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            placeholder="Nueva categoría..."
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <button onClick={addCategory} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition-colors">Agregar</button>
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
