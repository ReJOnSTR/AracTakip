import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import {
    formatDate,
    formatCurrency,
    getDaysUntilText,
    getStatusColor
} from '../utils/helpers'

import { Plus, Pencil, Trash2, ClipboardCheck, Building2, Eye } from 'lucide-react'
import DocumentPreviewModal from '../components/DocumentPreviewModal'
import DocumentUploadModal from '../components/DocumentUploadModal'

import InspectionForm from '../components/forms/InspectionForm'
export default function Inspections() {
    const { currentCompany } = useCompany()
    const [inspections, setInspections] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingInspection, setEditingInspection] = useState(null)
    // formData removed
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const [confirmModal, setConfirmModal] = useState(null) // { type: 'single'|'bulk', item, ids, title, message }

    // Archive State
    const [showArchived, setShowArchived] = useState(false)

    // Document State
    const [documents, setDocuments] = useState([])
    const [previewDoc, setPreviewDoc] = useState(null)
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [activeUploadId, setActiveUploadId] = useState(null)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setInspections([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany, showArchived]) // Reload on toggle

    const loadData = async () => {
        setLoading(true)
        try {
            const [inspResult, vehiclesResult, documentsResult] = await Promise.all([
                window.electronAPI.getAllInspections(currentCompany.id, 'traffic', showArchived ? 1 : 0),
                window.electronAPI.getVehicles(currentCompany.id),
                window.electronAPI.getAllDocuments(currentCompany.id)
            ])

            if (inspResult.success) setInspections(inspResult.data)
            if (vehiclesResult.success) setVehicles(vehiclesResult.data)
            if (documentsResult.success) setDocuments(documentsResult.data)
        } catch (error) {
            console.error('Failed to load data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setEditingInspection(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (inspection) => {
        setEditingInspection(inspection)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleFormSubmit = async (data) => {
        setError('')
        setSaving(true)

        const payload = {
            ...data,
            vehicleId: parseInt(data.vehicleId),
            cost: data.cost ? parseFloat(data.cost) : 0,
            type: 'traffic'
        }

        let result
        if (editingInspection) {
            result = await window.electronAPI.updateInspection({ id: editingInspection.id, ...payload })
        } else {
            result = await window.electronAPI.createInspection(payload)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (inspection) => {
        setConfirmModal({
            type: 'single',
            item: inspection,
            title: 'Muayene Silme',
            message: 'Bu muayene kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            type: 'bulk',
            ids: ids,
            title: 'Toplu Silme',
            message: `${ids.length} muayene kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await window.electronAPI.deleteInspection(confirmModal.item.id)
        } else if (confirmModal.type === 'bulk') {
            for (const id of confirmModal.ids) {
                await window.electronAPI.deleteInspection(id)
            }
        }

        loadData()
        setConfirmModal(null)
    }

    const handleBulkArchive = async (ids) => {
        if (!ids || ids.length === 0) return

        const newStatus = showArchived ? 0 : 1

        for (const id of ids) {
            await window.electronAPI.archiveItem('inspections', id, newStatus)
        }
        loadData()
    }

    const resultOptions = [
        { value: 'passed', label: 'Geçti', color: 'success' },
        { value: 'failed', label: 'Kaldı', color: 'danger' },
        { value: 'conditional', label: 'Şartlı Geçti', color: 'warning' }
    ]

    const activeColumns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        { key: 'model', label: 'Model' },
        {
            key: 'inspection_date',
            label: 'Muayene Tarihi',
            render: (value) => formatDate(value)
        },
        {
            key: 'next_inspection',
            label: 'Sonraki Muayene',
            render: (value) => formatDate(value)
        },
        {
            key: 'next_inspection_status',
            label: 'Kalan Süre',
            render: (_, item) => {
                if (!item.next_inspection) return '-'
                const value = item.next_inspection
                const color = getStatusColor(value ? (new Date(value) - new Date()) / (1000 * 60 * 60 * 24) : null)
                return <span className={`badge badge-${color}`}>{getDaysUntilText(value)}</span>
            }
        },
        {
            key: 'result',
            label: 'Sonuç',
            render: (value) => {
                const result = resultOptions.find(r => r.value === value) || { label: value, color: 'neutral' }
                return <span className={`badge badge-${result.color}`}>{result.label}</span>
            }
        },
        {
            key: 'cost',
            label: 'Ücret',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell(row)
        }
    ]

    const archivedColumns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        { key: 'model', label: 'Model' },
        {
            key: 'inspection_date',
            label: 'Muayene Tarihi',
            render: (value) => formatDate(value)
        },
        {
            key: 'next_inspection',
            label: 'Geçerlilik Bitiş',
            render: (value) => formatDate(value)
        },
        {
            key: 'result',
            label: 'Sonuç',
            render: (value) => {
                const result = resultOptions.find(r => r.value === value) || { label: value, color: 'neutral' }
                return <span className={`badge badge-${result.color}`}>{result.label}</span>
            }
        },
        {
            key: 'cost',
            label: 'Ücret',
            render: (value) => formatCurrency(value)
        },
        {
            key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell(row)
        }
    ]

    const columns = showArchived ? archivedColumns : activeColumns

    // Document Helpers
    const getDocument = (inspectionId) => {
        return documents.find(d => d.related_type === 'inspection' && d.related_id === inspectionId)
    }

    const renderDocumentCell = (row) => {
        const doc = getDocument(row.id)
        if (doc) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <div
                        onClick={(e) => { e.stopPropagation(); handleDocumentOpen(doc) }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 8px', borderRadius: '6px',
                            background: 'var(--accent-subtle)', color: 'var(--accent-primary)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid transparent',
                            transition: 'all 0.2s', width: 'fit-content'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        title={doc.file_name}
                    >
                        <Eye size={12} />
                        <span>Gör</span>
                    </div>
                </div>
            )
        } else {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenUpload(row.id) }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            border: '1px dashed var(--border-color)', background: 'transparent',
                            padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: '11px', width: 'fit-content', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        title="Dosya Ekle"
                    >
                        <Plus size={12} />
                        <span>Ekle</span>
                    </button>
                </div>
            )
        }
    }

    const handleDocumentOpen = async (doc) => {
        if (!doc) return

        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(doc.file_type?.toLowerCase())
        if (isImage) {
            const result = await window.electronAPI.readDocumentData(doc.file_path)
            if (result.success) {
                setPreviewDoc({ ...doc, data: result.data })
            } else {
                alert('Dosya önizlemesi yüklenemedi: ' + result.error)
            }
        } else {
            const error = await window.electronAPI.openDocument(doc.file_path)
            if (error) alert('Dosya açılamadı: ' + error)
        }
    }

    const handleOpenUpload = (id) => {
        setActiveUploadId(id)
        setUploadModalOpen(true)
    }

    const handleUploadConfirm = async (file) => {
        if (!activeUploadId) return

        const inspection = inspections.find(i => i.id === activeUploadId)
        if (!inspection) return

        const result = await window.electronAPI.addDocument({
            vehicleId: inspection.vehicle_id,
            relatedType: 'inspection',
            relatedId: activeUploadId,
            filePath: file.path
        })

        if (result.success) {
            const docsRes = await window.electronAPI.getAllDocuments(currentCompany.id)
            if (docsRes.success) setDocuments(docsRes.data)
            setUploadModalOpen(false)
            setActiveUploadId(null)
        } else {
            alert('Dosya yüklenirken hata oluştu: ' + result.error)
        }
    }

    const handleDocumentDelete = async () => {
        if (!previewDoc) return
        setConfirmModal({
            title: 'Belgeyi Sil',
            message: 'Bu belgeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            confirmText: 'Sil',
            type: 'danger',
            onConfirm: async () => {
                const result = await window.electronAPI.deleteDocument(previewDoc.id)
                if (result.success) {
                    const docsRes = await window.electronAPI.getAllDocuments(currentCompany.id)
                    if (docsRes.success) setDocuments(docsRes.data)
                    setPreviewDoc(null)
                    setConfirmModal(null)
                } else {
                    alert('Silme hatası: ' + result.error)
                }
            }
        })
    }

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Building2 /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Muayene kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
            </div>
        )
    }

    if (loading && inspections.length === 0) {
        return (
            <div className="loading-screen" style={{ height: 'auto', padding: '60px' }}>
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Muayene Takibi</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Araç muayene takibi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni Muayene
                    </button>
                </div>
            </div>

            {inspections.length === 0 && vehicles.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><ClipboardCheck /></div>
                    <h2 className="empty-state-title">Muayene Kaydı Yok</h2>
                    <p className="empty-state-desc">Önce araç eklemeniz gerekiyor.</p>
                    <div style={{ marginTop: '16px' }}>
                        <button className="btn btn-primary" onClick={() => window.location.href = '#/vehicles'}>
                            <Plus size={18} />
                            Araç Ekle
                        </button>
                    </div>
                </div>
            ) : (
                <DataTable
                    key={showArchived ? 'archived' : 'active'}
                    columns={columns}
                    data={inspections}
                    persistenceKey={`inspections_table_${showArchived ? 'archived' : 'active'}`}
                    showSearch={true}
                    showCheckboxes={true}
                    showDateFilter={true}
                    dateFilterKey="inspection_date"
                    onBulkDelete={handleBulkDeleteClick}
                    onBulkArchive={handleBulkArchive}
                    isArchiveView={showArchived}
                    onToggleArchiveView={setShowArchived}
                    initialSort={{ key: 'next_inspection', direction: 'asc' }}
                    actions={(item) => (
                        <>
                            <button title="Düzenle" onClick={() => openEditModal(item)}><Pencil size={16} /></button>
                            <button title="Sil" className="danger" onClick={() => handleDeleteClick(item)}><Trash2 size={16} /></button>
                        </>
                    )}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingInspection ? 'Muayene Düzenle' : 'Yeni Muayene'}
                footer={null}
            >
                <InspectionForm
                    initialData={editingInspection}
                    onSubmit={handleFormSubmit}
                    onCancel={closeModal}
                    vehicles={vehicles}
                    type="traffic"
                    loading={saving}
                    error={error}
                />
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmDelete}
                title={confirmModal?.title}
                message={confirmModal?.message}
            />

            <DocumentUploadModal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                onUpload={handleUploadConfirm}
            />

            <DocumentPreviewModal
                doc={previewDoc}
                onClose={() => setPreviewDoc(null)}
                onDelete={handleDocumentDelete}
            />
        </div>
    )
}
