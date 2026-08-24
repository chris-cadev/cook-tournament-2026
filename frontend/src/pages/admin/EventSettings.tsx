import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

interface Config {
  event_date: string
  event_title: string
  event_description: string
  rules: string
  scoring_categories: string
  judge_password: string
  team_password: string
  landing_page_content: string
}

export default function EventSettings() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [config, setConfig] = useState<Config>({
    event_date: '',
    event_title: '',
    event_description: '',
    rules: '',
    scoring_categories: '',
    judge_password: '',
    team_password: '',
    landing_page_content: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    try {
      const res = await fetch('/api/config')
      const data = await res.json()
      setConfig({
        event_date: data.event_date || '',
        event_title: data.event_title || '',
        event_description: data.event_description || '',
        rules: data.rules || '',
        scoring_categories: Array.isArray(data.scoring_categories) ? data.scoring_categories.join(', ') : data.scoring_categories || '',
        judge_password: data.judge_password || '',
        team_password: data.team_password || '',
        landing_page_content: data.landing_page_content || '',
      })
    } catch (err) {
      console.error('Failed to fetch config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSave = async () => {
    if (!token) return
    setSaving(true)
    setFeedback(null)
    try {
      const body = {
        ...config,
        scoring_categories: config.scoring_categories.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Configuración guardada correctamente.' })
      } else {
        const err = await res.json()
        setFeedback({ type: 'error', message: err.error || 'Error al guardar.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Error de red — intenta de nuevo.' })
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
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="font-headline text-xl font-black text-secondary">Panel de Admin</h1>
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Equipos</Link>
            <Link to="/admin/chat" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Chat</Link>
            <Link to="/admin/score-reveal" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Puntuaciones</Link>
            <Link to="/admin/settings" className="text-sm font-bold text-primary border-b-2 border-primary pb-0.5">Configuración</Link>
            <button onClick={handleLogout} className="text-sm font-bold text-error hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-1">Configuración del Evento</h2>
          <p className="text-sm text-gray-500">Ajusta los parámetros generales del torneo.</p>
        </div>

        {feedback && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-medium ${feedback.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {feedback.message}
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-headline text-base font-bold text-secondary mb-4">General</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título del Evento</label>
                <input type="text" value={config.event_title} onChange={e => setConfig(prev => ({ ...prev, event_title: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha del Evento</label>
                <input type="datetime-local" value={config.event_date} onChange={e => setConfig(prev => ({ ...prev, event_date: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (Markdown)</label>
                <textarea value={config.event_description} onChange={e => setConfig(prev => ({ ...prev, event_description: e.target.value }))} rows={4} className="w-full border border-gray-300 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-headline text-base font-bold text-secondary mb-4">Reglas y Puntuación</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reglas (Markdown)</label>
                <textarea value={config.rules} onChange={e => setConfig(prev => ({ ...prev, rules: e.target.value }))} rows={6} className="w-full border border-gray-300 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categorías de Puntuación (separadas por coma)</label>
                <input type="text" value={config.scoring_categories} onChange={e => setConfig(prev => ({ ...prev, scoring_categories: e.target.value }))} placeholder="Sabor, Presentación, Creatividad" className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-headline text-base font-bold text-secondary mb-4">Contraseñas</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de Jueces</label>
                <input type="password" value={config.judge_password} onChange={e => setConfig(prev => ({ ...prev, judge_password: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña de Equipos</label>
                <input type="password" value={config.team_password} onChange={e => setConfig(prev => ({ ...prev, team_password: e.target.value }))} className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-headline text-base font-bold text-secondary mb-4">Landing Page</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (Markdown)</label>
              <textarea value={config.landing_page_content} onChange={e => setConfig(prev => ({ ...prev, landing_page_content: e.target.value }))} rows={8} className="w-full border border-gray-300 rounded-xl px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  )
}
