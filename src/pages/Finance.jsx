import { useState, useEffect, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import DataTable from '../components/DataTable'
import TransactionForm from '../components/forms/TransactionForm'
import { formatCurrency, formatDate } from '../utils/helpers'
import { Plus, Wallet, Banknote, FileSignature, ArrowDownRight, Trash2, Pencil } from 'lucide-react'

export default function Finance() {
    const { currentCompany } = useCompany()
    const [transactions, setTransactions] = useState([])
    const [stats, setStats] = useState({
        totalBalance: 0,
        cashBalance: 0,
        pendingChecks: 0,
        currentMonthOut: 0
    })
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTx, setEditingTx] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setTransactions([])
            setStats({ totalBalance: 0, cashBalance: 0, pendingChecks: 0, currentMonthOut: 0 })
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [txRes, statsRes] = await Promise.all([
                window.electronAPI.getAllFinance(currentCompany.id),
                window.electronAPI.getFinanceStats(currentCompany.id)
            ])

            if (txRes.success) setTransactions(txRes.data)
            if (statsRes.success) setStats(statsRes.data)
        } catch (error) {
            console.error('Failed to load finance data:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setEditingTx(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (tx) => {
        setEditingTx(tx)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleFormSubmit = async (data) => {
        setError('')
        setSaving(true)

        const payload = {
            ...data,
            companyId: currentCompany.id
        }

        let result
        if (editingTx) {
            result = await window.electronAPI.updateFinance({ id: editingTx.id, ...payload })
        } else {
            result = await window.electronAPI.createFinance(payload)
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadData()
        } else {
            setError(result.error)
        }
    }

    const handleDeleteClick = (tx) => {
        setConfirmModal({
            type: 'single',
            item: tx,
            title: 'İşlem Silme',
            message: 'Bu finansal işlemi silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve bakiyenizi etkileyecektir.'
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.type === 'single') {
            await window.electronAPI.deleteFinance(confirmModal.item.id)
        }

        loadData()
        setConfirmModal(null)
    }

    // Prepare table columns
    const columns = useMemo(() => [
        {
            key: 'date',
            label: 'Tarih',
            sortable: true,
            render: (val) => formatDate(val)
        },
        {
            key: 'type',
            label: 'İşlem Türü',
            sortable: true,
            render: (val, row) => {
                const isIncome = val === 'IN'
                return (
                    <span className={`badge badge-${isIncome ? 'success' : 'danger'}`}>
                        {isIncome ? 'Gelir / Tahsilat' : 'Gider / Ödeme'}
                    </span>
                )
            }
        },
        {
            key: 'method',
            label: 'Yöntem',
            sortable: true,
            render: (val) => {
                switch (val) {
                    case 'CASH': return <span className="badge badge-info">Nakit</span>
                    case 'BANK': return <span className="badge badge-primary">Banka</span>
                    case 'CHECK': return <span className="badge badge-warning">Çek</span>
                    default: return <span className="badge badge-secondary">{val}</span>
                }
            }
        },
        {
            key: 'description',
            label: 'Açıklama',
            sortable: false
        },
        {
            key: 'details',
            label: 'Çek Detayı',
            sortable: false,
            render: (_, row) => {
                if (row.method === 'CHECK') {
                    return (
                        <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {row.check_number && <div>No: {row.check_number}</div>}
                            {row.check_due_date && <div>Vade: {formatDate(row.check_due_date)}</div>}
                            <span className={`badge badge-${row.status === 'PENDING' ? 'warning' : 'success'}`} style={{ alignSelf: 'flex-start', marginTop: '2px' }}>
                                {row.status === 'PENDING' ? 'Müşteride Bekliyor' : 'Tahsil Edildi'}
                            </span>
                        </div>
                    )
                }
                return '-'
            }
        },
        {
            key: 'amount',
            label: 'Tutar',
            sortable: true,
            render: (val, row) => {
                const isIncome = row.type === 'IN'
                return (
                    <div style={{
                        color: isIncome ? 'var(--success)' : 'var(--danger)',
                        fontWeight: '600'
                    }}>
                        {isIncome ? '+' : '-'}{formatCurrency(val)}
                    </div>
                )
            }
        }
    ], [])

    return (
        <div className="page-container fade-in">
            <TopProgressBar loading={loading} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Kasa & Banka Cüzdanı</h1>
                    <p className="page-subtitle">Kasa ve banka hesap hareketleri, gelir/gider detayları</p>
                </div>

                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={openCreateModal}
                        disabled={loading || !currentCompany}
                    >
                        <Plus size={18} />
                        Yeni İşlem
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                {/* Cash Balance */}
                <div className="stat-card" style={{ width: '300px', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">KASA BAKİYESİ</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><Banknote size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{formatCurrency(stats.cashBalance)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Güncel nakit tutarı
                        </div>
                    </div>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={transactions}
                loading={loading}
                searchPlaceholder="Açıklama, tutar veya yöntem ile ara..."
                searchKeys={['description', 'amount', 'method', 'check_number']}
                emptyMessage={currentCompany ? "Henüz işlem bulunmuyor." : "Lütfen bir şirket seçin."}
                showDateFilter={true}
                dateFilterKey="date"
                filters={[
                    {
                        key: 'type',
                        label: 'İşlem Türü',
                        options: [
                            { value: 'IN', label: 'Gelir' },
                            { value: 'OUT', label: 'Gider' }
                        ]
                    },
                    {
                        key: 'method',
                        label: 'Yöntem',
                        options: [
                            { value: 'CASH', label: 'Nakit' },
                            { value: 'BANK', label: 'Banka' }
                        ]
                    }
                ]}
                actions={(item) => (
                    <>
                        <button title="Düzenle" onClick={() => openEditModal(item)}><Pencil size={16} /></button>
                        <button title="Sil" className="danger" onClick={() => handleDeleteClick(item)}><Trash2 size={16} /></button>
                    </>
                )}
            />

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingTx ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}
            >
                {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

                <TransactionForm
                    initialData={editingTx}
                    onSubmit={handleFormSubmit}
                    onCancel={closeModal}
                    loading={saving}
                    hideCheck={true}
                />
            </Modal>

            {confirmModal && (
                <ConfirmModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmModal(null)}
                    confirmText="Evet, Sil"
                    cancelText="İptal"
                    isDanger={true}
                />
            )}
        </div>
    )
}
