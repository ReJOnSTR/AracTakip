import TopProgressBar from '../components/TopProgressBar'
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import MonthFilter from '../components/MonthFilter'
import ConfirmModal from '../components/ConfirmModal'
import { formatCurrency, getHistoricalBaseSalary, formatDateForInput } from '../utils/helpers'
import { Clock, Users, Building2, Wallet, Banknote, X, Plus, Calendar, Calculator, Trash2 } from 'lucide-react'

const paymentMethods = [
    { value: 'nakit', label: 'Nakit' },
    { value: 'kasa', label: 'Kasa' },
    { value: 'bank', label: 'Banka' }
]

const overtimeTypes = [
    { value: 'weekday', label: 'Hafta İçi Mesai' },
    { value: 'sunday', label: 'Pazar Mesaisi' }
]

export default function Overtimes() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const { openNewTab } = useTabs()
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const saved = localStorage.getItem(`overtimes_selected_month_${currentCompany?.id || 'default'}`)
        return saved || new Date().toISOString().slice(0, 7)
    })
    
    const [overtimeData, setOvertimeData] = useState([]) // Entries for the table
    const [summaryData, setSummaryData] = useState([]) // Summaries for stats and payments
    const [allEmployees, setAllEmployees] = useState([])
    const [displayData, setDisplayData] = useState([]) 
    const [loading, setLoading] = useState(true)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const [selectedRows, setSelectedRows] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        amount: '',
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'kasa',
        notes: '',
        useRemaining: true,
        useAsLeave: false
    })

    const [overtimeModalOpen, setOvertimeModalOpen] = useState(false)
    const [overtimeFormData, setOvertimeFormData] = useState({
        employeeId: '',
        overtimeType: 'weekday',
        date: formatDateForInput(new Date()),
        hours: '',
        rate: 0,
        amount: '',
        notes: '',
        useAsLeave: false
    })

    // Restore Month Persistence
    useEffect(() => {
        if (currentCompany) {
            const m = localStorage.getItem(`overtimes_selected_month_${currentCompany.id}`)
            if (m) setSelectedMonth(m)
        }
    }, [currentCompany])

    useEffect(() => {
        if (selectedMonth && currentCompany) {
            localStorage.setItem(`overtimes_selected_month_${currentCompany.id}`, selectedMonth)
        }
    }, [selectedMonth, currentCompany])

    const departmentOptions = useMemo(() => {
        const depts = [...new Set(overtimeData.map(item => item.department).filter(Boolean))].sort()
        return depts.map(d => ({ value: d, label: d }))
    }, [overtimeData])

    const displayStats = useMemo(() => {
        // Stats should be based on entries in displayData
        return displayData.reduce((acc, item) => ({
            totalHours: acc.totalHours + (item.hours || 0),
            totalAmount: acc.totalAmount + (item.amount || 0),
            totalPaid: acc.totalPaid + 0, // Paid is harder to track per entry, we'll use summaryData for this
            totalPending: acc.totalPending + 0
        }), { totalHours: 0, totalAmount: 0, totalPaid: 0, totalPending: 0 })
    }, [displayData])

    // Corrected stats to use summaryData for payments
    const totalStats = useMemo(() => {
        return summaryData.reduce((acc, item) => ({
            totalPaid: acc.totalPaid + (item.calc_paid || 0),
            totalPending: acc.totalPending + (item.calc_remaining || 0)
        }), { totalPaid: 0, totalPending: 0 })
    }, [summaryData])

    useEffect(() => {
        if (currentCompany) {
            loadOvertimes()
            loadAllEmployees()
        } else {
            setOvertimeData([])
            setAllEmployees([])
            setDisplayData([])
            setLoading(false)
        }
    }, [currentCompany, selectedMonth])

    const loadAllEmployees = async () => {
        try {
            const result = await window.electronAPI.getEmployees(currentCompany.id)
            if (result.success) {
                setAllEmployees(result.data)
            }
        } catch (err) {
            console.error('Failed to load employees:', err)
        }
    }

    const loadOvertimes = async () => {
        setLoading(true)
        try {
            // We use the same payroll summary API as it returns overtimes and salaries for the month
            const result = await window.electronAPI.getPayrollSummary(currentCompany.id, selectedMonth)
            if (result.success && result.data) {
                const flatEntries = []
                const summaries = result.data.map(emp => {
                    const otEntries = (emp.overtimes || [])
                        .filter(o => !(o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]')));
                    
                    // Add to flat list
                    otEntries.forEach(ot => {
                        flatEntries.push({
                            ...ot,
                            employeeId: emp.id,
                            first_name: emp.first_name,
                            last_name: emp.last_name,
                            department: emp.department,
                            position: emp.position
                        })
                    })

                    const otAmount = otEntries.reduce((sum, o) => sum + (o.amount || 0), 0);
                    const otHours = otEntries.reduce((sum, o) => sum + (o.hours || 0), 0);
                    
                    const paidAmount = (emp.salaries || [])
                        .filter(s => s.status === 'paid' && s.period === 'overtime_pay')
                        .reduce((sum, s) => sum + (s.net_salary || 0), 0);
                    
                    const remainingPay = otAmount - paidAmount;

                    return {
                        ...emp,
                        calc_hours: otHours,
                        calc_required: otAmount,
                        calc_paid: paidAmount,
                        calc_remaining: remainingPay
                    };
                }).filter(emp => emp.calc_required > 0 || emp.calc_paid > 0);

                setOvertimeData(flatEntries)
                setSummaryData(summaries)
            }
        } catch (err) {
            console.error('Failed to load overtime summary:', err)
        }
        setLoading(false)
    }

    const calcOvertimeRate = (type, employee) => {
        if (!employee) return 0
        // Use selectedMonth for historical salary if available, otherwise current salary
        const activeSalary = employee.salary || 0
        if (!activeSalary) return 0
        
        const dailyRate = activeSalary / 30
        const hourlyRate = dailyRate / 10
        
        const weekdayMultiplier = parseFloat(localStorage.getItem('hr_overtime_weekday_multiplier')) || 1.5
        const sundayMultiplier = parseFloat(localStorage.getItem('hr_overtime_sunday_multiplier')) || 1.5
        
        if (type === 'weekday') return Math.round(hourlyRate * weekdayMultiplier * 100) / 100
        if (type === 'sunday') return Math.round(dailyRate * sundayMultiplier * 100) / 100
        return 0
    }

    const updateOvertimeField = (key, value) => {
        setOvertimeFormData(prev => {
            const newData = { ...prev, [key]: value }
            
            // Auto-calculate amount if hours or type changes
            if (key === 'hours' || key === 'overtimeType' || key === 'rate' || key === 'employeeId') {
                const hours = key === 'hours' ? parseFloat(value) : parseFloat(prev.hours)
                let rate = prev.rate
                
                if (key === 'overtimeType' || key === 'employeeId') {
                    const empId = key === 'employeeId' ? value : prev.employeeId
                    const type = key === 'overtimeType' ? value : prev.overtimeType
                    const emp = allEmployees.find(e => e.id === parseInt(empId)) || overtimeData.find(e => e.id === parseInt(empId))
                    if (emp) {
                        rate = calcOvertimeRate(type, emp)
                        newData.rate = rate
                    }
                }
                
                if (hours > 0 && rate > 0) {
                    newData.amount = Math.round(hours * rate * 100) / 100
                }
            }
            return newData
        })
    }

    const handleOpenOvertimeModal = (row = null) => {
        const empId = row ? row.id : (selectedRows.length === 1 ? selectedRows[0] : '')
        const emp = empId ? (allEmployees.find(e => e.id === empId) || overtimeData.find(e => e.id === empId)) : null
        const rate = emp ? calcOvertimeRate('weekday', emp) : 0

        setOvertimeFormData({
            employeeId: empId,
            overtimeType: 'weekday',
            date: formatDateForInput(new Date()),
            hours: '',
            rate,
            amount: '',
            notes: '',
            useAsLeave: false
        })
        setOvertimeModalOpen(true)
    }

    const handleBulkOvertimeSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const marker = '[İZİN OLARAK KULLANILDI]'
            let finalNotes = overtimeFormData.notes || ''
            if (overtimeFormData.useAsLeave && !finalNotes.includes(marker)) {
                finalNotes = (marker + ' ' + finalNotes).trim()
            }

            const targetIds = overtimeFormData.employeeId ? [parseInt(overtimeFormData.employeeId)] : selectedRows

            for (const empId of targetIds) {
                const emp = allEmployees.find(e => e.id === empId) || overtimeData.find(e => e.id === empId)
                if (!emp) continue

                // Recalculate rate/amount for each employee if salaries differ
                const rate = calcOvertimeRate(overtimeFormData.overtimeType, emp)
                const hours = parseFloat(overtimeFormData.hours) || 0
                const amount = Math.round(hours * rate * 100) / 100

                await window.electronAPI.createOvertime({
                    employeeId: emp.id,
                    date: overtimeFormData.date,
                    hours,
                    rate,
                    amount,
                    notes: finalNotes || null
                })
            }
            setOvertimeModalOpen(false)
            setSelectedRows([])
            loadOvertimes()
        } catch (error) {
            console.error('Bulk overtime creation failed:', error)
            alert('İşlem sırasında bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const handleOpenPaymentModal = (row = null) => {
        if (row) {
            setSelectedRows([row.id])
            setFormData({
                amount: row.calc_remaining > 0 ? row.calc_remaining : '',
                paymentDate: formatDateForInput(new Date()),
                paymentMethod: 'kasa',
                notes: '',
                useRemaining: true,
                useAsLeave: false,
                salary_month: selectedMonth
            })
        } else {
            setFormData({
                amount: '',
                paymentDate: formatDateForInput(new Date()),
                paymentMethod: 'kasa',
                notes: '',
                useRemaining: true,
                useAsLeave: false,
                salary_month: selectedMonth
            })
        }
        setModalOpen(true)
    }

    const handlePaymentSubmit = async (e) => {
        e.preventDefault()
        if (selectedRows.length === 0) return
        setSaving(true)
        
        try {
            if (formData.useAsLeave) {
                // ASSIGN AS LEAVE LOGIC
                const marker = '[İZİN OLARAK KULLANILDI]'
                
                for (const id of selectedRows) {
                    // Check if it's a summary ID (employeeId) or entry ID
                    // In bulk payment, selectedRows contains entry IDs now.
                    const entry = overtimeData.find(e => e.id === id)
                    if (!entry) continue

                    let finalNotes = entry.notes || ''
                    if (!finalNotes.includes(marker)) {
                        finalNotes = (marker + ' ' + finalNotes).trim()
                    }
                    
                    await window.electronAPI.updateOvertime({
                        id: entry.id,
                        employeeId: entry.employeeId,
                        date: entry.date,
                        hours: entry.hours,
                        rate: entry.rate,
                        amount: entry.amount,
                        notes: finalNotes || null
                    })
                }
            } else {
                // REGULAR PAYMENT LOGIC
                // We need to group selected entries by employee to make a single payment for each
                const employeeGroups = {}
                selectedRows.forEach(id => {
                    const entry = overtimeData.find(e => e.id === id)
                    if (entry) {
                        if (!employeeGroups[entry.employeeId]) employeeGroups[entry.employeeId] = 0
                        employeeGroups[entry.employeeId] += entry.amount
                    }
                })

                for (const [empId, amount] of Object.entries(employeeGroups)) {
                    const empSummary = summaryData.find(s => s.id === parseInt(empId))
                    if (!empSummary) continue

                    let finalAmount = amount
                    if (formData.useRemaining) {
                        finalAmount = empSummary.calc_remaining
                    }

                    if (finalAmount > 0) {
                        await window.electronAPI.createSalary({
                            employeeId: parseInt(empId),
                            period: 'overtime_pay',
                            baseSalary: 0,
                            bonus: 0,
                            deduction: 0,
                            netSalary: finalAmount,
                            paymentDate: formData.paymentDate,
                            salaryMonth: formData.salary_month || selectedMonth,
                            status: 'paid',
                            paymentMethod: formData.paymentMethod,
                            notes: formData.notes
                        })
                    }
                }
            }
            setModalOpen(false)
            setPaymentModalOpen(false)
            loadOvertimes()
        } catch (err) {
            console.error('Failed to process payment:', err)
            alert('İşlem sırasında bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return
        try {
            await window.electronAPI.deleteOvertime(deleteConfirm)
            setDeleteConfirm(null)
            loadOvertimes()
        } catch (err) {
            console.error('Failed to delete overtime:', err)
        }
    }

    const columns = [
        {
            key: 'date',
            label: 'Tarih',
            render: (val) => val ? new Date(val).toLocaleDateString('tr-TR') : '-',
            width: '100px'
        },
        {
            key: 'name',
            label: 'Ad Soyad',
            render: (_, row) => (
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                    {row.first_name} {row.last_name}
                </span>
            )
        },
        {
            key: 'department',
            label: 'Departman',
            render: (value) => value ? (
                <span style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    border: '1px solid var(--border-color)'
                }}>
                    {value}
                </span>
            ) : <span style={{ color: 'var(--text-muted)', paddingLeft: '10px' }}>-</span>
        },
        {
            key: 'hours',
            label: 'Süre',
            render: (value, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {value || 0} {row.rate > 0 && row.amount / row.rate === value && row.amount / (row.salary / 30) > 0 ? 'Gün' : 'Saat'}
                    </span>
                </div>
            )
        },
        {
            key: 'amount',
            label: 'Hakediş',
            render: (value) => (
                <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                    {formatCurrency(value || 0)}
                </span>
            )
        },
        {
            key: 'notes',
            label: 'Notlar',
            render: (val) => val ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '200px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={val}>
                    {val}
                </span>
            ) : <span style={{ color: 'var(--text-muted)' }}>-</span>
        },
        {
            key: 'calc_paid',
            label: 'Ödenen (Ay)',
            render: (_, row) => {
                const summary = summaryData.find(s => s.id === row.employeeId)
                return (
                    <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                        {formatCurrency(summary?.calc_paid || 0)}
                    </span>
                )
            }
        },
        {
            key: 'calc_remaining',
            label: 'Kalan (Ay)',
            render: (_, row) => {
                const summary = summaryData.find(s => s.id === row.employeeId)
                const value = summary?.calc_remaining || 0
                return (
                    <span style={{ 
                        fontWeight: '700', 
                        color: value > 0 ? 'var(--danger)' : (value < 0 ? 'var(--info)' : 'var(--success)'), 
                        fontSize: '14px' 
                    }}>
                        {formatCurrency(value)}
                    </span>
                )
            }
        },
        {
            key: 'status',
            label: 'Durum',
            render: (_, row) => {
                const summary = summaryData.find(s => s.id === row.employeeId)
                const val = summary?.calc_remaining || 0
                if (row.notes && row.notes.includes('[İZİN OLARAK KULLANILDI]')) return <span className="badge badge-info">İzin Olarak Atandı</span>
                if (val > 0) return <span className="badge badge-danger">Ödeme Bekliyor</span>
                if (val < 0) return <span className="badge badge-info">Fazla Ödeme</span>
                return <span className="badge badge-success">Tamamlandı</span>
            }
        }
    ]

    const StatCard = ({ title, value, icon: Icon, color, bgColor, isDanger }) => (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
            border: `1px solid var(--border-color)`
        }}>
            <div style={{
                backgroundColor: isDanger ? 'var(--danger-bg)' : (bgColor || 'var(--accent-subtle)'),
                color: isDanger ? 'var(--danger)' : color,
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={22} />
            </div>
            <div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 500 }}>
                    {title}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: isDanger ? 'var(--danger)' : 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    {value}
                </div>
            </div>
        </div>
    )

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Building2 />
                </div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">
                    Mesai tablosunu görüntülemek için lütfen bir şirket seçin.
                </p>
            </div>
        )
    }

    return (
        <div>
            <TopProgressBar loading={loading} />
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Mesai Tablosu</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>Personellerin aylık mesai saatleri ve ödemeleri.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => handleOpenOvertimeModal()}>
                        <Plus size={16} /> Yeni Mesai Kaydı
                    </button>
                    <div style={{ width: '240px' }}>
                        <MonthFilter 
                            value={selectedMonth} 
                            onChange={setSelectedMonth} 
                        />
                    </div>
                </div>
            </div>

            {/* Top Summaries */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                <StatCard 
                    title="Toplam Mesai Saati" 
                    value={`${displayStats.totalHours} Saat`} 
                    icon={Clock} 
                    color="var(--accent-primary)" 
                    bgColor="var(--accent-subtle)"
                />
                <StatCard 
                    title="Toplam Mesai Ücreti" 
                    value={formatCurrency(displayStats.totalAmount)} 
                    icon={Calculator} 
                    color="var(--info)" 
                    bgColor="var(--info-bg)"
                />
                <StatCard 
                    title="Ödenen Mesai" 
                    value={formatCurrency(totalStats.totalPaid)} 
                    icon={Wallet} 
                    color="var(--success)" 
                    bgColor="var(--success-bg)"
                />
                <StatCard 
                    title="Kalan Mesai Ödemesi" 
                    value={formatCurrency(totalStats.totalPending)} 
                    icon={Banknote} 
                    color="var(--warning)" 
                    bgColor="var(--warning-bg)"
                    isDanger={totalStats.totalPending > 0} 
                />
            </div>

            {/* Data Table */}
            <DataTable 
                persistenceKey="overtimes_table_v1"
                columns={columns}
                data={overtimeData}
                onFilteredDataChange={setDisplayData}
                filters={[
                    {
                        key: 'department',
                        label: 'Departman',
                        options: departmentOptions
                    },
                    {
                        key: 'status',
                        label: 'Ödeme Durumu',
                        options: [
                            { value: 'all', label: 'Tüm Mesailer' },
                            { value: 'weekday', label: 'Hafta İçi' },
                            { value: 'sunday', label: 'Pazar' }
                        ],
                        filterFn: (row, value) => {
                            if (value === 'all') return true
                            // Since we don't have a 'type' field in the DB yet, we infer it from hours/rate
                            // In TR logic we set: 1 sunday = 1 day, weekday = hours
                            // We can use the note marker if we add it, or just check rate logic
                            // But for now let's just use the selected month
                            return true
                        }
                    }
                ]}
                initialSort={{ key: 'date', direction: 'desc' }}
                showSearch={true}
                searchPlaceholder="Personel Ara..."
                searchKeys={['first_name', 'last_name', 'department']}
                onSelectionChange={setSelectedRows}
                customBulkActions={(selectedIds, clearSelection) => (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            className="btn-bulk-action primary" 
                            onClick={() => handleOpenPaymentModal()}
                        >
                            <Wallet size={15} />
                            Ödeme Yap
                        </button>
                        <button 
                            className="btn-bulk-action secondary" 
                            onClick={() => handleOpenOvertimeModal()}
                        >
                            <Plus size={15} />
                            Mesai Ekle
                        </button>
                    </div>
                )}
                actions={(row) => (
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                            className="btn-icon" 
                            title="Mesai Ekle" 
                            onClick={(e) => {
                                e.stopPropagation()
                                // Find employee in allEmployees or summaryData
                                const emp = allEmployees.find(e => e.id === row.employeeId) || row
                                handleOpenOvertimeModal(emp)
                            }}
                        >
                            <Plus size={16} />
                        </button>
                        <button 
                            className="btn-icon" 
                            title="Ödeme Yap" 
                            onClick={(e) => {
                                e.stopPropagation()
                                const summary = summaryData.find(s => s.id === row.employeeId)
                                if (summary) handleOpenPaymentModal(summary)
                            }}
                        >
                            <Wallet size={16} />
                        </button>
                        <button 
                            className="btn-icon danger" 
                            title="Sil" 
                            onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm(row.id)
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
                onRowClick={(item, e) => {
                    if (e.ctrlKey || e.metaKey) {
                        openNewTab(`/employees/${item.id}`, true, `${item.first_name} ${item.last_name}`)
                    } else {
                        navigate(`/employees/${item.id}`)
                    }
                }}
            />

            {/* Payment Modal */}
            <Modal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                title={selectedRows.length > 1 ? `Toplu Mesai Ödemesi (${selectedRows.length} Personel)` : 'Mesai Ödemesi Yap'}
            >
                <form onSubmit={handlePaymentSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* Assign as Leave Toggle Card */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px',
                            background: formData.useAsLeave ? 'var(--info-bg)' : 'var(--bg-tertiary)',
                            border: `1px solid ${formData.useAsLeave ? 'var(--info)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-sm)', transition: 'all 0.2s ease', cursor: 'pointer',
                            boxShadow: formData.useAsLeave ? '0 4px 12px rgba(14, 165, 233, 0.1)' : 'none'
                        }} onClick={() => setFormData({ ...formData, useAsLeave: !formData.useAsLeave })}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '10px', 
                                backgroundColor: formData.useAsLeave ? 'var(--info)' : 'var(--bg-secondary)',
                                color: formData.useAsLeave ? '#fff' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                            }}>
                                <Calendar size={20} />
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: formData.useAsLeave ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    Mesaiyi İzin Olarak Ata
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {formData.useAsLeave 
                                        ? 'Bu ayki mesailer hakedişten düşülerek izin bakiyesine eklenecek.' 
                                        : 'Mesai hakedişi nakit ödeme olarak kaydedilecek.'}
                                </span>
                            </div>
                            <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={formData.useAsLeave} onChange={(e) => setFormData({ ...formData, useAsLeave: e.target.checked })} />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>

                        {!formData.useAsLeave ? (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomInput
                                        label="Ödeme Tarihi"
                                        type="date"
                                        value={formData.paymentDate}
                                        onChange={(val) => setFormData({ ...formData, paymentDate: val })}
                                        required
                                    />

                                    <CustomInput
                                        label="Ait Olduğu Ay"
                                        type="month"
                                        value={formData.salary_month || selectedMonth}
                                        onChange={(val) => setFormData({ ...formData, salary_month: val })}
                                    />

                                    <CustomSelect
                                        label="Ödeme Kanalı"
                                        value={formData.paymentMethod}
                                        onChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                                        options={paymentMethods}
                                        required
                                    />

                                    <CustomInput
                                        label="Tutar (₺) *"
                                        type="number"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(val) => setFormData({ ...formData, amount: val })}
                                        required={!formData.useRemaining}
                                        disabled={formData.useRemaining}
                                        placeholder={formData.useRemaining ? "Bakiyeler otomatik hesaplanacak" : "Tutar girin..."}
                                    />
                                </div>

                                {/* Otomatik Bakiye Toggle Card */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px',
                                    background: formData.useRemaining ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.useRemaining ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => setFormData({ ...formData, useRemaining: !formData.useRemaining, amount: !formData.useRemaining ? '' : formData.amount })}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.useRemaining} onChange={(e) => setFormData({ ...formData, useRemaining: e.target.checked, amount: e.target.checked ? '' : formData.amount })} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bakiye Eşitleme</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.useRemaining ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.useRemaining ? 'Personel Mesai Bakiyesini Sıfırla' : 'Sabit Tutar Ödemesi Yap'}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ 
                                padding: '16px', borderRadius: '12px', border: '1px dashed var(--info)', 
                                backgroundColor: 'var(--info-bg-subtle)', color: 'var(--text-secondary)',
                                fontSize: '13px', lineHeight: '1.6'
                            }}>
                                <strong>Bilgi:</strong> Seçilen personellerin <strong>{selectedMonth}</strong> dönemine ait tüm aktif mesaileri "İzin Olarak Kullanıldı" şeklinde işaretlenecektir. Bu işlem mesai hakedişini sıfırlar ve personelin izin bakiyesinde kullanılabilir süre oluşturur.
                            </div>
                        )}

                        <div>
                            <CustomInput
                                label="Notlar"
                                type="textarea"
                                rows={2}
                                value={formData.notes}
                                onChange={(val) => setFormData({ ...formData, notes: val })}
                                placeholder={formData.useAsLeave ? "İzin ataması için ek not..." : "Mesai ödemesi açıklaması..."}
                            />
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>İptal</button>
                        <button type="submit" className={`btn btn-${formData.useAsLeave ? 'info' : 'primary'}`} disabled={saving}>
                            {saving ? 'Kaydediliyor...' : (formData.useAsLeave ? 'İzin Olarak Kaydet' : 'Ödemeyi Kaydet')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Add Overtime Modal */}
            <Modal 
                isOpen={overtimeModalOpen} 
                onClose={() => setOvertimeModalOpen(false)} 
                title={overtimeFormData.employeeId ? 'Mesai Ekle' : `Toplu Mesai Ekle (${selectedRows.length} Personel)`}
            >
                <form onSubmit={handleBulkOvertimeSubmit}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {!overtimeFormData.employeeId && selectedRows.length === 0 ? (
                            <CustomSelect 
                                label="Personel Seçin *" 
                                value={overtimeFormData.employeeId} 
                                options={allEmployees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))} 
                                onChange={(val) => updateOvertimeField('employeeId', val)} 
                                required
                            />
                        ) : overtimeFormData.employeeId ? (
                            <div style={{ padding: '10px 14px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '14px', fontWeight: 600 }}>
                                {(() => {
                                    const emp = allEmployees.find(e => e.id === parseInt(overtimeFormData.employeeId)) || overtimeData.find(e => e.id === parseInt(overtimeFormData.employeeId))
                                    return emp ? `${emp.first_name} ${emp.last_name}` : 'Personel'
                                })()}
                            </div>
                        ) : null}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            <CustomSelect 
                                label="Mesai Türü *" 
                                value={overtimeFormData.overtimeType} 
                                options={overtimeTypes} 
                                onChange={(val) => updateOvertimeField('overtimeType', val)} 
                            />
                            <CustomInput 
                                label="Tarih *" 
                                type="date" 
                                value={overtimeFormData.date} 
                                onChange={(val) => updateOvertimeField('date', val)} 
                                required 
                            />
                            <CustomInput 
                                label={overtimeFormData.overtimeType === 'sunday' ? 'Süre (Gün) *' : 'Süre (Saat) *'} 
                                type="number" 
                                value={overtimeFormData.hours} 
                                onChange={(val) => updateOvertimeField('hours', val)} 
                                step="0.5" 
                                min={0} 
                                required 
                            />
                        </div>

                        {/* Assign as Leave Toggle Card */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px',
                            background: overtimeFormData.useAsLeave ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                            border: `1px solid ${overtimeFormData.useAsLeave ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                        }} onClick={() => updateOvertimeField('useAsLeave', !overtimeFormData.useAsLeave)}>
                            <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={overtimeFormData.useAsLeave} onChange={(e) => updateOvertimeField('useAsLeave', e.target.checked)} />
                                <span className="toggle-slider"></span>
                            </label>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesaiyi İzin Olarak Kullan</span>
                                    {overtimeFormData.useAsLeave && overtimeFormData.hours > 0 && (
                                        <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                            + {(() => {
                                                const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
                                                const sdpl = parseFloat(localStorage.getItem('hr_overtime_sunday_days_per_leave')) || 1
                                                const hours = parseFloat(overtimeFormData.hours) || 0
                                                const days = overtimeFormData.overtimeType === 'weekday' ? hours / whpl : hours / sdpl
                                                return Math.round(days * 100) / 100
                                            })()} Gün İzin
                                        </span>
                                    )}
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 600, color: overtimeFormData.useAsLeave ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                    {overtimeFormData.useAsLeave ? 'Aktif - İzin Tabına Eklenecek' : 'Pasif - Ücret Olarak Ödenecek'}
                                </span>
                            </div>
                        </div>

                        {!overtimeFormData.useAsLeave && (
                            <div style={{ 
                                padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '8px' }}>
                                    <strong>Birim Ücret:</strong> {overtimeFormData.overtimeType === 'sunday' ? `Günlük` : `Saatlik`} (Maaş üzerinden otomatik hesaplandı)
                                </div>
                                <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                                    <span>Seçili Hak Ediş:</span>
                                    <span style={{ color: 'var(--accent-primary)', fontSize: '20px', fontWeight: 700 }}>
                                        {formatCurrency(overtimeFormData.amount || 0)}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div>
                            <CustomInput
                                label="Notlar"
                                type="textarea"
                                rows={2}
                                value={overtimeFormData.notes}
                                onChange={(val) => updateOvertimeField('notes', val)}
                                placeholder="Mesai açıklaması..."
                            />
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setOvertimeModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Ekleniyor...' : 'Mesaileri Ekle'}
                        </button>
                    </div>
                </form>
            </Modal>
            {/* Delete Confirmation */}
            <ConfirmModal 
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title="Mesai Kaydını Sil"
                message="Bu mesai kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
                confirmText="Sil"
            />
        </div>
    )
}
