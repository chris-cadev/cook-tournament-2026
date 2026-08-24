import { useState, useEffect, useCallback } from 'react'

interface Judge {
  id: number
  email: string
  name: string
  anonymous_id: string | null
  created_at: string
}

export default function Judges() {
  const [judges, setJudges] = useState<Judge[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [editing, setEditing] = useState<Judge | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const fetchJudges = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/judges')
      if (res.ok) setJudges(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJudges() }, [fetchJudges])

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim()) return
    const res = await fetch('/api/admin/judges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setCreatedPassword(data.password)
      setNewName('')
      setNewEmail('')
      fetchJudges()
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    await fetch(`/api/admin/judges/${editing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, email: editEmail }),
    })
    setEditing(null)
    fetchJudges()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este juez?')) return
    await fetch(`/api/admin/judges/${id}`, { method: 'DELETE' })
    fetchJudges()
  }

  const handleRegenerate = async (id: number) => {
    if (!confirm('Regenerar contraseña? La anterior dejará de funcionar.')) return
    const res = await fetch(`/api/admin/judges/${id}/regenerate-password`, { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      alert(`Nueva contraseña: ${data.password}`)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-headline text-2xl font-black text-secondary">Jueces ({judges.length})</h2>
        <button onClick={() => setShowCreate(true)}
          className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-4 py-2 rounded-2xl transition-colors text-sm">
          + Crear Juez
        </button>
      </div>

      {createdPassword && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-4 rounded-xl space-y-2">
          <p className="font-bold">Contraseña generada (guárdala, solo se muestra una vez):</p>
          <code className="block bg-yellow-100 px-3 py-2 rounded-lg font-mono text-lg">{createdPassword}</code>
          <button onClick={() => setCreatedPassword(null)} className="text-yellow-600 underline text-xs">Cerrar</button>
        </div>
      )}

      {judges.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">No hay jueces registrados.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/5 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-headline font-bold text-secondary">Nombre</th>
                <th className="text-left px-4 py-3 font-headline font-bold text-secondary hidden sm:table-cell">Email</th>
                <th className="text-right px-4 py-3 font-headline font-bold text-secondary">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {judges.map((j) => (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold">{j.name}</td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{j.email}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditing(j); setEditName(j.name); setEditEmail(j.email) }}
                        className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-colors" title="Editar">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button onClick={() => handleRegenerate(j.id)}
                        className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-colors" title="Regenerar contraseña">
                        <span className="material-symbols-outlined text-lg">key</span>
                      </button>
                      <button onClick={() => handleDelete(j.id)}
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
            <h3 className="font-headline text-xl font-black text-secondary">Crear Juez</h3>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
            <h3 className="font-headline text-xl font-black text-secondary">Editar Juez</h3>
            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email"
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
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
