import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import {
    maintenanceTypes,
    getMaintenanceTypeLabel,
    formatDate,
    formatCurrency,
    getDaysUntilText,
    getStatusColor
} from '../utils/helpers'
import { Plus, Pencil, Trash2, Wrench, Building2 } from 'lucide-react'

export default function Maintenance() {
    const { currentCompany } = useCompany()
    const [maintenances, setMaintenances] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingMaintenance, setEditingMaintenance] = useState(null)
    const [formData, setFormData] = useState({
        vehicleId: '',
        type: 'general',
        description: '',
        date: '',
        cost: '',
        nextKm: '',
        nextDate: '',
        notes: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null) // { type: 'single'|'bulk', item, ids, title, message }

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setMaintenances([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [maintResult, vehiclesResult] = await Promise.all([
                window.electronAPI.getAllMaintenances(currentCompany.id),
                window.electronAPI.getVehicles(currentCompany.id)
            ])

            if (maintResult.success) setMaintenances(maintResult.data)
            if (vehiclesResult.success) setVehicles(vehiclesResult.data)
        } catch (error) {
            console.error('Failed to load data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setFormData({
            vehicleId: vehicles.length > 0 ? vehicles[0].id.toString() : '',
            type: 'general',
            description: '',
            date: new Date().toISOString().split('T')[0],
            cost: '',
            nextKm: '',
            nextDate: '',
            notes: ''
        })
        setEditingMaintenance(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (maintenance) => {
        setFormData({
            vehicleId: maintenance.vehicle_id.toString(),
            type: maintenance.type,
            description: maintenance.description || '',
            date: maintenance.date,
            cost: maintenance.cost?.toString() || '',
            nextKm: maintenance.next_km?.toString() || '',
            nextDate: maintenance.next_date || '',
            notes: maintenance.notes || ''
        })
        setEditingMaintenance(maintenance)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.vehicleId || !formData.date) {
            setError('Araç ve tarih zorunludur')
            return
        }

        setSaving(true)

        const data = {
            vehicleId: parseInt(formData.vehicleId),
            type: formData.type,
            description: formData.description,
            date: formData.date,
            cost: formData.cost ? parseFloat(formData.cost) : 0,
            nextKm: formData.nextKm ? parseInt(formData.nextKm) : null,
            nextDate: formData.nextDate || null,
            notes: formData.notes
        }

        let result
        if (editingMaintenance) {
            result = await window.electronAPI.updateMaintenance({ id: editingMaintenance.id, ...data })
        } else {
            result = await window.electronAPI.createMaintenance(data)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (maintenance) => {
        setConfirmModal({
            type: 'single',
            item: maintenance,
            title: 'Bakım Silme',
            message: 'Bu bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            type: 'bulk',
            ids: ids,
            title: 'Toplu Silme',
            message: `${ids.length} bakım kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await window.electronAPI.deleteMaintenance(confirmModal.item.id)
        } else if (confirmModal.type === 'bulk') {
            for (const id of confirmModal.ids) {
                await window.electronAPI.deleteMaintenance(id)
            }
        }

        if (confirmModal.type === 'bulk' || confirmModal.type === 'single') loadData()
        setConfirmModal(null)
    }

    const columns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        {
            key: 'type',
            label: 'Bakım Türü',
            render: (value) => getMaintenanceTypeLabel(value)
        },
        { key: 'description', label: 'Açıklama' },
        {
            key: 'date',
            label: 'Tarih',
            render: (value) => formatDate(value)
        },
        {
            key: 'next_date',
            label: 'Sonraki Bakım',
            render: (value, row) => {
                if (!value) return '-'
                const color = getStatusColor(row.next_date ? new Date(row.next_date) - new Date() : null)
                return <span className={`badge badge-${color}`}>{getDaysUntilText(value)}</span>
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
                <p className="empty-state-desc">Bakım kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
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
                    <h1 className="page-title">Bakım Takibi</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Periyodik bakım ve onarım takibi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni Bakım
                    </button>
                </div>
            </div>

            {maintenances.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Wrench /></div>
                    <h2 className="empty-state-title">Bakım Kaydı Yok</h2>
                    <p className="empty-state-desc">
                        {vehicles.length === 0 ? 'Önce araç eklemeniz gerekiyor.' : 'Henüz bakım kaydı eklenmemiş.'}
                    </p>
                    {vehicles.length > 0 && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Bakım Ekle
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={maintenances}
                    showSearch={true}
                    showCheckboxes={true}
                    showDateFilter={true}
                    dateFilterKey="date"
                    filters={[
                        {
                            key: 'type',
                            label: 'Bakım Türü',
                            options: maintenanceTypes
                        }
                    ]}
                    onBulkDelete={handleBulkDeleteClick}
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
                title={editingMaintenance ? 'Bakım Düzenle' : 'Yeni Bakım'}
                size="lg"
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
                    <div className="form-row">
                        <CustomSelect
                            label="Araç"
                            required={true}
                            className="form-select-custom"
                            value={formData.vehicleId}
                            onChange={(value) => setFormData({ ...formData, vehicleId: value })}
                            options={vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.brand} ${v.model}` }))}
                            placeholder="Araç seçin"
                        />

                        <CustomSelect
                            label="Bakım Türü"
                            className="form-select-custom"
                            value={formData.type}
                            onChange={(value) => setFormData({ ...formData, type: value })}
                            options={maintenanceTypes}
                            placeholder="Seçiniz"
                        />
                    </div>

                    <div className="form-group">
                        <CustomInput label="Açıklama" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput label="Tarih" type="date" required={true} value={formData.date} onChange={(value) => setFormData({ ...formData, date: value })} />
                        </div>
                        <div className="form-group">
                            <CustomInput label="Maliyet (₺)" type="number" value={formData.cost} onChange={(value) => setFormData({ ...formData, cost: value })} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput label="Sonraki Bakım KM" type="number" value={formData.nextKm} onChange={(value) => setFormData({ ...formData, nextKm: value })} placeholder="0" />
                        </div>
                        <div className="form-group">
                            <CustomInput label="Sonraki Bakım Tarihi" type="date" value={formData.nextDate} onChange={(value) => setFormData({ ...formData, nextDate: value })} />
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
