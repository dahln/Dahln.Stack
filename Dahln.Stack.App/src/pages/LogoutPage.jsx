import { useEffect } from 'react'
import { Alert } from 'react-bootstrap'
import { useAuth } from '../context/AuthContext'

/**
 * Signs the user out on mount and shows status feedback.
 */
export default function LogoutPage() {
  const auth = useAuth()

  useEffect(() => {
    auth.logout()
  }, [auth.logout])

  if (auth.isAuthenticated) {
    return <Alert variant="info">Logging you out...</Alert>
  }

  return (
    <Alert variant="success">
      You are logged out. <a href="/">Log in.</a>
    </Alert>
  )
}
