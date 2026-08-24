import { useState, useEffect, useCallback } from 'react'

interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
  attachment_url: string | null
  attachment_type: string | null
  created_at: string
}

interface Team {
  id: number
  slug: string
  name: string
}

type TabType = 'global' | 'team' | 'judge'

export default function ChatModeration() {
  const [activeTab, setActiveTab] = useState<TabType>('global')
  const [selectedTeamSlug, setSelectedTeamSlug] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/teams')
      if (res.ok) {
        const data = await res.json()
        setTeams(data.teams || [])
        if (data.teams?.length > 0) {
          setSelectedTeamSlug(data.teams[0].slug)
        }
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    try {
      let url = ''
      if (activeTab === 'global') {
        url = '/api/chat/global/messages?limit=100'
      } else if (activeTab === 'team' && selectedTeamSlug) {
        url = `/api/chat/team/${selectedTeamSlug}/messages?limit=100`
      } else if (activeTab === 'judge') {
        url = '/api/chat/judge/messages?limit=100'
      }

      if (url) {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages)
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab, selectedTeamSlug])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 15000)
    return () => clearInterval(interval)
  }, [fetchMessages])

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Delete this message?')) return
    try {
      let url = ''
      if (activeTab === 'global') {
        url = `/api/chat/global/messages/${messageId}`
      } else if (activeTab === 'team' && selectedTeamSlug) {
        url = `/api/chat/team/${selectedTeamSlug}/messages/${messageId}`
      } else if (activeTab === 'judge') {
        url = `/api/chat/judge/messages/${messageId}`
      }
      if (!url) return
      const res = await fetch(url, {
        method: 'DELETE',
      })
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
      }
    } catch (err) {
      console.error('Failed to delete message:', err)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const getChannelLabel = () => {
    if (activeTab === 'global') return 'Global Chat'
    if (activeTab === 'judge') return 'Judge Chat'
    if (activeTab === 'team' && selectedTeamSlug) {
      const team = teams.find(t => t.slug === selectedTeamSlug)
      return team ? `Team: ${team.name}` : `Team ${selectedTeamSlug}`
    }
    return ''
  }

  const tabs: { key: TabType; label: string }[] = [
    { key: 'global', label: 'Global Chat' },
    { key: 'team', label: 'Team Chats' },
    { key: 'judge', label: 'Judge Chat' },
  ]

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-headline text-3xl font-black text-secondary mb-2">Chat Moderation</h1>
          <p className="text-gray-500">View and moderate all chat channels.</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="flex overflow-x-auto border-b border-gray-200">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-secondary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Team selector */}
          {activeTab === 'team' && (
            <div className="p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Team Channel</label>
              <select
                value={selectedTeamSlug || ''}
                onChange={(e) => setSelectedTeamSlug(e.target.value)}
                className="w-full md:w-64 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {teams.map(team => (
                  <option key={team.slug} value={team.slug}>{team.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Messages list */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-lg font-bold text-secondary">
                {getChannelLabel()}
                <span className="ml-2 text-sm font-normal text-gray-500">({messages.length} messages)</span>
              </h2>
              <button onClick={fetchMessages} className="text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-400 py-8">No messages in this channel.</div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-secondary">{msg.sender_name}</span>
                        <span className="text-xs text-gray-400 px-2 py-0.5 bg-gray-100 rounded-full">{msg.sender_role}</span>
                        <span className="text-xs text-gray-400">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-gray-800 text-sm break-words">{msg.content}</p>
                      {msg.attachment_url && msg.attachment_type === 'image' && (
                        <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl shadow-sm" />
                      )}
                      {msg.attachment_url && msg.attachment_type === 'audio' && (
                        <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                      )}
                    </div>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete message"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
