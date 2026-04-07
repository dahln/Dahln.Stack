import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const auth = useAuth()

  if (auth.isLoading) {
    return null
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requireAdmin && !auth.isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}
