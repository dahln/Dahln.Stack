import { useAuth } from '../context/AuthContext'
import CustomerSearchPage from './CustomerSearchPage'
import LoginPage from './LoginPage'

export default function HomePage() {
  const auth = useAuth()

  if (auth.isLoading) {
    return null
  }

  return auth.isAuthenticated ? <CustomerSearchPage embedded /> : <LoginPage embedded />
}
