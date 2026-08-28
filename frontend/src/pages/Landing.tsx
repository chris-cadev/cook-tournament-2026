import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const EVENT_DATE = import.meta.env.VITE_EVENT_DATETIME || '2026-10-10T14:00:00'

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

const schedule = [
  { time: '0:00 – 0:10', activity: 'Llegada de equipos e instalación. Llegada del público y socialización.', who: 'Todos' },
  { time: '0:10 – 0:15', activity: 'Lectura de reglas. Asignación de estaciones.', who: 'Organizador + Equipos' },
  { time: '0:15 – 1:15', activity: '¡Comienza la cocina! (60 min). Actividades paralelas para el público.', who: 'Equipos + Público' },
  { time: '1:15', activity: '¡ALTO! Emplatado y etiquetado (A–F).', who: 'Equipos' },
  { time: '1:20 – 1:40', activity: 'Degustación de jueces. Público prueba muestras.', who: 'Jueces + Público' },
  { time: '1:40 – 1:50', activity: 'Conteo de puntuaciones.', who: 'Organizador' },
  { time: '1:50 – 2:00', activity: 'Ceremonia de premiación y deseos de cumpleaños.', who: 'Todos' },
]

const GUEST_KEY = 'guest_access_code'
const GUEST_NAME = 'guest_name'

function downloadICS() {
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sandwich Fest//ES',
    'BEGIN:VEVENT',
    'DTSTART:20261010T140000',
    'DTEND:20261010T170000',
    'SUMMARY:Sandwich Fest. 2026',
    'DESCRIPTION:Competencia de cocina en vivo + Celebración de cumpleaños en Parque Morelos.',
    'LOCATION:Parque Morelos\\, Tijuana\\, Baja California',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'sandwich-fest-2026.ics'
  a.click()
  URL.revokeObjectURL(url)
}

export default function Landing() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE)
  const [rsvp, setRsvp] = useState(() => ({ name: localStorage.getItem(GUEST_NAME) || '', email: '', num_people: '' }))
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({})
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [rsvpCode, setRsvpCode] = useState<string | null>(() => localStorage.getItem(GUEST_KEY))
  const [validating, setValidating] = useState(true)

  useEffect(() => {
    const code = localStorage.getItem(GUEST_KEY)
    if (!code) { setValidating(false); return }

    fetch(`/api/guests/validate-access-code?access_code=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.valid) {
          localStorage.removeItem(GUEST_KEY)
          localStorage.removeItem(GUEST_NAME)
          setRsvpCode(null)
        } else if (data.name) {
          localStorage.setItem(GUEST_NAME, data.name)
          setRsvp((f) => ({ ...f, name: data.name }))
        }
      })
      .catch(() => {})
      .finally(() => setValidating(false))
  }, [])

  const updateRsvp = (field: string, value: string) => {
    setRsvp((f) => ({ ...f, [field]: value }))
    if (rsvpErrors[field]) setRsvpErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  const handleRsvp = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!rsvp.name.trim()) errs.name = 'Nombre requerido'
    if (!rsvp.email.trim()) errs.email = 'Email requerido'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rsvp.email)) errs.email = 'Email inválido'
    if (rsvp.num_people) {
      const p = parseInt(rsvp.num_people, 10)
      if (isNaN(p) || p < 0 || p > 10) errs.num_people = 'Máximo 10 acompañantes'
    }
    if (Object.keys(errs).length > 0) { setRsvpErrors(errs); return }

    setRsvpLoading(true)
    try {
      const res = await fetch('/api/guests/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rsvp.name.trim(),
          email: rsvp.email.trim(),
          num_people: rsvp.num_people ? parseInt(rsvp.num_people, 10) : 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setRsvpErrors({ submit: data.error }); return }
      localStorage.setItem(GUEST_KEY, data.access_code)
      localStorage.setItem(GUEST_NAME, rsvp.name.trim())
      setRsvpCode(data.access_code)
    } catch {
      setRsvpErrors({ submit: 'Error de red' })
    } finally {
      setRsvpLoading(false)
    }
  }

  const copyCode = () => {
    if (rsvpCode) navigator.clipboard.writeText(rsvpCode)
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="font-headline text-5xl md:text-7xl font-black text-secondary leading-tight">
            Sandwich Fest. 2026
          </h1>
          <p className="text-xl text-gray-600">Competencia de cocina en vivo + Celebración de cumpleaños</p>

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

        </section>

        {/* ¿Qué es esto? */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-2xl font-black text-secondary mb-2">¿Qué es esto?</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            El <strong>Sandwich Fest</strong> es una competencia de cocina en vivo donde los equipos se enfrentan para crear el mejor sándwich en 60 minutos. A la vez celebramos el cumpleaños de Cristian Camacho con una fiesta al aire libre en el Parque Morelos.
          </p>
        </section>

        {/* Regla #1 */}
        <section id="reglas" className="bg-error/10 border-2 border-error/30 rounded-2xl p-6 text-center">
          <p className="font-headline text-lg font-black text-error uppercase tracking-wide">
            Regla #1: No se permiten hamburguesas
          </p>
          <p className="text-sm text-gray-600 mt-1">Cualquier hamburguesa = descalificación inmediata</p>
        </section>

        {/* Dos caminos: Asistir / Competir */}
        <section id="asistir" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Voy a asistir */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-headline text-xl font-black text-secondary mb-1">Voy a asistir 🎉</h2>
            <p className="text-sm text-gray-500 mb-4">Regístrate para reservar tu lugar y acceder al evento desde cualquier dispositivo.</p>

            {!validating && rsvpCode ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-3xl">🎫</p>
                <p className="font-headline font-bold text-secondary text-lg">¡Listo, {rsvp.name}!</p>
                <p className="text-sm text-gray-500">Tu código de acceso es:</p>
                <div className="bg-primary/5 border-2 border-dashed border-primary/30 rounded-2xl px-6 py-4">
                  <p className="font-mono text-3xl font-black text-primary tracking-widest">{rsvpCode}</p>
                </div>
                <p className="text-xs text-gray-400">Guárdalo, lo necesitas para entrar al evento.</p>
                <button onClick={copyCode}
                  className="text-sm bg-primary/10 text-primary-dark font-semibold px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors">
                  {navigator.clipboard ? 'Copiar código' : 'Código copiado'}
                </button>

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-2">Agrega el evento a tu calendario:</p>
                  <div className="flex gap-2 justify-center flex-wrap">
                    <a
                      href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Sandwich+Fest.+2026&dates=20261010T140000/20261010T170000&details=Competencia+de+cocina+en+vivo+%2B+Celebraci%C3%B3n+de+cumplea%C3%B1os&location=Parque+Morelos%2C+Tijuana%2C+Baja+California`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-secondary font-semibold text-xs px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      Google
                    </a>
                    <a
                      href={`https://outlook.live.com/calendar/0/action/compose?subject=Sandwich+Fest.+2026&startdt=2026-10-10T14:00:00&enddt=2026-10-10T17:00:00&body=Competencia+de+cocina+en+vivo+%2B+Celebraci%C3%B3n+de+cumplea%C3%B1os&location=Parque+Morelos%2C+Tijuana%2C+Baja+California`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-secondary font-semibold text-xs px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="22,4 12,13 2,4" />
                      </svg>
                      Outlook
                    </a>
                    <button
                      onClick={downloadICS}
                      className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-50 text-secondary font-semibold text-xs px-3 py-2 rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      .ics
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRsvp} className="space-y-3">
                {rsvpErrors.submit && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{rsvpErrors.submit}</p>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tu nombre *</label>
                  <input type="text" value={rsvp.name} onChange={(e) => updateRsvp('name', e.target.value)} autoFocus
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${rsvpErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    placeholder="Ej: María López" />
                  {rsvpErrors.name && <p className="text-xs text-red-600 mt-1">{rsvpErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={rsvp.email} onChange={(e) => updateRsvp('email', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${rsvpErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    placeholder="maria@ejemplo.com" />
                  {rsvpErrors.email && <p className="text-xs text-red-600 mt-1">{rsvpErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Acompañantes <span className="text-gray-400">(opcional)</span></label>
                  <input type="number" min={0} max={10} value={rsvp.num_people} onChange={(e) => updateRsvp('num_people', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${rsvpErrors.num_people ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                    placeholder="0" />
                  {rsvpErrors.num_people && <p className="text-xs text-red-600 mt-1">{rsvpErrors.num_people}</p>}
                </div>

                <button type="submit" disabled={rsvpLoading}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors disabled:opacity-50">
                  {rsvpLoading ? 'Confirmando...' : 'Confirmar Asistencia'}
                </button>
              </form>
            )}
          </div>

          {/* Quiero competir */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="font-headline text-xl font-black text-secondary mb-1">Quiero competir 🍳</h2>
            <p className="text-sm text-gray-500 mb-4">Forma tu equipo o únete a uno existente para pelear por La Tostadora Dorada.</p>

            <div className="flex-1 flex flex-col justify-center space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <span className="text-lg">👥</span>
                <p>Hasta <strong>6 equipos</strong> · máx. 3 personas c/u</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">⏱️</span>
                <p><strong>60 minutos</strong> de cocina en vivo</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-lg">⚖️</span>
                <p>3 jueces oficiales · degustación a ciegas</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Link to="/register" className="block text-center bg-secondary hover:bg-secondary-dark text-white font-headline font-bold py-3 rounded-2xl transition-colors">
                Registrar mi equipo
              </Link>
              <Link to="/join-team" className="block text-center bg-secondary/10 hover:bg-secondary/20 text-secondary font-headline font-semibold py-3 rounded-2xl transition-colors">
                Unirme a un equipo
              </Link>
            </div>
          </div>
        </section>

        {/* Actividades del público */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">¿Qué hay para el público?</h2>
            <p className="text-sm text-gray-500 mt-1">No solo miras — ¡participas!</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { icon: '🗳️', name: 'Muro de Predicciones', desc: 'Escribe en un papel qué equipo crees que va a ganar. Si aciertas, te llevas un premio.' },
              { icon: '🎯', name: 'Trivia', desc: 'Preguntas sobre comida y cocina. No necesitas ser experto — solo tener curiosidad. Hay premios.' },
              { icon: '👃', name: 'Prueba de Olores', desc: 'Huele frascos con ingredientes y adivina cuál es. Entre más acertes, mejor.' },
              { icon: '👅', name: 'Degustación Popular', desc: 'Cuando los jueces terminen de calificar, todos prueban los sándwiches. Sí, gratis.' },
              { icon: '🎨', name: 'Evaluación Visual', desc: 'Mira los 6 sándwiches en la mesa y del 1 al 5 califica cuál se ve mejor. Así de simple.' },
              { icon: '🎂', name: 'Pastel de Cumpleaños', desc: 'Al final cortamos pastel. Es el cumpleaños de Cristian Camacho y lo celebramos entre todos.' },
            ].map((act) => (
              <div key={act.name} className="flex items-start px-6 py-4 gap-3">
                <span className="text-2xl">{act.icon}</span>
                <div>
                  <p className="text-sm font-bold text-gray-800">{act.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{act.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Cronograma */}
        <section id="cronograma" className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">Cronograma</h2>
            <p className="text-sm text-gray-500 mt-1">Sábado 10 de octubre, 2:00 – 5:00 PM</p>
          </div>
          <div className="divide-y divide-gray-100">
            {schedule.map((item) => (
              <div key={item.time} className="flex items-start px-6 py-3 gap-4">
                <span className="font-headline font-bold text-primary-dark text-sm whitespace-nowrap min-w-[100px]">{item.time}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{item.activity}</p>
                  <p className="text-xs text-gray-500">{item.who}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">Preguntas Frecuentes</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {[
              { q: '¿Qué debo traer?', a: 'Todos tus ingredientes, utensilios y cocina portátil. El evento es al aire libre, así que trae todo lo que necesites para cocinar tu sándwich.' },
              { q: '¿Cómo funciona la degustación?', a: '3 jueces prueban cada sándwich a ciegas y puntúan por categorías: sabor, presentación y creatividad. No saben qué equipo preparó qué.' },
              { q: '¿Puedo traer ayuda?', a: 'Sí, cada equipo puede tener hasta 3 personas. ¡Forma tu squad y compite juntos!' },
              { q: '¿Hay restricciones?', a: 'NO se permiten hamburguesas. Cualquier hamburguesa = descalificación inmediata. Todo lo demás es bienvenido.' },
              { q: '¿Cuánto tiempo tengo?', a: '60 minutos de cocina en vivo. El cronograma incluye llegada, instalación y degustación, así que aprovecha cada minuto.' },
            ].map((item) => (
              <details key={item.q} className="group px-6 py-4">
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-sm font-bold text-gray-800">{item.q}</span>
                  <span className="material-symbols-outlined text-gray-400 group-open:rotate-180 transition-transform text-xl">expand_more</span>
                </summary>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Lugar */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
          <span className="text-4xl">📍</span>
          <div className="flex-1">
            <h2 className="font-headline text-lg font-black text-secondary">Parque Morelos</h2>
            <p className="text-sm text-gray-500">Sábado 10 de octubre · 2:00 – 5:00 PM</p>
          </div>
          <a
            href="https://maps.app.goo.gl/v2dxUyGw9i2YyZRB7"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 bg-primary/10 hover:bg-primary/20 text-primary-dark font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
          >
            Ver en mapa
          </a>
        </section>

        {/* Chats */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center space-y-4">
          <h2 className="font-headline text-2xl font-black text-secondary">Chatea en el evento</h2>
          <p className="text-sm text-gray-500">Conecta con los demás participantes en tiempo real.</p>
          <Link to="/chat"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-headline font-bold px-8 py-3 rounded-2xl transition-colors">
            <span className="material-symbols-outlined text-xl">chat</span>
            Chat Global
          </Link>
          <div className="flex justify-center gap-3 flex-wrap pt-2">
            <Link to="/login/team"
              className="inline-flex items-center gap-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-base">groups</span>
              Chat de Equipos
            </Link>
            <Link to="/login/judge"
              className="inline-flex items-center gap-1.5 bg-tertiary/10 hover:bg-tertiary/20 text-tertiary font-semibold text-sm px-4 py-2 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-base">gavel</span>
              Chat de Jueces
            </Link>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-400 pb-8">
          Sandwich Fest. 2026
        </footer>
      </div>
    </div>
  )
}
