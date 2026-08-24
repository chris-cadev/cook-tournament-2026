import { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { useToastStore } from '../../stores/toastStore'
import Navbar from '../../components/Navbar'

export default function EmailReminders() {
  const { token } = useAuthStore()
  const { addToast } = useToastStore()
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; errors?: string[] } | null>(null)

  const sendReminders = async () => {
    if (!token) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/send-reminders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setResult(data)
      addToast(`Recordatorios enviados a ${data.sent} equipos`, 'success')
    } catch {
      addToast('Error al enviar recordatorios', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="font-headline text-3xl font-black text-secondary mb-6">Email Reminders</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Preview</h2>
          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700">
            <p className="font-bold mb-2">Asunto: Recordatorio: The Crust Competition 2026</p>
            <p>Hola, [Team Name]</p>
            <p>Este es un recordatorio del Campeonato de Sándwiches 2026.</p>
            <p>Tu sándwich: [Sandwich Name]</p>
            <p>Asegúrate de estar preparado para el día del evento. ¡Buena suerte!</p>
            <p className="mt-2 text-gray-500">— El Equipo Organizador</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-headline text-lg font-bold text-secondary mb-4">Enviar Recordatorios</h2>
          <p className="text-gray-500 text-sm mb-4">
            Enviarás un email de recordatorio a todos los capitanes de equipos confirmados.
          </p>
          <button
            onClick={sendReminders}
            disabled={sending}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {sending ? 'Enviando...' : 'Enviar a todos los equipos'}
          </button>

          {result && (
            <div className="mt-4 p-4 rounded-xl bg-tertiary/10 text-tertiary text-sm">
              <p className="font-bold">Enviados: {result.sent}</p>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-error font-bold">Errores:</p>
                  {result.errors.map((e, i) => <p key={i} className="text-xs text-error">{e}</p>)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
