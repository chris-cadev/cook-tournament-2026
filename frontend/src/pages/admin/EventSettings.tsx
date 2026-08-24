import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import Navbar from '../../components/Navbar'

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
  const addToast = useToastStore((s) => s.addToast)
  const [config, setConfig] = useState<Config>({
    event_date: '',
    event_title: '',
    event_description: '',
    rules: '',
    scoring_categories: [],
    landing_page_content: '',
  })
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      setConfig({
        event_date: data.event_date || '',
        event_title: data.event_title || '',
        event_description: data.event_description || '',
        rules: data.rules || '',
        scoring_categories: data.scoring_categories || [],
        landing_page_content: data.landing_page_content || '',
      })
    } catch {
      addToast('Error al cargar configuración', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(config),
      })
      if (res.ok) {
        addToast('Configuración guardada', 'success')
      } else {
        addToast('Error al guardar', 'error')
      }
    } catch {
      addToast('Error de red', 'error')
    } finally {
      setSaving(false)
    }
  }

  const addCategory = () => {
    if (newCategory.trim() && !config.scoring_categories.includes(newCategory.trim())) {
      setConfig((p) => ({ ...p, scoring_categories: [...p.scoring_categories, newCategory.trim()] }))
      setNewCategory('')
    }
  }

  const removeCategory = (cat: string) => {
    setConfig((p) => ({ ...p, scoring_categories: p.scoring_categories.filter((c) => c !== cat) }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Configuración del Evento</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del evento</label>
            <input
              type="datetime-local"
              value={config.event_date}
              onChange={(e) => setConfig((p) => ({ ...p, event_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título del evento</label>
            <input
              type="text"
              value={config.event_title}
              onChange={(e) => setConfig((p) => ({ ...p, event_title: e.target.value }))}
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (markdown)</label>
            <textarea
              value={config.event_description}
              onChange={(e) => setConfig((p) => ({ ...p, event_description: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (markdown)</label>
            <textarea
              value={config.rules}
              onChange={(e) => setConfig((p) => ({ ...p, rules: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categorías de puntuación</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {config.scoring_categories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 bg-primary/10 text-primary-dark text-sm font-medium px-3 py-1 rounded-full"
                >
                  {cat}
                  <button onClick={() => removeCategory(cat)} className="hover:text-error ml-1">×</button>
                </span>
              ))}
            </div>
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
                onClick={addCategory}
                className="px-4 py-2 bg-secondary/10 text-secondary font-medium rounded-xl hover:bg-secondary/20 text-sm"
              >
                Agregar
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido landing page (markdown)</label>
            <textarea
              value={config.landing_page_content}
              onChange={(e) => setConfig((p) => ({ ...p, landing_page_content: e.target.value }))}
              rows={4}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
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
