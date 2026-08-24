import { Router } from 'express';
import crypto from 'crypto';
import * as Minio from 'minio';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
const ALLOWED_TYPES = /^(image|audio)\//;
let minioClient = null;
function getMinioClient() {
    if (minioClient)
        return minioClient;
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;
    if (!endpoint || !accessKey || !secretKey)
        return null;
    try {
        const url = new URL(endpoint);
        minioClient = new Minio.Client({
            endPoint: url.hostname,
            port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 9000),
            useSSL: url.protocol === 'https:',
            accessKey,
            secretKey,
        });
        return minioClient;
    }
    catch {
        return null;
    }
}
router.post('/presign', authMiddleware, async (req, res) => {
    const { filename, content_type } = req.body;
    if (!filename || !content_type) {
        return res.status(400).json({ error: 'filename and content_type required' });
    }
    if (!ALLOWED_TYPES.test(content_type)) {
        return res.status(400).json({ error: 'Only image/* and audio/* content types allowed' });
    }
    const client = getMinioClient();
    const bucket = process.env.MINIO_BUCKET || 'uploads';
    if (!client) {
        return res.status(503).json({ error: 'File upload not configured (MinIO unavailable)' });
    }
    const ext = filename.split('.').pop() || 'bin';
    const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    try {
        const exists = await client.bucketExists(bucket);
        if (!exists) {
            await client.makeBucket(bucket);
        }
        const presignedUrl = await client.presignedPutObject(bucket, key, 15 * 60);
        const fileUrl = `${process.env.MINIO_ENDPOINT}/${bucket}/${key}`;
        res.json({ upload_url: presignedUrl, file_url: fileUrl });
    }
    catch (err) {
        console.error('Failed to generate presigned URL:', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
export default router;
