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

interface JudgeChatProps {
  token: string;
  currentUserId: string;
  onBack?: () => void;
}

export default function JudgeChat({ token, currentUserId, onBack }: JudgeChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/judge/messages?limit=50', {
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
  }, [token]);

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
      const res = await fetch('/api/chat/judge/messages', {
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
            >
              <span className="material-symbols-outlined text-[#855300]">arrow_back</span>
            </button>
          )}
          <span className="material-symbols-outlined text-[#855300]">timer</span>
          <h1 className="font-[Montserrat] text-xl font-black text-[#855300] tracking-tighter">
            JUDGES SECURE COMMS
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[#006c49]">lock</span>
          <span className="font-bold text-xs text-[#006c49] hidden sm:inline-block">ENCRYPTED</span>
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
              const isOwn = msg.sender_id?.toString() === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-bold text-[#534434] text-xs">{msg.sender_name}</span>
                        <span className="text-[#867461] text-xs">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className="bg-[#f2eede] border-2 border-[#867461]/30 rounded-2xl rounded-tl-sm p-3 text-[#1c1c13] shadow-sm">
                        {msg.content}
                      </div>
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-[#867461] text-xs">{formatTime(msg.created_at)}</span>
                        <span className="font-bold text-[#855300] text-xs">You</span>
                      </div>
                      <div className="bg-[#f59e0b] text-[#613b00] border-2 border-[#f59e0b] rounded-2xl rounded-tr-sm p-3 shadow-[0_4px_10px_rgba(133,83,0,0.2)]">
                        {msg.content}
                      </div>
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
      <div className="fixed bottom-0 w-full bg-[#f2eede]/90 backdrop-blur-md border-t-2 border-[#d8c3ad] z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              className="w-full bg-white border-2 border-[#867461] rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:border-[#855300] focus:ring-4 focus:ring-[#f59e0b]/30 transition-all text-[#1c1c13] resize-none min-h-[48px] max-h-[120px]"
              placeholder="Discuss entry with judges..."
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
            className="w-12 h-12 rounded-xl bg-[#855300] text-white flex items-center justify-center shadow-[0_4px_10px_rgba(133,83,0,0.3)] hover:bg-[#855300]/90 active:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
