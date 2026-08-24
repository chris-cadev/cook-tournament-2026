import { create } from 'zustand'

interface AuthUser {
  id?: number
  email?: string
  team_id?: number
  name?: string
  anonymous_id?: string
  role: 'admin' | 'team' | 'judge' | 'guest'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  login: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null })
  },
}))
