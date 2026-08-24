import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'

interface ChecklistItem {
  id: string
  text: string
  done: boolean
  category: string
}

const CATEGORIES = [
  { key: 'ingredients', label: 'Ingredientes', icon: 'grocery' },
  { key: 'equipment', label: 'Equipo', icon: 'kitchen' },
  { key: 'timing', label: 'Tiempo', icon: 'schedule' },
]

export default function TeamChecklist() {
  const { token, user } = useAuthStore()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState('ingredients')
  const [teamId, setTeamId] = useState<number | null>(null)

  useEffect(() => {
    if (user?.team_id) setTeamId(user.team_id)
  }, [user])

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
    } catch (err) {
      console.error('Failed to fetch checklist:', err)
    } finally {
      setLoading(false)
    }
  }, [token, teamId])

  useEffect(() => {
    fetchChecklist()
  }, [fetchChecklist])

  const saveChecklist = useCallback(async (newItems: ChecklistItem[]) => {
    if (!token || !teamId) return
    try {
      await fetch(`/api/teams/${teamId}/checklist`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checklist: newItems }),
      })
    } catch (err) {
      console.error('Failed to save checklist:', err)
    }
  }, [token, teamId])

  const addItem = () => {
    if (!newText.trim()) return
    const item: ChecklistItem = {
      id: Date.now().toString(),
      text: newText.trim(),
      done: false,
      category: newCategory,
    }
    const updated = [...items, item]
    setItems(updated)
    setNewText('')
    saveChecklist(updated)
  }

  const toggleItem = (id: string) => {
    const updated = items.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    setItems(updated)
    saveChecklist(updated)
  }

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id)
    setItems(updated)
    saveChecklist(updated)
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  const totalDone = items.filter((i) => i.done).length
  const progress = items.length > 0 ? (totalDone / items.length) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline text-2xl font-black text-secondary">Lista de Preparación</h2>
        <p className="text-sm text-gray-500 mt-1">{totalDone} de {items.length} completados</p>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Add item */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <div className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Nuevo ítem..."
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={addItem}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold transition-colors"
          >
            Agregar
          </button>
        </div>
      </div>

      {/* Items by category */}
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((i) => i.category === cat.key)
        if (catItems.length === 0) return null
        const catDone = catItems.filter((i) => i.done).length
        return (
          <div key={cat.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-lg">{cat.icon}</span>
                <h3 className="font-headline font-bold text-secondary">{cat.label}</h3>
              </div>
              <span className="text-xs text-gray-400">{catDone}/{catItems.length}</span>
            </div>
            <ul className="divide-y divide-gray-100">
              {catItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-6 py-3 group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleItem(item.id)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/50"
                  />
                  <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm transition-all"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      })}

      {items.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">No hay ítems. ¡Agrega tu primer ítem de preparación!</p>
      )}
    </div>
  )
}
