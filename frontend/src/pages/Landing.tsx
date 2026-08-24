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

export default function Landing() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE)
  const [rsvp, setRsvp] = useState(() => ({ name: localStorage.getItem(GUEST_NAME) || '', email: '', num_people: '' }))
  const [rsvpErrors, setRsvpErrors] = useState<Record<string, string>>({})
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [rsvpCode, setRsvpCode] = useState<string | null>(() => localStorage.getItem(GUEST_KEY))

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
    <div className="min-h-screen bg-surface">
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

            {rsvpCode ? (
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

        {/* Actividades del público */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">¿Qué hay para el público?</h2>
            <p className="text-sm text-gray-500 mt-1">No solo miras — ¡participas!</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            {[
              { icon: '🗳️', name: 'Muro de Predicciones', desc: 'Coloca tu predicción del ganador. Los que acierten se llevan un premio.' },
              { icon: '🎯', name: 'Trivia / Bingo de Sándwiches', desc: 'Datos curiosos, pistas y premios sorpresa.' },
              { icon: '👃', name: 'Prueba de Olores', desc: 'Adivina qué ingrediente están usando los equipos.' },
              { icon: '👅', name: 'Degustación Popular', desc: 'Prueba los sándwiches después de la evaluación de jueces.' },
              { icon: '🎨', name: 'Evaluación Visual', desc: 'Califica los sándwiches solo por apariencia (del 1 al 5).' },
              { icon: '🎂', name: 'Pastel de Cumpleaños', desc: 'Al final, compartimos pastel para celebrar al anfitrión.' },
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

        <footer className="text-center text-xs text-gray-400 pb-8">
          Sandwich Fest. 2026
        </footer>
      </div>
    </div>
  )
}
