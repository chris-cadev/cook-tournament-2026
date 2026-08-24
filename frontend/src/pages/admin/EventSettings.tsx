import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Config {
  event_date: string
  event_title: string
  event_description: string
  rules: string
  scoring_categories: string[]
  landing_page_content: string
}

export default function EventSettings() {
  const { token } = useAuthStore()
  const [config, setConfig] = useState<Config>({
    event_date: '',
    event_title: '',
    event_description: '',
    rules: '',
    scoring_categories: [],
    landing_page_content: '',
  })
  const [newCategory, setNewCategory] = useState('')
  const [judgePassword, setJudgePassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(data => {
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

  const addCategory = () => {
    if (newCategory.trim() && !config.scoring_categories.includes(newCategory.trim())) {
      setConfig(prev => ({ ...prev, scoring_categories: [...prev.scoring_categories, newCategory.trim()] }))
      setNewCategory('')
    }
  }

  const removeCategory = (cat: string) => {
    setConfig(prev => ({ ...prev, scoring_categories: prev.scoring_categories.filter(c => c !== cat) }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const body: any = { ...config }
      if (judgePassword) body.judge_password = judgePassword
      if (teamPassword) body.team_password = teamPassword

      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        setMessage({ type: 'error', text: err.error || 'Error al guardar' })
        return
      }
      setMessage({ type: 'success', text: 'Configuración guardada' })
      setJudgePassword('')
      setTeamPassword('')
    } catch {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-headline text-3xl font-black text-secondary mb-2">Configuración del Evento</h1>
      <p className="text-gray-500 mb-6">Edita los detalles del evento, reglas y categorías de puntuación.</p>

      {message && (
        <div className={`mb-4 p-3 rounded-xl text-sm text-center ${
          message.type === 'success' ? 'bg-tertiary/10 text-tertiary' : 'bg-error/10 text-error'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Basic info */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Información Básica</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del evento</label>
              <input
                type="text"
                value={config.event_title}
                onChange={e => setConfig(prev => ({ ...prev, event_title: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento</label>
              <input
                type="datetime-local"
                value={config.event_date}
                onChange={e => setConfig(prev => ({ ...prev, event_date: e.target.value }))}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </section>

        {/* Markdown content */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Contenido</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del evento (Markdown)</label>
              <textarea
                value={config.event_description}
                onChange={e => setConfig(prev => ({ ...prev, event_description: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (Markdown)</label>
              <textarea
                value={config.rules}
                onChange={e => setConfig(prev => ({ ...prev, rules: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido de la landing page (Markdown)</label>
              <textarea
                value={config.landing_page_content}
                onChange={e => setConfig(prev => ({ ...prev, landing_page_content: e.target.value }))}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </section>

        {/* Scoring categories */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Categorías de Puntuación</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
              placeholder="Nueva categoría"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={addCategory}
              className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold px-4 py-2 rounded-xl transition-colors text-sm"
            >
              Agregar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.scoring_categories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium">
                {cat}
                <button onClick={() => removeCategory(cat)} className="hover:text-error ml-1">✕</button>
              </span>
            ))}
          </div>
        </section>

        {/* Passwords */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Contraseñas</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de juez (dejar vacío para no cambiar)</label>
              <input
                type="password"
                value={judgePassword}
                onChange={e => setJudgePassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de equipo (dejar vacío para no cambiar)</label>
              <input
                type="password"
                value={teamPassword}
                onChange={e => setTeamPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
