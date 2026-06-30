import React from 'react'
import Modal from './Modal'
import DocumentForm from './forms/DocumentForm'

export default function DocumentUploadModal({ isOpen, onClose, onUpload, targetType = 'vehicle', initialType = 'other' }) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Belge Yükle"
            size="lg"
        >
            <DocumentForm
                onSubmit={onUpload}
                onCancel={onClose}
                loading={false}
                targetType={targetType}
                initialType={initialType}
            />
        </Modal>
    )
}
