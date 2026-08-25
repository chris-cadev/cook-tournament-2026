import { useState, useEffect, useCallback } from 'react'

interface Task {
  id: number
  title: string
  description: string
  status: string
  created_at: string
  completed_at: string | null
  updated_at: string
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completada',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
}

export default function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tasks')
      if (res.ok) setTasks(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    await fetch('/api/admin/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim(), description: newDesc.trim() }),
    })
    setNewTitle('')
    setNewDesc('')
    setShowCreate(false)
    fetchTasks()
  }

  const handleUpdate = async () => {
    if (!editing) return
    await fetch(`/api/admin/tasks/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, description: editDesc }),
    })
    setEditing(null)
    fetchTasks()
  }

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/admin/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchTasks()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch(`/api/admin/tasks/${id}`, { method: 'DELETE' })
    fetchTasks()
  }

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter)

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-black text-secondary">Tareas ({tasks.length})</h2>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-4 py-2 rounded-2xl transition-colors text-sm">
          + Crear Tarea
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'completed'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {f === 'all' ? 'Todas' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">No hay tareas.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/5 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Tarea</th>
                <th className="text-center px-4 py-3 font-headline font-bold text-secondary">Estado</th>
                <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden md:table-cell">Creada</th>
                <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold">{task.title}</div>
                    {task.description && <div className="text-xs text-gray-500 mt-0.5">{task.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleStatusChange(task.id, task.status === 'completed' ? 'pending' : 'completed')}
                      className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${STATUS_COLORS[task.status] || ''}`}>
                      {task.status === 'completed' ? '✓ Completada' : 'Pendiente'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                    {new Date(task.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(task); setEditTitle(task.title); setEditDesc(task.description) }}
                        className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleDelete(task.id)}
                        className="text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Eliminar">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-xl font-black text-secondary">Crear Tarea</h3>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Título"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Descripción (opcional)" rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleCreate} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold">Crear</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-xl font-black text-secondary">Editar Tarea</h3>
            <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Descripción" rows={3}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleUpdate} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
