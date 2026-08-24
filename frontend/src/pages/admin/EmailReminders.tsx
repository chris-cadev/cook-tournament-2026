import { useState, useEffect } from 'react'

export default function EmailReminders() {
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [emailAvailable, setEmailAvailable] = useState(true)

  useEffect(() => {
    fetch('/api/admin/email/health')
      .then((r) => r.json())
      .then((d) => setEmailAvailable(d.available))
      .catch(() => setEmailAvailable(false))
  }, [])

  const handleSend = async () => {
    setSending(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to send')
        return
      }
      setResult(data)
    } catch {
      setError('Network error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="font-headline text-2xl font-black text-secondary">Enviar Recordatorios</h2>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
        {!emailAvailable ? (
          <div className="bg-yellow-50 text-yellow-700 text-sm p-4 rounded-xl">
            El correo no está configurado. Configura las variables SMTP_HOST, SMTP_USER y SMTP_PASS.
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Envía un correo de recordatorio a todos los capitanes de equipos confirmados.
            </p>

            {result && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl">
                Correos enviados: {result.sent} de {result.total}
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-xl">{error}</div>
            )}

            <button onClick={handleSend} disabled={sending}
              className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50">
              {sending ? 'Enviando...' : 'Enviar a todos los equipos'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
