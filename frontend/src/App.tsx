import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import JudgePanel from './pages/JudgePanel'
import Register from './pages/Register'
import LoginAdmin from './pages/LoginAdmin'
import LoginTeam from './pages/LoginTeam'
import LoginJudge from './pages/LoginJudge'
import Dashboard from './pages/admin/Dashboard'
import Teams from './pages/admin/Teams'
import ScoreReveal from './pages/admin/ScoreReveal'
import ChatModeration from './pages/admin/ChatModeration'
import EventSettings from './pages/admin/EventSettings'
import EmailReminders from './pages/admin/EmailReminders'
import ToDo from './pages/admin/ToDo'
import TeamChecklist from './pages/TeamChecklist'
import Invite from './pages/Invite'
import InviteManager from './pages/admin/InviteManager'
import ProtectedRoute from './components/ProtectedRoute'
import ToastContainer from './components/ui/Toast'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/results" element={<Results />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<LoginAdmin />} />
        <Route path="/login/team" element={<LoginTeam />} />
        <Route path="/login/judge" element={<LoginJudge />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/invite/:code" element={<Invite />} />
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
          path="/judge/panel"
          element={<JudgePanel />}
        />
        <Route
          path="/team/checklist"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamChecklist />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Teams />
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
          path="/admin/settings"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EventSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/email"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EmailReminders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/todo"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ToDo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/invites"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <InviteManager />
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
