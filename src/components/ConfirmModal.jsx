import Modal from './Modal'

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Sil', cancelText = 'İptal', type = 'danger' }) {
    if (!isOpen) return null

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose}>{cancelText}</button>
                    <button className={`btn btn-${type === 'danger' ? 'danger' : 'primary'}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </>
            }
        >
            <div style={{ padding: '10px 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                {message}
            </div>
        </Modal>
    )
}
