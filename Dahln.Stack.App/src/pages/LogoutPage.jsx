import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Signs the current user out on mount and shows appropriate status feedback.
 *
 * While `isAuthenticated` is still true the user sees a "logging you out..."
 * indicator.  Once the logout completes (and the auth state updates), the
 * success message with a login link is shown.
 */
export default function LogoutPage() {
  const auth = useAuth()

  // Trigger logout as soon as this page mounts.
  useEffect(() => {
    auth.logout()
  }, [auth])

  // Show a brief in-progress message while the auth state transitions.
  if (auth.isAuthenticated) {
    return <div className="alert alert-info" role="alert">Logging you out...</div>
  }

  return (
    <div className="alert alert-success" role="alert">
      You are logged out. <a href="/">Log in.</a>
    </div>
  )
}
