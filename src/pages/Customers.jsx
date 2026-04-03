import { useState, useEffect } from 'react'
import { Plus, Users, Pencil, Trash2, Building2, Phone, Mail, MapPin, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import CustomerForm from '../components/forms/CustomerForm'
import { formatCurrency } from '../utils/helpers'

export default function Customers() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const { openNewTab } = useTabs()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)
    const [showArchived, setShowArchived] = useState(false)

    useEffect(() => {
        if (currentCompany) {
            loadCustomers()
        }
    }, [currentCompany, showArchived])

    const loadCustomers = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getCustomers(currentCompany.id, showArchived ? 1 : 0)
            if (result.success) {
                setCustomers(result.data)
            }
        } catch (error) {
            console.error('Failed to load customers:', error)
        }
        setLoading(false)
    }

    const openCreateModal = () => {
        setEditingCustomer(null)
        setIsModalOpen(true)
    }

    const openEditModal = (customer) => {
        setEditingCustomer(customer)
        setIsModalOpen(true)
    }

    const handleFormSubmit = async (formData) => {
        setSaving(true)
        try {
            let result
            if (editingCustomer) {
                result = await window.electronAPI.updateCustomer({
                    id: editingCustomer.id,
                    ...formData
                })
            } else {
                result = await window.electronAPI.createCustomer({
                    companyId: currentCompany.id,
                    ...formData
                })
            }

            if (result.success) {
                setIsModalOpen(false)
                loadCustomers()
            } else {
                alert('Kaydetme başarısız: ' + result.error)
            }
        } catch (error) {
            console.error('Error saving customer:', error)
        }
        setSaving(false)
    }

    const handleDeleteClick = (customer) => {
        setConfirmModal({
            title: 'Müşteri Sil',
            message: `"${customer.name}" isimli müşteriyi silmek istediğinize emin misiniz? Bu müşteriye ait iş/proje kayıtları bozulabilir.`,
            item: customer
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            title: 'Toplu Silme',
            message: `${ids.length} müşteriyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            ids
        })
    }

    const handleBulkArchive = async (ids) => {
        if (!ids || ids.length === 0) return
        const newStatus = showArchived ? 0 : 1
        for (const id of ids) {
            await window.electronAPI.archiveItem('customers', id, newStatus)
        }
        loadCustomers()
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return
        try {
            if (confirmModal.ids) {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteCustomer(id)
                }
                loadCustomers()
            } else {
                const result = await window.electronAPI.deleteCustomer(confirmModal.item.id)
                if (result.success) {
                    loadCustomers()
                } else {
                    alert('Silme işlemi başarısız: ' + result.error)
                }
            }
        } catch (error) {
            console.error('Delete failed:', error)
        }
        setConfirmModal(null)
    }

    // Stats
    const stats = customers.reduce((acc, c) => {
        acc.totalReceivables += c.total_receivable || 0;
        acc.totalWorks += c.work_count || 0;
        return acc;
    }, { totalReceivables: 0, totalWorks: 0 })

    const columns = [
        {
            key: 'name',
            label: 'Müşteri Adı',
            render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>
        },
        {
            key: 'contact',
            label: 'İletişim',
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px' }}>
                    {row.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <Phone size={12} /> <span>{row.phone}</span>
                        </div>
                    )}
                    {row.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <Mail size={12} /> <span>{row.email}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'work_count',
            label: 'Toplam İş Sayısı',
            render: (v) => <span className="badge badge-neutral">{v || 0} İş</span>
        },
        {
            key: 'total_receivable',
            label: 'Toplam Bakiye',
            render: (v) => <span className="font-semibold text-warning">{formatCurrency(v || 0)}</span>
        }
    ]

    if (!currentCompany && !loading) return null

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Müşteri (Cari) Yönetimi</h1>
                    <p className="page-subtitle">Müşterilerinizi, bakiyelerini ve iletişim bilgilerini yönetin.</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} /> Yeni Müşteri
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Users />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{customers.length}</div>
                        <div className="stat-label">Toplam Müşteri</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Building2 />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.totalWorks}</div>
                        <div className="stat-label">Bağlı İş & Projeler</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <DollarSign />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-warning">{formatCurrency(stats.totalReceivables)}</div>
                        <div className="stat-label">Toplam Bakiye</div>
                    </div>
                </div>
            </div>

            <DataTable persistenceKey="Customers_table_0"
                columns={columns}
                data={customers}
                emptyMessage="Henüz müşteri kaydı bulunamadı"
                showSearch={true}
                searchPlaceholder="Müşteri adı, mail veya telefon ara..."
                searchKeys={['name', 'phone', 'email']}
                onRowClick={(customer, e) => {
                    if (e.ctrlKey || e.metaKey) {
                        openNewTab(`/customers/${customer.id}`, true, customer.name)
                    } else {
                        navigate(`/customers/${customer.id}`)
                    }
                }}
                showCheckboxes={true}
                onBulkDelete={handleBulkDeleteClick}
                onBulkArchive={handleBulkArchive}
                isArchiveView={showArchived}
                onToggleArchiveView={setShowArchived}
                actions={(item) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" title="Düzenle" onClick={(e) => { e.stopPropagation(); openEditModal(item) }}><Pencil size={16} /></button>
                        <button className="btn-icon danger" title="Sil" onClick={(e) => { e.stopPropagation(); handleDeleteClick(item) }}><Trash2 size={16} /></button>
                    </div>
                )}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
                footer={null}
            >
                <CustomerForm
                    initialData={editingCustomer}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    loading={saving}
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
