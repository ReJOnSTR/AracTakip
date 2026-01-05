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
import { Plus, Pencil, Trash2, ClipboardCheck, Building2 } from 'lucide-react'

export default function PeriodicInspections() {
    const { currentCompany } = useCompany()
    const [inspections, setInspections] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingInspection, setEditingInspection] = useState(null)
    const [formData, setFormData] = useState({
        vehicleId: '',
        inspectionDate: '',
        nextInspection: '',
        result: 'passed',
        cost: '',
        notes: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setInspections([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [inspResult, vehiclesResult] = await Promise.all([
                window.electronAPI.getAllInspections(currentCompany.id, 'periodic'),
                window.electronAPI.getVehicles(currentCompany.id)
            ])

            if (inspResult.success) setInspections(inspResult.data)
            if (vehiclesResult.success) setVehicles(vehiclesResult.data)
        } catch (error) {
            console.error('Failed to load data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        const today = new Date().toISOString().split('T')[0]
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        setFormData({
            vehicleId: vehicles.length > 0 ? vehicles[0].id.toString() : '',
            inspectionDate: today,
            nextInspection: nextYear,
            result: '',
            cost: '',
            notes: ''
        })
        setEditingInspection(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (inspection) => {
        setFormData({
            vehicleId: inspection.vehicle_id.toString(),
            inspectionDate: inspection.inspection_date,
            nextInspection: inspection.next_inspection || '',
            result: inspection.result || '',
            cost: inspection.cost?.toString() || '',
            notes: inspection.notes || ''
        })
        setEditingInspection(inspection)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.vehicleId || !formData.inspectionDate) {
            setError('Araç ve muayene tarihi zorunludur')
            return
        }

        setSaving(true)

        const data = {
            vehicleId: parseInt(formData.vehicleId),
            inspectionDate: formData.inspectionDate,
            nextInspection: formData.nextInspection || null,
            result: formData.result,
            cost: formData.cost ? parseFloat(formData.cost) : 0,
            notes: formData.notes,
            type: 'periodic' // EXPLICIT TYPE
        }

        let result
        if (editingInspection) {
            result = await window.electronAPI.updateInspection({ id: editingInspection.id, ...data })
        } else {
            result = await window.electronAPI.createInspection(data)
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
            title: 'Kontrol Silme',
            message: 'Bu periyodik kontrol kaydını silmek istediğinize emin misiniz?'
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        const result = await window.electronAPI.deleteInspection(confirmModal.item.id)
        if (result.success) loadData()

        setConfirmModal(null)
    }

    const resultOptions = [
        { value: 'passed', label: 'Uygundur', color: 'success' },
        { value: 'failed', label: 'Uygun Değildir', color: 'danger' },
        { value: 'conditional', label: 'Eksikler Var', color: 'warning' }
    ]

    const columns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        {
            key: 'inspection_date',
            label: 'Kontrol Tarihi',
            render: (value) => formatDate(value)
        },
        {
            key: 'next_inspection',
            label: 'Sonraki Kontrol',
            render: (value) => {
                if (!value) return '-'
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
            label: 'Maliyet',
            render: (value) => formatCurrency(value)
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Building2 /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Periyodik kontrolleri görüntülemek için lütfen bir şirket seçin.</p>
            </div>
        )
    }

    if (loading) {
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
                    <h1 className="page-title">Periyodik Kontroller</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Vinç ve iş makineleri periyodik muayene takibi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni Kontrol
                    </button>
                </div>
            </div>

            {inspections.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><ClipboardCheck /></div>
                    <h2 className="empty-state-title">Kayıt Bulunamadı</h2>
                    <p className="empty-state-desc">
                        {vehicles.length === 0 ? 'Önce araç eklemeniz gerekiyor.' : 'Henüz periyodik kontrol kaydı eklenmemiş.'}
                    </p>
                    {vehicles.length > 0 && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Kontrol Ekle
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={inspections}
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
                title={editingInspection ? 'Kontrol Düzenle' : 'Yeni Periyodik Kontrol'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <CustomSelect
                        label="Araç"
                        required={true}
                        className="form-select-custom"
                        value={formData.vehicleId}
                        onChange={(value) => setFormData({ ...formData, vehicleId: value })}
                        options={vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.brand} ${v.model}` }))}
                        placeholder="Araç seçin"
                    />

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput label="Kontrol Tarihi *" type="date" required={true} value={formData.inspectionDate} onChange={(value) => setFormData({ ...formData, inspectionDate: value })} />
                        </div>
                        <div className="form-group">
                            <CustomInput label="Sonraki Kontrol" type="date" value={formData.nextInspection} onChange={(value) => setFormData({ ...formData, nextInspection: value })} />
                        </div>
                    </div>

                    <div className="form-row">
                        <CustomSelect
                            label="Sonuç"
                            className="form-select-custom"
                            value={formData.result}
                            onChange={(value) => setFormData({ ...formData, result: value })}
                            options={resultOptions}
                            placeholder="Seçiniz"
                        />

                        <div className="form-group">
                            <CustomInput label="Maliyet (₺)" type="number" value={formData.cost} onChange={(value) => setFormData({ ...formData, cost: value })} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="form-group">
                        <CustomInput
                            label="Notlar"
                            placeholder="Ek notlar..."
                            value={formData.notes}
                            onChange={(value) => setFormData({ ...formData, notes: value })}
                            multiline={true}
                            rows={3}
                            floatingLabel={true}
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmDelete}
                title={confirmModal?.title}
                message={confirmModal?.message}
            />
        </div>
    )
}
