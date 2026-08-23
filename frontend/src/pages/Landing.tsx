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
  { time: '2:00 – 2:15', activity: 'Llegada de equipos e instalación. Llegada del público y socialización.', who: 'Todos' },
  { time: '2:15 – 2:25', activity: 'Lectura de reglas. Asignación de estaciones.', who: 'Organizador + Equipos' },
  { time: '2:25 – 3:30', activity: '¡Comienza la cocina! (65 min). Actividades paralelas para el público.', who: 'Equipos + Público' },
  { time: '3:30 – 3:40', activity: '¡ALTO! Emplatado y etiquetado (A–F).', who: 'Equipos' },
  { time: '3:40 – 4:10', activity: 'Degustación de jueces. Público prueba muestras.', who: 'Jueces + Público' },
  { time: '4:10 – 4:25', activity: 'Conteo de puntuaciones.', who: 'Organizador' },
  { time: '4:25 – 4:50', activity: 'Ceremonia de premiación y deseos de cumpleaños.', who: 'Todos' },
  { time: '4:50 – 5:00', activity: 'Despedida. El parque cierra a las 5:00 PM.', who: 'Todos' },
]

const scoring = [
  { category: 'Sabor', weight: 'x2', max: 20, desc: 'Balance de sabores, sazón, nivel de delicia' },
  { category: 'Textura', weight: 'x1', max: 10, desc: 'Frescura del pan, crujiente, consistencia' },
  { category: 'Creatividad', weight: 'x1', max: 10, desc: 'Combinaciones originales, técnicas ingeniosas' },
  { category: 'Presentación', weight: 'x1', max: 10, desc: 'Emplatado, color, limpieza, atractivo visual' },
  { category: 'Bonificación', weight: 'opcional', max: '+2', desc: 'Pan casero, pepinillos caseros, ingrediente "salvaje"' },
]

export default function Landing() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE)

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="font-headline text-5xl md:text-7xl font-black text-secondary leading-tight">
            El Campeonato de Sándwiches
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

          <div className="flex justify-center gap-3 pt-4">
            <Link to="/results" className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors">
              Ver Resultados
            </Link>
            <Link to="/admin/score-reveal" className="bg-secondary/10 hover:bg-secondary/20 text-secondary font-headline font-semibold px-6 py-3 rounded-2xl transition-colors">
              Admin
            </Link>
          </div>
        </section>

        {/* Regla #1 */}
        <section className="bg-error/10 border-2 border-error/30 rounded-2xl p-6 text-center">
          <p className="font-headline text-lg font-black text-error uppercase tracking-wide">
            Regla #1: No se permiten hamburguesas
          </p>
          <p className="text-sm text-gray-600 mt-1">Cualquier hamburguesa = descalificación inmediata</p>
        </section>

        {/* Quick facts */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Equipos', value: 'Hasta 6', icon: '👥' },
            { label: 'Por equipo', value: 'Max 3 personas', icon: '🧑‍🍳' },
            { label: 'Jueces', value: '3 oficiales', icon: '⚖️' },
            { label: 'Cocción', value: '60 minutos', icon: '⏱️' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <p className="text-2xl mb-1">{item.icon}</p>
              <p className="font-headline font-bold text-secondary text-sm">{item.value}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          ))}
        </section>

        {/* Cronograma */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">Cronograma</h2>
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

        {/* Sistema de puntuación */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">Sistema de Puntuación</h2>
            <p className="text-sm text-gray-500 mt-1">Degustación a ciegas · Sándwiches etiquetados A–F · 52 pts posibles por juez</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/5">
                  <th className="text-left px-6 py-3 font-headline font-bold text-secondary">Categoría</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Peso</th>
                  <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Pts</th>
                  <th className="text-left px-6 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Criterios</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scoring.map((row) => (
                  <tr key={row.category} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-semibold">{row.category}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{row.weight}</td>
                    <td className="px-4 py-3 text-center font-bold text-secondary">{row.max}</td>
                    <td className="px-6 py-3 text-gray-600 hidden sm:table-cell">{row.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lo que debe traer cada equipo */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-headline text-2xl font-black text-secondary">Qué debe traer cada equipo</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
            <div className="p-6">
              <h3 className="font-headline font-bold text-tertiary mb-3">El organizador proporciona</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>Mesas (1 por equipo)</li>
                <li>Enchufes</li>
                <li>Nevera portátil compartida con hielo</li>
                <li>Microondas compartido</li>
                <li>Freidora de aire compartida</li>
                <li>Botes de basura, toallas de papel</li>
                <li>Platos para presentación final</li>
              </ul>
            </div>
            <div className="p-6">
              <h3 className="font-headline font-bold text-error mb-3">Cada equipo debe traer</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><strong>TODOS los ingredientes</strong> (pan, proteínas, verduras, salsas, etc.)</li>
                <li>Proteínas pre-marinadas/listas para cocinar</li>
                <li>Cuchillos, tablas de cortar, utensilios</li>
                <li>Cocina portátil (plancha, hornilla) — <em>no hay estufas</em></li>
                <li>Ollas, sartenes, espátulas</li>
                <li>Fuente propia para presentación final</li>
              </ul>
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
              { icon: '🗳️', name: 'Voto Popular en Vivo', desc: 'Escanea el QR y vota por tu sándwich favorito en tiempo real. El ganador del público se lleva un trofeo especial.' },
              { icon: '📸', name: 'Photo Booth Temático', desc: 'Sombreros de chef, espátulas gigantes y un fondo perfecto para Instagram. ¡Etiquétanos!' },
              { icon: '🎯', name: 'Predicciones Premiadas', desc: '¿Quién ganará? Escribe tu predicción antes del inicio. Los que acierten se llevan un premio sorpresa.' },
              { icon: '👅', name: 'Catatura Popular', desc: 'Cuando los jueces terminen, ¡tú también pruebas! Califica los sándwiches y comparte tu opinión.' },
              { icon: '🎵', name: 'Música y Ambientación', desc: 'Playlist curada, ambiente festivo y buena vibra todo el evento.' },
              { icon: '🎂', name: 'Pastel de Cumpleaños', desc: 'Al final, todos compartimos un pedacito de pastel para celebrar al anfitrión.' },
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
          El Campeonato de Sándwiches &amp; Celebración de Cumpleaños · 2026
        </footer>
      </div>
    </div>
  )
}
