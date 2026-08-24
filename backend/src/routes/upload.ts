import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { Client as MinioClient } from 'minio'
import crypto from 'crypto'

const router = Router()

let minioClient: MinioClient | null = null

function getMinio(): MinioClient | null {
  if (minioClient) return minioClient
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  if (!endpoint || !accessKey || !secretKey) return null

  try {
    const url = new URL(endpoint)
    minioClient = new MinioClient({
      endPoint: url.hostname,
      port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 9000),
      useSSL: url.protocol === 'https:',
      accessKey,
      secretKey,
    })
    return minioClient
  } catch {
    return null
  }
}

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm',
]

// POST /api/upload/presign — generate presigned PUT URL
router.post('/presign', authMiddleware, (req: Request, res: Response) => {
  const { filename, content_type } = req.body

  if (!filename || !content_type) {
    return res.status(400).json({ error: 'filename and content_type are required' })
  }

  if (!ALLOWED_TYPES.includes(content_type)) {
    return res.status(400).json({ error: 'File type not allowed' })
  }

  const client = getMinio()
  if (!client) {
    return res.status(503).json({ error: 'File upload not configured (MinIO unavailable)' })
  }

  const ext = filename.split('.').pop() || 'bin'
  const uniqueName = `chat/${crypto.randomUUID()}.${ext}`
  const bucket = process.env.MINIO_BUCKET || 'chat-uploads'

  client.presignedPutObject(bucket, uniqueName, 15 * 60).then((uploadUrl: string) => {
    const baseUrl = process.env.MINIO_ENDPOINT || 'http://localhost:9000'
    const fileUrl = `${baseUrl}/${bucket}/${uniqueName}`
    res.json({ upload_url: uploadUrl, file_url: fileUrl })
  }).catch((err) => {
    console.error('MinIO presign error:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  })
})

export default router
