import { useState, useEffect } from 'react'
import { X, Upload, FileText, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, Check, Trash2 } from 'lucide-react'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { formatDateForInput } from '../../utils/helpers'

export default function DocumentForm({ onSubmit, onCancel, loading, initialType = 'other', options }) {
    const [queue, setQueue] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isSelectionPhase, setIsSelectionPhase] = useState(true)

    const defaultDocumentTypes = [
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

    const documentTypes = options || defaultDocumentTypes

    const handleSelectFiles = async () => {
        try {
            const result = await window.electronAPI.selectFile()
            if (!result.canceled && result.filePaths.length > 0) {
                const newItems = result.filePaths.map(filePath => {
                    const fileName = filePath.split(/[\\/]/).pop()
                    const nameWithoutExt = fileName.split('.').slice(0, -1).join('.')
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        path: filePath,
                        originalName: fileName,
                        displayName: nameWithoutExt,
                        docType: initialType,
                        startDate: formatDateForInput(new Date()),
                        endDate: '',
                        isSaved: false
                    }
                })
                const isFirstSelection = queue.length === 0
                setQueue(prev => [...prev, ...newItems])
                setIsSelectionPhase(false)
                if (isFirstSelection) setCurrentIndex(0)
            }
        } catch (error) {
            console.error('File selection error:', error)
        }
    }

    const updateCurrentItem = (field, value) => {
        if (queue[currentIndex]?.isSaved) return
        setQueue(prev => prev.map((item, idx) => 
            idx === currentIndex ? { ...item, [field]: value } : item
        ))
    }

    const handleConfirmCurrent = async () => {
        const currentItem = queue[currentIndex]
        if (currentItem.isSaved) return
        
        await onSubmit([currentItem])
        
        setQueue(prev => prev.map((item, idx) => 
            idx === currentIndex ? { ...item, isSaved: true } : item
        ))

        const nextUnsavedIndex = queue.findIndex((item, idx) => idx > currentIndex && !item.isSaved)
        if (nextUnsavedIndex !== -1) {
            setCurrentIndex(nextUnsavedIndex)
        }
    }

    const removeItem = (e, index) => {
        e.stopPropagation()
        const newQueue = queue.filter((_, idx) => idx !== index)
        setQueue(newQueue)
        if (newQueue.length === 0) {
            setIsSelectionPhase(true)
        } else {
            setCurrentIndex(Math.min(currentIndex, newQueue.length - 1))
        }
    }

    if (isSelectionPhase) {
        return (
            <div
                onClick={handleSelectFiles}
                style={{
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '60px 24px',
                    textAlign: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-normal)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
                <div style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>
                    <Upload size={48} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '18px' }}>Yüklenecek Belgeleri Seçin</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tekli veya toplu seçim yapabilirsiniz.
                    </div>
                </div>
            </div>
        )
    }

    const currentItem = queue[currentIndex]
    const allSaved = queue.length > 0 && queue.every(item => item.isSaved)
    const progress = (queue.filter(i => i.isSaved).length / queue.length) * 100

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Progress and Nav */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--accent-primary)' }}>{currentIndex + 1} / {queue.length}</span>
                        <span>{currentItem?.isSaved ? 'Belge Kaydedildi' : 'Belge Bilgileri'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button 
                            onClick={handleSelectFiles}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '11px', height: '28px' }}
                        >
                            <Plus size={14} /> Daha Fazla
                        </button>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                                className="btn btn-secondary"
                                disabled={currentIndex === 0} 
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button 
                                className="btn btn-secondary"
                                disabled={currentIndex === queue.length - 1} 
                                onClick={() => setCurrentIndex(prev => prev + 1)}
                                style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ height: '3px', background: 'var(--bg-tertiary)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${progress}%`, transition: 'width 0.3s' }} />
                </div>
            </div>

            {/* Content Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ 
                    padding: '12px 16px', 
                    borderRadius: 'var(--radius-md)', 
                    background: 'var(--bg-tertiary)', 
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{ color: currentItem?.isSaved ? 'var(--success)' : 'var(--accent-primary)' }}>
                            {currentItem?.isSaved ? <CheckCircle2 size={20} /> : <FileText size={20} />}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {currentItem?.originalName}
                        </div>
                    </div>
                    {!currentItem?.isSaved && (
                        <button 
                            onClick={(e) => removeItem(e, currentIndex)}
                            className="btn btn-secondary danger"
                            style={{ padding: '6px', border: 'none', background: 'transparent' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div style={{ 
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    opacity: currentItem?.isSaved ? 0.6 : 1,
                    pointerEvents: currentItem?.isSaved ? 'none' : 'auto'
                }}>
                    <CustomInput
                        label="Dosya Adı"
                        value={currentItem?.displayName}
                        onChange={(val) => updateCurrentItem('displayName', val)}
                        required
                    />
                    
                    <CustomSelect
                        label="Kategori"
                        value={currentItem?.docType}
                        onChange={(val) => updateCurrentItem('docType', val)}
                        options={documentTypes}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Başlangıç"
                            type="date"
                            value={currentItem?.startDate}
                            onChange={(val) => updateCurrentItem('startDate', val)}
                        />
                        <CustomInput
                            label="Bitiş"
                            type="date"
                            value={currentItem?.endDate}
                            onChange={(val) => updateCurrentItem('endDate', val)}
                        />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ 
                marginTop: '10px', 
                paddingTop: '16px', 
                borderTop: '1px solid var(--border-color)', 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <button className="btn btn-secondary" onClick={onCancel}>
                    {allSaved ? 'Kapat' : 'İptal'}
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {!currentItem?.isSaved ? (
                        <button 
                            className="btn btn-primary" 
                            onClick={handleConfirmCurrent}
                            disabled={loading || !currentItem?.displayName}
                        >
                            {loading ? 'Yükleniyor...' : 'Onayla ve Kaydet'}
                        </button>
                    ) : (
                        <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Check size={16} /> Başarıyla kaydedildi
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
