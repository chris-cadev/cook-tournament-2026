import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Results from './pages/Results'
import ScoreReveal from './pages/admin/ScoreReveal'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/results" element={<Results />} />
        <Route
          path="/admin/score-reveal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ScoreReveal />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}
