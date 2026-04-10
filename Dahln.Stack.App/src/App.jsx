import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import AccountPage from './pages/AccountPage'
import AdminPage from './pages/AdminPage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import ConfirmEmailResendPage from './pages/ConfirmEmailResendPage'
import CustomerPage from './pages/CustomerPage'
import CustomerSearchPage from './pages/CustomerSearchPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import LogoutPage from './pages/LogoutPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'

/**
 * Root route map for the application.
 */
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppLayout>
            <Routes>
              <Route path="/" element={<HomePage />} />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/logout" element={<LogoutPage />} />

              <Route path="/confirmingEmail" element={<ConfirmEmailPage />} />
              <Route path="/confirmEmailResend" element={<ConfirmEmailResendPage />} />
              <Route path="/password/forgot" element={<ForgotPasswordPage />} />
              <Route path="/password/reset/:code" element={<ResetPasswordPage />} />

              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <CustomerSearchPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customer"
                element={
                  <ProtectedRoute>
                    <CustomerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customer/:id"
                element={
                  <ProtectedRoute>
                    <CustomerPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/account"
                element={
                  <ProtectedRoute>
                    <AccountPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

export default App
