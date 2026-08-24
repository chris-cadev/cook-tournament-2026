import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'

const STORAGE_KEY = 'admin_todo'

interface TodoItem {
  id: number
  text: string
  done: boolean
}

export default function ToDo() {
  const { logout } = useAuthStore()
  const [items, setItems] = useState<TodoItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch { return [] }
  })
  const [newText, setNewText] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = () => {
    if (!newText.trim()) return
    setItems(prev => [...prev, { id: Date.now(), text: newText.trim(), done: false }])
    setNewText('')
  }

  const toggleItem = (id: number) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  const deleteItem = (id: number) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
  }

  return (
    <div className="min-h-screen bg-surface">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <h1 className="font-headline text-xl font-black text-secondary">Panel de Admin</h1>
          <div className="flex items-center gap-6">
            <Link to="/admin/dashboard" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Equipos</Link>
            <Link to="/admin/chat" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Chat</Link>
            <Link to="/admin/score-reveal" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Puntuaciones</Link>
            <Link to="/admin/settings" className="text-sm font-bold text-gray-500 hover:text-secondary transition-colors">Configuración</Link>
            <button onClick={() => { logout() }} className="text-sm font-bold text-error hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
              Cerrar sesión
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-1">Lista de Tareas</h2>
          <p className="text-sm text-gray-500">Planificación del evento — persiste localmente.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar tarea..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button onClick={addItem} className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
              Agregar
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No hay tareas aún.</p>
          ) : (
            <ul className="space-y-2">
              {items.map(item => (
                <li key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm transition-all"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
