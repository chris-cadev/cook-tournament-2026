import { useState, useRef, useEffect } from 'react'

interface ChatInputProps {
  placeholder?: string
  onSend: (content: string, attachment?: { url: string; type: string }) => Promise<void>
  disabled?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4'

export default function ChatInput({ placeholder = 'Escribe un mensaje...', onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
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

    if (file.size > 10 * 1024 * 1024) {
      alert('Archivo muy grande (máximo 10MB)')
      return
    }

    setUploading(true)
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const res = await fetch('/api/upload/presign', {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: file.name, content_type: file.type }),
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
          disabled={disabled || sending || uploading || !minioAvailable}
          className="w-10 h-10 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!minioAvailable ? 'Subida de archivos no disponible' : 'Adjuntar imagen o audio'}
        >
          {uploading ? (
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
