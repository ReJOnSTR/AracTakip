import { useState, useEffect, useMemo } from 'react'
import TopProgressBar from '../components/TopProgressBar'
import { useCompany } from '../context/CompanyContext'
import { formatCurrency, formatDate, getDaysUntil } from '../utils/helpers'
import { ScrollableList } from '../components/DashboardComponents'
import {
    Users,
    Briefcase,
    Calendar,
    Wallet,
    UserCheck,
    Clock,
    UserMinus,
    TrendingUp,
    PlusCircle,
    FileText,
    PieChart as PieIcon,
    Cake,
    ArrowRight,
    Search,
    Settings,
    Save,
    GripVertical,
    Banknote,
    AlertTriangle
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import Modal from '../components/Modal'
import EmployeeForm from '../components/forms/EmployeeForm'

export default function PersonelDashboard() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [employees, setEmployees] = useState([])
    const [upcomingDocs, setUpcomingDocs] = useState([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            const [empRes, docRes] = await Promise.all([
                window.electronAPI.getEmployees(currentCompany.id, 0),
                window.electronAPI.getUpcomingPersonnelDocuments(currentCompany.id)
            ])
            
            if (empRes.success) setEmployees(empRes.data || [])
            if (docRes.success) setUpcomingDocs(docRes.data || [])
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // --- Computed Stats ---
    const stats = useMemo(() => {
        const active = employees.filter(e => e.status === 'active')
        const totalSalary = active.reduce((sum, e) => sum + (parseFloat(e.salary) || 0), 0)
        
        // Birthdays this month
        const currentMonth = new Date().getMonth() + 1
        const birthdays = employees.filter(e => {
            if (!e.birth_date) return false
            const birthMonth = new Date(e.birth_date).getMonth() + 1
            return birthMonth === currentMonth
        }).sort((a, b) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate())

        // New hires this month
        const currentYear = new Date().getFullYear()
        const recentHires = employees.filter(e => {
            if (!e.start_date) return false
            const hireDate = new Date(e.start_date)
            return hireDate.getMonth() + 1 === currentMonth && hireDate.getFullYear() === currentYear
        })

        // Department breakdown
        const deptMap = {}
        active.forEach(e => {
            const d = e.department || 'Diğer'
            deptMap[d] = (deptMap[d] || 0) + 1
        })
        const deptStats = Object.entries(deptMap)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)

        // Hiring trend (last 6 months)
        const hiringTrend = []
        for (let i = 5; i >= 0; i--) {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const monthLabel = d.toLocaleString('tr-TR', { month: 'short' })
            const monthVal = d.getMonth() + 1
            const yearVal = d.getFullYear()
            
            const count = employees.filter(e => {
                if (!e.start_date) return false
                const sd = new Date(e.start_date)
                return sd.getMonth() + 1 === monthVal && sd.getFullYear() === yearVal
            }).length

            hiringTrend.push({ name: monthLabel, count })
        }

        return {
            total: employees.length,
            active: active.length,
            passive: employees.length - active.length,
            totalSalary,
            avgSalary: active.length > 0 ? totalSalary / active.length : 0,
            deptStats,
            birthdays,
            recentHires,
            hiringTrend
        }
    }, [employees])

    const allActions = useMemo(() => [
        { id: 'add-employee', label: 'Yeni Personel', icon: 'PlusCircle', path: '/employees', default: true },
        { id: 'employee-list', label: 'Personel Listesi', icon: 'Users', path: '/employees', default: true },
        { id: 'payroll', label: 'Maaş & Ödemeler', icon: 'Wallet', path: '/payroll', default: true },
        { id: 'search-employee', label: 'Personel Ara', icon: 'Search', path: '/employees', default: true },
        { id: 'reports', label: 'İK Raporları', icon: 'FileText', path: '/reports', default: false },
        { id: 'add-payment', label: 'Yeni Ödeme', icon: 'Banknote', path: '/payroll', default: false },
    ], [])

    const actionIconMap = {
        'PlusCircle': <PlusCircle size={18} color="var(--accent-primary)" />,
        'Users': <Users size={18} />,
        'Wallet': <Wallet size={18} />,
        'Search': <Search size={18} />,
        'FileText': <FileText size={18} />,
        'Banknote': <Banknote size={18} />
    }

    const [visibleActions, setVisibleActions] = useState(allActions.filter(a => a.default))
    const [showSettings, setShowSettings] = useState(false)
    const [tempActions, setTempActions] = useState([])
    const [draggedItemIndex, setDraggedItemIndex] = useState(null)

    // Load preferences
    useEffect(() => {
        if (currentCompany) {
            const saved = localStorage.getItem(`hr_dashboard_actions_${currentCompany.id}`)
            if (saved) {
                try {
                    const parsedIds = JSON.parse(saved)
                    const restored = parsedIds
                        .map(id => allActions.find(a => a.id === id))
                        .filter(Boolean)
                    if (restored.length > 0) setVisibleActions(restored)
                } catch (e) { console.error(e) }
            }
        }
    }, [currentCompany, allActions])

    const handleOpenSettings = () => {
        const visibleIds = new Set(visibleActions.map(a => a.id))
        const orderedVisible = visibleActions.map(a => ({ ...a, active: true }))
        const others = allActions.filter(a => !visibleIds.has(a.id)).map(a => ({ ...a, active: false }))
        setTempActions([...orderedVisible, ...others])
        setShowSettings(true)
    }

    const toggleAction = (id) => {
        setTempActions(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
    }

    const onDragStart = (e, index) => {
        setDraggedItemIndex(index)
        e.dataTransfer.effectAllowed = "move"
    }

    const onDragOver = (e, index) => {
        e.preventDefault()
        if (draggedItemIndex === null || draggedItemIndex === index) return
        const newItems = [...tempActions]
        const draggedItem = newItems[draggedItemIndex]
        newItems.splice(draggedItemIndex, 1)
        newItems.splice(index, 0, draggedItem)
        setTempActions(newItems)
        setDraggedItemIndex(index)
    }

    const saveSettings = () => {
        const selected = tempActions.filter(a => a.active)
        setVisibleActions(selected)
        localStorage.setItem(`hr_dashboard_actions_${currentCompany.id}`, JSON.stringify(selected.map(a => a.id)))
        setShowSettings(false)
    }

    const triggerAction = (action) => {
        if (action.id === 'add-employee') {
            setIsAddModalOpen(true)
        } else {
            navigate(action.path)
        }
    }

    const handleAddSubmit = async (formData) => {
        setSaving(true)
        try {
            const res = await window.electronAPI.createEmployee({
                companyId: currentCompany.id,
                ...formData
            })
            if (res.success) {
                setIsAddModalOpen(false)
                loadData()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    // Helper Component for Stats
    const StatCard = ({ label, value, subValue, icon: Icon, type }) => (
        <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                <div className={`stat-icon ${type}`} style={{ width: '36px', height: '36px', borderRadius: '10px' }}><Icon size={18} /></div>
            </div>
            <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
                {subValue && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{subValue}</div>}
            </div>
        </div>
    )

    return (
        <div className="page-container fade-in" style={{ paddingBottom: '40px' }}>
            <TopProgressBar loading={loading} />
            
            <div className="page-header" style={{ marginBottom: '25px' }}>
                <div>
                    <h1 className="page-title">Personel Paneli</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>İnsan kaynakları genel bakış ve yönetimi.</p>
                </div>
            </div>

            {/* Quick Actions Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h2 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Hızlı İşlemler</h2>
                <button
                    onClick={handleOpenSettings}
                    className="btn btn-secondary"
                    style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
                >
                    <Settings size={14} /> Özelleştir
                </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(visibleActions.length, 4)}, 1fr)`, gap: '15px', marginBottom: '30px' }}>
                {visibleActions.map(action => (
                    <button 
                        key={action.id}
                        className="btn btn-secondary" 
                        onClick={() => triggerAction(action)} 
                        style={{ justifyContent: 'center', height: '45px', gap: '10px', background: 'var(--bg-secondary)' }}
                    >
                        {actionIconMap[action.icon]} {action.label}
                    </button>
                ))}
                {visibleActions.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Görüntülenecek kısayol seçilmedi. Özelleştir butonundan ekleyebilirsiniz.
                    </div>
                )}
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
                <StatCard 
                    label="Toplam Personel" 
                    value={stats.total} 
                    subValue={`${stats.active} Aktif / ${stats.passive} Pasif`}
                    icon={Users} 
                    type="primary"
                />
                <StatCard 
                    label="Maaş Hakediş Yükü" 
                    value={formatCurrency(stats.totalSalary)} 
                    subValue="Bu ayki tahmini yük"
                    icon={Wallet} 
                    type="success"
                />
                <StatCard 
                    label="Ortalama Maaş" 
                    value={formatCurrency(stats.avgSalary)} 
                    subValue="Aktif personel ortalaması"
                    icon={TrendingUp} 
                    type="info"
                />
                <StatCard 
                    label="Bu Ay Katılanlar" 
                    value={stats.recentHires.length} 
                    subValue="Yeni personel girişi"
                    icon={UserCheck} 
                    type="warning"
                />
            </div>
            
            {/* Middle Row: Documents & Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '25px' }}>
                {/* Upcoming Personnel Documents */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                             Personele Ait Yaklaşan & Gecikmiş Belgeler
                        </h3>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                                <AlertTriangle size={14} />
                                Gecikmiş: {upcomingDocs.filter(e => getDaysUntil(e.expiry_date) < 0).length}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}>
                                <Calendar size={14} />
                                Yaklaşan: {upcomingDocs.filter(e => {
                                    const d = getDaysUntil(e.expiry_date)
                                    return d >= 0 && d <= 15
                                }).length}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', padding: '20px' }}>
                        {/* Overdue Column */}
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--danger)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <AlertTriangle size={14} /> Gecikenler
                            </h3>
                            <ScrollableList height="210px">
                                {upcomingDocs.filter(e => getDaysUntil(e.expiry_date) < 0).length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Geciken belge yok.</div>
                                ) : (
                                    upcomingDocs.filter(e => getDaysUntil(e.expiry_date) < 0).map((doc) => {
                                        const days = getDaysUntil(doc.expiry_date)
                                        return (
                                            <div 
                                                key={doc.id} 
                                                onClick={() => navigate(`/employees?tab=documents&id=${doc.employees?.id}`)}
                                                style={{
                                                    padding: '12px',
                                                    background: 'rgba(239, 68, 68, 0.03)',
                                                    border: '1px solid rgba(239, 68, 68, 0.15)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{doc.employees?.first_name} {doc.employees?.last_name}</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--danger)' }}>{Math.abs(days)} gün geçti</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.category || 'Belge'} • {doc.file_name}</div>
                                            </div>
                                        )
                                    })
                                )}
                            </ScrollableList>
                        </div>

                        {/* Divider */}
                        <div style={{ width: '1px', background: 'var(--border-color)' }}></div>

                        {/* Upcoming Column */}
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: '600', color: 'var(--warning)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Calendar size={14} /> Yaklaşanlar
                            </h3>
                            <ScrollableList height="210px">
                                {upcomingDocs.filter(e => {
                                    const days = getDaysUntil(e.expiry_date)
                                    return days >= 0 && days <= 15
                                }).length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>Yaklaşan belge yok.</div>
                                ) : (
                                    upcomingDocs.filter(e => {
                                        const days = getDaysUntil(e.expiry_date)
                                        return days >= 0 && days <= 15
                                    }).map((doc) => {
                                        const days = getDaysUntil(doc.expiry_date)
                                        return (
                                            <div 
                                                key={doc.id} 
                                                onClick={() => navigate(`/employees?tab=documents&id=${doc.employees?.id}`)}
                                                style={{
                                                    padding: '12px',
                                                    background: 'rgba(245, 158, 11, 0.03)',
                                                    border: '1px solid rgba(245, 158, 11, 0.15)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    marginBottom: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{doc.employees?.first_name} {doc.employees?.last_name}</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--warning)' }}>{days === 0 ? 'Bugün' : `${days} gün kaldı`}</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{doc.category || 'Belge'} • {doc.file_name}</div>
                                            </div>
                                        )
                                    })
                                )}
                            </ScrollableList>
                        </div>
                    </div>
                </div>

                {/* Department Distribution */}
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PieIcon size={16} color="var(--accent-primary)" />
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Departman Dağılımı</h3>
                    </div>
                    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {stats.deptStats.slice(0, 7).map((d, i) => (
                            <div key={i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{d.name}</span>
                                    <span style={{ fontSize: '12px', fontWeight: '700' }}>{d.count}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div 
                                        style={{ 
                                            width: `${(d.count / stats.active) * 100}%`, 
                                            height: '100%', 
                                            background: 'var(--accent-primary)', 
                                            borderRadius: '3px'
                                        }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                {/* Upcoming Birthdays */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Cake size={18} color="var(--accent-primary)" /> Bu Ayki Doğum Günleri
                        </h3>
                    </div>
                    <div style={{ padding: '10px 0' }}>
                        {stats.birthdays.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Bu ay doğum günü bulunmuyor.</div>
                        ) : stats.birthdays.slice(0, 5).map((e, i) => (
                            <div key={i} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontWeight: '700', fontSize: '14px', textAlign: 'center', lineHeight: '36px' }}>
                                        {e.first_name[0]}{e.last_name[0]}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{e.first_name} {e.last_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.department} • {new Date(e.birth_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</div>
                                    </div>
                                </div>
                                <div style={{ color: 'var(--accent-primary)' }}><ArrowRight size={16} /></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Hires */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <UserCheck size={18} color="var(--success)" /> Yeni Katılanlar (Son 5)
                        </h3>
                    </div>
                    <div style={{ padding: '10px 0' }}>
                        {employees.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Kayıtlı personel bulunmuyor.</div>
                        ) : [...employees].sort((a,b) => new Date(b.start_date) - new Date(a.start_date)).slice(0, 5).map((e, i) => (
                            <div key={i} style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: '600' }}>{e.first_name} {e.last_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.department} • {e.position}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{formatDate(e.start_date)}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--success)' }}>Katıldı</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Action Modal */}
            <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Personel Kaydı" size="xl">
                <EmployeeForm onSubmit={handleAddSubmit} onCancel={() => setIsAddModalOpen(false)} loading={saving} />
            </Modal>

            {/* Customization Modal */}
            <Modal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                title="Hızlı İşlemler Ayarları"
                size="default"
                footer={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', width: '100%' }}>
                        <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>İptal</button>
                        <button className="btn btn-primary" onClick={saveSettings}>
                            <Save size={16} /> Kaydet
                        </button>
                    </div>
                }
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', padding: '5px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Dashboard'da görmek istediğiniz kısayolları seçin. Sıralamak için sürükleyip bırakabilirsiniz.
                    </p>
                    {tempActions.map((action, index) => (
                        <div
                            key={action.id}
                            draggable
                            onDragStart={(e) => onDragStart(e, index)}
                            onDragOver={(e) => onDragOver(e, index)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 0',
                                borderBottom: '1px solid var(--border-color)',
                                cursor: 'grab',
                                opacity: draggedItemIndex === index ? 0.3 : 1,
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ color: 'var(--text-muted)', cursor: 'grab' }}>
                                    <GripVertical size={16} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>{action.label}</span>
                            </div>

                            <div
                                onClick={() => toggleAction(action.id)}
                                style={{
                                    width: '36px',
                                    height: '20px',
                                    background: action.active ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                                    borderRadius: '10px',
                                    padding: '2px',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: action.active ? 'flex-end' : 'flex-start'
                                }}>
                                <div style={{ width: '16px', height: '16px', background: '#fff', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    )
}
