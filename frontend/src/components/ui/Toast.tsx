import { useEffect, useState } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

let toastId = 0
let listeners: ((items: ToastItem[]) => void)[] = []
let toasts: ToastItem[] = []

function notify(message: string, type: ToastItem['type'] = 'info') {
  const id = ++toastId
  toasts = [...toasts, { id, message, type }]
  listeners.forEach(fn => fn(toasts))
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    listeners.forEach(fn => fn(toasts))
  }, 4000)
}

export const toast = {
  success: (msg: string) => notify(msg, 'success'),
  error: (msg: string) => notify(msg, 'error'),
  info: (msg: string) => notify(msg, 'info'),
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.push(setItems)
    return () => { listeners = listeners.filter(l => l !== setItems) }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map(item => {
        const colors = {
          success: 'bg-tertiary text-white',
          error: 'bg-error text-white',
          info: 'bg-secondary text-white',
        }
        return (
          <div key={item.id} className={`${colors[item.type]} px-4 py-3 rounded-2xl shadow-lg text-sm font-medium max-w-xs animate-[slideIn_0.2s_ease-out]`}>
            {item.message}
          </div>
        )
      })}
    </div>
  )
}
