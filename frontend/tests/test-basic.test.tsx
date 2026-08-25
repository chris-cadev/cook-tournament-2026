// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useAuthStore } from '@/stores/authStore'
import ProtectedRoute from '@/components/ProtectedRoute'

beforeEach(() => {
  useAuthStore.setState({ user: null, loading: false })
})

describe('authStore', () => {
  it('starts with null user and loading false after reset', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.loading).toBe(false)
  })

  it('login sets user', () => {
    const { login } = useAuthStore.getState()
    login({ id: 1, email: 'test@test.com', role: 'admin' })

    const user = useAuthStore.getState().user
    expect(user).toBeDefined()
    expect(user!.role).toBe('admin')
    expect(user!.email).toBe('test@test.com')
  })

  it('logout clears user', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    const { login, logout } = useAuthStore.getState()
    login({ id: 1, email: 'test@test.com', role: 'admin' })
    expect(useAuthStore.getState().user).not.toBeNull()

    await logout()
    expect(useAuthStore.getState().user).toBeNull()

    vi.unstubAllGlobals()
  })

  it('checkSession sets user when authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ user: { id: 1, email: 'a@b.com', role: 'team' } }),
    }))

    await useAuthStore.getState().checkSession()

    expect(useAuthStore.getState().user).toEqual({ id: 1, email: 'a@b.com', role: 'team' })
    expect(useAuthStore.getState().loading).toBe(false)

    vi.unstubAllGlobals()
  })

  it('checkSession clears user when not authenticated', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

    await useAuthStore.getState().checkSession()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().loading).toBe(false)

    vi.unstubAllGlobals()
  })

  it('checkSession clears user on network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))

    await useAuthStore.getState().checkSession()

    expect(useAuthStore.getState().user).toBeNull()
    expect(useAuthStore.getState().loading).toBe(false)

    vi.unstubAllGlobals()
  })
})

describe('ProtectedRoute', () => {
  function renderWithRouter(ui: React.ReactNode, initialEntries = ['/']) {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        {ui}
      </MemoryRouter>
    )
  }

  it('redirects to login when no user', () => {
    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Secret</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
  })

  it('renders children when user has allowed role', () => {
    useAuthStore.setState({ user: { id: 1, role: 'admin' } })

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Admin Content')).toBeInTheDocument()
  })

  it('redirects when user role is not allowed', () => {
    useAuthStore.setState({ user: { id: 1, role: 'team' } })

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin']}>
        <div>Admin Only</div>
      </ProtectedRoute>
    )

    expect(screen.queryByText('Admin Only')).not.toBeInTheDocument()
  })

  it('renders children when no allowedRoles specified', () => {
    useAuthStore.setState({ user: { id: 1, role: 'guest' } })

    renderWithRouter(
      <ProtectedRoute>
        <div>Public Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Public Content')).toBeInTheDocument()
  })

  it('allows multiple roles', () => {
    useAuthStore.setState({ user: { id: 1, role: 'judge' } })

    renderWithRouter(
      <ProtectedRoute allowedRoles={['admin', 'judge']}>
        <div>Judge Content</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Judge Content')).toBeInTheDocument()
  })
})
