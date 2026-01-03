import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'

import { formatDate } from '../utils/helpers'
import { Plus, Pencil, Trash2, UserCheck, Building2 } from 'lucide-react'

export default function Assignments() {
    const { currentCompany } = useCompany()
    const [assignments, setAssignments] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingAssignment, setEditingAssignment] = useState(null)
    const [formData, setFormData] = useState({
        vehicleId: '',
        itemName: '',
        quantity: '1',
        assignedTo: '',
        department: '',
        startDate: '',
        endDate: '',
        notes: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setAssignments([])
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [assignResult, vehiclesResult] = await Promise.all([
                window.electronAPI.getAllAssignments(currentCompany.id),
                window.electronAPI.getVehicles(currentCompany.id)
            ])

            if (assignResult.success) setAssignments(assignResult.data)
            if (vehiclesResult.success) setVehicles(vehiclesResult.data)
        } catch (error) {
            console.error('Failed to load data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setFormData({
            vehicleId: vehicles.length > 0 ? vehicles[0].id.toString() : '',
            itemName: '',
            quantity: '1',
            assignedTo: '',
            department: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            notes: ''
        })
        setEditingAssignment(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (assignment) => {
        setFormData({
            vehicleId: assignment.vehicle_id.toString(),
            itemName: assignment.item_name || '',
            quantity: assignment.quantity?.toString() || '1',
            assignedTo: assignment.assigned_to || '',
            department: assignment.department || '',
            startDate: assignment.start_date,
            endDate: assignment.end_date || '',
            notes: assignment.notes || ''
        })
        setEditingAssignment(assignment)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.vehicleId || !formData.itemName || !formData.startDate) {
            setError('Araç, malzeme adı ve başlangıç tarihi zorunludur')
            return
        }

        setSaving(true)

        const data = {
            vehicleId: parseInt(formData.vehicleId),
            itemName: formData.itemName,
            quantity: parseInt(formData.quantity) || 1,
            assignedTo: formData.assignedTo,
            department: formData.department,
            startDate: formData.startDate,
            endDate: formData.endDate || null,
            notes: formData.notes
        }

        let result
        if (editingAssignment) {
            result = await window.electronAPI.updateAssignment({ id: editingAssignment.id, ...data })
        } else {
            result = await window.electronAPI.createAssignment(data)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDelete = async (assignment) => {
        if (confirm('Bu zimmet kaydını silmek istediğinize emin misiniz?')) {
            const result = await window.electronAPI.deleteAssignment(assignment.id)
            if (result.success) loadData()
        }
    }

    const columns = [
        { key: 'vehicle_plate', label: 'Plaka' },
        { key: 'item_name', label: 'Malzeme/Demirbaş' },
        { key: 'quantity', label: 'Adet' },
        { key: 'assigned_to', label: 'Sorumlu Kişi' },
        {
            key: 'start_date',
            label: 'Başlangıç',
            render: (value) => formatDate(value)
        },
        {
            key: 'end_date',
            label: 'Bitiş',
            render: (value) => value ? formatDate(value) : <span className="badge badge-success">Aktif</span>
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Building2 /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Zimmet kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
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
                    <h1 className="page-title">Araç Demirbaş / Zimmet</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Zimmet ve malzeme yönetimi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal} disabled={vehicles.length === 0}>
                        <Plus size={18} />
                        Yeni Zimmet
                    </button>
                </div>
            </div>

            {assignments.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><UserCheck /></div>
                    <h2 className="empty-state-title">Demirbaş Kaydı Yok</h2>
                    <p className="empty-state-desc">
                        {vehicles.length === 0 ? 'Önce araç eklemeniz gerekiyor.' : 'Henüz zimmet kaydı eklenmemiş.'}
                    </p>
                    {vehicles.length > 0 && (
                        <button className="btn btn-primary" onClick={openCreateModal}>
                            <Plus size={18} />
                            Zimmet Ekle
                        </button>
                    )}
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={assignments}
                    showSearch={true}
                    showCheckboxes={true}
                    showDateFilter={true}
                    dateFilterKey="start_date"
                    onBulkDelete={async (ids) => {
                        if (confirm(`${ids.length} zimmet kaydını silmek istediğinize emin misiniz?`)) {
                            for (const id of ids) {
                                await window.electronAPI.deleteAssignment(id)
                            }
                            loadData()
                        }
                    }}
                    actions={(item) => (
                        <>
                            <button title="Düzenle" onClick={() => openEditModal(item)}><Pencil size={16} /></button>
                            <button title="Sil" className="danger" onClick={() => handleDelete(item)}><Trash2 size={16} /></button>
                        </>
                    )}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingAssignment ? 'Demirbaş Düzenle' : 'Yeni Demirbaş/Zimmet'}
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
                    <div className="form-group">
                        <label className="form-label">Araç *</label>
                        <CustomSelect
                            className="form-select-custom"
                            value={formData.vehicleId}
                            onChange={(value) => setFormData({ ...formData, vehicleId: value })}
                            options={vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.brand} ${v.model}` }))}
                            placeholder="Araç seçin"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group" style={{ flex: 2 }}>
                            <CustomInput label="Malzeme/Demirbaş Adı *" required={true} value={formData.itemName} onChange={(value) => setFormData({ ...formData, itemName: value })} />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <CustomInput label="Adet" type="number" value={formData.quantity} onChange={(value) => setFormData({ ...formData, quantity: value })} />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput label="Sorumlu Kişi (Opsiyonel)" value={formData.assignedTo} onChange={(value) => setFormData({ ...formData, assignedTo: value })} format="title" />
                        </div>
                        <div className="form-group">
                            <CustomInput label="Departman" value={formData.department} onChange={(value) => setFormData({ ...formData, department: value })} format="title" />
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
                                value={formData.endDate}
                                onChange={(value) => setFormData({ ...formData, endDate: value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notlar</label>
                        <textarea
                            className="form-textarea"
                            placeholder="Ek notlar..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    {error && <div className="form-error">{error}</div>}
                </form>
            </Modal>
        </div>
    )
}
