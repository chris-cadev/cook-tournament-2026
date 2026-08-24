import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useToastStore } from '../stores/toastStore'
import Navbar from '../components/Navbar'

interface CheckItem {
  id: string
  text: string
  done: boolean
  category: string
}

const CATEGORIES = ['Ingredientes', 'Equipo', 'Tiempo', 'Otros']

export default function TeamChecklist() {
  const { token, user } = useAuthStore()
  const { addToast } = useToastStore()
  const [items, setItems] = useState<CheckItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState(CATEGORIES[0])
  const [loading, setLoading] = useState(true)

  const teamId = user?.team_id

  const fetchChecklist = useCallback(async () => {
    if (!token || !teamId) return
    try {
      const res = await fetch(`/api/teams/${teamId}/checklist`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.checklist || [])
      }
    } catch {
      console.error('Failed to fetch checklist')
    } finally {
      setLoading(false)
    }
  }, [token, teamId])

  useEffect(() => { fetchChecklist() }, [fetchChecklist])

  const saveChecklist = async (updated: CheckItem[]) => {
    if (!token || !teamId) return
    setItems(updated)
    try {
      await fetch(`/api/teams/${teamId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checklist: updated }),
      })
    } catch {
      addToast('Error al guardar', 'error')
    }
  }

  const addItem = () => {
    if (!newItem.trim()) return
    const item: CheckItem = { id: crypto.randomUUID(), text: newItem.trim(), done: false, category: newCategory }
    saveChecklist([...items, item])
    setNewItem('')
  }

  const toggleItem = (id: string) => {
    saveChecklist(items.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }

  const removeItem = (id: string) => {
    saveChecklist(items.filter(i => i.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem() }
  }

  const grouped = CATEGORIES.map(cat => ({
    category: cat,
    items: items.filter(i => i.category === cat),
  })).filter(g => g.items.length > 0)

  const progress = items.length > 0 ? Math.round((items.filter(i => i.done).length / items.length) * 100) : 0

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Checklist del Equipo</h1>
        <p className="text-gray-500 text-sm mb-6">Prepara todo para el día del evento.</p>

        {items.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-500">Progreso</span>
              <span className="font-bold text-secondary">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-tertiary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex gap-2 mb-4">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Agregar item..."
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
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-8">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="text-center text-gray-400 py-8">No hay items. ¡Agrega tu primer item!</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(group => (
              <div key={group.category} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-headline text-sm font-bold text-secondary mb-3">{group.category}</h3>
                <div className="space-y-2">
                  {group.items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
