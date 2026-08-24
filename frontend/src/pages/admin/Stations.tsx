import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface Station {
  id: number
  name: string
  description: string | null
}

export default function StationManager() {
  const { token } = useAuthStore()
  const [stations, setStations] = useState<Station[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  const fetchStations = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/admin/stations', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setStations(await res.json())
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchStations() }, [fetchStations])

  const addStation = async () => {
    if (!newName.trim() || !token) return
    const res = await fetch('/api/admin/stations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
    })
    if (res.ok) {
      const station = await res.json()
      setStations(prev => [...prev, station])
      setNewName('')
      setNewDesc('')
    }
  }

  const deleteStation = async (id: number) => {
    if (!token || !confirm('¿Eliminar esta estación?')) return
    await fetch(`/api/admin/stations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    setStations(prev => prev.filter(s => s.id !== id))
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Gestionar Estaciones</h1>
        <p className="text-gray-500 mb-6">Administra las estaciones de cocina para asignar a equipos.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 space-y-3">
          <h2 className="font-headline text-lg font-bold text-secondary">Nueva Estación</h2>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addStation()}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Nombre (ej: Mesa 1)"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Descripción (opcional)"
          />
          <button
            onClick={addStation}
            className="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
          >
            Agregar Estación
          </button>
        </div>

        <div className="space-y-2">
          {stations.map(station => (
            <div key={station.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100">
              <div>
                <p className="font-semibold text-secondary text-sm">{station.name}</p>
                {station.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{station.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteStation(station.id)}
                className="text-gray-400 hover:text-error text-sm"
              >
                ✕
              </button>
            </div>
          ))}
          {stations.length === 0 && (
            <p className="text-center text-gray-400 py-8">No hay estaciones aún.</p>
          )}
        </div>
      </div>
    </div>
  )
}
