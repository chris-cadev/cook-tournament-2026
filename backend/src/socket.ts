import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'

let io: Server

export function initSocket(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true,
    },
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    socket.on('chat:join', ({ channel }) => {
      socket.join(`chat:${channel}`)
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`)
    })
  })

  return io
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized')
  return io
}
