import { useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const navItems = [
  { to: '/admin/teams', label: 'Equipos', icon: 'group' },
  { to: '/admin/settings', label: 'Configuración', icon: 'settings' },
  { to: '/admin/emails', label: 'Emails', icon: 'mail' },
  { to: '/admin/chat', label: 'Chat Moderation', icon: 'chat' },
  { to: '/admin/score-reveal', label: 'Score Reveal', icon: 'leaderboard' },
  { to: '/admin/todo', label: 'To-Do', icon: 'checklist' },
]

export default function Dashboard() {
  const { logout } = useAuthStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  const activeLabel = navItems.find(i => location.pathname === i.to)?.label || 'Admin'

  const navLinkClass = (to: string) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
      location.pathname === to
        ? 'bg-primary/10 text-primary-dark font-bold'
        : 'text-gray-600 hover:bg-gray-100'
    }`

  const sidebar = (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={navLinkClass(item.to)}
          onClick={() => setDrawerOpen(false)}
        >
          <span className="material-symbols-outlined text-xl">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
      <div className="mt-auto pt-4 border-t border-gray-200">
        <NavLink to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
          <span className="material-symbols-outlined text-xl">home</span>
          Inicio
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors w-full"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
          Salir
        </button>
      </div>
    </nav>
  )

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-screen sticky top-0">
        <div className="px-4 py-5 border-b border-gray-200">
          <h1 className="font-headline text-lg font-black text-secondary">Admin Dashboard</h1>
        </div>
        {sidebar}
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl z-50 flex flex-col">
            <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
              <h1 className="font-headline text-lg font-black text-secondary">Admin</h1>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-gray-500 hover:text-gray-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h1 className="font-headline text-lg font-bold text-secondary">{activeLabel}</h1>
        </header>

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
