import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY = 'admin-todo'

interface TodoItem {
  id: number
  text: string
  done: boolean
}

function loadTodos(): TodoItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveTodos(todos: TodoItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

export default function ToDo() {
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newText, setNewText] = useState('')

  useEffect(() => {
    setTodos(loadTodos())
  }, [])

  function addTodo() {
    const text = newText.trim()
    if (!text) return
    const next = [...todos, { id: Date.now(), text, done: false }]
    setTodos(next)
    saveTodos(next)
    setNewText('')
  }

  function toggle(id: number) {
    const next = todos.map(t => (t.id === id ? { ...t, done: !t.done } : t))
    setTodos(next)
    saveTodos(next)
  }

  function remove(id: number) {
    const next = todos.filter(t => t.id !== id)
    setTodos(next)
    saveTodos(next)
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/admin" className="text-sm text-gray-500 hover:text-primary">&larr; Panel de Admin</Link>
        </div>

        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Lista de Tareas</h1>
        <p className="text-gray-500 mb-6">Organiza los pendientes del evento.</p>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTodo()}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Nueva tarea..."
          />
          <button
            onClick={addTodo}
            className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors text-sm"
          >
            Agregar
          </button>
        </div>

        <div className="space-y-2">
          {todos.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-3 bg-white rounded-2xl border border-gray-100 px-4 py-3 ${
                t.done ? 'opacity-60' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => toggle(t.id)}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                className="text-gray-400 hover:text-error text-sm"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        {todos.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-white rounded-2xl">
            No hay tareas pendientes.
          </div>
        )}
      </div>
    </div>
  )
}
