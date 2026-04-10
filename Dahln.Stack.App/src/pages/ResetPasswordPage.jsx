import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Row } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { api } from '../services/apiClient'

/**
 * Completes password reset for a given recovery code.
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { code } = useParams()

  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [allowAllOperations, setAllowAllOperations] = useState(false)

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await api.get('api/v1/account/operations', {
          redirectOnUnauthorized: false,
          showToast: false,
        })

        setAllowAllOperations(Boolean(response))
      } catch {
        setAllowAllOperations(false)
      }
    }

    loadStatus()

    if (!code) {
      toast.error('Invalid recovery code.')
    }
  }, [code])

  async function handleSubmit(event) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.")
      return
    }

    const response = await api.post(
      'resetpassword',
      {
        email,
        resetCode: code,
        newPassword,
      },
      {
        redirectOnUnauthorized: false,
        showToast: true,
      },
    )

    if (response) {
      toast.success('Done. Password is reset. Please log in with your new password.')
      navigate('/')
    }
  }

  return (
    <fieldset disabled={!allowAllOperations}>
      <Row className="mt-4">
        <Col lg={4} md={6} className="mx-auto">
          <Card className="feature-card">
            <Card.Header>
              <h2 className="h4 mb-0">Reset Password</h2>
            </Card.Header>

            <Card.Body>
              <p>Re-enter your account email and the new password.</p>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="resetPasswordEmail">
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="resetPasswordNewPassword">
                  <Form.Control
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="resetPasswordConfirmPassword">
                  <Form.Control
                    type="password"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </Form.Group>

                <div className="text-end">
                  <Button type="submit">Submit</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </fieldset>
  )
}
