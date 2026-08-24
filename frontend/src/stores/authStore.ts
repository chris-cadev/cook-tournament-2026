import { create } from 'zustand'

interface AuthUser {
  id?: number
  email?: string
  team_id?: number
  team_slug?: string
  name?: string
  sandwich_name?: string
  anonymous_id?: string
  role: 'admin' | 'team' | 'judge' | 'guest'
}

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (user: AuthUser) => void
  logout: () => void
  checkSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  login: (user) => {
    set({ user })
  },
  logout: async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    set({ user: null })
  },
  checkSession: async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        set({ user: data.user, loading: false })
      } else {
        set({ user: null, loading: false })
      }
    } catch {
      set({ user: null, loading: false })
    }
  },
}))
