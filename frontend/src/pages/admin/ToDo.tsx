import { useState, useEffect, useCallback } from 'react'

export default function ToDo() {
  const [markdown, setMarkdown] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  const fetchTodos = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/todos')
      if (res.ok) {
        const data = await res.json()
        setMarkdown(data.content_markdown || '')
        setLastSaved(data.updated_at)
      }
    } catch (err) {
      console.error('Failed to fetch todos:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const saveTodos = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_markdown: markdown }),
      })
      if (res.ok) {
        setLastSaved(new Date().toISOString())
      }
    } catch (err) {
      console.error('Failed to save todos:', err)
    } finally {
      setSaving(false)
    }
  }, [markdown])

  useEffect(() => {
    if (loading) return
    const timeout = setTimeout(saveTodos, 1500)
    return () => clearTimeout(timeout)
  }, [markdown, loading, saveTodos])

  const formatTime = (iso: string | null) => {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-black text-secondary">Lista de Tareas</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Editor Markdown. Usa <code className="bg-gray-100 px-1 rounded">- [ ] tarea</code> para checkboxes,{' '}
          <code className="bg-gray-100 px-1 rounded">**negrita**</code>, <code className="bg-gray-100 px-1 rounded">~~tachado~~</code>, etc.
        </p>

        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={`# Lista de Tareas\n\n- [ ] Comprar ingredientes\n- [ ] Confirmar jueces\n- [ ] ~~Reservar mesas~~\n\n## Notas\n\nInformación adicional...`}
          rows={20}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono leading-relaxed"
        />

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            {saving ? 'Guardando...' : lastSaved ? `Último guardado: ${formatTime(lastSaved)}` : ''}
          </span>
          <span>{markdown.length} caracteres</span>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h3 className="font-headline text-sm font-bold text-secondary mb-2">Vista previa</h3>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap break-words">
            {markdown.split('\n').map((line, i) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-4 mb-2">{line.slice(2)}</h1>
              if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-3 mb-1">{line.slice(3)}</h2>
              if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-2 mb-1">{line.slice(4)}</h3>
              if (line.startsWith('- [ ]')) return <div key={i} className="flex items-center gap-2 py-0.5"><input type="checkbox" disabled className="w-3 h-3" /><span>{line.slice(5)}</span></div>
              if (line.startsWith('- [x]')) return <div key={i} className="flex items-center gap-2 py-0.5"><input type="checkbox" checked disabled className="w-3 h-3" /><span className="line-through text-gray-400">{line.slice(5)}</span></div>
              if (line.startsWith('- ')) return <div key={i} className="py-0.5 ml-2">• {line.slice(2)}</div>
              if (line.trim() === '') return <br key={i} />
              return <p key={i} className="py-0.5">{line}</p>
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
