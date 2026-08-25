import { useState, useEffect, useCallback } from 'react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  enabled: boolean
}

interface EmailLog {
  id: number
  template_id: string
  recipient_email: string
  sent_at: string
  opened_at: string | null
  open_count: number
}

interface EmailSchedule {
  id: number
  template_id: string
  recipient_filter: string
  scheduled_at: string
  status: string
  created_at: string
}

type Tab = 'send' | 'schedule' | 'logs' | 'templates'

export default function EmailReminders() {
  const [tab, setTab] = useState<Tab>('send')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [schedules, setSchedules] = useState<EmailSchedule[]>([])
  const [emailAvailable, setEmailAvailable] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [resending, setResending] = useState<number | null>(null)

  // Schedule form
  const [schedTemplate, setSchedTemplate] = useState('')
  const [schedFilter, setSchedFilter] = useState('all_teams')
  const [schedDate, setSchedDate] = useState('')
  const [scheduling, setScheduling] = useState(false)

  // Template editing
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [health, tplRes, logsRes, schedRes] = await Promise.all([
        fetch('/api/admin/email/health').then(r => r.json()).catch(() => ({ available: false })),
        fetch('/api/admin/email/templates').then(r => r.json()).catch(() => []),
        fetch('/api/admin/email/logs').then(r => r.json()).catch(() => []),
        fetch('/api/admin/email/schedules').then(r => r.json()).catch(() => []),
      ])
      setEmailAvailable(health.available)
      setTemplates(Array.isArray(tplRes) ? tplRes : [])
      setLogs(Array.isArray(logsRes) ? logsRes : [])
      setSchedules(Array.isArray(schedRes) ? schedRes : [])
    } catch {
      setEmailAvailable(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSend = async (templateId: string) => {
    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      setResult({ sent: data.sent, total: data.sent + data.failed })
      fetchData()
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  const handleResend = async (log: EmailLog) => {
    setResending(log.id)
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: log.template_id, team_ids: [] }),
      })
      const data = await res.json()
      if (res.ok) fetchData()
    } catch {
      // silent
    } finally {
      setResending(null)
    }
  }

  const handleSchedule = async () => {
    if (!schedTemplate || !schedDate) return
    setScheduling(true)
    try {
      await fetch('/api/admin/email/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: schedTemplate,
          recipient_filter: schedFilter,
          scheduled_at: new Date(schedDate).toISOString(),
        }),
      })
      setSchedDate('')
      fetchData()
    } finally {
      setScheduling(false)
    }
  }

  const handleCancelSchedule = async (id: number) => {
    await fetch(`/api/admin/email/schedules/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return
    await fetch(`/api/admin/email/templates/${editingTemplate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: editSubject, body: editBody }),
    })
    setEditingTemplate(null)
    fetchData()
  }

  const handleToggleTemplate = async (t: EmailTemplate) => {
    await fetch(`/api/admin/email/templates/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !t.enabled }),
    })
    fetchData()
  }

  if (!emailAvailable) {
    return (
      <div className="space-y-6">
        <h2 className="font-headline text-2xl font-black text-secondary">Email</h2>
        <div className="bg-yellow-50 text-yellow-700 text-sm p-4 rounded-xl">
          El correo no está configurado. Configura SMTP_HOST, SMTP_USER y SMTP_PASS.
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-black text-secondary">Email</h2>

      {result && (
        <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl">
          Correos enviados: {result.sent} de {result.total}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { key: 'send' as Tab, label: 'Enviar' },
          { key: 'schedule' as Tab, label: 'Programar' },
          { key: 'logs' as Tab, label: 'Historial' },
          { key: 'templates' as Tab, label: 'Templates' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Send tab */}
      {tab === 'send' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-headline text-lg font-bold text-secondary">Enviar ahora</h3>
          {templates.filter(t => t.enabled).length === 0 ? (
            <p className="text-sm text-gray-500">No hay templates habilitados.</p>
          ) : (
            <div className="space-y-2">
              {templates.filter(t => t.enabled).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className="text-xs text-gray-500 ml-2">→ {t.subject}</span>
                  </div>
                  <button onClick={() => handleSend(t.id)} disabled={sending}
                    className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                    {sending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule tab */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="font-headline text-lg font-bold text-secondary">Programar envío</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select value={schedTemplate} onChange={(e) => setSchedTemplate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="">Template...</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <select value={schedFilter} onChange={(e) => setSchedFilter(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="all_teams">Todos los equipos</option>
                <option value="all_judges">Todos los jueces</option>
              </select>
              <input type="datetime-local" value={schedDate} onChange={(e) => setSchedDate(e.target.value)}
                className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button onClick={handleSchedule} disabled={scheduling || !schedTemplate || !schedDate}
              className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-2.5 rounded-2xl transition-colors disabled:opacity-50 text-sm">
              {scheduling ? 'Programando...' : 'Programar'}
            </button>
          </div>

          {schedules.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
              <h3 className="font-headline text-lg font-bold text-secondary">Programados</h3>
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl text-sm">
                    <div>
                      <span className="font-medium">{s.template_id}</span>
                      <span className="text-gray-500 ml-2">→ {s.recipient_filter}</span>
                      <span className="text-gray-500 ml-2">{new Date(s.scheduled_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : s.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status === 'pending' ? 'Pendiente' : s.status === 'sent' ? 'Enviado' : 'Fallido'}
                      </span>
                      {s.status === 'pending' && (
                        <button onClick={() => handleCancelSchedule(s.id)} className="text-red-600 hover:text-red-800 text-xs">Cancelar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logs tab */}
      {tab === 'logs' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-headline text-lg font-bold text-secondary">Historial de envíos</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-gray-500">No hay envíos registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Template</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Destinatario</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-600">Enviado</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Abierto</th>
                    <th className="text-center px-3 py-2 font-medium text-gray-600">Veces</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.slice(0, 50).map((l) => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{l.template_id}</td>
                      <td className="px-3 py-2 text-gray-600">{l.recipient_email}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{new Date(l.sent_at).toLocaleString()}</td>
                      <td className="px-3 py-2 text-center">
                        {l.opened_at ? (
                          <span className="text-green-600 text-xs font-bold">✓ {new Date(l.opened_at).toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-xs">{l.open_count}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handleResend(l)} disabled={resending === l.id}
                          className="text-primary hover:text-primary-dark text-xs font-medium disabled:opacity-50">
                          {resending === l.id ? '...' : 'Reenviar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-headline text-lg font-bold text-secondary">Administrar Templates</h3>
          <p className="text-sm text-gray-500">Edita el asunto y contenido de los correos. Variables: {'{{team_name}}'}, {'{{captain_name}}'}, {'{{event_date}}'}</p>
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="p-4 bg-gray-50 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {t.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggleTemplate(t)}
                      className="text-xs text-gray-500 hover:text-gray-700">
                      {t.enabled ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => { setEditingTemplate(t); setEditSubject(t.subject); setEditBody(t.body) }}
                      className="text-primary hover:text-primary-dark text-xs font-medium">
                      Editar
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500">Asunto: {t.subject}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit template modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditingTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-xl font-black text-secondary">Editar: {editingTemplate.name}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
              <input type="text" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuerpo (Markdown)</label>
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={12}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingTemplate(null)} className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSaveTemplate} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
