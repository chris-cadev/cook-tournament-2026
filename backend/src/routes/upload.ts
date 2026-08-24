import { Router, Request, Response } from 'express'
import { Client } from 'minio'
import crypto from 'crypto'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

function getMinioClient(): Client | null {
  const endpoint = process.env.MINIO_ENDPOINT
  const accessKey = process.env.MINIO_ACCESS_KEY
  const secretKey = process.env.MINIO_SECRET_KEY
  if (!endpoint || !accessKey || !secretKey) return null

  const [host, port] = endpoint.split(':')
  return new Client({
    endPoint: host || 'localhost',
    port: parseInt(port || '9000'),
    useSSL: false,
    accessKey,
    secretKey,
  })
}

router.post('/presign', authMiddleware, async (req: Request, res: Response) => {
  const { filename, content_type } = req.body
  if (!filename || !content_type) {
    return res.status(400).json({ error: 'filename and content_type required' })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/wav', 'audio/ogg']
  if (!allowedTypes.includes(content_type)) {
    return res.status(400).json({ error: 'Unsupported content type' })
  }

  const minio = getMinioClient()
  if (!minio) {
    return res.status(503).json({ error: 'File upload not configured' })
  }

  const bucket = 'chat-uploads'
  const exists = await minio.bucketExists(bucket)
  if (!exists) {
    await minio.makeBucket(bucket)
  }

  const ext = filename.split('.').pop() || 'bin'
  const uniqueName = `${crypto.randomUUID()}.${ext}`
  const uploadUrl = await minio.presignedPutObject(bucket, uniqueName, 15 * 60)
  const fileUrl = `${process.env.MINIO_ENDPOINT || 'http://localhost:9000'}/${bucket}/${uniqueName}`

  res.json({ upload_url: uploadUrl, file_url: fileUrl })
})

export default router
