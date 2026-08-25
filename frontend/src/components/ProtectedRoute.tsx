import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || '/login/admin'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user } = useAuthStore()

  if (!user) {
    const role = allowedRoles?.[0]
    const loginPath = role === 'admin' ? ADMIN_ROUTE : role === 'team' ? '/login/team' : role === 'judge' ? '/login/judge' : role === 'guest' ? '/login/guest' : '/login'
    return <Navigate to={loginPath} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
