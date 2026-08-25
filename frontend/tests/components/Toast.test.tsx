// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { render, screen, act, cleanup } from '@testing-library/react'
import { ToastContainer } from '@/components/Toast'

let addToast: (message: string, type?: 'success' | 'error' | 'info') => void
let removeToast: (id: number) => void

beforeEach(async () => {
  cleanup()
  const mod = await import('@/components/Toast')
  addToast = mod.useToastStore.getState().add
  removeToast = mod.useToastStore.getState().remove
  mod.useToastStore.setState({ toasts: [] })
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ToastContainer', () => {
  it('renders nothing when no toasts', () => {
    const { container } = render(<ToastContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toast message when added', () => {
    act(() => {
      addToast('Hello world')
    })

    render(<ToastContainer />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders multiple toasts', () => {
    act(() => {
      addToast('First toast')
      addToast('Second toast')
    })

    render(<ToastContainer />)
    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
  })

  it('removes toast when close button clicked', () => {
    act(() => {
      addToast('Dismiss me')
    })

    render(<ToastContainer />)
    const closeBtn = screen.getByText('\u00d7')
    act(() => {
      closeBtn.click()
    })

    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
  })

  it('auto-removes toast after 4 seconds', () => {
    act(() => {
      addToast('Auto remove')
    })

    render(<ToastContainer />)
    expect(screen.getByText('Auto remove')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4000)
    })

    expect(screen.queryByText('Auto remove')).not.toBeInTheDocument()
  })

  it('applies correct color class for success type', () => {
    act(() => {
      addToast('Success!', 'success')
    })

    render(<ToastContainer />)
    const toast = screen.getByText('Success!').closest('div')!
    expect(toast.className).toContain('green')
  })

  it('applies correct color class for error type', () => {
    act(() => {
      addToast('Error!', 'error')
    })

    render(<ToastContainer />)
    const toast = screen.getByText('Error!').closest('div')!
    expect(toast.className).toContain('red')
  })

  it('applies correct color class for info type', () => {
    act(() => {
      addToast('Info msg', 'info')
    })

    render(<ToastContainer />)
    const toast = screen.getByText('Info msg').closest('div')!
    expect(toast.className).toContain('blue')
  })
})
