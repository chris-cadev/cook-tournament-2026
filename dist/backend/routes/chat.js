import { Router } from 'express';
import { validateChannelAccess, requireAdmin } from '../middleware/chat';
import { queryAll, queryOne, run, saveDb } from '../db';
const router = Router();
// GET /api/chat/team/:teamId/messages
router.get('/team/:teamId/messages', validateChannelAccess, (req, res) => {
    const { teamId } = req.params;
    const channel = `team:${teamId}`;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;
    let messages;
    if (before) {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?', [channel, before, limit]);
    }
    else {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?', [channel, limit]);
    }
    res.json({ messages: messages.reverse() });
});
// POST /api/chat/team/:teamId/messages
router.post('/team/:teamId/messages', validateChannelAccess, (req, res) => {
    const { teamId } = req.params;
    const channel = `team:${teamId}`;
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
    }
    if (content.length > 2000) {
        return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }
    const result = run('INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)', [
        channel,
        req.user.id || req.user.team_id || null,
        req.user.name || req.user.email || req.user.anonymous_id || 'Unknown',
        req.user.role,
        content.trim(),
    ]);
    saveDb();
    const message = queryOne('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message });
});
// GET /api/chat/judge/messages
router.get('/judge/messages', validateChannelAccess, (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;
    let messages;
    if (before) {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?', ['judge', before, limit]);
    }
    else {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?', ['judge', limit]);
    }
    res.json({ messages: messages.reverse() });
});
// POST /api/chat/judge/messages
router.post('/judge/messages', validateChannelAccess, (req, res) => {
    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' });
    }
    if (content.length > 2000) {
        return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }
    const result = run('INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)', [
        'judge',
        req.user.id || req.user.anonymous_id || null,
        req.user.name || req.user.anonymous_id || 'Judge',
        req.user.role,
        content.trim(),
    ]);
    saveDb();
    const message = queryOne('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message });
});
// GET /api/chat/global/messages (public, useful for admin moderation)
router.get('/global/messages', (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before;
    let messages;
    if (before) {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? AND id < ? ORDER BY created_at DESC LIMIT ?', ['global', before, limit]);
    }
    else {
        messages = queryAll('SELECT * FROM chat_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?', ['global', limit]);
    }
    res.json({ messages: messages.reverse() });
});
// GET /api/chat/teams (list all teams for admin moderation)
router.get('/teams', requireAdmin, (_req, res) => {
    const teams = queryAll('SELECT id, name FROM teams ORDER BY name');
    res.json({ teams });
});
// DELETE /api/chat/:channel/messages/:messageId (admin only)
router.delete('/:channel/messages/:messageId', requireAdmin, (req, res) => {
    const { messageId } = req.params;
    const existing = queryOne('SELECT * FROM chat_messages WHERE id = ?', [messageId]);
    if (!existing) {
        return res.status(404).json({ error: 'Message not found' });
    }
    run('DELETE FROM chat_messages WHERE id = ?', [messageId]);
    saveDb();
    res.json({ success: true });
});
export default router;
