import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const sections = [
  { label: 'Equipos', description: 'Gestionar registros y estaciones', href: '/admin/teams', icon: '👥' },
  { label: 'Configuración', description: 'Fecha, reglas, categorías', href: '/admin/settings', icon: '⚙️' },
  { label: 'Email', description: 'Plantillas y envío de correos', href: '/admin/email', icon: '✉️' },
  { label: 'Invitaciones', description: 'Enlaces únicos para invitar', href: '/admin/invites', icon: '🔗' },
  { label: 'Puntuaciones', description: 'Revelar categorías', href: '/admin/score-reveal', icon: '🏆' },
  { label: 'Chats', description: 'Moderar todos los canales', href: '/admin/chat', icon: '💬' },
  { label: 'Tareas', description: 'Lista de pendientes del evento', href: '/admin/todo', icon: '✅' },
]

export default function AdminDashboard() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-headline text-3xl font-black text-secondary">Panel de Admin</h1>
            <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm font-medium text-gray-500 hover:text-error transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="grid gap-4">
          {sections.map((s) => (
            <Link
              key={s.href}
              to={s.href}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
            >
              <span className="text-3xl">{s.icon}</span>
              <div>
                <p className="font-headline font-bold text-secondary">{s.label}</p>
                <p className="text-sm text-gray-500">{s.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
