import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
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
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import Teams from './pages/admin/Teams'
import EventSettings from './pages/admin/EventSettings'
import TodoList from './pages/admin/TodoList'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ui/ToastContainer'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/login" element={<LoginAdmin />} />
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
          path="/admin/todo"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TodoList />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Results />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  )
}

function TeamChatWrapper() {
  const { teamId } = useParams()
  const { user } = useAuthStore()
  return <TeamChat teamId={parseInt(teamId!, 10)} teamName={user?.name || `Team ${teamId}`} />
}
