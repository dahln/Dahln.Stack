import { useEffect, useMemo, useState } from 'react'
import { Container, Nav, Navbar } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

/**
 * Main top navigation with auth-aware links.
 */
export default function TopNavigation() {
  const [expanded, setExpanded] = useState(false)
  const location = useLocation()
  const auth = useAuth()
  const { isDarkMode, toggleTheme } = useTheme()

  // Close navbar on any navigation change
  useEffect(() => {
    setExpanded(false)
  }, [location.pathname])

  const themeLabel = isDarkMode ? 'Dark Mode' : 'Light Mode'

  const themeIcon = useMemo(
    () =>
      isDarkMode ? (
        <i className="bi bi-moon-fill me-2" style={{ color: 'mediumpurple' }} />
      ) : (
        <i className="bi bi-sun me-2" style={{ color: 'gold' }} />
      ),
    [isDarkMode],
  )

  const themeToggle = (
    <Nav.Link
      as="button"
      className="btn btn-link nav-link text-start"
      onClick={toggleTheme}
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDarkMode}
    >
      {themeIcon}
      {themeLabel}
    </Nav.Link>
  )

  return (
    <Navbar
      bg="dark"
      data-bs-theme="dark"
      expand="lg"
      className="shadow-sm"
      sticky="top"
      expanded={expanded}
      onToggle={(exp) => setExpanded(exp)}
    >
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="ms-2">
          <i className="bi bi-stack me-2" style={{ color: 'mediumpurple' }} />
          Dahln.Stack
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navigation" />

        <Navbar.Collapse id="main-navigation">
          <Nav className="ms-auto align-items-lg-center gap-lg-1">
            {auth.isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/customers">
                  <i className="bi bi-search text-danger me-2" />
                  Search
                </Nav.Link>

                {auth.isAdmin ? (
                  <Nav.Link as={Link} to="/admin">
                    <i className="bi bi-gear text-warning me-2" />
                    Admin
                  </Nav.Link>
                ) : null}

                {themeToggle}

                <Nav.Link as={Link} to="/account">
                  <i className="bi bi-person-gear text-info me-2" />
                  {auth.user?.email}
                </Nav.Link>

                <Nav.Link as={Link} to="/logout">
                  <i className="bi bi-box-arrow-right me-1" />
                  Log out
                </Nav.Link>
              </>
            ) : (
              <>
                {themeToggle}

                <Nav.Link as={Link} to="/register">
                  <i className="bi bi-person-plus text-success me-2" />
                  Register
                </Nav.Link>

                <Nav.Link as={Link} to="/login">
                  <i className="bi bi-box-arrow-in-right text-info me-2" />
                  Sign In
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
