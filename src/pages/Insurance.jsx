import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'

import {
    insuranceTypes,
    getInsuranceTypeLabel,
    formatDate,
    formatCurrency,
    getDaysUntilText,
    getStatusColor
} from '../utils/helpers'
import { Plus, Pencil, Trash2, Shield, Building2 } from 'lucide-react'

export default function Insurance() {
    const { currentCompany } = useCompany()
    const [insurances, setInsurances] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingInsurance, setEditingInsurance] = useState(null)
    const [formData, setFormData] = useState({
        vehicleId: '',
        company: '',
        policyNo: '',
        type: 'traffic',
        startDate: '',
        endDate: '',
        premium: '',
        notes: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null) // { type: 'single'|'bulk', item, ids, title, message }

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setInsurances([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [insResult, vehiclesResult] = await Promise.all([
                window.electronAPI.getAllInsurances(currentCompany.id),
                window.electronAPI.getVehicles(currentCompany.id)
            ])

            if (insResult.success) setInsurances(insResult.data)
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
            company: '',
            policyNo: '',
            type: 'traffic',
            startDate: today,
            endDate: nextYear,
            premium: '',
            notes: ''
        })
        setEditingInsurance(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (insurance) => {
        setFormData({
            vehicleId: insurance.vehicle_id.toString(),
            company: insurance.company,
            policyNo: insurance.policy_no || '',
            type: insurance.type,
            startDate: insurance.start_date,
            endDate: insurance.end_date,
            premium: insurance.premium?.toString() || '',
            notes: insurance.notes || ''
        })
        setEditingInsurance(insurance)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.vehicleId || !formData.company || !formData.startDate || !formData.endDate) {
            setError('Araç, sigorta şirketi ve tarihler zorunludur')
            return
        }

        setSaving(true)

        const data = {
            vehicleId: parseInt(formData.vehicleId),
            company: formData.company,
            policyNo: formData.policyNo,
            type: formData.type,
            startDate: formData.startDate,
            endDate: formData.endDate,
            premium: formData.premium ? parseFloat(formData.premium) : 0,
            notes: formData.notes
        }

        let result
        if (editingInsurance) {
            result = await window.electronAPI.updateInsurance({ id: editingInsurance.id, ...data })
        } else {
            result = await window.electronAPI.createInsurance(data)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (insurance) => {
        setConfirmModal({
            type: 'single',
            item: insurance,
            title: 'Sigorta Silme',
            message: 'Bu sigorta kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            type: 'bulk',
            ids: ids,
            title: 'Toplu Silme',
            message: `${ids.length} sigorta kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await window.electronAPI.deleteInsurance(confirmModal.item.id)
        } else if (confirmModal.type === 'bulk') {
            for (const id of confirmModal.ids) {
                await window.electronAPI.deleteInsurance(id)
            }
        }

        if (confirmModal.type === 'bulk' || confirmModal.type === 'single') loadData()
        setConfirmModal(null)
    }

    const columns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        { key: 'company', label: 'Sigorta Şirketi' },
        {
            key: 'type',
            label: 'Tür',
            render: (value) => getInsuranceTypeLabel(value)
        },
        {
            key: 'start_date',
            label: 'Başlangıç',
            render: (value) => formatDate(value)
        },
        {
            key: 'end_date',
            label: 'Bitiş',
            render: (value) => {
                const color = getStatusColor(value ? (new Date(value) - new Date()) / (1000 * 60 * 60 * 24) : null)
                return <span className={`badge badge-${color}`}>{getDaysUntilText(value)}</span>
            }
        },
        {
            key: 'premium',
            label: 'Prim',
            render: (value) => formatCurrency(value)
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Building2 /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Sigorta kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
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
                    <h1 className="page-title">Sigorta Yönetimi</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Sigorta poliçe takibi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni Sigorta
                    </button>
                </div>
            </div>

            {insurances.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Shield /></div>
                    <h2 className="empty-state-title">Sigorta Kaydı Yok</h2>
                    <p className="empty-state-desc">
                        {vehicles.length === 0 ? 'Önce araç eklemeniz gerekiyor.' : 'Henüz sigorta kaydı eklenmemiş.'}
                    </p>
                    {vehicles.length > 0 && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Sigorta Ekle
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={insurances}
                    showSearch={true}
                    showCheckboxes={true}
                    showDateFilter={true}
                    dateFilterKey="start_date"
                    filters={[
                        {
                            key: 'type',
                            label: 'Sigorta Türü',
                            options: insuranceTypes
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
                title={editingInsurance ? 'Sigorta Düzenle' : 'Yeni Sigorta'}
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
                            label="Sigorta Türü"
                            className="form-select-custom"
                            value={formData.type}
                            onChange={(value) => setFormData({ ...formData, type: value })}
                            options={insuranceTypes}
                            placeholder="Seçiniz"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput label="Sigorta Şirketi *" required={true} value={formData.company} onChange={(value) => setFormData({ ...formData, company: value })} format="title" />
                        </div>

                        <div className="form-group">
                            <CustomInput label="Poliçe Numarası" value={formData.policyNo} onChange={(value) => setFormData({ ...formData, policyNo: value })} format="uppercase" />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput
                                label="Başlangıç Tarihi"
                                type="date"
                                required={true}
                                value={formData.startDate}
                                onChange={(value) => setFormData({ ...formData, startDate: value })}
                            />
                        </div>
                        <div className="form-group">
                            <CustomInput
                                label="Bitiş Tarihi"
                                type="date"
                                required={true}
                                value={formData.endDate}
                                onChange={(value) => setFormData({ ...formData, endDate: value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <CustomInput label="Prim Tutarı (₺)" type="number" value={formData.premium} onChange={(value) => setFormData({ ...formData, premium: value })} placeholder="0.00" />
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
