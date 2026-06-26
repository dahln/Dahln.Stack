import { useAuth } from '../context/AuthContext'
import CustomerSearchPage from './CustomerSearchPage'
import LoginPage from './LoginPage'

/**
 * Root home route.
 *
 * While the authentication state is resolving (e.g. a token-refresh is in
 * flight), nothing is rendered to avoid a flash of the wrong page.
 *
 * Once auth is settled:
 * - Authenticated users -> CustomerSearchPage (their customer list)
 * - Anonymous users     -> LoginPage
 */
export default function HomePage() {
  const auth = useAuth()

  // Render nothing until the initial auth check completes.
  if (auth.isLoading) {
    return null
  }

  if (auth.isAuthenticated) {
    return <CustomerSearchPage embedded />
  }

  return <LoginPage embedded />
}
