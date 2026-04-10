import { useAuth } from '../context/AuthContext'
import CustomerSearchPage from './CustomerSearchPage'
import LoginPage from './LoginPage'

/**
 * Home route that shows login or customer search based on auth state.
 */
export default function HomePage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return null
  }

  return auth.isAuthenticated ? <CustomerSearchPage embedded /> : <LoginPage embedded />
}
