import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Phone, Mail, Building2, MapPin, Briefcase, Info, Calendar, Pencil } from 'lucide-react'
import DataTable from '../components/DataTable'
import TopProgressBar from '../components/TopProgressBar'
import { formatDate, formatCurrency } from '../utils/helpers'

import Modal from '../components/Modal'
import CustomerForm from '../components/forms/CustomerForm'

export default function CustomerDetail() {
    const { id } = useParams()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('works')
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

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

    const workColumns = [
        {
            key: 'status',
            label: 'Durum',
            width: '120px',
            render: (v) => {
                const colors = {
                    pending: 'neutral',
                    in_progress: 'warning',
                    completed: 'success',
                    cancelled: 'danger'
                }
                const labels = {
                    pending: 'Bekliyor',
                    in_progress: 'Devam Ediyor',
                    completed: 'Tamamlandı',
                    cancelled: 'İptal'
                }
                return <span className={`badge badge-${colors[v] || 'neutral'}`}>{labels[v] || v}</span>
            }
        },
        {
            key: 'date_range',
            label: 'Tarih Aralığı / Toplam Gün',
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
                    {(row.total_days > 0) && (
                        <div style={{ marginTop: '2px', color: 'var(--text-primary)', fontWeight: 500 }}>
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

    if (loading) return <div><TopProgressBar loading={loading} /></div>
    if (!customer) return <div className="empty-state"><h2 className="empty-state-title">Müşteri Bulunamadı</h2><Link className="btn btn-primary" to="/customers">Müşterilere Dön</Link></div>

    const tabs = [
        { id: 'works', label: 'İş ve Projeler', icon: Briefcase }
    ]

    const completedWorks = customer.works?.filter(w => w.status === 'completed') || []
    const pendingWorks = customer.works?.filter(w => w.status !== 'completed' && w.status !== 'cancelled') || []
    const totalEarnings = customer.works?.reduce((sum, w) => sum + (w.total_price || 0), 0) || 0

    return (
        <div>
            <TopProgressBar loading={loading} />

            {/* Header / Breadcrumb / Actions */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                    <Link to="/customers" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowLeft size={14} /> Müşteriler
                    </Link>
                    <span>/</span>
                    <span>{customer.name}</span>
                </div>

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
                            <Link to="/works" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                                Yeni İş Ekle
                            </Link>
                        </div>

                        <DataTable persistenceKey="Customer_Works_0"
                            columns={workColumns}
                            data={customer.works || []}
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
        </div>
    )
}
