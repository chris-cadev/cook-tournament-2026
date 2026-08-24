export async function uploadFile(
  file: File,
): Promise<{ file_url: string; attachment_type: 'image' | 'audio' } | null> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  try {
    const presignRes = await fetch('/api/upload/presign', {
      method: 'POST',
      headers,
      body: JSON.stringify({ filename: file.name, content_type: file.type }),
    })

    if (!presignRes.ok) return null
    const { upload_url, file_url } = await presignRes.json()

    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!uploadRes.ok) return null

    const attachment_type = file.type.startsWith('image/') ? 'image' : 'audio'
    return { file_url, attachment_type }
  } catch {
    return null
  }
}
