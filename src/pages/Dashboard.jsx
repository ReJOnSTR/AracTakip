import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import { formatDate, getDaysUntil, getDaysUntilText, getStatusColor, formatCurrency } from '../utils/helpers'
import {
    Car,
    Activity,
    ClipboardCheck,
    Shield,
    AlertTriangle,
    Calendar,
    Building2,
    Wallet,
    TrendingUp,
    PlusCircle,
    Wrench,
    ArrowRight,
    Gauge
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'

export default function Dashboard() {
    const { currentCompany, loading: companyLoading } = useCompany()
    const navigate = useNavigate()

    // PC Listeners
    useEffect(() => {
        const handleAction = (action) => {
            if (action === 'new-vehicle') {
                navigate('/vehicles')
            } else if (action === 'search') {
                // Trigger global search focus if implemented
            }
        }

        const handleNavigate = (route) => {
            navigate(route)
        }

        if (window.electronAPI && window.electronAPI.onTriggerAction) {
            window.electronAPI.onTriggerAction(handleAction)
            window.electronAPI.onNavigate(handleNavigate)
        }

        return () => {
            if (window.electronAPI && window.electronAPI.removePCListeners) {
                window.electronAPI.removePCListeners()
            }
        }
    }, [navigate])

    const [stats, setStats] = useState(null)
    const [upcoming, setUpcoming] = useState(null)
    const [recent, setRecent] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (currentCompany) {
            loadDashboardData()
        } else {
            setStats(null)
            setUpcoming(null)
            setRecent([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadDashboardData = async () => {
        setLoading(true)
        try {
            const [statsResult, upcomingResult, recentResult] = await Promise.all([
                window.electronAPI.getDashboardStats(currentCompany.id),
                window.electronAPI.getUpcomingEvents(currentCompany.id),
                window.electronAPI.getRecentActivity(currentCompany.id)
            ])

            if (statsResult.success) setStats(statsResult.data)
            if (upcomingResult.success) setUpcoming(upcomingResult.data)
            if (recentResult.success) setRecent(recentResult.data)
        } catch (error) {
            console.error('Dashboard data error:', error)
        }
        setLoading(false)
    }

    if (companyLoading || loading) {
        return (
            <div className="loading-screen" style={{ height: 'auto', padding: '60px' }}>
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        )
    }

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Building2 />
                </div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">
                    Dashboard'ı görüntülemek için lütfen bir şirket seçin veya yeni bir şirket oluşturun.
                </p>
            </div>
        )
    }

    // Data is already processed and sorted by backend
    const allUpcoming = upcoming || []

    // Calculate percentages for cost distribution
    const totalCost = stats?.monthlyCost || 0
    const calculatePct = (val) => totalCost > 0 ? ((val || 0) / totalCost) * 100 : 0

    const costPcts = {
        service: calculatePct(stats?.costDistribution?.service),
        maintenance: calculatePct(stats?.costDistribution?.maintenance),
        inspection: calculatePct(stats?.costDistribution?.inspection),
        insurance: calculatePct(stats?.costDistribution?.insurance),
    }

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gösterge Paneli</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>Filo durum özeti ve performans metrikleri.</p>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <Link to="/vehicles" className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px' }}>
                    <PlusCircle size={18} className="text-primary" /> Araç Ekle
                </Link>
                <Link to="/maintenance" className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px' }}>
                    <PlusCircle size={18} className="text-warning" /> Bakım Ekle
                </Link>
                <Link to="/services" className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px' }}>
                    <PlusCircle size={18} className="text-success" /> Tamir Ekle
                </Link>
                <Link to="/reports" className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px' }}>
                    <ClipboardCheck size={18} className="text-info" /> Rapor Al
                </Link>
            </div>

            {/* Main Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                {/* Total Vehicles */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">TOPLAM ARAÇ</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><Car size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats?.totalVehicles || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span className="text-success" style={{ fontWeight: '600' }}>{stats?.activeVehicles || 0}</span> Aktif
                        </div>
                    </div>
                </div>

                {/* Monthly Cost */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">BU AY HARCAMA</div>
                        <div className="stat-icon success" style={{ width: '32px', height: '32px' }}><Wallet size={16} /></div>
                    </div>
                    <div style={{ width: '100%' }}>
                        <div className="stat-value" style={{ fontSize: '22px' }}>{formatCurrency(stats?.monthlyCost || 0)}</div>

                        {/* Cost Distribution Bar */}
                        <div style={{ display: 'flex', height: '4px', borderRadius: '2px', overflow: 'hidden', marginTop: '10px', background: 'var(--bg-tertiary)' }}>
                            <div style={{ width: `${costPcts.service}%`, background: '#3b82f6' }} title="Servis"></div>
                            <div style={{ width: `${costPcts.maintenance}%`, background: '#f59e0b' }} title="Bakım"></div>
                            <div style={{ width: `${costPcts.inspection}%`, background: '#10b981' }} title="Muayene"></div>
                            <div style={{ width: `${costPcts.insurance}%`, background: '#8b5cf6' }} title="Sigorta"></div>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">YAKLAŞAN MUAYENE</div>
                        <div className="stat-icon warning" style={{ width: '32px', height: '32px' }}><ClipboardCheck size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats?.upcomingInspections || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>30 gün içinde</div>
                    </div>
                </div>

                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">BİTEN SİGORTA</div>
                        <div className="stat-icon danger" style={{ width: '32px', height: '32px' }}><Shield size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats?.expiringInsurances || 0}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>30 gün içinde</div>
                    </div>
                </div>
            </div>

            {/* Dashboard Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

                {/* Left Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>

                    {/* Recent Activities */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={18} className="text-primary" />
                                Son Aktiviteler
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {recent.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px', fontSize: '13px' }}>
                                    Henüz aktivite yok
                                </div>
                            ) : (
                                recent.map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '12px 0',
                                        borderBottom: i < recent.length - 1 ? '1px solid var(--border-color)' : 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '8px',
                                                background: item.type === 'service' ? 'rgba(59, 130, 246, 0.1)' : item.type === 'maintenance' ? 'rgba(249, 115, 22, 0.1)' : item.type === 'inspection' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                                                color: item.type === 'service' ? '#3b82f6' : item.type === 'maintenance' ? '#f97316' : item.type === 'inspection' ? '#22c55e' : '#a855f7',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                            }}>
                                                {item.type === 'service' && <Wrench size={16} />}
                                                {item.type === 'maintenance' && <TrendingUp size={16} />}
                                                {item.type === 'inspection' && <ClipboardCheck size={16} />}
                                                {item.type === 'insurance' && <Shield size={16} />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '500', fontSize: '13px', color: 'var(--text-primary)' }}>{item.plate}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.description}</div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{item.cost ? formatCurrency(item.cost) : '-'}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDate(item.date)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Upcoming Alerts */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Yaklaşan & Gecikmiş İşlemler
                            </div>
                        </div>

                        {allUpcoming.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Yaklaşan işlem yok
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {allUpcoming.map((event, index) => {
                                    const days = getDaysUntil(event.date)
                                    const statusColor = getStatusColor(days) // danger, warning, success
                                    const colorMap = { danger: 'var(--danger)', warning: 'var(--warning)', success: 'var(--success)' }

                                    return (
                                        <div key={`${event.eventType}-${event.id}-${index}`} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            background: 'var(--bg-tertiary)',
                                            borderRadius: '6px',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{event.plate} - {event.brand} {event.model}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>{event.type}</span>
                                            </div>
                                            <div style={{ fontSize: '12px', fontWeight: '500', color: colorMap[statusColor] }}>
                                                {getDaysUntilText(event.date)}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                </div>

                {/* Right Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Fleet Status Distribution */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Filo Durumu</div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Aktif</span>
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats?.statusBreakdown?.active || 0}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }}></div>
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Pasif/Satıldı</span>
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats?.statusBreakdown?.passive || 0}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--warning)' }}></div>
                                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Bakımda</span>
                                </div>
                                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats?.statusBreakdown?.maintenance || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mileage Leaders */}
                    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                        <div className="card-header" style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', marginBottom: '0' }}>
                            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Gauge size={18} className="text-secondary" />
                                En Yüksek KM
                            </div>
                        </div>
                        <div>
                            {stats?.topVehicles?.length > 0 ? (
                                stats.topVehicles.map((vehicle, i) => (
                                    <div key={i} style={{
                                        padding: '15px 20px',
                                        borderBottom: i < stats.topVehicles.length - 1 ? '1px solid var(--border-color)' : 'none',
                                        display: 'flex', alignItems: 'center', gap: '12px'
                                    }}>
                                        <div style={{
                                            width: '24px', height: '24px', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: '50%',
                                            fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)'
                                        }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{vehicle.plate}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{vehicle.brand} {vehicle.model}</div>
                                        </div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                            {(vehicle.km || 0).toLocaleString()} km
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Veri yok</div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
