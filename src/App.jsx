import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import CompanyWorkspace from './pages/CompanyWorkspace'

function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/company/home" replace />
  }
  return children
}

function RootRedirect() {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <Navigate to="/company/home" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/company/:section?"
        element={
          <ProtectedRoute>
            <CompanyWorkspace />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
