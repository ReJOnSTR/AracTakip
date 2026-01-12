import React, { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import Modal from './Modal'

export default function DocumentUploadModal({ isOpen, onClose, onUpload }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploading, setUploading] = useState(false)

    const handleSelectFile = async () => {
        const result = await window.electronAPI.selectFile()
        if (result && !result.canceled && result.filePaths.length > 0) {
            setSelectedFile({
                path: result.filePaths[0],
                name: result.filePaths[0].split(/[\\/]/).pop()
            })
        }
    }

    const handleConfirm = async () => {
        if (!selectedFile) return
        setUploading(true)
        await onUpload(selectedFile)
        setUploading(false)
        setSelectedFile(null)
        onClose()
    }

    const handleClose = () => {
        setSelectedFile(null)
        onClose()
    }

    const footer = (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', width: '100%' }}>
            <button className="btn btn-secondary" onClick={handleClose}>
                İptal
            </button>
            <button
                className="btn btn-primary"
                disabled={!selectedFile || uploading}
                onClick={handleConfirm}
                style={{ opacity: !selectedFile || uploading ? 0.5 : 1 }}
            >
                {uploading ? 'Yükleniyor...' : (
                    <>
                        <Upload size={16} />
                        Yükle
                    </>
                )}
            </button>
        </div>
    )

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Belge Yükle"
            footer={footer}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {!selectedFile ? (
                    <div
                        onClick={handleSelectFile}
                        style={{
                            border: '2px dashed var(--border-color)',
                            borderRadius: '12px',
                            padding: '40px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            backgroundColor: 'var(--bg-secondary)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.borderColor = 'var(--accent-primary)'
                            e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.borderColor = 'var(--border-color)'
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                        }}
                    >
                        <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-primary)',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                        }}>
                            <Upload size={32} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                Dosya Seçmek İçin Tıklayın
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                veya buraya sürükleyin
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '16px',
                        backgroundColor: 'var(--bg-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px'
                    }}>
                        <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--accent-subtle)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <FileText size={24} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {selectedFile.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>
                                Yüklemeye hazır
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedFile(null)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                padding: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}

                {/* Help Text */}
                <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div style={{ minWidth: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor', marginTop: '6px' }} />
                    Desteklenen formatlar: Resimler (PNG, JPG), PDF ve diğer belgeler.
                </div>
            </div>
        </Modal>
    )
}
