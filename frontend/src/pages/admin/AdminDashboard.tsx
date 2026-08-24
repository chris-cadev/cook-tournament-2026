import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import Teams from './Teams'
import EventSettings from './EventSettings'
import ScoreReveal from './ScoreReveal'
import ChatModeration from './ChatModeration'
import ToDo from './ToDo'
import EmailReminders from './EmailReminders'
import Invites from './Invites'

type Tab = 'teams' | 'settings' | 'scores' | 'chat' | 'todo' | 'email' | 'invites'

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('teams')
  const { logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'teams', label: 'Equipos', icon: 'groups' },
    { key: 'settings', label: 'Configuración', icon: 'settings' },
    { key: 'scores', label: 'Puntuaciones', icon: 'emoji_events' },
    { key: 'chat', label: 'Chat', icon: 'chat' },
    { key: 'todo', label: 'Tareas', icon: 'checklist' },
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'invites', label: 'Invitaciones', icon: 'link' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-headline text-xl font-black text-secondary">Admin Panel</Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-sm text-gray-500 hover:text-primary transition-colors">Ver sitio</Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-600 transition-colors">Salir</button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span className="material-symbols-outlined text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'teams' && <Teams />}
        {tab === 'settings' && <EventSettings />}
        {tab === 'scores' && <ScoreReveal />}
        {tab === 'chat' && <ChatModeration />}
        {tab === 'todo' && <ToDo />}
        {tab === 'email' && <EmailReminders />}
        {tab === 'invites' && <Invites />}
      </div>
    </div>
  )
}
