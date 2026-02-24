import { useState, useEffect, useMemo, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import { UtensilsCrossed, Users, CalendarDays, Plus, Pencil, Trash2, Settings, TrendingUp } from 'lucide-react'

export default function MealTickets() {
    const { currentCompany } = useCompany()
    const [tickets, setTickets] = useState([])
    const [stats, setStats] = useState({ totalThisMonth: 0, todayCount: 0, ticketCountThisMonth: 0, pricePerPerson: 0, totalCostThisMonth: 0 })
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingTicket, setEditingTicket] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    // Delete confirm
    const [confirmModal, setConfirmModal] = useState(null)

    // Form state
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
    const [formCount, setFormCount] = useState('')
    const [formNotes, setFormNotes] = useState('')

    const loadData = useCallback(async () => {
        if (!currentCompany) return
        setLoading(true)
        try {
            const [ticketRes, statsRes] = await Promise.all([
                window.electronAPI.getMealTickets(currentCompany.id),
                window.electronAPI.getMealTicketStats(currentCompany.id)
            ])
            if (ticketRes.success) setTickets(ticketRes.data)
            if (statsRes.success) setStats(statsRes.data)
        } catch (err) {
            console.error('Failed to load meal tickets:', err)
        }
        setLoading(false)
    }, [currentCompany])

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setTickets([])
            setStats({ totalThisMonth: 0, todayCount: 0, ticketCountThisMonth: 0, pricePerPerson: 0, totalCostThisMonth: 0 })
            setLoading(false)
        }
    }, [currentCompany, loadData])

    useEffect(() => {
        const unsub = window.electronAPI.onDbUpdate((change) => {
            if (change?.table === 'meal_tickets' || change?.table === 'meal_settings') loadData()
        })
        return () => { if (unsub) unsub() }
    }, [loadData])

    const openCreateModal = () => {
        setEditingTicket(null)
        setFormDate(new Date().toISOString().split('T')[0])
        setFormCount('')
        setFormNotes('')
        setError('')
        setShowModal(true)
    }

    const openEditModal = (ticket) => {
        setEditingTicket(ticket)
        setFormDate(ticket.date)
        setFormCount(String(ticket.person_count))
        setFormNotes(ticket.notes || '')
        setError('')
        setShowModal(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const count = parseInt(formCount)
        if (!formDate || !count || count < 1) {
            setError('Tarih ve kişi sayısı gereklidir.')
            return
        }

        setSaving(true)
        try {
            let result
            if (editingTicket) {
                result = await window.electronAPI.updateMealTicket({
                    id: editingTicket.id,
                    date: formDate,
                    personCount: count,
                    notes: formNotes
                })
            } else {
                result = await window.electronAPI.createMealTicket({
                    companyId: currentCompany.id,
                    date: formDate,
                    personCount: count,
                    notes: formNotes
                })
            }

            if (result.success) {
                setShowModal(false)
                loadData()
            } else {
                setError(result.error || 'Bir hata oluştu.')
            }
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteClick = (ticket) => {
        setConfirmModal({
            item: ticket,
            title: 'Yemek Fişi Silme',
            message: `${formatDate(ticket.date)} tarihli, ${ticket.person_count} kişilik yemek fişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return
        await window.electronAPI.deleteMealTicket(confirmModal.item.id)
        loadData()
        setConfirmModal(null)
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        const d = new Date(dateStr)
        return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2 }).format(val || 0)
    }

    const columns = useMemo(() => [
        {
            key: 'date',
            label: 'Tarih',
            sortable: true,
            render: (val) => (
                <span style={{ fontWeight: '500' }}>{formatDate(val)}</span>
            )
        },
        {
            key: 'person_count',
            label: 'Kişi Sayısı',
            sortable: true,
            render: (val) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: '600', fontSize: '15px' }}>{val}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>kişi</span>
                </div>
            )
        },
        {
            key: 'cost',
            label: 'Tutar',
            sortable: false,
            render: (_val, item) => {
                const cost = (item.person_count || 0) * (stats.pricePerPerson || 0)
                return cost > 0
                    ? <span style={{ fontWeight: '600', color: 'var(--primary)' }}>{formatCurrency(cost)}</span>
                    : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
            }
        },
        {
            key: 'notes',
            label: 'Notlar',
            sortable: false,
            render: (val) => val || <span style={{ color: 'var(--text-muted)' }}>-</span>
        }
    ], [stats.pricePerPerson])

    const currentMonthName = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })

    return (
        <div className="page-container fade-in">
            <TopProgressBar loading={loading} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Yemek Fişleri</h1>
                    <p className="page-subtitle">Günlük yemek katılım takibi ve fiş yönetimi</p>
                </div>
                <div className="header-actions">
                    <button
                        className="btn btn-primary"
                        onClick={openCreateModal}
                        disabled={loading || !currentCompany}
                    >
                        <Plus size={18} />
                        Yeni Fiş
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '25px' }}>
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">BUGÜN</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><UtensilsCrossed size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats.todayCount} <span style={{ fontSize: '14px', fontWeight: '400' }}>kişi</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Bugün yemeğe giden</div>
                    </div>
                </div>

                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">BU AY TOPLAM</div>
                        <div className="stat-icon success" style={{ width: '32px', height: '32px' }}><Users size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats.totalThisMonth} <span style={{ fontSize: '14px', fontWeight: '400' }}>kişi</span></div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{currentMonthName} toplamı</div>
                    </div>
                </div>

                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">KİŞİ BAŞI ÜCRET</div>
                        <div className="stat-icon warning" style={{ width: '32px', height: '32px' }}><Settings size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(stats.pricePerPerson)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Kişi başı yemek ücreti</div>
                    </div>
                </div>

                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">BU AY MALİYET</div>
                        <div className="stat-icon danger" style={{ width: '32px', height: '32px' }}><TrendingUp size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(stats.totalCostThisMonth)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {stats.totalThisMonth} kişi × {formatCurrency(stats.pricePerPerson)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <DataTable
                columns={columns}
                data={tickets}
                loading={loading}
                searchPlaceholder="Tarih veya not ile ara..."
                searchKeys={['date', 'notes']}
                emptyMessage={currentCompany ? "Henüz yemek fişi bulunmuyor." : "Lütfen bir şirket seçin."}
                showDateFilter={true}
                dateFilterKey="date"
                actions={(item) => (
                    <>
                        <button title="Düzenle" onClick={() => openEditModal(item)}><Pencil size={16} /></button>
                        <button title="Sil" className="danger" onClick={() => handleDeleteClick(item)}><Trash2 size={16} /></button>
                    </>
                )}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={editingTicket ? "Yemek Fişi Düzenle" : "Yeni Yemek Fişi"}
            >
                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Tarih *</label>
                        <input type="date" className="form-input" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Kişi Sayısı *</label>
                        <input type="number" className="form-input" value={formCount} onChange={(e) => setFormCount(e.target.value)} min="1" placeholder="Kaç kişi yemeğe gitti?" required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notlar</label>
                        <textarea className="form-input" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} placeholder="Ekstra bilgi (opsiyonel)" style={{ resize: 'vertical' }} />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : (editingTicket ? 'Güncelle' : 'Kaydet')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirm Modal */}
            {confirmModal && (
                <ConfirmModal
                    isOpen={true}
                    title={confirmModal.title}
                    message={confirmModal.message}
                    onConfirm={handleConfirmDelete}
                    onClose={() => setConfirmModal(null)}
                    confirmText="Evet, Sil"
                    cancelText="İptal"
                    type="danger"
                />
            )}
        </div>
    )
}
