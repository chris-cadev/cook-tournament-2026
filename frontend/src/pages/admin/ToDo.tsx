import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import Navbar from '../../components/Navbar'

interface TodoItem {
  id: string
  text: string
  done: boolean
}

export default function ToDo() {
  const { token } = useAuthStore()
  const { addToast } = useToastStore()
  const [items, setItems] = useState<TodoItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/todo', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.todo || [])
      }
    } catch {
      console.error('Failed to fetch todos')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const saveTodos = async (updated: TodoItem[]) => {
    if (!token) return
    setItems(updated)
    try {
      await fetch('/api/admin/todo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ todo: updated }),
      })
    } catch {
      addToast('Error al guardar', 'error')
    }
  }

  const addItem = () => {
    if (!newItem.trim()) return
    const item: TodoItem = { id: crypto.randomUUID(), text: newItem.trim(), done: false }
    saveTodos([...items, item])
    setNewItem('')
  }

  const toggleItem = (id: string) => {
    saveTodos(items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  const removeItem = (id: string) => {
    saveTodos(items.filter(i => i.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">To-Do List</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar tarea..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={addItem}
              disabled={!newItem.trim()}
              className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Agregar
            </button>
          </div>

          {loading ? (
            <div className="text-center text-gray-400 py-8">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="text-center text-gray-400 py-8">No hay tareas. ¡Agrega una!</div>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary/50 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded-lg transition-all"
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
  )
}
