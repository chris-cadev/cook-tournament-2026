import { io, Socket } from 'socket.io-client'

const URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

let currentSocket: Socket | null = null

export function connectSocket(token?: string): Socket {
  if (currentSocket) {
    currentSocket.disconnect()
  }
  currentSocket = io(URL, {
    autoConnect: false,
    withCredentials: true,
    auth: token ? { token } : undefined,
  })
  return currentSocket
}

export function getSocket(): Socket | null {
  return currentSocket
}
