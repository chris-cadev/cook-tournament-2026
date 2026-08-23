import { useToastStore } from '../stores/toastStore'

const styles: Record<string, string> = {
  success: 'bg-green-50 border-green-200 text-green-700',
  error: 'bg-red-50 border-red-200 text-red-700',
  info: 'bg-blue-50 border-blue-200 text-blue-700',
}

export default function ToastContainer() {
  const { toasts, dismiss } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`border px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center justify-between gap-3 ${styles[t.type] || styles.info}`}
        >
          <span>{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-current opacity-50 hover:opacity-100 text-lg leading-none">&times;</button>
        </div>
      ))}
    </div>
  )
}
