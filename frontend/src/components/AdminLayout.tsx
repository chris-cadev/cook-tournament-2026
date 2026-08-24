import { NavLink, Outlet } from 'react-router-dom'

const navItems = [
  { to: '/admin/score-reveal', label: 'Score Reveal' },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/chat', label: 'Chat' },
  { to: '/admin/settings', label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center h-14">
          <span className="font-headline font-black text-secondary text-lg mr-4 hidden sm:block">Admin</span>
          <div className="flex items-center gap-1 overflow-x-auto">
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
        </div>
      </nav>
      <Outlet />
    </div>
  )
}
