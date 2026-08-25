import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Chat from './pages/Chat'
import JudgeChat from './pages/JudgeChat'
import LoginAdmin from './pages/LoginAdmin'
import LoginTeam from './pages/LoginTeam'
import LoginJudge from './pages/LoginJudge'
import Registration from './pages/Registration'
import JudgeAccess from './pages/JudgeAccess'
import JudgePanel from './pages/JudgePanel'
import InvitePage from './pages/InvitePage'
import JoinTeam from './pages/JoinTeam'
import LoginGuest from './pages/LoginGuest'
import TeamDashboard from './pages/TeamDashboard'
import AdminDashboard from './pages/admin/AdminDashboard'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import Umami from './components/Umami'
import { ToastContainer } from './components/Toast'
import { useAuthStore } from './stores/authStore'

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE || '/login/admin'

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession)
  const loading = useAuthStore((s) => s.loading)

  useEffect(() => {
    checkSession()
  }, [checkSession])

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-surface relative">
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Ctext x='40' y='52' text-anchor='middle' font-size='36'%3E🥪%3C/text%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            opacity: 0.04,
          }}
        />
        <div className="relative z-10">
          <Navbar />
          <Umami />
          <ToastContainer />
          <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/join-team" element={<JoinTeam />} />
        <Route path="/invite/:code" element={<InvitePage />} />

        {/* Auth routes */}
        <Route path="/login" element={<LoginChooser />} />
        <Route path={ADMIN_ROUTE} element={<LoginAdmin />} />
        <Route path="/login/team" element={<LoginTeam />} />
        <Route path="/login/judge" element={<LoginJudge />} />
        <Route path="/login/guest" element={<LoginGuest />} />

        {/* Team dashboard (authenticated) */}
        <Route
          path="/team/dashboard"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamDashboard />
            </ProtectedRoute>
          }
        />

        {/* Judge routes */}
        <Route path="/judge" element={<JudgeAccess />} />
        <Route
          path="/judge/panel"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgePanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/judge"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgeChat />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/score-reveal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ScoreReveal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/chat"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ChatModeration />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Results />} />
      </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

function LoginChooser() {
  const user = useAuthStore((s) => s.user)

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />
    if (user.role === 'team') return <Navigate to="/team/dashboard" replace />
    if (user.role === 'judge') return <Navigate to="/judge/panel" replace />
    if (user.role === 'guest') return <Navigate to="/chat" replace />
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-6">Iniciar Sesión</h1>
        <Link to="/login/team" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow text-center">
          <span className="material-symbols-outlined text-3xl text-primary mb-2 block">group</span>
          <span className="font-headline font-bold text-secondary block">Equipo</span>
          <span className="text-xs text-gray-500">Capitán de equipo cocinero</span>
        </Link>
        <Link to="/login/judge" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow text-center">
          <span className="material-symbols-outlined text-3xl text-primary mb-2 block">gavel</span>
          <span className="font-headline font-bold text-secondary block">Juez</span>
          <span className="text-xs text-gray-500">Panel de puntuación</span>
        </Link>
        <Link to="/login/guest" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow text-center">
          <span className="material-symbols-outlined text-3xl text-primary mb-2 block">confirmation_number</span>
          <span className="font-headline font-bold text-secondary block">Invitado</span>
          <span className="text-xs text-gray-500">Usa tu código de acceso</span>
        </Link>
        <div className="text-center pt-2">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
