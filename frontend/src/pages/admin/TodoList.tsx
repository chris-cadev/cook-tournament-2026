import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'
import AdminNavbar from '../../components/admin/AdminNavbar'

interface TodoItem {
  id: number
  content: string
  completed: number
  created_at: string
}

export default function TodoList() {
  const { token } = useAuthStore()
  const [items, setItems] = useState<TodoItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/todo', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setItems(await res.json())
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = async () => {
    if (!newItem.trim() || !token) return
    try {
      const res = await fetch('/api/todo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newItem.trim() }),
      })
      if (res.ok) {
        const item = await res.json()
        setItems(prev => [item, ...prev])
        setNewItem('')
      }
    } catch (err) {
      console.error('Failed to add todo:', err)
    }
  }

  const toggleComplete = async (item: TodoItem) => {
    if (!token) return
    try {
      await fetch(`/api/todo/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ completed: !item.completed }),
      })
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: i.completed ? 0 : 1 } : i))
    } catch (err) {
      console.error('Failed to toggle todo:', err)
    }
  }

  const deleteItem = async (id: number) => {
    if (!token) return
    try {
      await fetch(`/api/todo/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (err) {
      console.error('Failed to delete todo:', err)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <AdminNavbar />
      <div className="max-w-[800px] mx-auto px-4 py-6">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">To-Do List</h1>
        <p className="text-gray-500 mb-6">Keep track of event planning tasks.</p>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Add a new task..."
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={addItem}
            disabled={!newItem.trim()}
            className="bg-primary text-white font-bold px-4 py-2 rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : items.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No tasks yet. Add one above.</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 bg-white rounded-xl border px-4 py-3 ${item.completed ? 'opacity-60' : ''}`}
              >
                <button
                  onClick={() => toggleComplete(item)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    item.completed ? 'bg-primary border-primary' : 'border-gray-300 hover:border-primary'
                  }`}
                >
                  {item.completed ? <span className="text-white text-xs">✓</span> : null}
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {item.content}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
