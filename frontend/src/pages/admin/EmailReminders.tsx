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

export default function EmailReminders() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [schedules, setSchedules] = useState<EmailSchedule[]>([])
  const [emailAvailable, setEmailAvailable] = useState(true)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState('')

  // Schedule form
  const [schedTemplate, setSchedTemplate] = useState('')
  const [schedFilter, setSchedFilter] = useState('all_teams')
  const [schedDate, setSchedDate] = useState('')
  const [scheduling, setScheduling] = useState(false)

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

      {/* Templates */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-secondary">Templates</h3>
        {templates.length === 0 ? (
          <p className="text-sm text-gray-500">No hay templates configurados.</p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <span className="font-medium text-sm">{t.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({t.id})</span>
                </div>
                <button onClick={() => handleSend(t.id)} disabled={sending}
                  className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50">
                  {sending ? 'Enviando...' : 'Enviar ahora'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-secondary">Programar envío</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select value={schedTemplate} onChange={(e) => setSchedTemplate(e.target.value)}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="">Seleccionar template...</option>
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

      {/* Scheduled */}
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

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="font-headline text-lg font-bold text-secondary">Historial de envíos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Template</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Destinatario</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Enviado</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Abierto</th>
                  <th className="text-center px-3 py-2 font-medium text-gray-600">Veces</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
