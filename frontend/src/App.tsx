import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import JudgePanel from './pages/judges/Panel'
import LoginAdmin from './pages/LoginAdmin'
import LoginTeam from './pages/LoginTeam'
import LoginJudge from './pages/LoginJudge'
import Registration from './pages/Registration'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import Teams from './pages/admin/Teams'
import EventSettings from './pages/admin/EventSettings'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './components/AdminLayout'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/login/team" element={<LoginTeam />} />
        <Route path="/login/judge" element={<LoginJudge />} />
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
        <Route
          path="/jueces"
          element={
            <ProtectedRoute allowedRoles={['judge']}>
              <JudgePanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<ScoreReveal />} />
          <Route path="score-reveal" element={<ScoreReveal />} />
          <Route path="teams" element={<Teams />} />
          <Route path="chat" element={<ChatModeration />} />
          <Route path="settings" element={<EventSettings />} />
        </Route>
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
