import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface NavLink {
  label: string
  to: string
}

const roleLinks: Record<string, NavLink[]> = {
  admin: [
    { label: 'Dashboard', to: '/admin' },
    { label: 'Equipos', to: '/admin/teams' },
    { label: 'Revelar', to: '/admin/score-reveal' },
    { label: 'Chat', to: '/admin/chat' },
    { label: 'Config', to: '/admin/settings' },
  ],
  team: [
    { label: 'Mi Equipo', to: '/equipo' },
    { label: 'Chat', to: '/chat/team/0' },
  ],
  judge: [
    { label: 'Puntuar', to: '/jueces' },
    { label: 'Chat', to: '/chat/judge' },
  ],
}

const publicLinks: NavLink[] = [
  { label: 'Registro', to: '/register' },
  { label: 'Chat', to: '/chat' },
  { label: 'Resultados', to: '/results' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const links = user ? roleLinks[user.role] || [] : publicLinks

  const handleLogout = () => {
    logout()
    navigate('/')
    setOpen(false)
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-headline font-black text-secondary text-lg tracking-tight">
          🥪 Sándwiches
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-gray-600 hover:text-secondary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-error hover:text-error/80 transition-colors"
            >
              Salir
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setOpen(!open)}
          aria-label="Menú"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className="block text-sm font-medium text-gray-600 hover:text-secondary py-1 transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="block text-sm font-medium text-error hover:text-error/80 py-1 transition-colors"
            >
              Salir
            </button>
          )}
        </div>
      )}
    </nav>
  )
}
