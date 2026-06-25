import { useState, useEffect } from 'react'
import { X, Upload, FileText, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Plus, Check, Trash2 } from 'lucide-react'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { useCompany } from '../../context/CompanyContext'
import { formatDateForInput } from '../../utils/helpers'

export default function DocumentForm({ onSubmit, onCancel, loading, initialType = 'other', options, targetType = 'employee' }) {
    const { currentCompany } = useCompany()
    const [queue, setQueue] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isSelectionPhase, setIsSelectionPhase] = useState(true)
    const [documentTypes, setDocumentTypes] = useState(options || [])
    const [documentFolders, setDocumentFolders] = useState([])
    const [isDragging, setIsDragging] = useState(false)

    useEffect(() => {
        if (currentCompany) {
            if (!options) {
                loadCategories()
            }
            loadFolders()
        }
    }, [currentCompany, options, targetType])

    const loadCategories = async () => {
        try {
            const res = await window.electronAPI.getDocumentCategories(currentCompany.id, targetType)
            if (res.success) {
                setDocumentTypes(res.data.map(t => ({ value: t.name, label: t.name })))
            }
        } catch (error) {
            console.error('Failed to load document categories:', error)
        }
    }

    const loadFolders = async () => {
        try {
            const res = await window.electronAPI.getDocumentFolders(currentCompany.id)
            if (res.success) {
                setDocumentFolders(res.data.map(t => ({ value: t.name, label: t.name })))
            }
        } catch (error) {
            console.error('Failed to load document folders:', error)
        }
    }

    const handleSelectFiles = async () => {
        try {
            const result = await window.electronAPI.selectFile()
            if (!result.canceled && result.filePaths.length > 0) {
                const today = new Date()
                const nextYear = new Date()
                nextYear.setFullYear(today.getFullYear() + 1)
                
                const startDateStr = formatDateForInput(today)
                const endDateStr = formatDateForInput(nextYear)

                const newItems = result.filePaths.map(filePath => {
                    const fileName = filePath.split(/[\\/]/).pop()
                    const nameWithoutExt = fileName.split('.').slice(0, -1).join('.')
                    return {
                        id: Math.random().toString(36).substr(2, 9),
                        path: filePath,
                        originalName: fileName,
                        displayName: nameWithoutExt,
                        docType: initialType,
                        folder: '',
                        startDate: startDateStr,
                        endDate: endDateStr,
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

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            const today = new Date()
            const nextYear = new Date()
            nextYear.setFullYear(today.getFullYear() + 1)
            const startDateStr = formatDateForInput(today)
            const endDateStr = formatDateForInput(nextYear)

            const newItems = files.map(file => {
                const filePath = file.path || file.name
                const fileName = file.name
                const nameWithoutExt = fileName.split('.').slice(0, -1).join('.') || fileName
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    path: filePath,
                    originalName: fileName,
                    displayName: nameWithoutExt,
                    docType: initialType,
                    folder: '',
                    startDate: startDateStr,
                    endDate: endDateStr,
                    isSaved: false
                }
            })

            const isFirstSelection = queue.length === 0
            setQueue(prev => [...prev, ...newItems])
            setIsSelectionPhase(false)
            if (isFirstSelection) setCurrentIndex(0)
        }
    }

    const updateCurrentItem = (field, value) => {
        if (queue[currentIndex]?.isSaved) return
        setQueue(prev => prev.map((item, idx) => {
            if (idx === currentIndex) {
                const updated = { ...item, [field]: value }
                // Automatically shift end date to 1 year later if start date changes
                if (field === 'startDate' && value && value.length === 10) {
                    const parts = value.split('-')
                    if (parts.length === 3) {
                        const year = parseInt(parts[0], 10)
                        const month = parts[1]
                        const day = parts[2]
                        if (!isNaN(year) && month.length === 2 && day.length === 2) {
                            updated.endDate = `${year + 1}-${month}-${day}`
                        }
                    }
                }
                return updated
            }
            return item
        }))
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                style={{
                    border: isDragging ? '2px dashed var(--accent-primary)' : '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '60px 24px',
                    textAlign: 'center',
                    backgroundColor: isDragging ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'var(--transition-normal)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                }}
                onMouseEnter={e => {
                    if (!isDragging) e.currentTarget.style.borderColor = 'var(--accent-primary)'
                }}
                onMouseLeave={e => {
                    if (!isDragging) e.currentTarget.style.borderColor = 'var(--border-color)'
                }}
            >
                <div style={{ color: 'var(--accent-primary)', opacity: 0.8 }}>
                    <Upload size={48} />
                </div>
                <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '18px' }}>
                        {isDragging ? 'Belgeleri Buraya Bırakın' : 'Yüklenecek Belgeleri Seçin veya Sürükleyin'}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tekli veya toplu seçim yapabilirsiniz. Sürükleyip bırakabilirsiniz.
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

                    <CustomSelect
                        label="Klasör"
                        value={currentItem?.folder}
                        onChange={(val) => updateCurrentItem('folder', val)}
                        options={documentFolders}
                        placeholder="Klasör seçin (İsteğe Bağlı)..."
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
