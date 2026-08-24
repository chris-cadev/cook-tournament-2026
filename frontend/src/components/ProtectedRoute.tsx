import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Props {
  children: React.ReactNode
  allowedRoles?: string[]
}

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { token, user } = useAuthStore()

  if (!token || !user) {
    const role = allowedRoles?.[0]
    const loginPath = role === 'admin' ? '/login/admin' : role === 'team' ? '/login/team' : role === 'judge' ? '/login/judge' : '/login/admin'
    return <Navigate to={loginPath} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
