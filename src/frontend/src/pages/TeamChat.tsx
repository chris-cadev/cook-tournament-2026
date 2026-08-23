import { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  id: number;
  channel: string;
  sender_id: number | null;
  sender_name: string;
  sender_role: string;
  content: string;
  created_at: string;
}

interface TeamChatProps {
  teamId: number;
  teamName: string;
  token: string;
  currentUserId: number;
  onBack?: () => void;
}

export default function TeamChat({ teamId, teamName, token, currentUserId, onBack }: TeamChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channel = `team:${teamId}`;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/team/${teamId}/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [teamId, token]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/chat/team/${teamId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-[#fdf9e9]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#fdf9e9] border-b-2 border-[#d8c3ad] shadow-sm flex justify-between items-center px-4 h-16">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-[#f59e0b]/20 rounded-full transition-colors"
              aria-label="Back to Team Dashboard"
            >
              <span className="material-symbols-outlined text-[#855300]">arrow_back</span>
            </button>
          )}
          <div className="flex flex-col">
            <span className="font-[Montserrat] text-xl font-black text-[#855300] tracking-tighter leading-none">
              {teamName}
            </span>
            <span className="text-xs text-[#534434] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#30c88f] inline-block"></span>
              Private Chat
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 pt-16 pb-20 overflow-y-auto px-4">
        <div className="max-w-4xl mx-auto py-4 flex flex-col gap-3">
          {loading ? (
            <div className="text-center text-[#534434] py-8">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-[#534434] py-8">No messages yet. Start the conversation!</div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.sender_id === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <span className="text-xs font-bold text-[#534434] ml-2">{msg.sender_name}</span>
                      <div className="bg-[#f2eede] text-[#1c1c13] p-3 rounded-xl rounded-bl-none shadow-sm border border-[#d8c3ad]/50">
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <div className="bg-[#855300] text-white p-3 rounded-xl rounded-br-none shadow-sm">
                        {msg.content}
                      </div>
                      <span className="text-[10px] text-[#534434]">{formatTime(msg.created_at)}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="fixed bottom-0 w-full bg-[#f2eede] border-t border-[#d8c3ad]/30 shadow-[0_-4px_10px_rgba(133,83,0,0.1)] z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              className="w-full bg-white border-2 border-[#867461] rounded-xl py-3 px-4 text-[#1c1c13] focus:border-[#855300] focus:ring-2 focus:ring-[#f59e0b]/50 outline-none resize-none transition-shadow"
              placeholder={`Message ${teamName}...`}
              rows={1}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-[#855300] text-white rounded-xl hover:translate-y-[2px] transition-transform shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
