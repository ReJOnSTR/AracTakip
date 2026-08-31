import React, { useState, useEffect } from 'react'
import { X, Search, ChevronLeft, ChevronRight, CheckCircle2, Car, Check } from 'lucide-react'
import Modal from './Modal'

export default function BatchOperationModal({
    isOpen,
    onClose,
    title,
    vehicles,
    formComponent: FormComponent,
    onSaveItem,
    initialFormType = 'traffic'
}) {
    const [step, setStep] = useState(1) // 1: Vehicle selection, 2: Form processing
    const [searchFilter, setSearchFilter] = useState('')
    const [selectedVehicleIds, setSelectedVehicleIds] = useState([])
    const [queue, setQueue] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [saving, setSaving] = useState(false)

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setSearchFilter('')
            setSelectedVehicleIds([])
            setQueue([])
            setCurrentIndex(0)
            setSaving(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    // Filter vehicles
    const filteredVehicles = vehicles.filter(v => {
        const query = searchFilter.toLowerCase()
        return (
            v.plate?.toLowerCase().includes(query) ||
            v.brand?.toLowerCase().includes(query) ||
            v.model?.toLowerCase().includes(query)
        )
    })

    const handleToggleSelectAll = () => {
        if (selectedVehicleIds.length === filteredVehicles.length) {
            setSelectedVehicleIds([])
        } else {
            setSelectedVehicleIds(filteredVehicles.map(v => v.id))
        }
    }

    const handleToggleVehicle = (id) => {
        setSelectedVehicleIds(prev => 
            prev.includes(id) ? prev.filter(vid => vid !== id) : [...prev, id]
        )
    }

    const handleStartProcessing = () => {
        if (selectedVehicleIds.length === 0) return
        const newQueue = selectedVehicleIds.map(id => {
            const vehicle = vehicles.find(v => v.id === id)
            return {
                id,
                vehicle,
                isSaved: false
            }
        })
        setQueue(newQueue)
        setCurrentIndex(0)
        setStep(2)
    }

    const handleFormSubmit = async (formData) => {
        const currentItem = queue[currentIndex]
        if (currentItem.isSaved) return

        setSaving(true)
        try {
            const success = await onSaveItem(currentItem.id, formData)
            if (success) {
                // Update queue status
                setQueue(prev => prev.map((item, idx) => 
                    idx === currentIndex ? { ...item, isSaved: true } : item
                ))
                // Advance to next unsaved item if exists
                const nextUnsavedIndex = queue.findIndex((item, idx) => idx > currentIndex && !item.isSaved)
                if (nextUnsavedIndex !== -1) {
                    setCurrentIndex(nextUnsavedIndex)
                } else {
                    const firstUnsavedIndex = queue.findIndex(item => !item.isSaved)
                    if (firstUnsavedIndex !== -1) {
                        setCurrentIndex(firstUnsavedIndex)
                    }
                }
            }
        } catch (error) {
            console.error('Batch save error:', error)
            alert('Kaydetme hatası: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    const allSaved = queue.length > 0 && queue.every(item => item.isSaved)
    const progress = queue.length > 0 ? (queue.filter(i => i.isSaved).length / queue.length) * 100 : 0
    const currentItem = queue[currentIndex]

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="lg"
        >
            {step === 1 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '420px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div className="search-box" style={{ height: '36px', flex: 1, boxSizing: 'border-box' }}>
                            <Search size={16} />
                            <input 
                                type="text"
                                placeholder="Plaka, marka veya model ara..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                style={{ height: '100%', padding: 0 }}
                            />
                            {searchFilter && (
                                <button type="button" className="search-clear" onClick={() => setSearchFilter('')} style={{ display: 'flex', alignItems: 'center' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div style={{
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        height: '280px',
                        overflowY: 'auto',
                        background: 'var(--bg-secondary)'
                    }}>
                        <div style={{
                            padding: '10px 14px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-tertiary)',
                            fontSize: '13px',
                            position: 'sticky',
                            top: 0,
                            zIndex: 2
                        }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Araç Listesi ({filteredVehicles.length})</span>
                            <button
                                type="button"
                                onClick={handleToggleSelectAll}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent-primary)',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                {selectedVehicleIds.length === filteredVehicles.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredVehicles.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                    Araç bulunamadı.
                                </div>
                            ) : (
                                filteredVehicles.map(veh => {
                                    const isChecked = selectedVehicleIds.includes(veh.id)
                                    return (
                                        <div
                                            key={veh.id}
                                            onClick={() => handleToggleVehicle(veh.id)}
                                            style={{
                                                padding: '10px 14px',
                                                borderBottom: '1px solid var(--border-color)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                                backgroundColor: isChecked ? 'var(--bg-tertiary)' : 'transparent'
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {}}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{veh.plate}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{veh.brand} {veh.model}</span>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                        <button type="button" className="btn btn-secondary" onClick={onClose}>İptal</button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={selectedVehicleIds.length === 0}
                            onClick={handleStartProcessing}
                        >
                            Devam Et ({selectedVehicleIds.length} Araç Seçildi)
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Stepper / Progress Header */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--accent-primary)' }}>{currentIndex + 1} / {queue.length}</span>
                                <span>{currentItem?.isSaved ? 'İşlem Kaydedildi' : 'Operasyon Bilgileri'}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setStep(1)}
                                    style={{ padding: '4px 10px', fontSize: '11px', height: '28px' }}
                                >
                                    Seçimi Değiştir
                                </button>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        disabled={currentIndex === 0}
                                        onClick={() => setCurrentIndex(prev => prev - 1)}
                                        style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
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

                    {/* Active Vehicle Info Card */}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ color: currentItem?.isSaved ? 'var(--success)' : 'var(--accent-primary)' }}>
                                <Car size={24} />
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {currentItem?.vehicle?.plate}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    {currentItem?.vehicle?.brand} {currentItem?.vehicle?.model}
                                </div>
                            </div>
                        </div>
                        {currentItem?.isSaved && (
                            <div style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                                <Check size={16} /> Kaydedildi
                            </div>
                        )}
                    </div>

                    {/* Render the Form */}
                    <div style={{
                        opacity: currentItem?.isSaved ? 0.6 : 1,
                        pointerEvents: currentItem?.isSaved ? 'none' : 'auto'
                    }}>
                        <FormComponent
                            key={currentItem?.id}
                            onSubmit={handleFormSubmit}
                            onCancel={onClose}
                            vehicles={[currentItem?.vehicle]}
                            type={initialFormType}
                            loading={saving}
                        />
                    </div>

                    {/* Close/Cancel Footer (Only shown when all items are saved to allow closing the modal) */}
                    {allSaved && (
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Kapat
                            </button>
                            <div style={{ color: 'var(--success)', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CheckCircle2 size={16} /> Tüm Kayıtlar Başarıyla Eklendi
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    )
}
