// Public assets are served from the app root in Vite, so reference the logo by URL.
const firmDahlnStackLogo = '/firm-dahln-stack-logo.svg'

/**
 * Renders the Dahln.Stack brand logo as a small inline SVG image.
 *
 * The image is intentionally hidden from screen readers (aria-hidden) because
 * it is purely decorative  -  any surrounding text provides the accessible label.
 *
 * @param {Object} props
 * @param {string} [props.className=''] - Additional CSS class names to apply to the <img>.
 * @param {Object} [props.*] - Any other valid <img> attributes (e.g. style, onClick).
 */
export default function DahlnStackLogo({ className = '', ...restProps }) {
  return (
    <img
      src={firmDahlnStackLogo}
      alt="" // Empty alt  -  decorative image; aria-hidden handles a11y.
      aria-hidden="true" // Remove from the accessibility tree entirely.
      className={`fs-1 ${className}`.trim()}
      style={{ width: '1.5rem', height: '1.5rem', objectFit: 'contain' }}
      {...restProps}
    />
  )
}
