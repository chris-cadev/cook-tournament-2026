import { Client } from 'minio'

const endpoint = process.env.MINIO_ENDPOINT
const accessKey = process.env.MINIO_ACCESS_KEY
const secretKey = process.env.MINIO_SECRET_KEY
const bucket = process.env.MINIO_BUCKET || 'chat-uploads'
const port = parseInt(process.env.MINIO_PORT || '9000', 10)
const useSSL = process.env.MINIO_USE_SSL === 'true'

let minioClient: Client | null = null

export function getMinioClient(): Client | null {
  if (!endpoint || !accessKey || !secretKey) {
    return null
  }
  if (!minioClient) {
    minioClient = new Client({
      endPoint: endpoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    })
  }
  return minioClient
}

export function isMinioAvailable(): boolean {
  return getMinioClient() !== null
}

export function getBucket(): string {
  return bucket
}

export function getPublicUrl(objectName: string): string {
  const client = getMinioClient()
  if (!client) return ''
  const protocol = useSSL ? 'https' : 'http'
  return `${protocol}://${endpoint}:${port}/${bucket}/${objectName}`
}

export async function ensureBucket(): Promise<void> {
  const client = getMinioClient()
  if (!client) return
  const exists = await client.bucketExists(bucket)
  if (!exists) {
    await client.makeBucket(bucket)
  }
}
