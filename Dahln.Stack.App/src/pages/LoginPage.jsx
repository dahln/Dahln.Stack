import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '../services/apiClient'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ embedded = false }) {
  const auth = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [twoFactorRecoveryCode, setTwoFactorRecoveryCode] = useState('')
  const [twoFactorRememberMe, setTwoFactorRememberMe] = useState(false)
  const [twoFactorPrompt, setTwoFactorPrompt] = useState(false)
  const [twoFactorRecoveryPrompt, setTwoFactorRecoveryPrompt] = useState(false)
  const [allowAllOperations, setAllowAllOperations] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState(true)
  const [errorList, setErrorList] = useState([])

  useEffect(() => {
    async function loadOptions() {
      try {
        const [registrationAllowed, operationsAllowed] = await Promise.all([
          api.get('api/v1/account/operations/registration', {
            redirectOnUnauthorized: false,
            showToast: false,
          }),
          api.get('api/v1/account/operations', {
            redirectOnUnauthorized: false,
            showToast: false,
          }),
        ])

        setRegistrationEnabled(Boolean(registrationAllowed))
        setAllowAllOperations(Boolean(operationsAllowed))
      } catch {
        setRegistrationEnabled(true)
        setAllowAllOperations(false)
      }
    }

    loadOptions()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const messages = []

    if (!email.trim()) {
      messages.push('Email is required.')
    }

    if (!password.trim()) {
      messages.push('Password is required.')
    }

    if (messages.length > 0) {
      setErrorList(messages)
      return
    }

    const result = await auth.login(
      email.trim(),
      password,
      twoFactorCode || null,
      twoFactorRecoveryCode || null,
    )

    if (result.prompt2FA && !twoFactorRecoveryPrompt) {
      setTwoFactorCode('')
      setTwoFactorRecoveryCode('')
      setTwoFactorPrompt(true)
      toast.info('Enter your security code.')
      return
    }

    if (result.prompt2FA && twoFactorRecoveryPrompt) {
      setTwoFactorCode('')
      setTwoFactorRecoveryCode('')
      toast.info('Enter your security recovery code.')
      return
    }

    if (!result.succeeded) {
      setErrorList(result.errorList ?? ['Invalid email and/or password.'])
      return
    }

    if (!twoFactorRememberMe && twoFactorPrompt) {
      await api.post('manage/2fa', { forgetMachine: true }, {
        redirectOnUnauthorized: false,
        showToast: false,
      })
    }

    setErrorList([])
    navigate('/')
  }

  if (auth.isAuthenticated) {
    return <Alert variant="success">You are logged in as {auth.user?.email}.</Alert>
  }

  return (
    <Row className={embedded ? 'mt-4' : 'mt-5'}>
      <Col lg={4} md={6} className="mx-auto">
        <Card className="feature-card">
          <Card.Header>
            <h2 className="h3 mb-0">Login</h2>
          </Card.Header>
          <Card.Body>
            {errorList.map((error) => (
              <Alert key={error} variant="danger">
                {error}
              </Alert>
            ))}
            <Form onSubmit={handleSubmit} autoComplete="off">
              <Form.Group className="mb-3" controlId="loginEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="loginPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Form.Group>
              {twoFactorPrompt ? (
                <>
                  <Form.Group className="mb-3" controlId="loginTwoFactorCode">
                    <Form.Label>Security Code</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="6-digit code"
                      value={twoFactorCode}
                      onChange={(event) => setTwoFactorCode(event.target.value)}
                    />
                  </Form.Group>
                  <Form.Check
                    id="rememberDevice"
                    className="mb-3"
                    label="Remember this device for 14 days"
                    checked={twoFactorRememberMe}
                    onChange={(event) => setTwoFactorRememberMe(event.target.checked)}
                  />
                </>
              ) : null}
              {twoFactorRecoveryPrompt ? (
                <Form.Group className="mb-3" controlId="loginTwoFactorRecoveryCode">
                  <Form.Label>Recovery Code</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter your 2FA recovery code"
                    value={twoFactorRecoveryCode}
                    onChange={(event) => setTwoFactorRecoveryCode(event.target.value)}
                  />
                </Form.Group>
              ) : null}
              <Button type="submit">Login</Button>
            </Form>
            {allowAllOperations ? (
              <div className="mt-3 d-flex flex-column gap-2">
                <Link to="/password/forgot">Forgot Password</Link>
                <Link to="/confirmEmailResend">Resend Email Confirmation</Link>
              </div>
            ) : null}
            {twoFactorPrompt ? (
              <button
                type="button"
                className="btn btn-link px-0 mt-3"
                onClick={() => {
                  setTwoFactorPrompt(false)
                  setTwoFactorRecoveryPrompt(true)
                }}
              >
                Security Code Recovery
              </button>
            ) : null}
            {registrationEnabled ? (
              <div className="mt-3">
                <Link to="/register">
                  <strong>Need an account? Register here.</strong>
                </Link>
              </div>
            ) : null}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}
