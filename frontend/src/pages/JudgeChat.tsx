import { useAuthStore } from '../stores/authStore'
import { useChat } from '../lib/useChat'
import ChatInput from '../components/ChatInput'

interface JudgeChatProps {
  onBack?: () => void
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function JudgeChat({ onBack }: JudgeChatProps) {
  const { user } = useAuthStore()
  const { messages, loading, messagesEndRef, sendMessage } = useChat('judge')

  const handleSend = async (content: string, attachment?: { url: string; type: string }) => {
    await sendMessage(content, 'Judge', 'judge', null, attachment)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="sticky top-0 z-10 bg-surface border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-gray-500 hover:text-secondary">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <span className="material-symbols-outlined text-primary">timer</span>
        <div>
          <h1 className="font-headline text-xl font-black text-secondary">Judges Secure Comms</h1>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="material-symbols-outlined text-green-600 text-sm">lock</span>
            Private channel
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No messages yet. Start the conversation!</div>
        ) : (
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {messages.filter(Boolean).map((msg) => {
              const isOwn = msg.sender_id?.toString() === user?.anonymous_id
              return (
                <div key={msg.id} className={`flex gap-2 items-end ${isOwn ? 'justify-end' : 'justify-start'}`}>
                  {!isOwn && (
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div className="flex items-center gap-2 ml-2">
                        <span className="font-bold text-gray-600 text-xs">{msg.sender_name}</span>
                        <span className="text-gray-400 text-xs">{formatTime(msg.created_at)}</span>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm p-3 text-gray-900 shadow-sm">
                        {msg.content}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                        )}
                      </div>
                    </div>
                  )}
                  {isOwn && (
                    <div className="flex flex-col gap-1 items-end max-w-[80%]">
                      <div className="flex items-center gap-2 mr-2">
                        <span className="text-gray-400 text-xs">{formatTime(msg.created_at)}</span>
                        <span className="font-bold text-primary text-xs">You</span>
                      </div>
                      <div className="bg-primary text-white border-2 border-primary rounded-2xl rounded-tr-sm p-3 shadow-sm">
                        {msg.content}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <img src={msg.attachment_url} alt="attachment" className="mt-2 max-w-xs rounded-xl opacity-90" />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <audio src={msg.attachment_url} controls className="mt-2 max-w-xs" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <ChatInput
        placeholder="Discuss entry with judges..."
        onSend={handleSend}
      />
    </div>
  )
}
