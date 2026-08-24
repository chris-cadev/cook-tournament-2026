import { useToastStore } from '../../stores/toastStore'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  const colors: Record<string, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-secondary',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${colors[t.type]} text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2`}
        >
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
        </div>
      ))}
    </div>
  )
}
