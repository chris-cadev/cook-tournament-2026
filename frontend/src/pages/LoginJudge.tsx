import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function LoginJudge() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // JudgePanel has its own auth gate, so just redirect there
    navigate('/jueces', { replace: true })
  }, [navigate])

  return null
}
