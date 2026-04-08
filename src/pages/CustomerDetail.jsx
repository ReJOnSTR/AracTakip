import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Phone, Mail, Building2, MapPin, Briefcase, Info, Calendar, Pencil, Banknote, Eye, CheckCircle2, Search, Filter, Archive } from 'lucide-react'
import DataTable from '../components/DataTable'
import TopProgressBar from '../components/TopProgressBar'
import { formatDate, formatCurrency } from '../utils/helpers'

import Modal from '../components/Modal'
import CustomerForm from '../components/forms/CustomerForm'
import TransactionForm from '../components/forms/TransactionForm'
import { usePersistentTab } from '../hooks/usePersistentTab'
import { useTabs } from '../context/TabContext'

export default function CustomerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { updateTabInfo } = useTabs()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = usePersistentTab('CustomerDetail', 'works')
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [paymentWork, setPaymentWork] = useState(null)

    // Filter states
    const [showArchived, setShowArchived] = useState(false)

    useEffect(() => {
        loadCustomer()
    }, [id])

    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({ left: activeElement.offsetLeft, width: activeElement.offsetWidth })
        }
    }, [activeTab, tabsRef, customer])

    const loadCustomer = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getCustomerDetails(id)
            if (result.success) {
                setCustomer(result.data)
                updateTabInfo(`/customers/${id}`, { label: result.data.name })
            }
        } catch (error) {
            console.error('Failed to load customer details:', error)
        }
        setLoading(false)
    }

    const handleEditSubmit = async (data) => {
        setSaving(true)
        try {
            const result = await window.electronAPI.updateCustomer({
                id: customer.id,
                ...data
            })
            if (result.success) {
                setCustomer(result.data)
                setIsEditModalOpen(false)
            } else {
                alert(result.error || 'Güncelleme başarısız oldu')
            }
        } catch (error) {
            console.error('Error updating customer:', error)
            alert('Müşteri güncellenirken bir hata oluştu')
        }
        setSaving(false)
    }

    const handleBulkArchive = async (ids) => {
        try {
            const result = await window.electronAPI.archiveWorks(ids, !showArchived);
            if (result.success) {
                loadCustomer();
            } else {
                alert(result.error || 'Arşivleme işlemi başarısız oldu');
            }
        } catch (error) {
            console.error('Error archiving works:', error)
        }
    }

    const handleBulkDelete = async (ids) => {
        if (!window.confirm(`${ids.length} adet iş kalıcı olarak silinecektir. Emin misiniz?`)) return;
        try {
            const result = await window.electronAPI.deleteWorks(ids);
            if (result.success) {
                loadCustomer();
            } else {
                alert(result.error || 'Silme işlemi başarısız oldu');
            }
        } catch (error) {
            console.error('Error deleting works:', error)
        }
    }

    const workColumns = [
        {
            key: 'status',
            label: 'Durum',
            width: '120px',
            render: (v) => {
                const colors = {
                    pending: 'neutral',
                    in_progress: 'warning',
                    completed: 'info',
                    paid: 'success',
                    cancelled: 'danger'
                }
                const labels = {
                    pending: 'Bekliyor',
                    in_progress: 'Devam Ediyor',
                    completed: 'Tamamlandı',
                    paid: 'Ödendi / Tahsil Edildi',
                    cancelled: 'İptal'
                }
                return <span className={`badge badge-${colors[v] || 'neutral'}`}>{labels[v] || v}</span>
            }
        },
        {
            key: 'date_range',
            label: 'Tarih Aralığı',
            width: '120px',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '12px' }}>
                        {/* Vertical Timeline Indicator */}
                        <div style={{ position: 'absolute', left: 0, top: '6px', bottom: row.start_date !== row.end_date ? '6px' : 'auto', height: row.start_date === row.end_date ? '0px' : 'auto', width: '2px', background: 'var(--border-color)', borderRadius: '2px' }}>
                            <div style={{ position: 'absolute', left: '-2px', top: '-2px', width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid var(--accent-primary)', background: 'var(--bg-primary)' }} />
                            {row.start_date !== row.end_date && (
                               <div style={{ position: 'absolute', left: '-2px', bottom: '-2px', width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid var(--text-muted)', background: 'var(--bg-primary)' }} />
                            )}
                        </div>
                        
                        <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: '1.3' }}>
                            {formatDate(row.start_date)}
                        </span>
                        {row.start_date !== row.end_date && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3', marginTop: '2px' }}>
                                {formatDate(row.end_date)}
                            </span>
                        )}
                    </div>
                    {(row.total_days > 0) && (
                        <div style={{ marginLeft: 'auto', padding: '4px 6px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {row.total_days} Gün
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'title',
            label: 'İş Detayı',
            render: (v, row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.location || row.description}</div>
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

    const filteredWorks = useMemo(() => {
        if (!customer || !customer.works) return [];
        return customer.works.filter(w => {
            const isArchived = w.is_archived === 1;
            if (showArchived && !isArchived) return false;
            if (!showArchived && isArchived) return false;
            return true;
        });
    }, [customer, showArchived]);

    if (loading) return <div><TopProgressBar loading={loading} /></div>
    if (!customer) return <div className="empty-state"><h2 className="empty-state-title">Müşteri Bulunamadı</h2><Link className="btn btn-primary" to="/customers">Müşterilere Dön</Link></div>

    const tabs = [
        { id: 'works', label: 'İş ve Projeler', icon: Briefcase }
    ]

    const completedWorks = customer.works?.filter(w => w.status === 'completed' && w.is_archived !== 1) || []
    const pendingWorks = customer.works?.filter(w => w.status !== 'completed' && w.status !== 'cancelled' && w.status !== 'paid' && w.is_archived !== 1) || []
    const totalEarnings = customer.works?.reduce((sum, w) => sum + (w.total_price || 0), 0) || 0

    return (
        <div>
            <TopProgressBar loading={loading} />

            {/* Header / Breadcrumb / Actions */}
            <div style={{ marginBottom: '24px' }}>


                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="employee-avatar" style={{ 
                            width: '72px', height: '72px', fontSize: '28px', 
                            borderRadius: '20px', backgroundColor: 'var(--bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)', fontWeight: '600',
                            border: '1px solid var(--border-color)',
                            flexShrink: 0
                        }}>
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                                {customer.name}
                            </h1>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14}/> {customer.phone}</span>}
                                {customer.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14}/> {customer.email}</span>}
                                {(customer.tax_office || customer.tax_number) && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Building2 size={14}/> {customer.tax_office} {customer.tax_number && `- ${customer.tax_number}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(true)}>
                            <Pencil size={18} /> Düzenle
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer Info Section - Minimal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* İletişim ve Adres */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} /> İletişim ve Adres
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Adres</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>{customer.address || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Telefon</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.phone || '-'}</div>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>E-posta</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{customer.email || '-'}</div>
                        </div>
                    </div>
                </div>
                
                {/* Kurumsal Bilgiler */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} /> Kurumsal Bilgiler
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Vergi Dairesi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.tax_office || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Vergi No / TC</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.tax_number || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Kayıt Tarihi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.created_at ? formatDate(customer.created_at) : '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Finansal Özet */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={13} /> Finansal Özet
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Açık Bakiye</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: customer.total_receivable > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{formatCurrency(customer.total_receivable || 0)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>İşlem Hacmi</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(totalEarnings)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{
                marginBottom: '24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                gap: '24px',
                overflowX: 'auto',
                paddingBottom: '0',
                position: 'relative'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        ref={el => tabsRef[tab.id] = el}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 4px',
                            background: 'transparent',
                            border: 'none',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            fontSize: '14px',
                            marginBottom: '0',
                            whiteSpace: 'nowrap',
                            position: 'relative',
                            zIndex: 1
                        }}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}

                {/* Sliding Indicator */}
                <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: indicatorStyle.left,
                    width: indicatorStyle.width,
                    height: '2px',
                    backgroundColor: 'var(--accent-primary)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: 2
                }} />
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'works' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                İşler ve Projeler
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Link to={`/works/new?customer=${customer.id}`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
                                    <Briefcase size={18} /> Yeni İş Ekle
                                </Link>
                            </div>
                        </div>

                        <DataTable persistenceKey={`Customer_Works_${activeTab}`}
                            columns={workColumns}
                            data={filteredWorks}
                            showSearch={true}
                            showDateFilter={true}
                            showCheckboxes={true}
                            dateFilterKey="start_date"
                            isArchiveView={showArchived}
                            onToggleArchiveView={setShowArchived}
                            onBulkArchive={handleBulkArchive}
                            onBulkDelete={handleBulkDelete}
                            filters={[
                                {
                                    key: 'status',
                                    label: 'Durum Filtresi',
                                    options: [
                                        { value: 'pending', label: 'Bekliyor' },
                                        { value: 'in_progress', label: 'Devam Ediyor' },
                                        { value: 'completed', label: 'Tamamlandı' },
                                        { value: 'paid', label: 'Ödendi / Tahsil Edildi' },
                                        { value: 'cancelled', label: 'İptal' }
                                    ]
                                }
                            ]}
                            onRowClick={(row) => navigate(`/works/${row.id}`)}
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button className="icon-btn info" onClick={(e) => { e.stopPropagation(); navigate(`/works/${row.id}`) }} title="İş Detayı">
                                        <Eye size={16} />
                                    </button>
                                    <button className="icon-btn success" style={{ background: row.status === 'paid' ? 'var(--success-subtle)' : 'var(--bg-secondary)', color: row.status === 'paid' ? 'var(--success)' : 'var(--text-secondary)' }} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(row.status !== 'paid') {
                                            setPaymentWork(row); 
                                            setPaymentModalOpen(true);
                                        }
                                    }} title={row.status === 'paid' ? "Tahsilat Alındı" : "Tahsilat Ekle"}>
                                        {row.status === 'paid' ? <CheckCircle2 size={16} /> : <Banknote size={16} />}
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Müşteri Bilgilerini Düzenle"
            >
                <CustomerForm
                    initialData={customer}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setIsEditModalOpen(false)}
                    loading={saving}
                />
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title={`${paymentWork?.title || 'İş'} İçin Tahsilat Al`}
            >
                <TransactionForm
                    initialData={{
                        type: 'IN',
                        method: 'CASH',
                        amount: paymentWork?.total_price || 0,
                        description: `[TAHSİLAT] İş: ${paymentWork?.title} - Müşteri: ${customer.name}`,
                        date: new Date().toISOString().split('T')[0]
                    }}
                    onSubmit={async (data) => {
                        setSaving(true)
                        try {
                            // 1. İş tablosunda konumu paid olarak güncelle
                            await window.electronAPI.updateWork({
                                id: paymentWork.id,
                                status: 'paid'
                            });
                            // 2. Bir gelir işlemi oluştur (finans)
                            await window.electronAPI.createFinance({
                                ...data,
                                category: `WORK_PAYMENT_${paymentWork.id}`,
                                companyId: customer.company_id
                            });
                            
                            setPaymentModalOpen(false);
                            loadCustomer(); // Yenile
                        } catch (err) {
                            console.error('Payment error', err);
                        } finally {
                            setSaving(false);
                        }
                    }}
                    onCancel={() => setPaymentModalOpen(false)}
                    loading={saving}
                    hideCheck={false}
                />
            </Modal>
        </div>
    )
}
