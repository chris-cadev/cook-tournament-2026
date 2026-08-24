import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'

const CHECKLIST_KEY = 'team_checklist'

interface CheckItem {
  id: number
  text: string
  done: boolean
  category: 'ingredients' | 'equipment' | 'timing'
}

const CATEGORY_LABELS: Record<string, string> = {
  ingredients: 'Ingredientes',
  equipment: 'Equipo',
  timing: 'Tiempos',
}

const DEFAULT_ITEMS: Omit<CheckItem, 'id'>[] = [
  { text: 'Pan para sándwiches', done: false, category: 'ingredients' },
  { text: 'Proteínas principales', done: false, category: 'ingredients' },
  { text: 'Verduras y vegetales', done: false, category: 'ingredients' },
  { text: 'Salsas y condimentos', done: false, category: 'ingredients' },
  { text: 'Cuchillos y tablas de cortar', done: false, category: 'equipment' },
  { text: 'Cocina portátil (plancha/hornilla)', done: false, category: 'equipment' },
  { text: 'Ollas y sartenes', done: false, category: 'equipment' },
  { text: 'Fuente para presentación', done: false, category: 'equipment' },
  { text: 'Proteínas pre-marinadas (lista para cocinar)', done: false, category: 'timing' },
  { text: 'Ingredientes pre-cortados', done: false, category: 'timing' },
]

export default function TeamChecklist() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<CheckItem[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`${CHECKLIST_KEY}_${user?.team_id}`) || '[]')
      if (stored.length > 0) return stored
      return DEFAULT_ITEMS.map((item, i) => ({ ...item, id: i + 1 }))
    } catch {
      return DEFAULT_ITEMS.map((item, i) => ({ ...item, id: i + 1 }))
    }
  })
  const [newText, setNewText] = useState('')
  const [newCategory, setNewCategory] = useState<CheckItem['category']>('ingredients')

  const save = (next: CheckItem[]) => {
    setItems(next)
    localStorage.setItem(`${CHECKLIST_KEY}_${user?.team_id}`, JSON.stringify(next))
  }

  const toggleItem = (id: number) => {
    save(items.map(i => (i.id === id ? { ...i, done: !i.done } : i)))
  }

  const deleteItem = (id: number) => {
    save(items.filter(i => i.id !== id))
  }

  const addItem = () => {
    if (!newText.trim()) return
    save([...items, { id: Date.now(), text: newText.trim(), done: false, category: newCategory }])
    setNewText('')
  }

  const categories = ['ingredients', 'equipment', 'timing'] as const
  const doneCount = items.filter(i => i.done).length
  const progress = items.length > 0 ? (doneCount / items.length) * 100 : 0

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center">
          <h1 className="font-headline text-3xl font-black text-secondary">Lista de Preparación</h1>
          <p className="text-gray-500 mt-2">{doneCount} de {items.length} completados</p>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden mt-3 max-w-md mx-auto">
            <div className="h-full bg-tertiary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
            placeholder="Agregar ítem..."
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value as CheckItem['category'])} className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <button onClick={addItem} className="bg-primary hover:bg-primary-dark text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
            Agregar
          </button>
        </div>

        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat)
          if (catItems.length === 0) return null
          return (
            <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-headline text-lg font-bold text-secondary">{CATEGORY_LABELS[cat]}</h2>
              </div>
              <ul className="divide-y divide-gray-100">
                {catItems.map(item => (
                  <li key={item.id} className="flex items-center gap-3 px-6 py-3 group hover:bg-gray-50">
                    <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                    <span className={`flex-1 text-sm ${item.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.text}</span>
                    <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-sm transition-all">✕</button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
