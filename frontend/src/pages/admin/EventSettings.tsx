import { useState, useEffect, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/ui/Toast'

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
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [eventDate, setEventDate] = useState('')
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [rules, setRules] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [newCategory, setNewCategory] = useState('')
  const [landingContent, setLandingContent] = useState('')

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then((d: Config) => {
        setEventDate(d.event_date || '')
        setEventTitle(d.event_title || '')
        setEventDescription(d.event_description || '')
        setRules(d.rules || '')
        setCategories(d.scoring_categories || [])
        setLandingContent(d.landing_page_content || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          event_date: eventDate || null,
          event_title: eventTitle,
          event_description: eventDescription,
          rules,
          scoring_categories: categories,
          landing_page_content: landingContent,
        }),
      })
      if (res.ok) {
        toast('Configuración guardada', 'success')
      } else {
        toast('Error al guardar', 'error')
      }
    } catch {
      toast('Error de conexión', 'error')
    } finally {
      setSaving(false)
    }
  }

  function addCategory() {
    const trimmed = newCategory.trim()
    if (trimmed && !categories.includes(trimmed)) {
      setCategories([...categories, trimmed])
      setNewCategory('')
    }
  }

  function removeCategory(cat: string) {
    setCategories(categories.filter(c => c !== cat))
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
        <div className="mb-6">
          <Link to="/admin" className="text-sm text-gray-500 hover:text-primary">&larr; Panel de Admin</Link>
        </div>

        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Configuración del Evento</h1>
        <p className="text-gray-500 mb-6">Configura fecha, reglas, categorías y contenido de la landing page.</p>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Información General</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título del evento</label>
              <input
                type="text"
                value={eventTitle}
                onChange={e => setEventTitle(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha y hora del evento</label>
              <input
                type="datetime-local"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del evento (markdown)</label>
              <textarea
                value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (markdown)</label>
              <textarea
                value={rules}
                onChange={e => setRules(e.target.value)}
                rows={6}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Scoring categories */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Categorías de Puntuación</h2>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCategory())}
                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                placeholder="Nueva categoría"
              />
              <button
                type="button"
                onClick={addCategory}
                className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm"
              >
                Agregar
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 bg-secondary/10 text-secondary text-sm font-medium px-3 py-1.5 rounded-full">
                  {cat}
                  <button type="button" onClick={() => removeCategory(cat)} className="text-secondary/50 hover:text-error ml-1">&times;</button>
                </span>
              ))}
            </div>

            {categories.length === 0 && (
              <p className="text-sm text-gray-400">No hay categorías. Agrega al menos una.</p>
            )}
          </div>

          {/* Landing page content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="font-headline text-lg font-bold text-secondary">Contenido de Landing Page</h2>
            <textarea
              value={landingContent}
              onChange={e => setLandingContent(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Contenido adicional para la landing page (markdown)..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      </div>
    </div>
  )
}
