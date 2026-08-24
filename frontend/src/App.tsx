import { BrowserRouter, Routes, Route, useParams, Link } from 'react-router-dom'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import LoginAdmin from './pages/LoginAdmin'
import LoginTeam from './pages/LoginTeam'
import LoginJudge from './pages/LoginJudge'
import Registration from './pages/Registration'
import JudgeAccess from './pages/JudgeAccess'
import JudgePanel from './pages/JudgePanel'
import InvitePage from './pages/InvitePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import ProtectedRoute from './components/ProtectedRoute'
import Umami from './components/Umami'
import { ToastContainer } from './components/Toast'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Umami />
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/invite/:code" element={<InvitePage />} />

        {/* Auth routes */}
        <Route path="/login" element={<LoginChooser />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/login/team" element={<LoginTeam />} />
        <Route path="/login/judge" element={<LoginJudge />} />

        {/* Team chat (authenticated) */}
        <Route
          path="/chat/team/:teamId"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamChatWrapper />
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
    </BrowserRouter>
  )
}

function TeamChatWrapper() {
  const { teamId } = useParams()
  const { user } = useAuthStore()
  return <TeamChat teamId={parseInt(teamId!, 10)} teamName={user?.name || `Team ${teamId}`} />
}

function LoginChooser() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="font-headline text-3xl font-black text-secondary text-center mb-6">Iniciar Sesión</h1>
        <Link to="/login/admin" className="block bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow text-center">
          <span className="material-symbols-outlined text-3xl text-primary mb-2 block">admin_panel_settings</span>
          <span className="font-headline font-bold text-secondary block">Admin</span>
          <span className="text-xs text-gray-500">Organizador del evento</span>
        </Link>
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
        <div className="text-center pt-2">
          <Link to="/" className="text-sm text-gray-500 hover:text-primary">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  )
}
