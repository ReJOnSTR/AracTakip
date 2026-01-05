import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import { formatDate, formatCurrency } from '../utils/helpers'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'

export default function Services() {
    const { currentCompany } = useCompany()
    const [services, setServices] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingService, setEditingService] = useState(null)
    const [formData, setFormData] = useState({
        vehicleId: '',
        type: 'Genel Bakım',
        serviceName: '',
        description: '',
        date: '',
        km: '',
        cost: '',
        notes: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null) // { type: 'single'|'bulk', item, ids, title, message }

    const serviceTypes = [
        { value: 'Genel Bakım', label: 'Genel Bakım' },
        { value: 'Arıza', label: 'Arıza/Tamir' },
        { value: 'Lastik', label: 'Lastik Değişimi/Tamiri' },
        { value: 'Kaporta', label: 'Kaporta/Boya' },
        { value: 'Elektrik', label: 'Elektrik Aksamı' },
        { value: 'Periyodik', label: 'Periyodik Bakım' },
        { value: 'Kaporta', label: 'Kaporta/Boya' },
        { value: 'Elektrik', label: 'Elektrik Aksamı' },
        { value: 'Periyodik', label: 'Periyodik Bakım' },
        { value: 'Diğer', label: 'Diğer' }
    ]

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setServices([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [servicesResult, vehiclesResult] = await Promise.all([
                window.electronAPI.getAllServices(currentCompany.id),
                window.electronAPI.getVehicles(currentCompany.id)
            ])

            if (servicesResult.success) setServices(servicesResult.data)
            if (vehiclesResult.success) setVehicles(vehiclesResult.data)
        } catch (error) {
            console.error('Failed to load data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setFormData({
            vehicleId: vehicles.length > 0 ? vehicles[0].id.toString() : '',
            type: 'Genel Bakım',
            serviceName: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            km: '',
            cost: '',
            notes: ''
        })
        setEditingService(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (service) => {
        setFormData({
            vehicleId: service.vehicle_id.toString(),
            type: service.type,
            serviceName: service.service_name || '',
            description: service.description || '',
            date: service.date,
            km: service.km || '',
            cost: service.cost || '',
            notes: service.notes || ''
        })
        setEditingService(service)
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
            serviceName: formData.serviceName,
            description: formData.description,
            date: formData.date,
            km: formData.km ? parseInt(formData.km) : null,
            cost: formData.cost ? parseFloat(formData.cost) : 0,
            notes: formData.notes
        }

        let result
        if (editingService) {
            result = await window.electronAPI.updateService({ id: editingService.id, ...data })
        } else {
            result = await window.electronAPI.createService(data)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (service) => {
        setConfirmModal({
            type: 'single',
            item: service,
            title: 'Servis Silme',
            message: 'Bu servis kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            type: 'bulk',
            ids: ids,
            title: 'Toplu Silme',
            message: `${ids.length} servis kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await window.electronAPI.deleteService(confirmModal.item.id)
        } else if (confirmModal.type === 'bulk') {
            for (const id of confirmModal.ids) {
                await window.electronAPI.deleteService(id)
            }
        }

        if (confirmModal.type === 'bulk' || confirmModal.type === 'single') loadData()
        setConfirmModal(null)
    }

    const columns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        { key: 'service_name', label: 'Servis Yeri' },
        { key: 'type', label: 'İşlem Türü' },
        { key: 'description', label: 'Yapılan İşlem' },
        {
            key: 'date',
            label: 'Tarih',
            render: (value) => formatDate(value)
        },
        { key: 'km', label: 'KM' },
        {
            key: 'cost',
            label: 'Maliyet',
            render: (value) => formatCurrency(value)
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Wrench /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Servis kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
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
                    <h1 className="page-title">Servis Takibi</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Araç bakım, tamir ve servis işlemleri.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni İşlem
                    </button>
                </div>
            </div>

            {services.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Wrench /></div>
                    <h2 className="empty-state-title">Servis Kaydı Yok</h2>
                    <p className="empty-state-desc">
                        {vehicles.length === 0 ? 'Önce araç eklemeniz gerekiyor.' : 'Henüz servis veya tamir kaydı eklenmemiş.'}
                    </p>
                    {vehicles.length > 0 && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Servis Ekle
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={services}
                    showSearch={true}
                    showDateFilter={true}
                    dateFilterKey="date"
                    filters={[
                        {
                            key: 'type',
                            label: 'İşlem Türü',
                            options: serviceTypes
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
                title={editingService ? 'Servis Kaydı Düzenle' : 'Yeni Servis Kaydı'}
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
                        <CustomSelect
                            label="İşlem Türü"
                            className="form-select-custom"
                            value={formData.type}
                            onChange={(value) => setFormData({ ...formData, type: value })}
                            options={serviceTypes}
                        />
                        <div className="form-group">
                            <CustomInput
                                label="Tarih *"
                                type="date"
                                value={formData.date}
                                onChange={(value) => setFormData({ ...formData, date: value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput
                                label="Servis Yeri / Firma"
                                placeholder="Örn: Oto Koç, Sanayi..."
                                value={formData.serviceName}
                                onChange={(value) => setFormData({ ...formData, serviceName: value })}
                            />
                        </div>
                        <div className="form-group">
                            <CustomInput
                                label="Maliyet (TL)"
                                type="number"
                                value={formData.cost}
                                onChange={(value) => setFormData({ ...formData, cost: value })}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput
                                label="Araç KM"
                                type="number"
                                value={formData.km}
                                onChange={(value) => setFormData({ ...formData, km: value })}
                            />
                        </div>
                        <div className="form-group">
                            <CustomInput
                                label="Yapılan İşlem Özeti"
                                placeholder="Örn: Fren balatası değişimi"
                                value={formData.description}
                                onChange={(value) => setFormData({ ...formData, description: value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <CustomInput
                            label="Detaylı Notlar"
                            placeholder="İşlem detayları..."
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
