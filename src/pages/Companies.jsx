import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import CustomInput from '../components/CustomInput'
import { formatDate } from '../utils/helpers'
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react'

export default function Companies() {
    const { user } = useAuth()
    const { companies, createCompany, updateCompany, deleteCompany, refreshCompanies } = useCompany()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCompany, setEditingCompany] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        taxNumber: '',
        address: '',
        phone: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null) // { type: 'single'|'bulk', item, ids, title, message }

    const resetForm = () => {
        setFormData({ name: '', taxNumber: '', address: '', phone: '' })
        setEditingCompany(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (company) => {
        setFormData({
            name: company.name,
            taxNumber: company.tax_number || '',
            address: company.address || '',
            phone: company.phone || ''
        })
        setEditingCompany(company)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (!formData.name.trim()) {
            setError('Şirket adı zorunludur')
            return
        }

        setLoading(true)

        let result
        if (editingCompany) {
            result = await updateCompany({
                id: editingCompany.id,
                name: formData.name,
                taxNumber: formData.taxNumber,
                address: formData.address,
                phone: formData.phone
            })
        } else {
            result = await createCompany(formData)
        }

        setLoading(false)

        if (result.success) {
            closeModal()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (company) => {
        setConfirmModal({
            type: 'single',
            item: company,
            title: 'Şirket Silme',
            message: `"${company.name}" şirketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleBulkDeleteClick = (ids) => {
        setConfirmModal({
            type: 'bulk',
            ids: ids,
            title: 'Toplu Silme',
            message: `${ids.length} şirketi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await deleteCompany(confirmModal.item.id)
        } else if (confirmModal.type === 'bulk') {
            for (const id of confirmModal.ids) {
                await deleteCompany(id)
            }
        }
        setConfirmModal(null)
    }

    const columns = [
        { key: 'name', label: 'Şirket Adı' },
        { key: 'tax_number', label: 'Vergi No' },
        { key: 'phone', label: 'Telefon' },
        { key: 'address', label: 'Adres' },
        {
            key: 'created_at',
            label: 'Kayıt Tarihi',
            render: (value) => formatDate(value)
        }
    ]

    // We don't have separate loading state for initial load vs refresh in context probably, 
    // but companies are usually cached in context. 
    // Wait, useCompany exposes refreshCompanies.
    // If we assume companies.length check is enough?
    // Actually companies might be empty initially.

    // Changing the logic slightly for companies since it comes from context
    // If companies is non-empty, we likely don't want to show loading screen

    // Wait, Companies.jsx doesn't have a 'loading' state for fetching, it's inside useCompany context generally.
    // But lines 22 declare `const [loading, setLoading] = useState(false)`. This is for form submission!
    // Ah, Companies.jsx gets data from `useCompany`. 
    // `useCompany` likely handles the fetching.

    // Let's check `useCompany`. If it provides a loading state for data fetch.
    // If not, we can't easily do this optimization here without checking context implementation.
    // However, existing code likely relies on `companies` array updates.

    // Reviewing lines 1-13 again.
    // It consumes `companies` from useCompany.

    // It does NOT have a fetching useEffect locally.
    // So there is NO local data loading state causing a reset.
    // Therefore, Companies.jsx probably DOES NOT need this fix because it doesn't unmount on refresh,
    // unless `useCompany` sets `companies` to [] before updating.

    // I'll skip Companies.jsx for now as it uses Context, not local state fetching.
    // Moving to VehicleDetail.jsx.

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Şirketler</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Şirket ve şube yönetimi.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Yeni Şirket
                    </button>
                </div>
            </div>

            {companies.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Building2 />
                    </div>
                    <h2 className="empty-state-title">Henüz Şirket Yok</h2>
                    <p className="empty-state-desc">
                        Araçlarınızı yönetmek için ilk şirketinizi oluşturun.
                    </p>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Şirket Oluştur
                    </button>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={companies}
                    showSearch={true}
                    showCheckboxes={true}
                    onBulkDelete={handleBulkDeleteClick}
                    actions={(company) => (
                        <>
                            <button title="Düzenle" onClick={() => openEditModal(company)}>
                                <Pencil size={16} />
                            </button>
                            <button title="Sil" className="danger" onClick={() => handleDeleteClick(company)}>
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingCompany ? 'Şirket Düzenle' : 'Yeni Şirket'}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>
                            İptal
                        </button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                            {loading ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </>
                }
            >
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <CustomInput
                            label="Şirket Adı"
                            required={true}
                            value={formData.name}
                            onChange={(value) => setFormData({ ...formData, name: value })}
                            format="title"
                            placeholder="Şirket adını girin"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput
                                label="Vergi Numarası"
                                value={formData.taxNumber}
                                onChange={(value) => setFormData({ ...formData, taxNumber: value })}
                                placeholder="Vergi numarası"
                            />
                        </div>

                        <div className="form-group">
                            <CustomInput
                                label="Telefon"
                                value={formData.phone}
                                onChange={(value) => setFormData({ ...formData, phone: value })}
                                format="phone"
                                placeholder="(5XX) XXX XX XX"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <CustomInput
                            label="Adres"
                            placeholder="Şirket adresi"
                            value={formData.address}
                            onChange={(value) => setFormData({ ...formData, address: value })}
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
