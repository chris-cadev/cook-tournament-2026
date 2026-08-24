import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Registration from './pages/Registration'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import JudgeAccess from './pages/JudgeAccess'
import JudgePanel from './pages/JudgePanel'
import LoginAdmin from './pages/LoginAdmin'
import LoginTeam from './pages/LoginTeam'
import LoginJudge from './pages/LoginJudge'
import Dashboard from './pages/admin/Dashboard'
import Teams from './pages/admin/Teams'
import EventSettings from './pages/admin/EventSettings'
import Emails from './pages/admin/Emails'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import Todo from './pages/admin/Todo'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/results" element={<Results />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/login/admin" element={<LoginAdmin />} />
        <Route path="/login/team" element={<LoginTeam />} />
        <Route path="/login/judge" element={<LoginJudge />} />
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
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route index element={<Teams />} />
          <Route path="teams" element={<Teams />} />
          <Route path="settings" element={<EventSettings />} />
          <Route path="emails" element={<Emails />} />
          <Route path="chat" element={<ChatModeration />} />
          <Route path="score-reveal" element={<ScoreReveal />} />
          <Route path="todo" element={<Todo />} />
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
