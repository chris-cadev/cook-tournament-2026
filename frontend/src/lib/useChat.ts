import { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from './socket'
import { useAuthStore } from '../stores/authStore'

export interface ChatMessage {
  id: number
  channel: string
  sender_id: number | null
  sender_name: string
  sender_role: string
  content: string
  attachment_url: string | null
  attachment_type: string | null
  created_at: string
}

interface UseChatOptions {
  pollingInterval?: number
}

export function useChat(channel: string, options?: UseChatOptions) {
  const socket = useSocket()
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [guestName, setGuestName] = useState<string | null>(() => {
    return localStorage.getItem('chat_name') || null
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${channel === 'global' ? 'global' : channel}/messages?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setLoading(false)
    }
  }, [channel])

  const loadOlder = useCallback(async (beforeId: number) => {
    try {
      const res = await fetch(`/api/chat/${channel === 'global' ? 'global' : channel}/messages?limit=50&before=${beforeId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.messages.length > 0) {
          setMessages((prev) => [...data.messages, ...prev])
        }
      }
    } catch (err) {
      console.error('Failed to load older messages:', err)
    }
  }, [channel])

  const sendMessage = useCallback(async (content: string, senderName: string, senderRole: string, senderId?: number | null, attachment?: { url: string; type: string }) => {
    const tempId = -Date.now()
    const optimistic: ChatMessage = {
      id: tempId,
      channel,
      sender_id: senderId ?? null,
      sender_name: senderName,
      sender_role: senderRole,
      content: content || (attachment ? '[attachment]' : ''),
      attachment_url: attachment?.url || null,
      attachment_type: attachment?.type || null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const apiUrl = channel === 'global' ? '/api/chat/global/messages' : `/api/chat/${channel}/messages`
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_name: senderName,
          content: content || (attachment ? '[attachment]' : ''),
          attachment_url: attachment?.url || null,
          attachment_type: attachment?.type || null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) {
              return prev.filter(m => m.id !== tempId)
            }
            return prev.map(m => m.id === tempId ? data.message : m)
          })
        }
        if (!user) {
          localStorage.setItem('chat_name', senderName)
        }
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }, [channel, user])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!socket) return

    const handleMessage = (data: { message: ChatMessage }) => {
      if (data?.message?.channel === channel) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    }

    const handleHistory = (data: { channel: string; messages: ChatMessage[] }) => {
      if (data?.channel === channel && data.messages?.length > 0) {
        setMessages(data.messages)
      }
    }

    const handleGuestName = (data: { name: string }) => {
      setGuestName(data.name)
      localStorage.setItem('chat_name', data.name)
    }

    socket.on('chat:message', handleMessage)
    socket.on('chat:new', handleMessage)
    socket.on('chat:history', handleHistory)
    if (!user && channel === 'global') {
      socket.on('chat:guest-name', handleGuestName)
    }

    socket.emit('chat:join', { channel })

    return () => {
      socket.emit('chat:leave', { channel })
      socket.off('chat:message', handleMessage)
      socket.off('chat:new', handleMessage)
      socket.off('chat:history', handleHistory)
      socket.off('chat:guest-name', handleGuestName)
    }
  }, [socket, channel, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    if (!options?.pollingInterval) return
    const interval = setInterval(fetchMessages, options.pollingInterval)
    return () => clearInterval(interval)
  }, [fetchMessages, options?.pollingInterval])

  return {
    messages,
    loading,
    guestName,
    messagesEndRef,
    scrollToBottom,
    sendMessage,
    loadOlder,
  }
}
