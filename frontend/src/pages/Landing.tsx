import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Markdown from 'react-markdown'

interface Config {
  event_date: string | null
  event_title: string
  event_description: string
  rules: string
  scoring_categories: string[]
  landing_page_content: string
}

function useCountdown(target: string) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(target).getTime() - Date.now())
      setTime({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  return time
}

const defaultConfig: Config = {
  event_date: '2026-10-10T14:00:00',
  event_title: 'El Campeonato de Sándwiches',
  event_description: 'Competencia de cocina en vivo + Celebración de cumpleaños',
  rules: '',
  scoring_categories: [],
  landing_page_content: '',
}

export default function Landing() {
  const [config, setConfig] = useState<Config>(defaultConfig)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => {
        setConfig({
          event_date: data.event_date || defaultConfig.event_date,
          event_title: data.event_title || defaultConfig.event_title,
          event_description: data.event_description || defaultConfig.event_description,
          rules: data.rules || '',
          scoring_categories: data.scoring_categories || [],
          landing_page_content: data.landing_page_content || '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const { days, hours, minutes, seconds } = useCountdown(config.event_date || defaultConfig.event_date!)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between h-14">
          <Link to="/" className="font-headline font-black text-secondary text-lg">
            {config.event_title}
          </Link>
          <div className="flex items-center gap-3">
            <a href="#reglas" className="text-sm text-gray-600 hover:text-secondary font-medium">Reglas</a>
            <Link to="/results" className="text-sm text-gray-600 hover:text-secondary font-medium">Resultados</Link>
            <Link to="/register" className="text-sm text-gray-600 hover:text-secondary font-medium">Registro</Link>
            <Link to="/chat" className="text-sm text-gray-600 hover:text-secondary font-medium">Chat</Link>
            <Link to="/login" className="text-sm bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold px-3 py-1.5 rounded-lg transition-colors">Admin</Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        <nav className="text-sm text-gray-400">
          <Link to="/" className="hover:text-secondary">Inicio</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">Reglas</span>
        </nav>

        <section className="text-center space-y-4">
          <h1 className="font-headline text-5xl md:text-7xl font-black text-secondary leading-tight">
            {config.event_title}
          </h1>
          {config.event_description && (
            <p className="text-xl text-gray-600">{config.event_description}</p>
          )}

          <div className="flex justify-center gap-4 flex-wrap pt-2">
            {[
              { label: 'Días', value: days },
              { label: 'Horas', value: hours },
              { label: 'Min', value: minutes },
              { label: 'Seg', value: seconds },
            ].map((unit) => (
              <div key={unit.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 px-2 py-2 min-w-[76px]">
                <p className="font-headline text-3xl font-black text-secondary">{String(unit.value).padStart(2, '0')}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{unit.label}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <Link to="/register" className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors">
              Registra Tu Equipo
            </Link>
            <Link to="/chat" className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-headline font-semibold px-6 py-3 rounded-2xl transition-colors">
              Unirse al Chat
            </Link>
            <Link to="/results" className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-headline font-semibold px-6 py-3 rounded-2xl transition-colors">
              Ver Resultados
            </Link>
          </div>
        </section>

        {config.rules && (
          <section id="reglas" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-headline text-2xl font-black text-secondary">Reglas</h2>
            </div>
            <div className="px-6 py-4 prose prose-sm max-w-none">
              <Markdown>{config.rules}</Markdown>
            </div>
          </section>
        )}

        {config.scoring_categories.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-headline text-2xl font-black text-secondary">Sistema de Puntuación</h2>
            </div>
            <div className="px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {config.scoring_categories.map((cat) => (
                  <span key={cat} className="bg-primary/10 text-primary-dark font-semibold px-3 py-1 rounded-full text-sm">{cat}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {config.landing_page_content && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-headline text-2xl font-black text-secondary">Información del Evento</h2>
            </div>
            <div className="px-6 py-4 prose prose-sm max-w-none">
              <Markdown>{config.landing_page_content}</Markdown>
            </div>
          </section>
        )}

        <footer className="text-center text-xs text-gray-400 pb-8 space-y-1">
          <p>{config.event_title} · 2026</p>
          <p>Organizado por el equipo de cocina</p>
        </footer>
      </div>
    </div>
  )
}
