import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import AdminLogin from './pages/admin/Login'
import TeamLogin from './pages/team/Login'
import JudgeLogin from './pages/judges/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />

        {/* Login pages */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/team/login" element={<TeamLogin />} />
        <Route path="/jueces/login" element={<JudgeLogin />} />

        {/* Protected dashboard routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipo"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamPlaceholder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jueces"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgePlaceholder />
            </ProtectedRoute>
          }
        />

        {/* Chat routes */}
        <Route path="/chat" element={<Chat />} />
        <Route
          path="/chat/team/:teamId"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamChatWrapper />
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

        {/* Admin sub-routes */}
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

function AdminPlaceholder() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="font-headline text-3xl font-black text-secondary">Panel de Admin</h1>
        <p className="text-gray-500 mt-2">Dashboard en construcción</p>
      </div>
    </div>
  )
}

function TeamPlaceholder() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="font-headline text-3xl font-black text-secondary">Mi Equipo</h1>
        <p className="text-gray-500 mt-2">Panel de equipo en construcción</p>
      </div>
    </div>
  )
}

function JudgePlaceholder() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="font-headline text-3xl font-black text-secondary">Panel de Jueces</h1>
        <p className="text-gray-500 mt-2">Interfaz de puntuación en construcción</p>
      </div>
    </div>
  )
}
