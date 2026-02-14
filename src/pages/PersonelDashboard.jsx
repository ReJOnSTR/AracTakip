import { useState, useEffect } from 'react'
import { useCompany } from '../context/CompanyContext'
import { formatDate, formatCurrency } from '../utils/helpers'
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
    FileText
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function PersonelDashboard() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        passive: 0,
        totalSalary: 0,
        upcomingLeaves: [],
        departmentStats: []
    })

    useEffect(() => {
        if (currentCompany) {
            loadStats()
        }
    }, [currentCompany])

    const loadStats = async () => {
        setLoading(true)
        try {
            // Fetch all employees to calculate stats on client side (or backend if specialized endpoint exists)
            // For now, simpler to fetch list and compute
            const res = await window.electronAPI.getEmployees(currentCompany.id, false) // false = not only active, get all
            if (res.success) {
                const employees = res.data
                const active = employees.filter(e => e.status === 'active')
                const passive = employees.filter(e => e.status !== 'active')
                const totalSalary = active.reduce((sum, e) => sum + (parseFloat(e.salary) || 0), 0)

                // Group by department
                const depts = {}
                active.forEach(e => {
                    const d = e.department || 'Diğer'
                    depts[d] = (depts[d] || 0) + 1
                })
                const deptStats = Object.entries(depts).map(([name, count]) => ({ name, count }))

                setStats({
                    total: employees.length,
                    active: active.length,
                    passive: passive.length,
                    totalSalary,
                    departmentStats: deptStats,
                    upcomingLeaves: [] // To be implemented with backend endpoint if needed
                })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>

    return (
        <div style={{ paddingBottom: '40px' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Personel Paneli</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-muted)' }}>İnsan kaynakları genel bakış ve yönetimi.</p>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="quick-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <Link to="/employees" className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px' }}>
                    <Users size={18} /> Personel Listesi
                </Link>
                <div className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px', opacity: 0.5, cursor: 'not-allowed' }} title="Yakında">
                    <Calendar size={18} /> İzin Takvimi
                </div>
                <div className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px', opacity: 0.5, cursor: 'not-allowed' }} title="Yakında">
                    <Wallet size={18} /> Bordro
                </div>
                <div className="btn btn-secondary" style={{ justifyContent: 'center', height: '42px', gap: '8px', opacity: 0.5, cursor: 'not-allowed' }} title="Yakında">
                    <FileText size={18} /> Raporlar
                </div>
            </div>

            {/* Main Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                {/* Total Personnel */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">TOPLAM PERSONEL</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><Users size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats.total}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            <span className="text-success" style={{ fontWeight: '600' }}>{stats.active}</span> Aktif
                        </div>
                    </div>
                </div>

                {/* Total Salary Cost */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">AYLIK MAAŞ YÜKÜ</div>
                        <div className="stat-icon success" style={{ width: '32px', height: '32px' }}><Wallet size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '22px' }}>{formatCurrency(stats.totalSalary)}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Tahmini net hakediş
                        </div>
                    </div>
                </div>

                {/* Active Ratio */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">AKTİFLİK ORANI</div>
                        <div className="stat-icon warning" style={{ width: '32px', height: '32px' }}><TrendingUp size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">
                            {stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Personel verimliliği
                        </div>
                    </div>
                </div>

                {/* Departments Check */}
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">DEPARTMAN</div>
                        <div className="stat-icon info" style={{ width: '32px', height: '32px' }}><Briefcase size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value">{stats.departmentStats.length}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Farklı birim
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Departman Dağılımı</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '10px 0' }}>
                        {stats.departmentStats.length === 0 ? (
                            <div className="text-muted" style={{ fontSize: '13px', textAlign: 'center' }}>Veri yok</div>
                        ) : stats.departmentStats.map((d, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{d.name}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '100px', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${(d.count / stats.active) * 100}%`, height: '100%', background: 'var(--accent-primary)' }}></div>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: '600', width: '20px', textAlign: 'right' }}>{d.count}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Placeholder for Upcoming Leaves or Birthdays */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Durum Özeti</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Aktif Çalışan</span>
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.active}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--danger)' }}></div>
                                <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Ayrılan/Pasif</span>
                            </div>
                            <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{stats.passive}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
