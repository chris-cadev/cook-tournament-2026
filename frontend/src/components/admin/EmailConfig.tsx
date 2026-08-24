import { useState, useEffect } from 'react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  enabled: boolean
}

interface Team {
  id: number
  name: string
  captain_email: string
}

interface SendResult {
  sent: number
  failed: number
  details: { email: string; ok: boolean; error?: string }[]
}

export default function EmailConfig() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [selectedTeams, setSelectedTeams] = useState<number[]>([])
  const [showSendDialog, setShowSendDialog] = useState<string | null>(null)
  const [sendResult, setSendResult] = useState<SendResult | null>(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  const [reminderResult, setReminderResult] = useState<{ message?: string; days_until_event?: number; results?: { template: string; sent: number; failed: number }[] } | null>(null)

  const authHeaders = { 'Content-Type': 'application/json' }

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchTeams()])
  }, [])

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/admin/email/templates', { headers: authHeaders })
      if (res.ok) setTemplates(await res.json())
    } catch (err) {
      console.error('Failed to fetch templates:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchTeams() {
    try {
      const res = await fetch('/api/teams', { headers: authHeaders })
      if (res.ok) setTeams(await res.json())
    } catch (err) {
      console.error('Failed to fetch teams:', err)
    }
  }

  async function handleSave(t: EmailTemplate) {
    try {
      const res = await fetch(`/api/admin/email/templates/${t.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ name: t.name, subject: t.subject, body: t.body, enabled: t.enabled }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTemplates(prev => prev.map(x => (x.id === updated.id ? updated : x)))
        setEditing(null)
      }
    } catch (err) {
      console.error('Failed to save template:', err)
    }
  }

  async function handleSend(templateId: string) {
    setSending(templateId)
    setSendResult(null)
    try {
      const res = await fetch('/api/admin/email/send', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ template_id: templateId, team_ids: selectedTeams.length > 0 ? selectedTeams : undefined }),
      })
      if (res.ok) {
        const result = await res.json()
        setSendResult(result)
      }
    } catch (err) {
      console.error('Failed to send emails:', err)
    } finally {
      setSending(null)
    }
  }

  async function handleSendReminders() {
    setSendingReminders(true)
    setReminderResult(null)
    try {
      const res = await fetch('/api/admin/email/send-reminders', {
        method: 'POST',
        headers: authHeaders,
      })
      const data = await res.json()
      setReminderResult(data)
    } catch (err) {
      console.error('Failed to send reminders:', err)
    } finally {
      setSendingReminders(false)
    }
  }

  function toggleTeam(id: number) {
    setSelectedTeams(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
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
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Email Templates</h1>
        <p className="text-gray-600 mb-6">Edit and send emails to teams via SMTP.</p>

        <div className="space-y-4">
          {templates.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border-2 border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-headline font-bold text-lg text-secondary">{t.name}</h3>
                  <p className="text-sm text-gray-500">Asunto: {t.subject}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditing(editing === t.id ? null : t.id)
                      setSendResult(null)
                    }}
                    className="text-sm font-medium text-primary hover:text-primary-dark"
                  >
                    {editing === t.id ? 'Cancelar' : 'Editar'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.enabled}
                      onChange={() => handleSave({ ...t, enabled: !t.enabled })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary" />
                  </label>
                </div>
              </div>

              {editing === t.id && (
                <div className="space-y-3 mt-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      value={t.name}
                      onChange={e => setTemplates(prev => prev.map(x => (x.id === t.id ? { ...x, name: e.target.value } : x)))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                    <input
                      type="text"
                      value={t.subject}
                      onChange={e => setTemplates(prev => prev.map(x => (x.id === t.id ? { ...x, subject: e.target.value } : x)))}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cuerpo (Markdown) — Variables: {'{{team_name}}'}, {'{{captain_name}}'}, {'{{event_title}}'}, {'{{event_date}}'}
                    </label>
                    <textarea
                      value={t.body}
                      onChange={e => setTemplates(prev => prev.map(x => (x.id === t.id ? { ...x, body: e.target.value } : x)))}
                      rows={8}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={() => handleSave(t)}
                    className="px-4 py-2 bg-tertiary text-white font-semibold rounded-xl hover:bg-tertiary/90 transition-colors text-sm"
                  >
                    Guardar
                  </button>
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setShowSendDialog(showSendDialog === t.id ? null : t.id)
                    setSelectedTeams([])
                    setSendResult(null)
                  }}
                  disabled={!t.enabled}
                  className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Enviar
                </button>
              </div>

              {showSendDialog === t.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Selecciona equipos (o deja vacío para enviar a todos):</p>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {teams.map(team => (
                      <label key={team.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedTeams.includes(team.id)}
                          onChange={() => toggleTeam(team.id)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span>{team.name}</span>
                        <span className="text-gray-400">({team.captain_email})</span>
                      </label>
                    ))}
                    {teams.length === 0 && <p className="text-gray-400 text-sm">No hay equipos registrados</p>}
                  </div>
                  <button
                    onClick={() => handleSend(t.id)}
                    disabled={sending === t.id}
                    className="px-4 py-2 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 text-sm"
                  >
                    {sending === t.id ? 'Enviando...' : 'Confirmar envío'}
                  </button>
                </div>
              )}

              {sendResult && showSendDialog === t.id && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${sendResult.failed > 0 ? 'bg-error/10 border border-error/30' : 'bg-tertiary/10 border border-tertiary/30'}`}>
                  <p className="font-medium">{sendResult.sent} enviado(s), {sendResult.failed} fallido(s)</p>
                  {sendResult.details.filter(d => !d.ok).map((d, i) => (
                    <p key={i} className="text-error text-xs mt-1">{d.email}: {d.error}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12 text-gray-500">No hay plantillas de email configuradas.</div>
        )}

        {/* Send Reminders Section */}
        <div className="mt-8 bg-white rounded-2xl border-2 border-gray-200 p-5">
          <h3 className="font-headline font-bold text-lg text-secondary mb-2">Recordatorios Automáticos</h3>
          <p className="text-sm text-gray-500 mb-4">
            Envía recordatorios según la fecha del evento: recordatorio a equipos (3 semanas antes), anuncio general + recordatorio a jueces (1 semana antes).
          </p>
          <button
            onClick={handleSendReminders}
            disabled={sendingReminders}
            className="px-4 py-2 bg-secondary text-white font-semibold rounded-xl hover:bg-secondary/90 transition-colors disabled:opacity-50 text-sm"
          >
            {sendingReminders ? 'Enviando...' : 'Enviar Recordatorios'}
          </button>
          {reminderResult && (
            <div className="mt-3 p-3 rounded-xl text-sm bg-gray-50 border border-gray-200">
              {reminderResult.message ? (
                <p className="text-gray-600">{reminderResult.message} (días hasta evento: {reminderResult.days_until_event})</p>
              ) : (
                <>
                  <p className="font-medium">Días hasta evento: {reminderResult.days_until_event}</p>
                  {reminderResult.results?.map((r, i) => (
                    <p key={i} className="text-gray-600">{r.template}: {r.sent} enviado(s), {r.failed} fallido(s)</p>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
