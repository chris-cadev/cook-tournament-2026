import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
const router = Router();
router.post('/presign', authMiddleware, (req, res) => {
    const { filename, content_type } = req.body;
    if (!filename || !content_type) {
        return res.status(400).json({ error: 'filename and content_type required' });
    }
    const minioEndpoint = process.env.MINIO_ENDPOINT;
    if (!minioEndpoint) {
        return res.status(503).json({ error: 'MinIO not configured' });
    }
    const bucket = 'chat-uploads';
    const key = `${Date.now()}-${filename}`;
    const upload_url = `${minioEndpoint}/${bucket}/${key}`;
    const file_url = `${minioEndpoint}/${bucket}/${key}`;
    res.json({ upload_url, file_url });
});
export default router;
