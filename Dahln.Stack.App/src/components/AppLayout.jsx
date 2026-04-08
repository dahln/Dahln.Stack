import { Container } from 'react-bootstrap'
import { ToastContainer } from 'react-toastify'
import LoadingOverlay from './LoadingOverlay'
import TopNavigation from './TopNavigation'

/**
 * Shared app shell used by all routes.
 */
export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <TopNavigation />
      <LoadingOverlay />

      <Container fluid className="page-shell">
        {children}
      </Container>

      <ToastContainer position="bottom-left" autoClose={8000} newestOnTop />
    </div>
  )
}
