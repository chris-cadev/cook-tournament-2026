import { useState } from 'react'
import EventSettings from './EventSettings'
import Teams from './Teams'
import Judges from './Judges'
import ScoreReveal from './ScoreReveal'
import AdminTasks from './AdminTasks'
import EmailReminders from './EmailReminders'
import Invites from './Invites'
import ChatModeration from './ChatModeration'

type Tab = 'settings' | 'teams' | 'judges' | 'scores' | 'todo' | 'email' | 'invites' | 'chat'

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('settings')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'settings', label: 'Configuración', icon: 'settings' },
    { key: 'teams', label: 'Equipos', icon: 'groups' },
    { key: 'judges', label: 'Jueces', icon: 'gavel' },
    { key: 'scores', label: 'Puntuaciones', icon: 'emoji_events' },
    { key: 'todo', label: 'Tareas', icon: 'checklist' },
    { key: 'email', label: 'Email', icon: 'mail' },
    { key: 'invites', label: 'Invitaciones', icon: 'link' },
    { key: 'chat', label: 'Chat', icon: 'chat' },
  ]

  return (
    <div className="min-h-screen bg-surface">
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
        {tab === 'settings' && <EventSettings />}
        {tab === 'teams' && <Teams />}
        {tab === 'judges' && <Judges />}
        {tab === 'scores' && <ScoreReveal />}
        {tab === 'todo' && <AdminTasks />}
        {tab === 'email' && <EmailReminders />}
        {tab === 'invites' && <Invites />}
        {tab === 'chat' && <ChatModeration />}
      </div>
    </div>
  )
}
