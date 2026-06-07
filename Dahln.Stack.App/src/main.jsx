import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Modal from 'react-modal'

// --- Global Styles ------------------------------------------------------------
// Bootstrap CSS must come before custom styles so that our overrides take effect.
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap-icons/font/bootstrap-icons.css'

// Bootstrap's JavaScript bundle includes Popper.js for dropdowns and tooltips.
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

// Toast notification styles (react-toastify).
import 'react-toastify/dist/ReactToastify.css'

// Application-wide base styles (minimal overrides applied after Bootstrap).
import './index.css'

import App from './App.jsx'

// --- Accessibility Setup ------------------------------------------------------
// Tell react-modal which element is the application root so it can move focus
// correctly when a modal opens (ARIA best practice).  Must run before any modal
// is mounted, so we call it at module load time here in the entry point.
Modal.setAppElement('#root')

// --- React Root Initialisation ------------------------------------------------
// Grab the single <div id="root"> from index.html and mount the React tree.
const appRootElement = document.getElementById('root')

createRoot(appRootElement).render(
  // StrictMode enables extra development-time warnings (double-invokes effects,
  // etc.) and has no effect in production builds.
  <StrictMode>
    <App />
  </StrictMode>,
)
