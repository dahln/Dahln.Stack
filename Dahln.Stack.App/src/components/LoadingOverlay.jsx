import { useEffect, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import { subscribeToNetworkActivity } from '../services/apiClient'

export default function LoadingOverlay() {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => subscribeToNetworkActivity(setIsLoading), [])

  if (!isLoading) {
    return null
  }

  return (
    <div className="loading-overlay" role="status" aria-live="polite" aria-label="Loading">
      <div className="loading-overlay__panel">
        <Spinner animation="border" variant="light" />
        <span>Loading...</span>
      </div>
    </div>
  )
}
