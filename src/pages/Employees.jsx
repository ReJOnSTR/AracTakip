import TopProgressBar from '../components/TopProgressBar'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import EmployeeForm from '../components/forms/EmployeeForm'
import { formatCurrency } from '../utils/helpers'
import { Plus, Pencil, Trash2, Users, Building2, AlertCircle, Calendar } from 'lucide-react'

const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' }
]

export default function Employees() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const { openNewTab } = useTabs()
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null)
    const [showArchived, setShowArchived] = useState(false)
    const [departments, setDepartments] = useState([])
    const departmentOptions = departments.map(d => ({ value: d.name, label: d.name }))

    useEffect(() => {
        if (currentCompany) {
            loadEmployees()
        } else {
            setEmployees([])
            setLoading(false)
        }
    }, [currentCompany, showArchived])

    const loadEmployees = async () => {
        setLoading(true)
        try {
            const [empRes, deptRes] = await Promise.all([
                window.electronAPI.getEmployees(currentCompany.id, showArchived ? 1 : 0),
                window.electronAPI.getDepartments(currentCompany.id)
            ])

            if (empRes.success) {
                const formattedData = (empRes.data || []).map(emp => ({
                    ...emp,
                    full_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
                }))
                setEmployees(formattedData)
            }

            if (deptRes.success) {
                setDepartments(deptRes.data || [])
            }
        } catch (err) {
            console.error('Failed to load employees:', err)
        }
        setLoading(false)
    }

    const openCreateModal = () => {
        setEditingEmployee(null)
        setError('')
        setIsModalOpen(true)
    }

    const openEditModal = (employee) => {
        setEditingEmployee(employee)
        setError('')
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingEmployee(null)
        setError('')
    }

    const handleSubmit = async (formData) => {
        setSaving(true)
        setError('')
        try {
            let result
            if (editingEmployee) {
                result = await window.electronAPI.updateEmployee({
                    id: editingEmployee.id,
                    ...formData
                })
            } else {
                result = await window.electronAPI.createEmployee({
                    companyId: currentCompany.id,
                    ...formData
                })
            }
            if (result.success) {
                closeModal()
                loadEmployees()
            } else {
                setError(result.error || 'Bir hata oluştu.')
            }
        } catch (err) {
            setError('Beklenmeyen hata: ' + err.message)
        }
        setSaving(false)
    }

    const handleDeleteClick = (employee) => {
        setConfirmModal({
            title: 'Personel Sil',
            message: `"${employee.first_name} ${employee.last_name}" personelini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            item: employee
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            title: 'Toplu Silme',
            message: `${ids.length} personeli silmek istediğinize emin misiniz?`,
            ids
        })
    }

    const handleBulkArchive = async (ids) => {
        if (!ids || ids.length === 0) return
        const newStatus = showArchived ? 0 : 1
        for (const id of ids) {
            await window.electronAPI.archiveItem('employees', id, newStatus)
        }
        loadEmployees()
    }

    const handleConfirmDelete = async () => {
        try {
            if (confirmModal.ids) {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteEmployee(id)
                }
            } else {
                await window.electronAPI.deleteEmployee(confirmModal.item.id)
            }
            loadEmployees()
        } catch (err) {
            console.error('Delete failed:', err)
        }
        setConfirmModal(null)
    }

    const getStatusInfo = (status) => {
        if (status === 'active') return { label: 'Aktif', color: 'success' }
        return { label: 'Pasif', color: 'secondary' }
    }

    const columns = [
        {
            key: 'full_name',
            label: 'Ad Soyad',
            render: (_, row) => `${row.first_name} ${row.last_name}`
        },
        { key: 'position', label: 'Pozisyon' },
        { key: 'department', label: 'Departman' },
        { key: 'phone', label: 'Telefon' },
        {
            key: 'salary',
            label: 'Maaş',
            render: (value) => value ? formatCurrency(value) : '-'
        },
        {
            key: 'status',
            label: 'Durum',
            render: (value) => {
                const status = getStatusInfo(value)
                return <span className={`badge badge-${status.color}`}>{status.label}</span>
            }
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Building2 />
                </div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">
                    Personelleri görüntülemek için lütfen bir şirket seçin.
                </p>
            </div>
        )
    }

    return (
        <div>
            <TopProgressBar loading={loading} />
            <div className="page-header">
                <div>
                    <h1 className="page-title">Personeller</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Personel yönetimi ve detayları.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Yeni Personel
                    </button>
                </div>
            </div>

            {/* Personnel Upcoming Alerts */}
            {currentCompany && !showArchived && (
                <div style={{ marginBottom: '25px' }}>
                    {(() => {
                        const { upcomingEvents } = useCompany()
                        const empEvents = (upcomingEvents || []).filter(e => e.eventType === 'employee_document')
                        const overdue = empEvents.filter(e => {
                            const d = Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24))
                            return d < 0
                        })
                        const upcoming = empEvents.filter(e => {
                            const d = Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24))
                            return d >= 0 && d <= 15
                        })

                        if (overdue.length === 0 && upcoming.length === 0) return null

                        return (
                            <div className="card" style={{ padding: '15px' }}>
                                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                    {overdue.length > 0 && (
                                        <div style={{ flex: 1, minWidth: '300px' }}>
                                            <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                                                <AlertCircle size={14} /> Geciken Belgeler ({overdue.length})
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {overdue.map(e => (
                                                    <div key={e.id} onClick={() => navigate(`/employees/${e.employeeId}`)} style={{ cursor: 'pointer', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div>
                                                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{e.employeeName}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{e.type}</div>
                                                        </div>
                                                        <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--danger)' }}>{Math.abs(Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24)))} gün geçti</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {upcoming.length > 0 && (
                                        <div style={{ flex: 1, minWidth: '300px' }}>
                                            <h3 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                                                <Calendar size={14} /> Yaklaşan Belgeler ({upcoming.length})
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {upcoming.map(e => {
                                                    const d = Math.ceil((new Date(e.date) - new Date()) / (1000 * 60 * 60 * 24))
                                                    return (
                                                        <div key={e.id} onClick={() => navigate(`/employees/${e.employeeId}`)} style={{ cursor: 'pointer', padding: '8px 12px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div>
                                                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{e.employeeName}</div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{e.type}</div>
                                                            </div>
                                                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--warning)' }}>{d === 0 ? 'Bugün' : `${d} gün kaldı`}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })()}
                </div>
            )}

            <DataTable persistenceKey="Employees_table_v2"
                initialSort={{ key: 'full_name', direction: 'asc' }}
                storageKey="employees_table_cols"
                columns={columns}
                data={employees}
                showSearch={true}
                showCheckboxes={true}
                emptyMessage={showArchived ? "Arşivlenmiş personel bulunmuyor." : "Henüz personel eklenmemiş."}
                searchPlaceholder="Ad, soyad, departman veya pozisyon ile ara..."
                searchKeys={['first_name', 'last_name', 'position', 'department', 'phone']}
                filters={[
                    {
                        key: 'department',
                        label: 'Departman',
                        options: departments.map(d => ({ value: d.name, label: d.name }))
                    },
                    {
                        key: 'status',
                        label: 'Durum',
                        options: statusOptions
                    }
                ]}
                onRowClick={(employee, e) => {
                    if (e.ctrlKey || e.metaKey) {
                        openNewTab(`/employees/${employee.id}`, true, `${employee.first_name} ${employee.last_name}`)
                    } else {
                        navigate(`/employees/${employee.id}`)
                    }
                }}
                onBulkDelete={handleBulkDeleteClick}
                onBulkArchive={handleBulkArchive}
                isArchiveView={showArchived}
                onToggleArchiveView={setShowArchived}
                actions={(employee) => (
                    <>
                        <button title="Düzenle" onClick={() => openEditModal(employee)}>
                            <Pencil size={16} />
                        </button>
                        <button title="Sil" className="danger" onClick={() => handleDeleteClick(employee)}>
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            />

            {employees.length === 0 && !loading && !showArchived && (
                <div className="empty-state" style={{ marginTop: '40px', border: 'none', background: 'transparent' }}>
                    <div className="empty-state-icon">
                        <Users />
                    </div>
                    <h2 className="empty-state-title">Henüz Personel Yok</h2>
                    <p className="empty-state-desc">
                        Bu şirkete ait personel bulunmuyor. İlk personelinizi ekleyin.
                    </p>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Personel Ekle
                    </button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingEmployee ? 'Personel Düzenle' : 'Yeni Personel'}
                size="xl"
                footer={null}
            >
                {error && (
                    <div style={{
                        backgroundColor: 'var(--danger-bg)',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        marginBottom: '20px'
                    }}>
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}
                <EmployeeForm 
                    initialData={editingEmployee} 
                    onSubmit={handleSubmit} 
                    onCancel={closeModal} 
                    saving={saving}
                    departmentOptions={departmentOptions}
                />
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
