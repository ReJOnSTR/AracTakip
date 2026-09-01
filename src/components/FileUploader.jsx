import { useState } from 'react'
import { Paperclip, X, FileText } from 'lucide-react'

export default function FileUploader({ onFileSelect, selectedFile, label = "Dosya Ekle" }) {
    const handleSelectFile = async (e) => {
        e.preventDefault() // Prevent button default type=submit
        try {
            const result = await window.electronAPI.selectFile()
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0]
                // Extract filename for display (simple split)
                const fileName = filePath.split(/[\\/]/).pop()

                onFileSelect({
                    path: filePath,
                    name: fileName
                })
            }
        } catch (error) {
            console.error('File selection error:', error)
        }
    }

    const handleRemoveFile = (e) => {
        e.preventDefault()
        onFileSelect(null)
    }

    return (
        <div className="file-uploader">
            {selectedFile ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '13px'
                }}>
                    <FileText size={16} className="text-accent" />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selectedFile.name}
                    </span>
                    <button
                        onClick={handleRemoveFile}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex'
                        }}
                    >
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <button
                    onClick={handleSelectFile}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'transparent',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '13px',
                        cursor: 'pointer',
                        width: '100%',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                >
                    <Paperclip size={16} />
                    {label}
                </button>
            )}
        </div>
    )
}
