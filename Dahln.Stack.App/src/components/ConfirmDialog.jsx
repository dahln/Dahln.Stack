import Modal from 'react-modal'

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
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
