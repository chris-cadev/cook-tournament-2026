import { NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const navItems = [
  { to: '/admin/score-reveal', label: 'Score Reveal' },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/chat', label: 'Chat' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-1 overflow-x-auto">
            <span className="font-headline font-black text-secondary text-lg mr-4 hidden sm:block">Admin</span>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary-dark'
                      : 'text-gray-500 hover:text-secondary hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-400 hover:text-error transition-colors ml-4 whitespace-nowrap"
          >
            Logout
          </button>
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
