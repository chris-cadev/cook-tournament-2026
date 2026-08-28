import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { getMinioClient, isMinioAvailable, getBucket, getPublicUrl, ensureBucket } from '../minio.js'
import crypto from 'crypto'

const router = Router()

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
])

const MAX_SIZES: Record<string, number> = {
  'image/jpeg': 5 * 1024 * 1024,
  'image/png': 5 * 1024 * 1024,
  'image/gif': 5 * 1024 * 1024,
  'image/webp': 5 * 1024 * 1024,
  'audio/mpeg': 2 * 1024 * 1024,
  'audio/wav': 2 * 1024 * 1024,
  'audio/ogg': 2 * 1024 * 1024,
  'audio/webm': 2 * 1024 * 1024,
  'audio/mp4': 2 * 1024 * 1024,
}

router.post('/presign', authMiddleware, async (req: Request, res: Response) => {
  const { filename, content_type } = req.body

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename is required' })
  }

  if (!content_type || typeof content_type !== 'string') {
    return res.status(400).json({ error: 'content_type is required' })
  }

  if (!ALLOWED_TYPES.has(content_type)) {
    return res.status(400).json({ error: 'File type not allowed. Use image/* or audio/*.' })
  }

  const maxSize = MAX_SIZES[content_type] || 5 * 1024 * 1024
  if (typeof req.body.size === 'number' && req.body.size > maxSize) {
    return res.status(400).json({ error: `File too large. Max size: ${Math.round(maxSize / 1024 / 1024)}MB` })
  }

  if (!isMinioAvailable()) {
    return res.status(503).json({ error: 'File upload is not available (MinIO not configured)' })
  }

  try {
    const client = getMinioClient()!
    await ensureBucket()

    const ext = filename.split('.').pop() || 'bin'
    const unique = crypto.randomBytes(8).toString('hex')
    const objectName = `chat/${Date.now()}-${unique}.${ext}`
    const bucket = getBucket()

    const uploadUrl = await client.presignedPutObject(bucket, objectName, 15 * 60)
    const fileUrl = getPublicUrl(objectName)

    res.json({ upload_url: uploadUrl, file_url: fileUrl })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Presign error:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
})

router.get('/health', async (_req: Request, res: Response) => {
  res.json({ available: isMinioAvailable() })
})

export default router
