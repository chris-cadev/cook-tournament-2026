import { useState, useEffect, useCallback } from 'react';

interface ChatMessage {
  id: number;
  channel: string;
  sender_id: number | null;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
}

interface ChatModerationProps {
  token: string;
}

type TabType = 'global' | 'team' | 'judge';

export default function ChatModeration({ token }: ChatModerationProps) {
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || data);
        if (data.teams?.length > 0 || data.length > 0) {
          const teamList = data.teams || data;
          setSelectedTeamId(teamList[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch teams:', err);
    }
  }, [token]);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      let url = '';
      if (activeTab === 'global') {
        url = '/api/chat/global/messages?limit=100';
      } else if (activeTab === 'team' && selectedTeamId) {
        url = `/api/chat/team/${selectedTeamId}/messages?limit=100`;
      } else if (activeTab === 'judge') {
        url = '/api/chat/judge/messages?limit=100';
      }

      if (url) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedTeamId, token]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 15000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const deleteMessage = async (messageId: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      const res = await fetch(`/api/chat/global/messages/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChannelLabel = () => {
    if (activeTab === 'global') return 'Global Chat';
    if (activeTab === 'judge') return 'Judge Chat';
    if (activeTab === 'team' && selectedTeamId) {
      const team = teams.find((t) => t.id === selectedTeamId);
      return team ? `Team: ${team.name}` : `Team ${selectedTeamId}`;
    }
    return '';
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'global', label: 'Global Chat' },
    { key: 'team', label: 'Team Chats' },
    { key: 'judge', label: 'Judge Chat' },
  ];

  return (
    <div className="min-h-screen bg-[#fdf9e9]">
      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-[Montserrat] text-3xl font-black text-[#855300] mb-2">
            Chat Moderation
          </h1>
          <p className="text-[#534434]">View and moderate all chat channels.</p>
        </div>

        {/* Tabs */}
        <div className="bg-[#f2eede] rounded-xl shadow-sm border-2 border-[#d8c3ad] overflow-hidden mb-6">
          <div className="flex overflow-x-auto border-b-2 border-[#d8c3ad] bg-[#e6e3d3]">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 font-bold text-sm whitespace-nowrap transition-colors border-b-4 ${
                  activeTab === tab.key
                    ? 'text-[#855300] border-[#855300] bg-white'
                    : 'text-[#534434] border-transparent hover:bg-white/50 hover:text-[#855300]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Team selector (when team tab active) */}
          {activeTab === 'team' && (
            <div className="p-4 border-b-2 border-[#d8c3ad] bg-white">
              <label className="block text-sm font-bold text-[#534434] mb-2">Select Team Channel</label>
              <select
                value={selectedTeamId || ''}
                onChange={(e) => setSelectedTeamId(parseInt(e.target.value, 10))}
                className="w-full md:w-64 bg-white border-2 border-[#867461] rounded-xl px-4 py-2 text-[#1c1c13] focus:outline-none focus:border-[#855300]"
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Messages list */}
          <div className="p-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[Montserrat] text-lg font-bold text-[#1c1c13]">
                {getChannelLabel()}
                <span className="ml-2 text-sm font-normal text-[#534434]">
                  ({messages.length} messages)
                </span>
              </h2>
              <button
                onClick={fetchMessages}
                className="text-[#855300] hover:bg-[#f59e0b]/20 p-2 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined">refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="text-center text-[#534434] py-8">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-[#534434] py-8">No messages in this channel.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 rounded-xl border border-[#d8c3ad] hover:bg-[#fdf9e9] transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-[#1c1c13]">{msg.sender_name}</span>
                        <span className="text-xs text-[#867461] px-2 py-0.5 bg-[#f2eede] rounded-full">
                          {msg.sender_role}
                        </span>
                        <span className="text-xs text-[#867461]">{formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-[#1c1c13] text-sm break-words">{msg.content}</p>
                    </div>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-[#ba1a1a] hover:bg-[#ffdad6] rounded-lg transition-all"
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
  );
}
