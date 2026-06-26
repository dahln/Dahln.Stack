import './ConfirmDialog.css'
import Modal from './Modal'

/**
 * A reusable confirmation dialog for destructive or sensitive actions
 * (e.g. "Delete document?", "Leave shared document?").
 *
 * Built on the shared Modal component so confirmation UX is consistent with
 * all other dialogs across the app.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={showDeleteConfirm}
 *     title="Delete Document"
 *     message="Are you sure you want to permanently delete this document?"
 *     confirmLabel="Delete"
 *     cancelLabel="Cancel"
 *     onConfirm={handleDeleteConfirmed}
 *     onCancel={() => setShowDeleteConfirm(false)}
 *   />
 *
 * @param {Object}   props
 * @param {boolean}  props.isOpen                    - Whether the dialog is currently visible.
 * @param {string}   [props.title='Please Confirm']  - Heading text shown at the top of the dialog.
 * @param {string}   props.message                   - Body text describing the action to confirm.
 * @param {string}   [props.confirmLabel='Confirm']  - Label for the confirm (destructive) button.
 * @param {string}   [props.cancelLabel='Cancel']    - Label for the cancel (safe) button.
 * @param {function} props.onCancel                  - Called when the user cancels or closes the dialog.
 * @param {function} props.onConfirm                 - Called when the user confirms the action.
 */
export default function ConfirmDialog({
  isOpen,
  title = 'Please Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
}) {
  const dialogBody = (
    <div className="confirm-modal__body">
      <h2>{title}</h2>
      <p>{message}</p>
    </div>
  )

  const dialogButtons = [
    {
      label: cancelLabel,
      variant: 'outline-secondary',
      onClick: onCancel,
    },
    {
      label: confirmLabel,
      variant: 'danger',
      onClick: onConfirm,
    },
  ]

  return (
    <Modal
      show={isOpen}
      onClose={onCancel}
      title={null}
      body={dialogBody}
      buttons={dialogButtons}
      centered
      size="sm"
    />
  )
}
