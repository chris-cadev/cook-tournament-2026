import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { AuthUser } from './middleware/auth';
import { queryOne, run, saveDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    console.log(`User connected: ${user.role} (${user.anonymous_id || user.team_id || user.email})`);

    socket.on('chat:join', (data: { channel: string }) => {
      if (!validateChannelAccess(user, data.channel)) {
        socket.emit('chat:error', { error: 'Access denied to this channel' });
        return;
      }
      socket.join(data.channel);
      socket.emit('chat:joined', { channel: data.channel });
    });

    socket.on('chat:leave', (data: { channel: string }) => {
      socket.leave(data.channel);
    });

    socket.on('chat:send', (data: { channel: string; content: string }) => {
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

      const result = run(
        'INSERT INTO chat_messages (channel, sender_id, sender_name, sender_role, content) VALUES (?, ?, ?, ?, ?)',
        [
          data.channel,
          user.id || user.team_id || user.anonymous_id || null,
          user.name || user.email || user.anonymous_id || 'Unknown',
          user.role,
          data.content.trim(),
        ]
      );
      saveDb();

      const message = queryOne('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
      io.to(data.channel).emit('chat:message', { message });
    });

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${user.role}`);
    });
  });

  return io;
}

function validateChannelAccess(user: AuthUser, channel: string): boolean {
  if (channel === 'global') return true;

  if (channel.startsWith('team:')) {
    const channelId = parseInt(channel.split(':')[1], 10);
    if (isNaN(channelId)) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'team' && user.team_id === channelId) return true;
    return false;
  }

  if (channel === 'judge') {
    return user.role === 'admin' || user.role === 'judge';
  }

  return false;
}
