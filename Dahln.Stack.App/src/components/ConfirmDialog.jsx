import Modal from 'react-modal'

/**
 * Shared confirmation modal used for destructive and sensitive actions.
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
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onCancel}
      contentLabel={title}
      className="confirm-modal"
      overlayClassName="confirm-modal__overlay"
    >
      <div className="confirm-modal__body">
        <h2>{title}</h2>
        <p>{message}</p>
      </div>

      <div className="confirm-modal__footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onCancel}
          aria-label={cancelLabel}
        >
          {cancelLabel}
        </button>

        <button
          type="button"
          className="btn btn-danger"
          onClick={onConfirm}
          aria-label={confirmLabel}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
