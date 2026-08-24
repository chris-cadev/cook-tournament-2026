import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Registration from './pages/Registration'
import Results from './pages/Results'
import Chat from './pages/Chat'
import TeamChat from './pages/TeamChat'
import JudgeChat from './pages/JudgeChat'
import JudgeAccess from './pages/JudgeAccess'
import JudgePanel from './pages/JudgePanel'
import Dashboard from './pages/admin/Dashboard'
import Teams from './pages/admin/Teams'
import Reveal from './pages/admin/Reveal'
import EventSettings from './pages/admin/EventSettings'
import ChatModeration from './pages/admin/ChatModeration'
import EmailReminders from './pages/admin/EmailReminders'
import ToDo from './pages/admin/ToDo'
import Invite from './pages/Invite'
import TeamChecklist from './pages/TeamChecklist'
import ProtectedRoute from './components/ProtectedRoute'
import Toast from './components/Toast'
import { useAuthStore } from './stores/authStore'

export default function App() {
  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/results" element={<Results />} />
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
        <Route path="/judge" element={<JudgeAccess />} />
        <Route
          path="/judge/score"
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
              <Dashboard />
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
          path="/admin/reveal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Reveal />
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
          path="/admin/chat"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ChatModeration />
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
        <Route path="/invite" element={<Invite />} />
        <Route
          path="/team/checklist"
          element={
            <ProtectedRoute allowedRoles={['team']}>
              <TeamChecklist />
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
