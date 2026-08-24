import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const links = [
  { to: '/admin/score-reveal', label: 'Scores', icon: 'emoji_events' },
  { to: '/admin/teams', label: 'Teams', icon: 'groups' },
  { to: '/admin/chat', label: 'Chat', icon: 'chat' },
  { to: '/admin/todo', label: 'To-Do', icon: 'checklist' },
  { to: '/admin/settings', label: 'Settings', icon: 'settings' },
]

export default function AdminNavbar() {
  const location = useLocation()
  const { logout } = useAuthStore()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between h-14">
        <div className="flex items-center gap-1">
          <Link to="/" className="font-headline font-black text-secondary text-lg mr-4 hidden sm:block">
            Admin
          </Link>
          <div className="flex gap-1 overflow-x-auto">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  location.pathname === link.to
                    ? 'bg-primary/10 text-primary-dark'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="material-symbols-outlined text-base">{link.icon}</span>
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}
