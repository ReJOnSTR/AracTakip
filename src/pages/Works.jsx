import React, { useState, useEffect, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import { useNavigate } from 'react-router-dom'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import WorkForm from '../components/forms/WorkForm'
import { Plus, CheckCircle, Clock, AlertCircle, Calendar, Pencil, Trash2, MapPin, Truck, User, ArrowRight } from 'lucide-react'
import { formatDate, formatCurrency, getWorkStatusLabel, getWorkStatusColor } from '../utils/helpers'

export default function Works() {
    const { currentCompany } = useCompany()
    const { openNewTab } = useTabs()
    const navigate = useNavigate()
    const [works, setWorks] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingWork, setEditingWork] = useState(null)
    const [saving, setSaving] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const worksRes = await window.electronAPI.getWorks(currentCompany.id)
            if (worksRes.success) setWorks(worksRes.data)
        } catch (error) {
            console.error('Veri yüklenirken hata:', error)
        }
        setLoading(false)
    }

    const handleFormSubmit = async (data) => {
        setSaving(true)
        const payload = {
            ...data,
            companyId: currentCompany.id
        }

        let result
        if (editingWork) {
            result = await window.electronAPI.updateWork({ id: editingWork.id, ...payload })
        } else {
            result = await window.electronAPI.createWork(payload)
        }

        if (result.success) {
            setIsModalOpen(false)
            loadData()
        } else {
            alert('Hata: ' + result.error)
        }
        setSaving(false)
    }

    const handleDeleteClick = (work) => {
        setConfirmModal({
            title: 'İşi Sil',
            message: 'Bu iş kaydını ve bağlı tüm detayları silmek istediğinize emin misiniz?',
            onConfirm: async () => {
                const result = await window.electronAPI.deleteWork(work.id)
                if (result.success) {
                    loadData()
                    setConfirmModal(null)
                } else {
                    alert('Silme hatası: ' + result.error)
                }
            }
        })
    }

    const openCreateModal = () => {
        setEditingWork(null)
        setIsModalOpen(true)
    }

    const openEditModal = (work) => {
        setEditingWork(work)
        setIsModalOpen(true)
    }

    const handleRowClick = (row, e) => {
        if (e.ctrlKey || e.metaKey) {
            openNewTab(`/works/${row.id}`, true, `İş: ${row.customer}`)
        } else {
            navigate(`/works/${row.id}`)
        }
    }

    // Stats
    const stats = useMemo(() => {
        const total = works.length
        const pending = works.filter(w => w.status === 'pending').length
        const inProgress = works.filter(w => w.status === 'in_progress').length
        const completed = works.filter(w => w.status === 'completed').length
        return { total, pending, inProgress, completed }
    }, [works])

    const columns = [
        {
            key: 'status',
            label: 'Durum',
            width: '120px',
            render: (v) => (
                <span className={`badge badge-${getWorkStatusColor(v)}`}>
                    {getWorkStatusLabel(v)}
                </span>
            )
        },
        {
            key: 'date_range',
            label: 'Tarih Aralığı',
            render: (_, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={12} className="text-muted" />
                        <span>{formatDate(row.start_date)}</span>
                    </div>
                    {row.start_date !== row.end_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                            <ArrowRight size={12} />
                            <span>{formatDate(row.end_date)}</span>
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'customer',
            label: 'Müşteri',
            render: (v) => <span style={{ fontWeight: 600 }}>{v}</span>
        },
        {
            key: 'title',
            label: 'İş Detayı',
            render: (v, row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.location ? row.location : row.description}</div>
                </div>
            )
        },
        {
            key: 'item_count',
            label: 'Kayıt',
            render: (v) => <span className="badge badge-neutral">{v || 0} Adet</span>
        },
        {
            key: 'total_hours',
            label: 'Toplam Saat',
            render: (v) => v ? `${v} sa` : '-'
        },
        {
            key: 'total_price',
            label: 'Toplam Tutar',
            render: (v) => <span className="font-semibold text-success">{formatCurrency(v || 0)}</span>
        }
    ]

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">İş Takibi (Vinç)</h1>
                    <p className="page-subtitle">Vinç kiralama ve iş emri yönetimi</p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <Plus size={18} /> Yeni İş
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.inProgress}</div>
                        <div className="stat-label">Devam Eden</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon neutral">
                        <AlertCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">Bekleyen</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <CheckCircle />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.completed}</div>
                        <div className="stat-label">Tamamlanan</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Calendar />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Toplam İş</div>
                    </div>
                </div>
            </div>

            <DataTable
                key="works-table"
                columns={columns}
                data={works}
                emptyMessage="Henüz iş kaydı bulunamadı"
                showSearch={true}
                onRowClick={handleRowClick}
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
                title={editingWork ? 'İşi Düzenle' : 'Yeni İş Ekle'}
                footer={null}
            >
                <WorkForm
                    initialData={editingWork}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsModalOpen(false)}
                    loading={saving}
                />
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={confirmModal?.onConfirm}
                title={confirmModal?.title}
                message={confirmModal?.message}
                type="danger"
            />
        </div>
    )
}
