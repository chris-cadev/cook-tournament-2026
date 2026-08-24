import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Config {
  event_date: string
  event_title: string
  event_description: string
  rules: string
  scoring_categories: { name: string; description: string }[]
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
  const [newCategoryDesc, setNewCategoryDesc] = useState('')
  const [judgePassword, setJudgePassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch('/api/config')
        const data = await res.json()
        const rawCats = data.scoring_categories || []
        const cats = rawCats.map((c: any) =>
          typeof c === 'string' ? { name: c, description: '' } : c
        )
        setConfig({
          event_date: data.event_date || '',
          event_title: data.event_title || '',
          event_description: data.event_description || '',
          rules: data.rules || '',
          scoring_categories: cats,
          landing_page_content: data.landing_page_content || '',
        })
      } catch (err) {
        console.error('Failed to fetch config:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchConfig()
  }, [])

  async function handleSave() {
    if (!token) return
    setSaving(true)
    setSaved(false)
    try {
      const body: Record<string, any> = {
        event_date: config.event_date,
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
      if (res.ok) {
        setSaved(true)
        setJudgePassword('')
        setTeamPassword('')
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save config:', err)
    } finally {
      setSaving(false)
    }
  }

  function addCategory() {
    if (newCategory.trim() && !config.scoring_categories.some((c) => c.name === newCategory.trim())) {
      setConfig((prev) => ({
        ...prev,
        scoring_categories: [...prev.scoring_categories, { name: newCategory.trim(), description: newCategoryDesc.trim() }],
      }))
      setNewCategory('')
      setNewCategoryDesc('')
    }
  }

  function removeCategory(cat: string) {
    setConfig((prev) => ({
      ...prev,
      scoring_categories: prev.scoring_categories.filter((c) => c.name !== cat),
    }))
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
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Configuración del Evento</h1>
        <p className="text-gray-500 mb-6">Administra los detalles del campeonato</p>

        <div className="space-y-6">
          {/* Event basics */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Datos del Evento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={config.event_title}
                  onChange={(e) => setConfig((p) => ({ ...p, event_title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento</label>
                <input
                  type="datetime-local"
                  value={config.event_date}
                  onChange={(e) => setConfig((p) => ({ ...p, event_date: e.target.value }))}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Markdown)</label>
                <textarea
                  value={config.event_description}
                  onChange={(e) => setConfig((p) => ({ ...p, event_description: e.target.value }))}
                  rows={4}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>
          </section>

          {/* Rules */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Reglas (Markdown)</h2>
            <textarea
              value={config.rules}
              onChange={(e) => setConfig((p) => ({ ...p, rules: e.target.value }))}
              rows={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </section>

          {/* Scoring categories */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Categorías de Puntuación</h2>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Nombre de categoría"
                />
                <button
                  onClick={addCategory}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-3 rounded-xl transition-colors"
                >
                  Agregar
                </button>
              </div>
              <input
                type="text"
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Descripción (opcional)"
              />
            </div>
            <div className="space-y-2">
              {config.scoring_categories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-start justify-between bg-secondary/5 rounded-xl px-4 py-3"
                >
                  <div>
                    <span className="font-medium text-secondary text-sm">{cat.name}</span>
                    {cat.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <button onClick={() => removeCategory(cat.name)} className="text-gray-400 hover:text-error ml-2">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Landing page content */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Contenido Landing Page (Markdown)</h2>
            <textarea
              value={config.landing_page_content}
              onChange={(e) => setConfig((p) => ({ ...p, landing_page_content: e.target.value }))}
              rows={6}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </section>

          {/* Passwords */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-bold text-secondary mb-4">Contraseñas</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de jueces</label>
                <input
                  type="password"
                  value={judgePassword}
                  onChange={(e) => setJudgePassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de equipos</label>
                <input
                  type="password"
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Dejar vacío para no cambiar"
                />
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            {saved && (
              <span className="text-sm text-tertiary font-medium">Guardado exitosamente</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
