import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  placeholder?: string
  onSend: (content: string, attachment?: { url: string; type: string }) => Promise<void>
  disabled?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4'
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_AUDIO_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_AUDIO_DURATION = 120 // 2 minutes in seconds

function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio()
    const url = URL.createObjectURL(file)
    audio.src = url
    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url)
      resolve(audio.duration)
    })
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la duración del audio'))
    })
  })
}

export default function ChatInput({ placeholder = 'Escribe un mensaje...', onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [checkingDuration, setCheckingDuration] = useState(false)
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null)
  const [minioAvailable, setMinioAvailable] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/upload/health')
      .then(r => r.json())
      .then(data => setMinioAvailable(data.available))
      .catch(() => setMinioAvailable(false))
  }, [])

  const prevSending = useRef(sending)
  useEffect(() => {
    if (prevSending.current && !sending) {
      textareaRef.current?.focus()
    }
    prevSending.current = sending
  }, [sending])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isAudio = file.type.startsWith('audio/')
    if (!isImage && !isAudio) {
      alert('Solo se permiten archivos de imagen y audio')
      return
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_AUDIO_SIZE
    if (file.size > maxSize) {
      const maxMB = isImage ? '5MB' : '2MB'
      alert(`Archivo muy grande (máximo ${maxMB})`)
      return
    }

    if (isAudio) {
      setCheckingDuration(true)
      try {
        const duration = await getAudioDuration(file)
        if (duration > MAX_AUDIO_DURATION) {
          alert('El audio dura más de 2 minutos. Máximo permitido: 2 minutos.')
          setCheckingDuration(false)
          return
        }
      } catch {
        alert('No se pudo verificar la duración del audio')
        setCheckingDuration(false)
        return
      }
      setCheckingDuration(false)
    }

    setUploading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: file.name, content_type: file.type, size: file.size }),
      })

      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Subida no disponible')
        return
      }

      const { upload_url, file_url } = await res.json()

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })

      if (!uploadRes.ok) {
        alert('Error al subir archivo')
        return
      }

      setPreview({ url: file_url, type: isImage ? 'image' : 'audio', name: file.name })
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Upload error:', err)
      alert('Error al subir')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSend = async () => {
    if ((!content.trim() && !preview) || sending) return
    setSending(true)
    try {
      await onSend(content.trim() || (preview ? '' : ''), preview ? { url: preview.url, type: preview.type } : undefined)
      setContent('')
      setPreview(null)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="sticky bottom-0 bg-surface border-t border-gray-200 px-4 py-3">
      {preview && (
        <div className="mb-2 flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-200">
          {preview.type === 'image' ? (
            <img src={preview.url} alt={preview.name} className="h-16 w-16 object-cover rounded-lg" />
          ) : (
            <audio src={preview.url} controls className="h-10 flex-1" />
          )}
          <span className="text-xs text-gray-500 truncate flex-1">{preview.name}</span>
          <button
            onClick={() => setPreview(null)}
            className="text-gray-400 hover:text-red-500 p-1"
            title="Eliminar adjunto"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled || sending || uploading || checkingDuration || !minioAvailable}
          className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!minioAvailable ? 'Subida de archivos no disponible' : 'Adjuntar imagen (≤5MB) o audio (≤2MB, máx. 2 min)'}
        >
          {uploading || checkingDuration ? (
            <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-sm">attach_file</span>
          )}
        </button>
        <textarea
          ref={textareaRef}
          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[40px] max-h-[120px]"
          placeholder={placeholder}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || sending}
        />
        <button
          onClick={handleSend}
          disabled={(!content.trim() && !preview) || sending || disabled}
          className="px-4 py-2 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar
        </button>
      </div>
    </div>
  )
}
