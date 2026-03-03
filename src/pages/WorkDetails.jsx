import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom' // Even though we use tabs, we might get ID from props
import { useTab } from '../context/TabContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, Truck, User, DollarSign, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '../utils/helpers'
import { workItemSchema } from '../schemas/workSchema'

export default function WorkDetails(props) {
    // Props might come from tab system
    const id = props.id
    const { openTab, replaceTab, activeTabId } = useTab()
    const [work, setWork] = useState(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState([])
    const [employees, setEmployees] = useState([])

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [modalError, setModalError] = useState('')

    // Confirm Delete State
    const [confirmModal, setConfirmModal] = useState(null)

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        vehicleId: '',
        employeeId: '',
        startTime: '',
        endTime: '',
        hours: 0,
        overtimeHours: 0,
        unitPrice: 0,
        description: ''
    })

    useEffect(() => {
        loadData()
    }, [id])

    const loadData = async () => {
        setLoading(true)
        try {
            // Load Work Details
            const workRes = await window.electronAPI.getWorkDetails(id)
            if (workRes.success) {
                setWork(workRes.data)

                // Load Resources for Dropdowns using companyId
                if (workRes.data.company_id) {
                    const [vehiclesRes, employeesRes] = await Promise.all([
                        window.electronAPI.getVehicles(workRes.data.company_id),
                        window.electronAPI.getEmployees(workRes.data.company_id)
                    ])

                    if (vehiclesRes.success) setVehicles(vehiclesRes.data)
                    if (employeesRes.success) setEmployees(employeesRes.data)
                }
            } else {
                console.error('Failed to load work:', workRes.error)
            }

        } catch (error) {
            console.error('Error loading data:', error)
        }
        setLoading(false)
    }

    const handleBack = (e) => {
        // Close current tab and go to works
        // But for now, just open 'works' tab
        if (e.ctrlKey || e.metaKey || e.button === 1) {
            openTab('works')
        } else {
            // Maybe replace? No, just open works.
            openTab('works')
        }
    }

    // --- Modal Handlers ---

    const openAddModal = () => {
        setEditingItem(null)
        setFormData({
            date: new Date().toISOString().split('T')[0],
            vehicleId: '',
            employeeId: '',
            startTime: '',
            endTime: '',
            hours: 0,
            overtimeHours: 0,
            unitPrice: 0,
            description: ''
        })
        setModalError('')
        setIsModalOpen(true)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setFormData({
            date: item.date,
            vehicleId: item.vehicle_id || '',
            employeeId: item.employee_id || '',
            startTime: item.start_time || '',
            endTime: item.end_time || '',
            hours: item.hours || 0,
            overtimeHours: item.overtime_hours || 0,
            unitPrice: item.unit_price || 0,
            description: item.description || ''
        })
        setModalError('')
        setIsModalOpen(true)
    }

    const handleModalSubmit = async (e) => {
        e.preventDefault()
        setModalError('')

        try {
            // Validation
            const parsed = workItemSchema.parse(formData)

            // Prepare payload
            const payload = {
                ...parsed,
                workId: id
            }

            let result
            if (editingItem) {
                result = await window.electronAPI.updateWorkItem({ ...payload, id: editingItem.id })
            } else {
                result = await window.electronAPI.addWorkItem(payload)
            }

            if (result.success) {
                setIsModalOpen(false)
                loadData()
            } else {
                setModalError(result.error)
            }
        } catch (err) {
            if (err.errors) {
                setModalError(err.errors[0].message)
            } else {
                setModalError(err.message)
            }
        }
    }

    // --- Delete Handlers ---

    const handleDeleteClick = (item) => {
        setConfirmModal({
            item,
            title: 'Kaydı Sil',
            message: 'Bu iş detay kaydını silmek istediğinize emin misiniz?'
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        const result = await window.electronAPI.deleteWorkItem(confirmModal.item.id)
        if (result.success) {
            setConfirmModal(null)
            loadData()
        } else {
            alert('Silme işlemi başarısız: ' + result.error)
        }
    }

    // --- Calculations ---

    const totalHours = work?.items?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0
    const totalOvertime = work?.items?.reduce((sum, item) => sum + (item.overtime_hours || 0), 0) || 0
    const grandTotal = work?.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>
    if (!work) return <div className="p-8 text-center">İş bulunamadı.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header" style={{ display: 'block', marginBottom: '24px' }}>
                <div onClick={handleBack} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '12px', cursor: 'pointer', width: 'fit-content' }}>
                    <ArrowLeft size={16} />
                    <span>İş Listesine Dön</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="page-title">{work.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={14} /> {work.customer}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={14} /> {formatDate(work.start_date)} - {formatDate(work.end_date)}
                            </span>
                            <span className={`badge badge-${getStatusColor(work.status)}`}>
                                {work.status === 'pending' ? 'Bekliyor' :
                                    work.status === 'in_progress' ? 'Devam Ediyor' :
                                        work.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Default Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon neutral">
                        <Clock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{totalHours} Saat</div>
                        <div className="stat-label">Toplam Süre</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-warning">{totalOvertime} Saat</div>
                        <div className="stat-label">Toplam Mesai</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <FileText />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-info">{work.items.length}</div>
                        <div className="stat-label">Kayıt Sayısı</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <DollarSign />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-success">{formatCurrency(grandTotal)}</div>
                        <div className="stat-label">Toplam Tutar</div>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Günlük Çalışma Kayıtları (Puantaj)</h3>
                    <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Yeni Kayıt Ekle
                    </button>
                </div>

                <DataTable persistenceKey="WorkDetails_table_0"
                    columns={[
                        { label: 'Tarih', key: 'date', render: (val) => formatDate(val) },
                        { label: 'Araç', key: 'vehicle_id', render: (val, row) => row.plate || '-' },
                        { label: 'Personel', key: 'employee_id', render: (val, row) => row.employee_name ? `${row.employee_name} ${row.employee_surname}` : '-' },
                        {
                            label: 'Saatler', key: 'start_time', render: (val, row) => (
                                <div style={{ fontSize: '12px' }}>
                                    {row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : '-'}
                                </div>
                            )
                        },
                        {
                            label: 'Süre/Mesai', key: 'hours', render: (val, row) => (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{row.hours} sa</span>
                                    {row.overtime_hours > 0 && <span className="text-warning" style={{ fontSize: '12px' }}>+{row.overtime_hours} sa mesai</span>}
                                </div>
                            )
                        },
                        { label: 'Birim Fiyat', key: 'unit_price', render: (val) => formatCurrency(val) },
                        { label: 'Toplam', key: 'total_price', render: (val) => <span className="text-success" style={{ fontWeight: 600 }}>{formatCurrency(val)}</span> },
                        { label: 'Açıklama', key: 'description', render: (val) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'inline-block' }}>{val}</span> },
                        {
                            label: 'İşlemler',
                            key: 'actions',
                            render: (_, row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(row) }} className="btn-icon" title="Düzenle"><Pencil size={16} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(row) }} className="btn-icon danger" title="Sil"><Trash2 size={16} /></button>
                                </div>
                            )
                        }
                    ]}
                    data={work.items || []}
                    onRowClick={() => { }}
                    showRowNumbers={true}
                />
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Kaydı Düzenle' : 'Yeni Çalışma Kaydı Ekle'}
            >
                <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <CustomInput
                            label="Tarih"
                            type="date"
                            value={formData.date}
                            onChange={(val) => setFormData({ ...formData, date: val })}
                            required
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomSelect
                            label="Araç"
                            value={formData.vehicleId}
                            onChange={(val) => setFormData({ ...formData, vehicleId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...vehicles.map(v => ({ value: v.id, label: v.plate + ' - ' + v.brand }))
                            ]}
                        />
                        <CustomSelect
                            label="Personel"
                            value={formData.employeeId}
                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...employees.map(e => ({ value: e.id, label: `${e.name} ${e.surname}` }))
                            ]}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Başlangıç Saati"
                            type="time"
                            value={formData.startTime}
                            onChange={(val) => setFormData({ ...formData, startTime: val })}
                        />
                        <CustomInput
                            label="Bitiş Saati"
                            type="time"
                            value={formData.endTime}
                            onChange={(val) => setFormData({ ...formData, endTime: val })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Normal Saat"
                            type="number"
                            step="0.5"
                            value={formData.hours}
                            onChange={(val) => setFormData({ ...formData, hours: val })}
                        />
                        <CustomInput
                            label="Mesai Saati"
                            type="number"
                            step="0.5"
                            value={formData.overtimeHours}
                            onChange={(val) => setFormData({ ...formData, overtimeHours: val })}
                        />
                        <CustomInput
                            label="Birim Fiyat"
                            type="number"
                            step="0.01"
                            value={formData.unitPrice}
                            onChange={(val) => setFormData({ ...formData, unitPrice: val })}
                        />
                    </div>

                    <CustomInput
                        label="Açıklama"
                        type="textarea"
                        value={formData.description}
                        onChange={(val) => setFormData({ ...formData, description: val })}
                    />

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">İptal</button>
                        <button type="submit" className="btn btn-primary">{editingItem ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Modal */}
            {confirmModal && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmModal(null)}
                    type="danger"
                />
            )}
        </div>
    )
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning'
        case 'in_progress': return 'info'
        case 'completed': return 'success'
        case 'cancelled': return 'important' // or danger based on css
        default: return 'secondary'
    }
}
