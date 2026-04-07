import { useEffect, useState } from 'react'
import { Nav, Navbar, Container } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function TopNavigation() {
  const auth = useAuth()
  const location = useLocation()
  const { isDarkMode, toggleTheme } = useTheme()
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [location.pathname])

  return (
    <Navbar bg="dark" data-bs-theme="dark" expand="lg" expanded={expanded} className="shadow-sm">
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="brand-mark ms-2">
        <i className="bi bi-stack me-2"></i> Dahln.Stack
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navigation" onClick={() => setExpanded((value) => !value)} />
        <Navbar.Collapse id="main-navigation">
          <Nav className="ms-auto align-items-lg-center gap-lg-1">
            {auth.isAuthenticated ? (
              <>
                <Nav.Link as={Link} to="/customers">
                  <i className="bi bi-search search-icon me-2" />Search
                </Nav.Link>
                {auth.isAdmin ? (
                  <Nav.Link as={Link} to="/admin">
                    <i className="bi bi-gear admin-icon me-2" />Admin
                  </Nav.Link>
                ) : null}
                <Nav.Link as="button" className="btn btn-link nav-link text-start" onClick={toggleTheme}>
                  {isDarkMode ? (
                    <>
                      <i className="bi bi-moon-fill me-1 theme-icon-dark" />Dark Mode
                    </>
                  ) : (
                    <>
                      <i className="bi bi-sun me-1 text-warning" />Light Mode
                    </>
                  )}
                </Nav.Link>
                <Nav.Link as={Link} to="/account">
                  <i className="bi bi-person-gear user-icon me-2" />
                  {auth.user?.email}
                </Nav.Link>
                <Nav.Link as={Link} to="/logout">
                  <i className="bi bi-box-arrow-right me-1" />Log out
                </Nav.Link>
              </>
            ) : (
              <>
                <Nav.Link as="button" className="btn btn-link nav-link text-start" onClick={toggleTheme}>
                  {isDarkMode ? (
                    <>
                      <i className="bi bi-moon-fill me-1 theme-icon-dark" />Dark Mode
                    </>
                  ) : (
                    <>
                      <i className="bi bi-sun me-1 text-warning" />Light Mode
                    </>
                  )}
                </Nav.Link>
                <Nav.Link as={Link} to="/register">
                  <i className="bi bi-person-plus text-success me-2" />Register
                </Nav.Link>
                <Nav.Link as={Link} to="/login">
                  <i className="bi bi-box-arrow-in-right text-info me-2" />Sign In
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}
