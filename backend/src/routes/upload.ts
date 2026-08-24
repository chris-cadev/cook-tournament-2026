import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
]

function generatePresignedUrl(filename: string, contentType: string): { upload_url: string; file_url: string } {
  const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || 'localhost:9000'
  const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || 'minioadmin'
  const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || 'minioadmin'
  const MINIO_BUCKET = 'chat-uploads'

  const ext = filename.split('.').pop() || 'bin'
  const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const expiry = 900

  const protocol = MINIO_ENDPOINT.includes('localhost') ? 'http' : 'https'
  const file_url = `${protocol}://${MINIO_ENDPOINT}/${MINIO_BUCKET}/${key}`

  const upload_url = `${file_url}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${MINIO_ACCESS_KEY}&X-Amz-Date=${new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '')}&X-Amz-Expires=${expiry}&X-Amz-SignedHeaders=host&X-Amz-Signature=dummy`

  return { upload_url, file_url }
}

router.post('/presign', authMiddleware, (req: Request, res: Response) => {
  const { filename, content_type } = req.body

  if (!filename || !content_type) {
    return res.status(400).json({ error: 'filename and content_type required' })
  }

  if (!ALLOWED_TYPES.includes(content_type)) {
    return res.status(400).json({ error: 'Content type not allowed. Allowed: images (jpeg, png, gif, webp) and audio (mpeg, wav, ogg, mp4)' })
  }

  const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT
  if (!MINIO_ENDPOINT) {
    return res.status(503).json({ error: 'File upload not configured (MINIO_ENDPOINT not set)' })
  }

  const { upload_url, file_url } = generatePresignedUrl(filename, content_type)
  res.json({ upload_url, file_url })
})

export default router
