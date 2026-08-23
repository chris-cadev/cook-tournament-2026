import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import ToastContainer from './components/Toast'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Registration from './pages/Registration'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import JudgePanel from './pages/JudgePanel'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import EventSettings from './pages/admin/EventSettings'
import Teams from './pages/admin/Teams'
import AdminLogin from './pages/admin/Login'
import TeamLogin from './pages/team/Login'
import JudgeLogin from './pages/judges/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/register" element={<Registration />} />

        {/* Login pages */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/team/login" element={<TeamLogin />} />
        <Route path="/jueces/login" element={<JudgeLogin />} />

        {/* Protected dashboard routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/teams"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Teams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EventSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipo"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jueces"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgePanel />
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

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="font-headline text-3xl font-black text-secondary">Panel de Admin</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="/admin/teams" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Equipos</p>
            <p className="text-sm text-gray-500 mt-1">Gestionar registros y asignar estaciones</p>
          </a>
          <a href="/admin/score-reveal" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Revelar Puntuaciones</p>
            <p className="text-sm text-gray-500 mt-1">Reveal categorías una por una</p>
          </a>
          <a href="/admin/chat" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Moderar Chat</p>
            <p className="text-sm text-gray-500 mt-1">Ver y eliminar mensajes</p>
          </a>
          <a href="/admin/settings" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Configuración</p>
            <p className="text-sm text-gray-500 mt-1">Fecha, reglas, categorías, contraseñas</p>
          </a>
          <a href="/results" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Leaderboard</p>
            <p className="text-sm text-gray-500 mt-1">Ver puntuaciones en tiempo real</p>
          </a>
        </div>
      </div>
    </div>
  )
}

function TeamDashboard() {
  const { user } = useAuthStore()
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
        <h1 className="font-headline text-3xl font-black text-secondary">Mi Equipo</h1>
        <p className="text-gray-500">Bienvenido, {user?.name || 'Equipo'}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {user?.team_id && (
            <a href={`/chat/team/${user.team_id}`} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
              <p className="font-headline text-lg font-bold text-secondary">Chat del Equipo</p>
              <p className="text-sm text-gray-500 mt-1">Coordina con tu equipo</p>
            </a>
          )}
          <a href="/results" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:border-primary/50 transition-colors">
            <p className="font-headline text-lg font-bold text-secondary">Resultados</p>
            <p className="text-sm text-gray-500 mt-1">Ver puntuaciones</p>
          </a>
        </div>
      </div>
    </div>
  )
}
