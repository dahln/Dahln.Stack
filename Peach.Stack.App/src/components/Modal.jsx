import { useEffect } from 'react'

/**
 * Generic Bootstrap-based modal dialog component.
 *
 * Renders a modal overlay using Bootstrap's CSS classes (without requiring
 * Bootstrap's JavaScript).  The modal is fully controlled  -  the parent decides
 * when to show or hide it via the `show` prop.
 *
 * Features:
 *  - Closes when the Escape key is pressed.
 *  - Prevents body scrolling while open (adds/removes the `modal-open` class).
 *  - Clicking the semi-transparent backdrop calls onClose.
 *  - Renders nothing at all when `show` is false (no hidden DOM nodes).
 *
 * @param {Object}   props
 * @param {boolean}  props.show              - Whether the modal is visible.
 * @param {string}   [props.title]           - Text for the modal header.  Omit to hide the header.
 * @param {React.ReactNode} [props.body]     - Content rendered in the modal body.  Omit to hide the body.
 * @param {Array<{
 *   label:   string,
 *   variant: string,
 *   onClick: function
 * }>} [props.buttons]                       - Footer action buttons.  Omit to hide the footer.
 * @param {function} [props.onClose]         - Called when the backdrop or x button is clicked.
 * @param {string}   [props.size]            - Bootstrap modal size modifier: 'sm', 'lg', 'xl', etc.
 * @param {boolean}  [props.centered=true]   - When true, vertically centres the dialog.
 */
export default function Modal({ show, title, body, buttons, onClose, size, centered = true }) {
  // --- Keyboard Handler: Close on Escape ---------------------------------------
  // Only attach the keydown listener when the modal is open; remove it when
  // it closes or the component unmounts so we don't accumulate listeners.
  useEffect(() => {
    if (!show) {
      return
    }

    function handleKeyDown(keyboardEvent) {
      if (keyboardEvent.key === 'Escape') {
        onClose?.()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [show, onClose])

  // --- Body Scroll Lock ---------------------------------------------------------
  // Bootstrap's modal-open class on <body> hides the scrollbar and prevents
  // the page from scrolling behind the open modal.
  useEffect(() => {
    document.body.classList.toggle('modal-open', !!show)

    // Always remove the class on cleanup so it doesn't get stuck if the
    // component unmounts while the modal is still open.
    return () => document.body.classList.remove('modal-open')
  }, [show])

  // Render nothing when the modal is hidden so it has zero DOM footprint.
  if (!show) {
    return null
  }

  // --- Class Name Assembly ------------------------------------------------------
  // Build the modal-dialog class string from the optional size and centered props.
  const dialogClassNames = ['modal-dialog', 'modal-dialog-scrollable']
  if (centered) {
    dialogClassNames.push('modal-dialog-centered')
  }
  if (size) {
    dialogClassNames.push(`modal-${size}`)
  }
  const dialogClassName = dialogClassNames.join(' ')

  // --- Render -------------------------------------------------------------------
  return (
    <>
      {/* Outer modal wrapper  -  clicking the backdrop (outside the dialog) closes the modal. */}
      <div
        className="modal fade show d-block"
        tabIndex="-1"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        {/* Inner dialog  -  stopPropagation prevents backdrop clicks from triggering
            when the user actually clicks inside the dialog content. */}
        <div
          className={dialogClassName}
          role="document"
          onClick={(clickEvent) => clickEvent.stopPropagation()}
        >
          <div className="modal-content">
            {/* Header: only rendered when a title was provided. */}
            {title != null && (
              <div className="modal-header">
                <h5 className="modal-title">{title}</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
              </div>
            )}

            {/* Body: only rendered when body content was provided. */}
            {body != null && <div className="modal-body">{body}</div>}

            {/* Footer buttons: only rendered when at least one button was provided. */}
            {buttons?.length > 0 && (
              <div className="modal-footer">
                {buttons.map((actionButton) => (
                  <button
                    key={actionButton.label}
                    type="button"
                    className={`btn btn-${actionButton.variant ?? 'secondary'}`}
                    onClick={actionButton.onClick}
                  >
                    {actionButton.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Semi-transparent backdrop sits behind the dialog and above page content. */}
      <div className="modal-backdrop fade show" />
    </>
  )
}
