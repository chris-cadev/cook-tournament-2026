import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Todo {
  id: number
  content: string
  completed: number
  sort_order: number
}

export default function ToDo() {
  const { token } = useAuthStore()
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/todos', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setTodos(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchTodos() }, [fetchTodos])

  const addTodo = async () => {
    if (!newTodo.trim() || !token) return
    const res = await fetch('/api/admin/todos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: newTodo.trim() }),
    })
    if (res.ok) {
      const todo = await res.json()
      setTodos(prev => [...prev, todo])
      setNewTodo('')
    }
  }

  const toggleTodo = async (todo: Todo) => {
    if (!token) return
    await fetch(`/api/admin/todos/${todo.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ completed: !todo.completed }),
    })
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: t.completed ? 0 : 1 } : t))
  }

  const deleteTodo = async (id: number) => {
    if (!token) return
    await fetch(`/api/admin/todos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setTodos(prev => prev.filter(t => t.id !== id))
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Lista de Tareas</h1>
        <p className="text-gray-500 mb-6">Administra las tareas del evento.</p>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Nueva tarea..."
          />
          <button
            onClick={addTodo}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
          >
            Agregar
          </button>
        </div>

        <div className="space-y-2">
          {todos.map(todo => (
            <div
              key={todo.id}
              className={`flex items-center gap-3 p-4 bg-white rounded-2xl border ${
                todo.completed ? 'border-green-200 bg-green-50' : 'border-gray-100'
              }`}
            >
              <button
                onClick={() => toggleTodo(todo)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  todo.completed
                    ? 'bg-tertiary border-tertiary text-white'
                    : 'border-gray-300 hover:border-tertiary'
                }`}
              >
                {todo.completed ? '✓' : ''}
              </button>
              <span className={`flex-1 text-sm ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {todo.content}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-gray-400 hover:text-error text-sm"
              >
                ✕
              </button>
            </div>
          ))}
          {todos.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay tareas aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}
