import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

const URL = import.meta.env.DEV ? 'http://localhost:3001' : ''

export function useSocket(): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    const newSocket = io(URL, {
      withCredentials: true,
    })
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
      setSocket(null)
    }
  }, [])

  return socket
}
