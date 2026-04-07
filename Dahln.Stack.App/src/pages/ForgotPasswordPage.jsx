import { useEffect, useState } from 'react'
import { Button, Card, Col, Form, Row } from 'react-bootstrap'
import { toast } from 'react-toastify'
import { api } from '../services/apiClient'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [disabled, setDisabled] = useState(false)

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await api.get('api/v1/account/operations', {
          redirectOnUnauthorized: false,
          showToast: false,
        })
        setDisabled(response === false)
      } catch {
        setDisabled(true)
      }
    }

    loadStatus()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const response = await api.post('forgotpassword', { email }, {
      redirectOnUnauthorized: false,
      showToast: true,
    })

    if (response) {
      toast.success('Done. Check your email for recovery instructions.')
      setDisabled(true)
    }
  }

  return (
    <fieldset disabled={disabled}>
      <Row className="mt-4">
        <Col lg={4} md={6} className="mx-auto">
          <Card className="feature-card">
            <Card.Header>
              <h2 className="h4 mb-0">Forgot Password</h2>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="forgotPasswordEmail">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
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
