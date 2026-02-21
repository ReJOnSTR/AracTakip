import React, { useState, useEffect } from 'react'
import { useTabs } from '../context/TabContext'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { Plus, Search, Users, Phone, Building2, Briefcase, Trash2, Pencil } from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'

export default function Employees() {
    const { openNewTab } = useTabs()
    const navigate = useNavigate()
    const { currentCompany } = useCompany()
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)

    const [confirmModal, setConfirmModal] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingEmployee, setEditingEmployee] = useState(null)
    const [formData, setFormData] = useState({})
    const [saving, setSaving] = useState(false)
    const [isArchiveView, setIsArchiveView] = useState(false)

    useEffect(() => {
        if (currentCompany) {
            loadEmployees()
        } else {
            setEmployees([])
            setLoading(false)
        }
    }, [currentCompany])

    // Filter by Status (Active/Passive View) - Default is Active (Not Passive)
    const filteredEmployees = employees.filter(emp =>
        isArchiveView ? emp.status === 'passive' : emp.status !== 'passive'
    )

    const loadEmployees = async () => {
        if (!currentCompany) return
        setLoading(true)
        try {
            const result = await window.electronAPI.getEmployees(currentCompany.id)
            if (result.success) {
                // Add full_name for search/sort compatibility with DataTable
                const dataWithFullName = result.data.map(emp => ({
                    ...emp,
                    full_name: `${emp.name} ${emp.surname}`
                }))
                setEmployees(dataWithFullName)
            }
        } catch (error) {
            console.error('Failed to load employees:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenModal = (employee = null) => {
        setEditingEmployee(employee)
        setFormData(employee || {
            name: '',
            surname: '',
            tc_no: '',
            phone: '',
            email: '',
            position: '',
            department: '',
            salary: '',
            start_date: new Date().toISOString().split('T')[0],
            overtime_rate: '',
            sunday_overtime_rate: '',
            status: 'active',
            notes: ''
        })
        setIsModalOpen(true)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (!currentCompany) {
                alert('Şirket bilgisi bulunamadı! Lütfen önce bir şirket seçin.')
                setSaving(false)
                return
            }

            const payload = {
                companyId: currentCompany.id,
                name: formData.name,
                surname: formData.surname,
                tcNo: formData.tc_no,
                phone: formData.phone,
                email: formData.email,
                position: formData.position,
                department: formData.department,
                salary: formData.salary,
                startDate: formData.start_date,
                overtime_rate: formData.overtime_rate,
                sunday_overtime_rate: formData.sunday_overtime_rate,
                status: formData.status || 'active',
                notes: formData.notes
            }

            if (editingEmployee) {
                payload.id = editingEmployee.id
            }

            let result
            if (editingEmployee) {
                result = await window.electronAPI.updateEmployee(payload)
            } else {
                result = await window.electronAPI.createEmployee(payload)
            }

            if (result.success) {
                setIsModalOpen(false)
                loadEmployees()
            } else {
                alert('Hata: ' + result.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id) => {
        setConfirmModal({
            type: 'single',
            title: 'Personel Sil',
            message: 'Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            id
        })
    }

    const handleBulkDelete = (ids) => {
        setConfirmModal({
            type: 'bulk',
            title: 'Toplu Personel Silme',
            message: `${ids.length} personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            ids
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return
        setLoading(true)
        try {
            if (confirmModal.type === 'single') {
                const result = await window.electronAPI.deleteEmployee(confirmModal.id)
                if (!result.success) throw new Error(result.error)
            } else if (confirmModal.type === 'bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteEmployee(id)
                }
            }

            loadEmployees()
            setConfirmModal(null)
        } catch (error) {
            console.error(error)
            alert('Silme işlemi sırasında hata oluştu: ' + error.message)
        } finally {
            setLoading(false)
        }
    }




    const columns = [

        {
            key: 'full_name', label: 'Ad Soyad', render: (_, row) => (
                <div style={{ fontWeight: 500 }}>{row.name} {row.surname}</div>
            )
        },
        { key: 'department', label: 'Departman', render: (v) => v || '-' },
        { key: 'position', label: 'Pozisyon', render: (v) => v || '-' },
        { key: 'phone', label: 'Telefon', render: (v) => v || '-' },
        {
            key: 'status', label: 'Durum', render: (v) => (
                <span className={`badge badge-${v === 'active' ? 'success' : 'neutral'}`}>
                    {v === 'active' ? 'Aktif' : 'Pasif'}
                </span>
            )
        }
    ]

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Personel Yönetimi</h1>
                    <p className="page-subtitle">Şirket çalışanlarını ve bilgilerini yönetin</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                    <Plus size={18} />
                    Yeni Personel
                </button>
            </div>



            <DataTable
                persistenceKey="employees_list_table"
                columns={columns}
                data={filteredEmployees}
                isArchiveView={isArchiveView}
                onToggleArchiveView={setIsArchiveView}
                onRowClick={(row, e) => {
                    if (e.ctrlKey || e.metaKey) {
                        openNewTab(`/employees/${row.id}`, true, `${row.name} ${row.surname} - Detay`)
                    } else {
                        navigate(`/employees/${row.id}`)
                    }
                }}
                onRowMiddleClick={(row) => openNewTab(`/employees/${row.id}`, true, `${row.name} ${row.surname} - Detay`)}
                onBulkDelete={handleBulkDelete}
                actions={(row) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleOpenModal(row) }}>
                            <Pencil size={16} />
                        </button>
                        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDelete(row.id) }}>
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            />


            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEmployee ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
            >
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Ad"
                                name="name"
                                value={formData.name}
                                onChange={(val) => handleChange({ target: { name: 'name', value: val } })}
                                required
                                format="uppercase"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Soyad"
                                name="surname"
                                value={formData.surname}
                                onChange={(val) => handleChange({ target: { name: 'surname', value: val } })}
                                required
                                format="uppercase"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="TC Kimlik No"
                                name="tc_no"
                                value={formData.tc_no}
                                onChange={(val) => handleChange({ target: { name: 'tc_no', value: val } })}
                                maxLength={11}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Telefon"
                                name="phone"
                                value={formData.phone}
                                onChange={(val) => handleChange({ target: { name: 'phone', value: val } })}
                                format="phone"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Departman"
                                name="department"
                                value={formData.department}
                                onChange={(val) => handleChange({ target: { name: 'department', value: val } })}
                                format="title"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Pozisyon"
                                name="position"
                                value={formData.position}
                                onChange={(val) => handleChange({ target: { name: 'position', value: val } })}
                                format="title"
                            />
                        </div>
                    </div>

                    <CustomInput
                        label="E-posta"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={(val) => handleChange({ target: { name: 'email', value: val } })}
                    />

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Maaş (TL)"
                                name="salary"
                                type="number"
                                value={formData.salary}
                                onChange={(val) => handleChange({ target: { name: 'salary', value: val } })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="İşe Başlama Tarihi"
                                name="start_date"
                                type="date"
                                value={formData.start_date}
                                onChange={(val) => handleChange({ target: { name: 'start_date', value: val } })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Mesai Ücreti (Saat)"
                                name="overtime_rate"
                                type="number"
                                value={formData.overtime_rate}
                                onChange={(val) => handleChange({ target: { name: 'overtime_rate', value: val } })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Pazar Mesai Ücreti (Günlük)"
                                name="sunday_overtime_rate"
                                type="number"
                                value={formData.sunday_overtime_rate}
                                onChange={(val) => handleChange({ target: { name: 'sunday_overtime_rate', value: val } })}
                            />
                        </div>
                    </div>

                    <CustomSelect
                        label="Durum"
                        value={formData.status || 'active'}
                        onChange={(val) => handleChange({ target: { name: 'status', value: val } })}
                        options={[
                            { value: 'active', label: 'Aktif' },
                            { value: 'passive', label: 'Pasif' }
                        ]}
                    />

                    <CustomInput
                        label="Notlar"
                        name="notes"
                        value={formData.notes || ''}
                        onChange={(val) => handleChange({ target: { name: 'notes', value: val } })}
                        multiline
                        rows={3}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title}
                message={confirmModal?.message}
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmModal(null)}
            />
        </div >
    )
}
