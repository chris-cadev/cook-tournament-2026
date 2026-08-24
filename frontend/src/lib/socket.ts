import { io, Socket } from 'socket.io-client'

const URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

export const socket: Socket = io(URL, {
  autoConnect: false,
  withCredentials: true,
  auth: () => ({
    token: localStorage.getItem('token'),
  }),
})
