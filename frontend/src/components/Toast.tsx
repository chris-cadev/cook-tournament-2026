import { create } from 'zustand'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: Toast['type']) => void
  remove: (id: number) => void
}

let nextId = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info') => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  if (toasts.length === 0) return null

  const colors: Record<string, string> = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-sm ${colors[t.type]} animate-in slide-in-from-right`}>
          <span className="text-sm flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-current opacity-50 hover:opacity-100">&times;</button>
        </div>
      ))}
    </div>
  )
}
