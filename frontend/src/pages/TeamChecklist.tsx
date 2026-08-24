import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'

interface ChecklistItem {
  id: number
  item: string
  category: string
  completed: number
}

const CATEGORIES = [
  { key: 'ingredients', label: 'Ingredientes', icon: '🥬' },
  { key: 'equipment', label: 'Equipo', icon: '🔪' },
  { key: 'timing', label: 'Tiempo', icon: '⏱️' },
  { key: 'general', label: 'General', icon: '📋' },
]

export default function TeamChecklist() {
  const { token } = useAuthStore()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [category, setCategory] = useState('ingredients')

  const fetchItems = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/checklist', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setItems(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = async () => {
    if (!newItem.trim() || !token) return
    const res = await fetch('/api/checklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ item: newItem.trim(), category }),
    })
    if (res.ok) {
      const item = await res.json()
      setItems(prev => [...prev, item])
      setNewItem('')
    }
  }

  const toggleItem = async (item: ChecklistItem) => {
    if (!token) return
    await fetch(`/api/checklist/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ completed: !item.completed }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: i.completed ? 0 : 1 } : i))
  }

  const deleteItem = async (id: number) => {
    if (!token) return
    await fetch(`/api/checklist/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Lista de Preparación</h1>
        <p className="text-gray-500 mb-6">Organiza lo que necesitas para el día del evento.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 space-y-3">
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map(c => (
                <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Nuevo ítem..."
            />
            <button
              onClick={addItem}
              className="bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {CATEGORIES.map(cat => {
          const catItems = items.filter(i => i.category === cat.key)
          if (catItems.length === 0) return null
          const completedCount = catItems.filter(i => i.completed).length

          return (
            <div key={cat.key} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-headline text-lg font-bold text-secondary">
                  {cat.icon} {cat.label}
                </h2>
                <span className="text-xs text-gray-500">{completedCount}/{catItems.length}</span>
              </div>
              <div className="space-y-2">
                {catItems.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 bg-white rounded-2xl border ${
                      item.completed ? 'border-green-200 bg-green-50' : 'border-gray-100'
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        item.completed
                          ? 'bg-tertiary border-tertiary text-white'
                          : 'border-gray-300 hover:border-tertiary'
                      }`}
                    >
                      {item.completed ? '✓' : ''}
                    </button>
                    <span className={`flex-1 text-sm ${item.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {item.item}
                    </span>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-gray-400 hover:text-error text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {items.length === 0 && (
          <p className="text-center text-gray-400 py-8">Agrega ítems para prepararte para el evento.</p>
        )}
      </div>
    </div>
  )
}
