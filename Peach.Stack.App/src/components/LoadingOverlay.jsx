import './LoadingOverlay.css'
import { useEffect, useState } from 'react'
import { subscribeToNetworkActivity } from '../services/apiClient'

const LOADING_OVERLAY_FADE_MS = 180
const LOADING_OVERLAY_SHOW_DELAY_MS = 500

/**
 * A full-viewport semi-transparent overlay with a spinner that is shown
 * automatically whenever one or more API requests are in-flight.
 *
 * This component subscribes to the global network activity counter exposed
 * by apiClient.  It does not need to be told which requests are happening  -
 * any call through the api client will trigger it unless that call opts out
 * with `{ trackLoading: false }`.
 *
 * The overlay stays mounted briefly while fading out so appearance and
 * dismissal feel less abrupt.
 */
export default function LoadingOverlay() {
  // True while at least one tracked API request is in-flight.
  const [isNetworkBusy, setIsNetworkBusy] = useState(false)
  const [isOverlayMounted, setIsOverlayMounted] = useState(false)
  const [isOverlayVisible, setIsOverlayVisible] = useState(false)

  // Subscribe to network activity changes on mount.  subscribeToNetworkActivity
  // returns an unsubscribe function that we return from the effect so React
  // cleans it up when this component unmounts (avoids memory leaks).
  useEffect(() => {
    return subscribeToNetworkActivity(setIsNetworkBusy)
  }, []) // empty deps  -  subscribe once on mount, unsubscribe on unmount

  useEffect(() => {
    let showTimeoutId
    let hideTimeoutId
    let hideVisibilityTimeoutId

    if (isNetworkBusy) {
      if (!isOverlayMounted) {
        showTimeoutId = window.setTimeout(() => {
          setIsOverlayMounted(true)
        }, LOADING_OVERLAY_SHOW_DELAY_MS)
      }
    } else {
      hideVisibilityTimeoutId = window.setTimeout(() => {
        setIsOverlayVisible(false)
      }, 0)

      if (isOverlayMounted) {
        hideTimeoutId = window.setTimeout(() => {
          setIsOverlayMounted(false)
        }, LOADING_OVERLAY_FADE_MS)
      }
    }

    return () => {
      window.clearTimeout(showTimeoutId)
      window.clearTimeout(hideTimeoutId)
      window.clearTimeout(hideVisibilityTimeoutId)
    }
  }, [isNetworkBusy, isOverlayMounted])

  useEffect(() => {
    if (!isOverlayMounted) {
      return undefined
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      setIsOverlayVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(animationFrameId)
    }
  }, [isOverlayMounted])

  if (!isOverlayMounted) {
    return null
  }

  return (
    // role="status" + aria-live="polite" ensures screen readers announce the
    // loading state without being too disruptive.
    (() => {
      const overlayClassNames = ['loading-overlay']
      if (isOverlayVisible) {
        overlayClassNames.push('is-visible')
      }

      return (
    <div
      className={overlayClassNames.join(' ')}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      aria-hidden={!isOverlayVisible}
    >
      <div className="loading-overlay__panel">
        <div className="spinner-border text-primary" aria-hidden="true" />
        <span>Loading...</span>
      </div>
    </div>
      )
    })()
  )
}
