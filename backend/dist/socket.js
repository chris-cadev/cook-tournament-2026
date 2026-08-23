import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getDb, saveDb } from './db.js';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
let io;
function rowsToObject(rows) {
    if (rows.length === 0 || rows[0].values.length === 0)
        return null;
    const obj = {};
    rows[0].columns.forEach((c, i) => (obj[c] = rows[0].values[0][i]));
    return obj;
}
function validateChannelAccess(user, channel) {
    if (channel === 'global')
        return true;
    if (channel.startsWith('team:')) {
        const channelId = parseInt(channel.split(':')[1], 10);
        if (isNaN(channelId))
            return false;
        if (user.role === 'admin')
            return true;
        if (user.role === 'team' && user.team_id === channelId)
            return true;
        return false;
    }
    if (channel === 'judge') {
        return user.role === 'admin' || user.role === 'judge';
    }
    return false;
}
export function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:5173'],
            credentials: true,
        },
    });
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            socket.data.user = decoded;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.data.user;
        console.log(`Socket connected: ${user.role} (${user.anonymous_id || user.team_id || user.email})`);
        socket.on('chat:join', (data) => {
            if (!validateChannelAccess(user, data.channel)) {
                socket.emit('chat:error', { error: 'Access denied to this channel' });
                return;
            }
            socket.join(`chat:${data.channel}`);
            socket.emit('chat:joined', { channel: data.channel });
        });
        socket.on('chat:leave', (data) => {
            socket.leave(`chat:${data.channel}`);
        });
        socket.on('chat:send', (data) => {
            if (!validateChannelAccess(user, data.channel)) {
                socket.emit('chat:error', { error: 'Access denied to this channel' });
                return;
            }
            if (!data.content || data.content.trim().length === 0) {
                socket.emit('chat:error', { error: 'Message content is required' });
                return;
            }
            if (data.content.length > 2000) {
                socket.emit('chat:error', { error: 'Message too long (max 2000 characters)' });
                return;
            }
            const db = getDb();
            db.run('INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)', [
                data.channel,
                user.id || user.team_id || user.anonymous_id || null,
                user.name || user.email || user.anonymous_id || 'Unknown',
                user.role,
                data.content.trim(),
            ]);
            saveDb();
            const idRows = db.exec('SELECT last_insert_rowid() as id');
            const messageId = idRows[0].values[0][0];
            const message = rowsToObject(db.exec('SELECT * FROM chat_messages WHERE id = ?', [messageId]));
            io.to(`chat:${data.channel}`).emit('chat:message', { message });
        });
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${user.role}`);
        });
    });
    return io;
}
export function getIO() {
    if (!io)
        throw new Error('Socket.io not initialized');
    return io;
}
