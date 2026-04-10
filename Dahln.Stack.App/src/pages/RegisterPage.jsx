import { useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

/**
 * Account registration form.
 */
export default function RegisterPage() {
  const auth = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorList, setErrorList] = useState([])

  async function handleSubmit(event) {
    event.preventDefault()

    const nextErrorList = []
    const normalizedEmail = email.trim()

    if (!normalizedEmail) {
      nextErrorList.push('Email is required.')
    }

    if (!password.trim()) {
      nextErrorList.push('Password is required.')
    }

    if (!confirmPassword.trim()) {
      nextErrorList.push('Please confirm your password.')
    }

    if (password !== confirmPassword) {
      nextErrorList.push("Passwords don't match.")
    }

    if (nextErrorList.length > 0) {
      setErrorList(nextErrorList)
      return
    }

    const result = await auth.register(normalizedEmail, password)
    if (!result.succeeded) {
      setErrorList(result.errorList ?? ['Registration failed.'])
      return
    }

    toast.success('Registration successful. Please sign in.')
    navigate('/')
  }

  if (auth.isAuthenticated) {
    return <Alert variant="success">You are logged in as {auth.user?.email}.</Alert>
  }

  return (
    <Row className="mt-5">
      <Col lg={4} md={6} className="mx-auto">
        <Card className="feature-card">
          <Card.Header>
            <h2 className="h3 mb-0">Register</h2>
          </Card.Header>

          <Card.Body>
            {errorList.map((error) => (
              <Alert key={error} variant="danger">
                {error}
              </Alert>
            ))}

            <Form onSubmit={handleSubmit} autoComplete="on">
              <Form.Group className="mb-3" controlId="registerEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  autoFocus
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="registerPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="registerConfirmPassword">
                <Form.Label>Retype Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </Form.Group>

              <Button type="submit">Register</Button>
            </Form>

            <div className="mt-3">
              <Link to="/">
                <strong>Have an account? Sign in here.</strong>
              </Link>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
