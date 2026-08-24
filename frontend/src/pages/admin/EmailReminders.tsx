import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

export default function EmailReminders() {
  const { token } = useAuthStore()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null)

  const handleSend = async () => {
    if (!token || !confirm('¿Enviar recordatorios a todos los equipos confirmados?')) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/email/send-reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      } else {
        setResult({ sent: 0, failed: 0, total: 0 })
        alert(data.error || 'Error al enviar')
      }
    } catch {
      alert('Error de red')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-2">Recordatorios por Email</h1>
        <p className="text-gray-500 mb-6">Envía recordatorios automáticos a los capitanes de equipo.</p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="font-headline text-lg font-bold text-secondary">Enviar Recordatorio</h2>
          <p className="text-sm text-gray-600">
            Se enviará un email a todos los capitanes de equipos confirmados con la fecha del evento, nombre del equipo y recordatorios de preparación.
          </p>
          <p className="text-xs text-gray-400">
            Requiere que SMTP_HOST, SMTP_USER y SMTP_PASS estén configurados en las variables de entorno.
          </p>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-primary hover:bg-primary-dark text-white font-headline font-bold px-6 py-3 rounded-2xl transition-colors disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar a todos los equipos'}
          </button>

          {result && (
            <div className={`px-4 py-3 rounded-xl text-sm ${
              result.sent > 0
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {result.sent > 0
                ? `Enviados: ${result.sent} de ${result.total} emails`
                : 'No se pudo enviar ningún email. Verifica la configuración SMTP.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
