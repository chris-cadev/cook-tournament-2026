import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getMinioClient, isMinioAvailable, getBucket, getPublicUrl, ensureBucket } from '../minio.js';
import crypto from 'crypto';
const router = Router();
const ALLOWED_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4',
]);
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
}
router.post('/presign', authMiddleware, async (req, res) => {
    const { filename, content_type } = req.body;
    if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ error: 'filename is required' });
    }
    if (!content_type || typeof content_type !== 'string') {
        return res.status(400).json({ error: 'content_type is required' });
    }
    if (!ALLOWED_TYPES.has(content_type)) {
        return res.status(400).json({ error: 'File type not allowed. Use image/* or audio/*.' });
    }
    if (!isMinioAvailable()) {
        return res.status(503).json({ error: 'File upload is not available (MinIO not configured)' });
    }
    try {
        const client = getMinioClient();
        await ensureBucket();
        const ext = filename.split('.').pop() || 'bin';
        const unique = crypto.randomBytes(8).toString('hex');
        const objectName = `chat/${Date.now()}-${unique}.${ext}`;
        const bucket = getBucket();
        const uploadUrl = await client.presignedPutObject(bucket, objectName, 15 * 60);
        const fileUrl = getPublicUrl(objectName);
        res.json({ upload_url: uploadUrl, file_url: fileUrl });
    }
    catch (err) {
        console.error('Presign error:', err);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
router.get('/health', async (_req, res) => {
    res.json({ available: isMinioAvailable() });
});
export default router;
