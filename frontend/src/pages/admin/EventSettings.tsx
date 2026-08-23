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
      .then((data: Config) => {
        setConfig({
          event_date: data.event_date ? data.event_date.slice(0, 16) : '',
          event_title: data.event_title || '',
          event_description: data.event_description || '',
          rules: data.rules || '',
          scoring_categories: data.scoring_categories || [],
          landing_page_content: data.landing_page_content || '',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const updateField = (field: keyof Config, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const addCategory = () => {
    const cat = newCategory.trim()
    if (cat && !config.scoring_categories.includes(cat)) {
      setConfig(prev => ({ ...prev, scoring_categories: [...prev.scoring_categories, cat] }))
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
      const body: Record<string, any> = {
        event_date: config.event_date || null,
        event_title: config.event_title,
        event_description: config.event_description,
        rules: config.rules,
        scoring_categories: config.scoring_categories,
        landing_page_content: config.landing_page_content,
      }
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
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Error al guardar' })
        return
      }

      setMessage({ type: 'success', text: 'Configuración guardada' })
      setJudgePassword('')
      setTeamPassword('')
    } catch {
      setMessage({ type: 'error', text: 'Error de red' })
    } finally {
      setSaving(false)
    }
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Configuración del Evento</h1>
        <p className="text-gray-500 mb-6">Administra los detalles de la competencia.</p>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">General</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del evento</label>
              <input
                type="text"
                value={config.event_title}
                onChange={(e) => updateField('event_title', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora del evento</label>
              <input
                type="datetime-local"
                value={config.event_date}
                onChange={(e) => updateField('event_date', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Markdown)</label>
              <textarea
                value={config.event_description}
                onChange={(e) => updateField('event_description', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] font-mono"
                placeholder="Descripción del evento..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (Markdown)</label>
              <textarea
                value={config.rules}
                onChange={(e) => updateField('rules', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[100px] font-mono"
                placeholder="Reglas de la competencia..."
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Categorías de Puntuación</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Nueva categoría..."
              />
              <button
                type="button"
                onClick={addCategory}
                className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
              >
                Agregar
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.scoring_categories.map(cat => (
                <span key={cat} className="bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  {cat}
                  <button onClick={() => removeCategory(cat)} className="text-secondary/50 hover:text-error text-xs">✕</button>
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Contraseñas</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de jueces</label>
                <input
                  type="password"
                  value={judgePassword}
                  onChange={(e) => setJudgePassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de equipos</label>
                <input
                  type="password"
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Contenido de Landing Page</h2>
            <textarea
              value={config.landing_page_content}
              onChange={(e) => updateField('landing_page_content', e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[120px] font-mono"
              placeholder="Contenido adicional para la landing page (Markdown)..."
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
