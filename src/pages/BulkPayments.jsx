import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import CustomDatePicker from '../components/CustomDatePicker'
import CustomSelect from '../components/CustomSelect'
import { formatCurrency } from '../utils/helpers'
import { Filter, DollarSign, CheckSquare, Search, Building2, Save } from 'lucide-react'

const paymentTypes = [
    { value: 'salary', label: 'Elden Maaş Ödemesi' },
    { value: 'advance', label: 'Avans Ver' },
    { value: 'loan', label: 'Borç Ver' },
    { value: 'loan_payment', label: 'Borç Tahsil Et / Kesinti' },
    { value: 'overtime_pay', label: 'Elden Mesai Ödemesi' }
]

const paymentMethods = [
    { value: 'nakit', label: 'Nakit (Dış)' },
    { value: 'banka', label: 'Banka (Dış)' },
    { value: 'kasa', label: 'Nakit (İç Kasa)' },
    { value: 'bank', label: 'Banka (İç Banka)' }
]

export default function BulkPayments() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const [employees, setEmployees] = useState([])
    const [salaries, setSalaries] = useState([])
    const [overtimes, setOvertimes] = useState([])
    const [loading, setLoading] = useState(true)

    // Form states
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
    const [paymentType, setPaymentType] = useState('advance')
    const [paymentMethod, setPaymentMethod] = useState('nakit')
    const [commonNote, setCommonNote] = useState('')
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])

    // Table specific states
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedEmpIds, setSelectedEmpIds] = useState(new Set())
    const [customAmounts, setCustomAmounts] = useState({})
    const [customNotes, setCustomNotes] = useState({})
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (currentCompany) {
            loadData()
        } else {
            setEmployees([])
            setSalaries([])
            setOvertimes([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadData = async () => {
        setLoading(true)
        try {
            // First fetch active employees
            const empRes = await window.electronAPI.getEmployees(currentCompany.id, 0)
            const activeEmployees = (empRes.data || []).filter(e => e.status === 'active')
            setEmployees(activeEmployees)

            // Then fetch salaries/overtimes for these employees using Promise.all
            // Actually, we need to make parallel queries
            const salPromises = activeEmployees.map(e => window.electronAPI.getSalaries(e.id))
            const otPromises = activeEmployees.map(e => window.electronAPI.getOvertimes(e.id))

            const allSalariesData = await Promise.all(salPromises)
            const allOvertimesData = await Promise.all(otPromises)

            let mergedSalaries = []
            let mergedOvertimes = []

            allSalariesData.forEach(res => {
                if (res.success && res.data) mergedSalaries.push(...res.data)
            })
            allOvertimesData.forEach(res => {
                if (res.success && res.data) mergedOvertimes.push(...res.data)
            })

            setSalaries(mergedSalaries)
            setOvertimes(mergedOvertimes)
        } catch (err) {
            console.error('Failed to load data for bulk payments:', err)
        }
        setLoading(false)
    }

    // Helper to get historical base salary
    const getHistoricalBaseSalary = (employee, targetMonth) => {
        if (!employee.salary_history || !Array.isArray(employee.salary_history)) return employee.salary || 0
        const sortedHistory = [...employee.salary_history].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))
        for (const record of sortedHistory) {
            const effectiveMonth = record.effective_date.substring(0, 7)
            if (targetMonth >= effectiveMonth) {
                return parseFloat(record.salary)
            }
        }
        return employee.salary || 0
    }

    // Prepare table data dynamically whenever selectedMonth, or other states change.
    const tableData = useMemo(() => {
        return employees.map(emp => {
            // Filter records for this month
            const formatMonth = (dStr) => {
                if (!dStr) return null
                return (typeof dStr === 'string' ? dStr : new Date(dStr).toISOString()).slice(0, 7)
            }
            
            const empSalaries = salaries.filter(s => s.employee_id === emp.id && s.status === 'paid' && (s.salary_month === selectedMonth || formatMonth(s.payment_date || s.created_at) === selectedMonth))
            const empOvertimes = overtimes.filter(o => o.employee_id === emp.id && formatMonth(o.date) === selectedMonth)

            const targetBase = getHistoricalBaseSalary(emp, selectedMonth)
            const targetOt = empOvertimes.reduce((sum, o) => sum + (o.amount || 0), 0)
            const netTarget = targetBase + targetOt

            const paidSalary = empSalaries.filter(s => s.period === 'salary').reduce((sum, s) => sum + (s.net_salary || 0), 0)
            const paidOt = empSalaries.filter(s => s.period === 'overtime_pay').reduce((sum, s) => sum + (s.net_salary || 0), 0)
            const paidAdvance = empSalaries.filter(s => s.period === 'advance').reduce((sum, s) => sum + (s.net_salary || 0), 0)
            
            const totalPaid = paidSalary + paidOt + paidAdvance
            const netRemaining = targetBase - paidSalary - paidAdvance + targetOt - paidOt

            const globalLoanTaken = salaries.filter(s => s.employee_id === emp.id && s.status === 'paid' && s.period === 'loan').reduce((sum, s) => sum + (s.net_salary || 0), 0)
            const globalLoanPaid = salaries.filter(s => s.employee_id === emp.id && s.status === 'paid' && s.period === 'loan_payment').reduce((sum, s) => sum + (s.net_salary || 0), 0)
            const globalRemainingLoan = globalLoanTaken - globalLoanPaid

            // Context-sensitive recommendation
            let recommendedAmount = ''
            if (paymentType === 'salary' || paymentType === 'advance') {
                recommendedAmount = netRemaining > 0 ? netRemaining : ''
            } else if (paymentType === 'loan_payment') {
                recommendedAmount = globalRemainingLoan > 0 ? globalRemainingLoan : ''
            } else if (paymentType === 'overtime_pay') {
                const remainingOt = targetOt - paidOt
                recommendedAmount = remainingOt > 0 ? remainingOt : ''
            }

            return {
                ...emp,
                targetBase,
                totalPaid,
                netRemaining,
                globalRemainingLoan,
                recommendedAmount
            }
        }).filter(item => {
            if (!searchTerm) return true
            return `${item.first_name} ${item.last_name} ${item.department} ${item.position}`.toLowerCase().includes(searchTerm.toLowerCase())
        })
    }, [employees, salaries, overtimes, selectedMonth, paymentType, searchTerm])

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedEmpIds(new Set(tableData.map(t => t.id)))
        } else {
            setSelectedEmpIds(new Set())
        }
    }

    const toggleEmp = (id) => {
        const next = new Set(selectedEmpIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedEmpIds(next)
    }

    const handleBulkSubmit = async () => {
        if (selectedEmpIds.size === 0) return
        setSaving(true)
        try {
            for (const empId of selectedEmpIds) {
                const empData = tableData.find(t => t.id === empId)
                if (!empData) continue

                let val = customAmounts[empId] || empData.recommendedAmount
                if (!val || parseFloat(val) <= 0) continue

                let note = commonNote
                if (customNotes[empId]) {
                    note = `${commonNote ? commonNote + ' - ' : ''}${customNotes[empId]}`
                }

                await window.electronAPI.createSalary({
                    employee_id: empId,
                    period: paymentType,
                    base_salary: empData.targetBase,
                    net_salary: parseFloat(val),
                    salary_month: selectedMonth,
                    payment_date: paymentDate,
                    status: 'paid',
                    payment_method: paymentMethod,
                    notes: note
                })
            }
            alert(`${selectedEmpIds.size} personele toplu işlem başarıyla eklendi!`)
            setSelectedEmpIds(new Set())
            setCustomAmounts({})
            setCustomNotes({})
            setCommonNote('')
            loadData() // Refresh to fetch new balances
        } catch (err) {
            console.error(err)
            alert("İşlem sırasında hata oluştu")
        }
        setSaving(false)
    }

    // Set amounts to default when the payment type or month basically forces a big reload
    useEffect(() => {
        setCustomAmounts({})
        setCustomNotes({})
        setSelectedEmpIds(new Set())
    }, [paymentType, selectedMonth])

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Building2 />
                </div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
            </div>
        )
    }

    return (
        <div>
            <TopProgressBar loading={loading || saving} />
            
            <div className="page-header" style={{ marginBottom: '20px' }}>
                <div>
                    <h1 className="page-title">Toplu Ödemeler</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Seçili aya dair çoklu personeller için toplu avans, maaş ve borç işlemleri yapın.</p>
                </div>
            </div>

            <div className="card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    
                    <div>
                        <label className="form-label">İşlem Yapılacak Ay</label>
                        <CustomDatePicker 
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="form-label">Ödeme / İşlem Tarihi</label>
                        <CustomDatePicker 
                            type="date"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="form-label">İşlem Tipi</label>
                        <CustomSelect 
                            options={paymentTypes}
                            value={paymentType}
                            onChange={(val) => setPaymentType(val)}
                        />
                    </div>

                    <div>
                        <label className="form-label">Ödeme Yöntemi</label>
                        <CustomSelect 
                            options={paymentMethods}
                            value={paymentMethod}
                            onChange={(val) => setPaymentMethod(val)}
                        />
                    </div>

                </div>

                <div style={{ marginTop: '16px' }}>
                    <label className="form-label">Ortak Not (Seçilmiş Cümle)</label>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Örn: Ekim ayı avans ödemesi" 
                        value={commonNote}
                        onChange={(e) => setCommonNote(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Aktif Personeller ({tableData.length})</h3>
                </div>
                <div style={{ width: '300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '38px', borderRadius: 'var(--radius-full)' }} 
                        placeholder="Personel ara..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                        <thead style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', width: '40px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={tableData.length > 0 && selectedEmpIds.size === tableData.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Personel</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Departman</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Maaş (Hesaplanan)</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Bu Ayki Kalan</th>
                                <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', width: '160px' }}>{paymentTypes.find(t => t.value === paymentType)?.label} Tutarı (₺)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>Bulunamadı.</td>
                                </tr>
                            ) : tableData.map(emp => {
                                const isSelected = selectedEmpIds.has(emp.id)
                                const val = customAmounts[emp.id] !== undefined ? customAmounts[emp.id] : emp.recommendedAmount
                                return (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s', backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent' }}>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input 
                                                type="checkbox" 
                                                onChange={() => toggleEmp(emp.id)}
                                                checked={isSelected}
                                            />
                                        </td>
                                        <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                            {emp.first_name} {emp.last_name}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{emp.department || '-'}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '13px' }}>{formatCurrency(emp.targetBase)}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--warning)', fontWeight: 600, fontSize: '13px' }}>
                                            {formatCurrency(emp.netRemaining)}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <input 
                                                type="number" 
                                                className="form-input" 
                                                placeholder="0.00"
                                                style={{ width: '100%' }}
                                                value={val}
                                                onChange={(e) => {
                                                    setCustomAmounts(prev => ({ ...prev, [emp.id]: e.target.value }))
                                                    if (!isSelected && e.target.value) {
                                                        const next = new Set(selectedEmpIds)
                                                        next.add(emp.id)
                                                        setSelectedEmpIds(next)
                                                    }
                                                }}
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedEmpIds.size > 0 && (
                <div style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-primary)', padding: '16px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px', zIndex: 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-primary-alpha)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>SEÇİLEN PERSONEL</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEmpIds.size} Kişi</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-color)' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--success-bg)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <DollarSign size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>TOPLAM ÖDENECEK</div>
                            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--success)' }}>
                                {formatCurrency(
                                    Array.from(selectedEmpIds).reduce((sum, id) => {
                                        const empData = tableData.find(t => t.id === id)
                                        const val = customAmounts[id] !== undefined ? customAmounts[id] : (empData?.recommendedAmount || 0)
                                        return sum + (parseFloat(val) || 0)
                                    }, 0)
                                )}
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-primary" style={{ marginLeft: '16px', padding: '10px 24px' }} disabled={saving} onClick={handleBulkSubmit}>
                        <Save size={18} />
                        İşlemi Onayla
                    </button>
                </div>
            )}
        </div>
    )
}
