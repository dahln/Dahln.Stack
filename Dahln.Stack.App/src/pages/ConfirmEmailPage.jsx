import { useEffect, useState } from 'react'
import { Alert, Col, Row } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import { api } from '../services/apiClient'

/**
 * Confirms a user email using query string values from the callback URL.
 */
export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const [confirmationFinished, setConfirmationFinished] = useState(false)

  useEffect(() => {
    async function confirmEmail() {
      const code = searchParams.get('code')
      const changedEmail = searchParams.get('changedEmail')
      const userId = searchParams.get('userId')

      if (!code || !userId) {
        return
      }

      const query = new URLSearchParams({ userId, code })
      if (changedEmail) {
        query.set('changedEmail', changedEmail)
      }

      const response = await api.get(`confirmEmail?${query.toString()}`, {
        redirectOnUnauthorized: false,
        showToast: true,
      })

      if (response) {
        setConfirmationFinished(true)
      }
    }

    confirmEmail()
  }, [searchParams])

  return (
    <Row className="mt-4">
      <Col>
        {confirmationFinished ? (
          <Alert variant="success" className="text-center">
            Your email address has been verified.
          </Alert>
        ) : null}
      </Col>
    </Row>
  )
}
