import { useState, useEffect } from 'react'
import { X, Upload } from 'lucide-react'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { formatDateForInput } from '../../utils/helpers'

export default function DocumentForm({ onSubmit, onCancel, loading, initialType = 'other' }) {
    const [docType, setDocType] = useState(initialType)
    const [startDate, setStartDate] = useState(formatDateForInput(new Date()))
    const [endDate, setEndDate] = useState('')
    const [file, setFile] = useState(null)
    const [fileName, setFileName] = useState('') // For manual descriptive name if needed, or just specific doc name

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0]
        if (selectedFile) {
            setFile(selectedFile)
            // If we want to suggest a file name? 
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!file) {
            alert('Lütfen bir dosya seçin.')
            return
        }

        onSubmit({
            file,
            docType,
            startDate,
            endDate
        })
    }

    // Document Types
    const documentTypes = [
        { value: 'ehliyet', label: 'Ehliyet' },
        { value: 'src', label: 'SRC Belgesi' },
        { value: 'psikoteknik', label: 'Psikoteknik' },
        { value: 'sozlesme', label: 'İş Sözleşmesi' },
        { value: 'kimlik', label: 'Kimlik Fotokopisi' },
        { value: 'sabika', label: 'Adli Sicil Kaydı' },
        { value: 'saglik', label: 'Sağlık Raporu' },
        { value: 'ikametgah', label: 'İkametgah' },
        { value: 'diploma', label: 'Diploma' },
        { value: 'certificate', label: 'Sertifika / Belge' },
        { value: 'other', label: 'Diğer' }
    ]

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* File Upload Area */}
            <div
                style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    position: 'relative',
                    cursor: 'pointer'
                }}
                onClick={() => document.getElementById('doc-file-input').click()}
            >
                <input
                    type="file"
                    id="doc-file-input"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />

                {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '10px', background: 'var(--primary-light)', borderRadius: '50%', color: 'var(--primary-color)' }}>
                            <Upload size={24} />
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            style={{
                                marginTop: '8px',
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                fontSize: '13px',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            Dosyayı Kaldır
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: '50%', color: 'var(--text-secondary)' }}>
                            <Upload size={24} />
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Dosya Seçmek İçin Tıklayın</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>PDF, JPG, PNG (Max 10MB)</span>
                    </div>
                )}
            </div>

            <CustomSelect
                label="Belge Türü"
                required
                value={docType}
                onChange={setDocType}
                options={documentTypes}
            />

            <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                    <CustomInput
                        label="Veriliş / Başlangıç Tarihi"
                        type="date"
                        value={startDate}
                        onChange={setStartDate}
                        required
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <CustomInput
                        label="Geçerlilik / Bitiş Tarihi (Varsa)"
                        type="date"
                        value={endDate}
                        onChange={setEndDate}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading || !file}>
                    {loading ? 'Yükleniyor...' : 'Kaydet'}
                </button>
            </div>
        </form>
    )
}
