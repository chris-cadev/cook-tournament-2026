import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import TeamChat from './TeamChat'
import TeamChecklist from './TeamChecklist'

type Tab = 'chat' | 'notes' | 'checklist'

interface TeamData {
  id: number
  name: string
  sandwich_name: string
  captain_email: string
  members: { name: string; email: string | null }[]
}

export default function TeamDashboard() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('chat')
  const [team, setTeam] = useState<TeamData | null>(null)
  const [joinRequests, setJoinRequests] = useState<{ id: number; team_id: number; name: string; email: string; message: string | null; status: string; created_at: string }[]>([])
  const [showRequests, setShowRequests] = useState(false)

  const isCaptain = team ? user?.email === team.captain_email : false

  const fetchTeam = useCallback(async () => {
    if (!user?.team_slug) return
    try {
      const res = await fetch(`/api/teams/${user.team_slug}`)
      if (res.ok) {
        setTeam(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch team:', err)
    }
  }, [user?.team_slug])

  const fetchJoinRequests = useCallback(async () => {
    if (!user?.team_slug) return
    try {
      const res = await fetch(`/api/join-requests/${user.team_slug}`)
      if (res.ok) {
        setJoinRequests(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch join requests:', err)
    }
  }, [user?.team_slug])

  useEffect(() => {
    fetchTeam()
    fetchJoinRequests()
  }, [fetchTeam, fetchJoinRequests])

  const pendingCount = joinRequests.filter(r => r.status === 'pending').length

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'chat', label: 'Chat', icon: 'chat' },
    { key: 'notes', label: 'Notas', icon: 'edit_note' },
    { key: 'checklist', label: 'Checklist', icon: 'checklist' },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-headline text-lg font-black text-secondary">
              {team?.name || user?.name || 'Mi Equipo'}
            </h1>
            {team?.sandwich_name && (
              <p className="text-xs text-gray-500">🥪 {team.sandwich_name}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button onClick={() => { setShowRequests(!showRequests); setTab('chat') }}
                className="bg-primary/10 text-primary-dark px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors">
                🤝 {pendingCount} solicitud{pendingCount > 1 ? 'es' : ''}
              </button>
            )}
            <span className="text-xs text-gray-400">
              {user?.email}
              {isCaptain && (
                <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary/10 text-primary-dark font-bold">
                  Capitán
                </span>
              )}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full px-4 pt-3">
        <div className="flex gap-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1 mb-4">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium flex-1 justify-center transition-colors ${
                tab === t.key
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}>
              <span className="material-symbols-outlined text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {tab === 'chat' && user?.team_slug && (
          <TeamChat
            teamSlug={user.team_slug}
            teamName={team?.name || user?.name || ''}
            members={team?.members || []}
            isCaptain={isCaptain}
            embedded
            joinRequests={joinRequests}
            setJoinRequests={setJoinRequests}
            showRequests={showRequests}
            setShowRequests={setShowRequests}
          />
        )}
        {tab === 'notes' && user?.team_slug && (
          <TeamNotes teamSlug={user.team_slug} isCaptain={isCaptain} />
        )}
        {tab === 'checklist' && (
          <div className="px-4 pb-6">
            <TeamChecklist />
          </div>
        )}
      </div>
    </div>
  )
}

function TeamNotes({ teamSlug, isCaptain }: { teamSlug: string; isCaptain: boolean }) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/teams/${teamSlug}/notes`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content || '')
        setSavedContent(data.content || '')
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [teamSlug])

  const save = useCallback(async (newContent: string) => {
    if (newContent === savedContent) return
    setSaving(true)
    try {
      await fetch(`/api/teams/${teamSlug}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      setSavedContent(newContent)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Failed to save notes:', err)
    } finally {
      setSaving(false)
    }
  }, [teamSlug, savedContent])

  const handleBlur = () => {
    save(content)
  }

  useEffect(() => {
    if (content === savedContent) return
    const timer = setTimeout(() => save(content), 2000)
    return () => clearTimeout(timer)
  }, [content, savedContent, save])

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="px-4 pb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-lg font-bold text-secondary">Notas del equipo</h2>
        <span className="text-xs text-gray-400">
          {saving ? 'Guardando...' : saved ? 'Guardado' : ''}
        </span>
      </div>
      {isCaptain ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleBlur}
          placeholder="Escribe notas para tu equipo... (se guardan automáticamente)"
          className="w-full h-64 border border-gray-300 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 min-h-[16rem] text-sm text-gray-700 whitespace-pre-wrap">
          {content || <span className="text-gray-400 italic">Sin notas aún</span>}
        </div>
      )}
      {!isCaptain && (
        <p className="text-xs text-gray-400 italic">Solo el capitán puede editar las notas</p>
      )}
    </div>
  )
}
