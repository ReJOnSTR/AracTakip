import { useState, useEffect, useMemo } from 'react'
import { useCompany } from '../context/CompanyContext'
import { Check, Info, Users, Search, AlertCircle, RefreshCw } from 'lucide-react'
import MonthFilter from '../components/MonthFilter'
import CustomDatePicker from '../components/CustomDatePicker'
import CustomSelect from '../components/CustomSelect'
import { formatCurrency, getHistoricalBaseSalary } from '../utils/helpers'
import { useNotification } from '../hooks/useNotification'
import DataTable from '../components/DataTable'

export default function BulkPayments() {
    const { currentCompany } = useCompany()
    const notify = useNotification()

    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [employeesData, setEmployeesData] = useState([])
    const [searchQuery, setSearchQuery] = useState('')

    // Bulk form state
    const [paymentParams, setPaymentParams] = useState({
        period: 'advance', // salary, advance, overtime_pay, loan, vs
        paymentMethod: 'nakit',
        paymentDate: new Date().toISOString().split('T')[0],
        commonNote: ''
    })

    // Selections and custom amounts
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [customAmounts, setCustomAmounts] = useState({}) // { empId: amount }

    const paymentTypes = [
        { value: 'salary', label: 'Maaş Ödemesi' },
        { value: 'advance', label: 'Avans' },
        { value: 'overtime_pay', label: 'Mesai Ödemesi' },
        { value: 'loan', label: 'Borç Alma' }
    ]

    const paymentMethods = [
        { value: 'nakit', label: 'Nakit' },
        { value: 'kasa', label: 'Kasa' },
        { value: 'bank', label: 'Banka' }
    ]

    const loadData = async () => {
        if (!currentCompany) return
        setLoading(true)
        setSelectedIds(new Set())
        setCustomAmounts({})

        try {
            // Sadece aktif çalışanları getir
            const resEmp = await window.electronAPI.getEmployees(currentCompany.id, false)
            if (!resEmp.success) throw new Error(resEmp.error)
            
            const activeEmployees = resEmp.data.filter(e => e.status === 'active')

            // Her çalışan için ayın maaş, mesai vb kayıtlarını paralel çekelim
            const enhancedData = await Promise.all(activeEmployees.map(async (emp) => {
                const [salRes, otRes] = await Promise.all([
                    window.electronAPI.getSalaries(emp.id),
                    window.electronAPI.getOvertimes(emp.id)
                ])

                const salaries = salRes.success ? salRes.data : []
                const overtimes = otRes.success ? otRes.data : []

                // Hesaplamalar
                const monthlySalaries = salaries.filter(s => {
                    if (s.salary_month) return s.salary_month === selectedMonth
                    if (!s.payment_date && !s.created_at) return false
                    const d = s.payment_date || s.created_at
                    const dStr = typeof d === 'string' ? d : new Date(d).toISOString()
                    return dStr.startsWith(selectedMonth)
                })

                const monthlyOvertimes = overtimes.filter(o => o.date && o.date.startsWith(selectedMonth))
                
                const baseSalaryTarget = getHistoricalBaseSalary(emp, selectedMonth) || 0
                const totalOtTarget = monthlyOvertimes.reduce((sum, o) => sum + (o.amount || 0), 0)
                
                const paidSalary = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'salary').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                const paidOt = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'overtime_pay').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                const paidAdvance = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'advance').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                
                const remainingSalary = baseSalaryTarget - paidSalary - paidAdvance
                const remainingOt = totalOtTarget - paidOt

                return {
                    ...emp,
                    baseSalaryTarget,
                    totalOtTarget,
                    paidSalary,
                    paidAdvance,
                    paidOt,
                    remainingSalary,
                    remainingOt,
                    totalTarget: baseSalaryTarget + totalOtTarget,
                    totalPaid: paidSalary + paidAdvance + paidOt
                }
            }))

            setEmployeesData(enhancedData)

            // Auto-fill custom amounts based on selected payment type?
            // Optionally we can initialize them here with defaults:
            const initialAmounts = {}
            enhancedData.forEach(e => {
                initialAmounts[e.id] = (paymentParams.period === 'salary') ? e.remainingSalary : ''
            })
            setCustomAmounts(initialAmounts)

        } catch (err) {
            console.error('Data load error:', err)
            notify.error('Veriler yüklenirken bir hata oluştu.')
        } finally {
            setLoading(false)
        }
    }

    // Seçili ay veya şirket değiştiğinde veriyi tekrar çek
    useEffect(() => {
        loadData()
    }, [currentCompany, selectedMonth])

    // Ödeme tipi değiştiğinde varsayılan tutarları güncelle
    useEffect(() => {
        const defaultAmounts = {}
        employeesData.forEach(e => {
            if (paymentParams.period === 'salary') {
                defaultAmounts[e.id] = e.remainingSalary > 0 ? e.remainingSalary : 0
            } else if (paymentParams.period === 'overtime_pay') {
                defaultAmounts[e.id] = e.remainingOt > 0 ? e.remainingOt : 0
            } else {
                defaultAmounts[e.id] = '' // Avans veya borç için genellikle özel belirlerler
            }
        })
        setCustomAmounts(prev => ({ ...prev, ...defaultAmounts }))
    }, [paymentParams.period, employeesData])

    const filteredEmployees = useMemo(() => {
        if (!searchQuery) return employeesData
        const lowerQ = searchQuery.toLowerCase()
        return employeesData.filter(e => 
            (e.first_name && e.first_name.toLowerCase().includes(lowerQ)) ||
            (e.last_name && e.last_name.toLowerCase().includes(lowerQ)) ||
            (e.department && e.department.toLowerCase().includes(lowerQ))
        )
    }, [employeesData, searchQuery])

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredEmployees.length) {
            setSelectedIds(new Set())
        } else {
            const allIds = filteredEmployees.map(e => e.id)
            setSelectedIds(new Set(allIds))
        }
    }

    const toggleEmployee = (id) => {
        const newSet = new Set(selectedIds)
        if (newSet.has(id)) {
            newSet.delete(id)
        } else {
            newSet.add(id)
        }
        setSelectedIds(newSet)
    }

    const handleAmountChange = (id, val) => {
        setCustomAmounts(prev => ({ ...prev, [id]: val }))
        // Seçili değilsa otomatik seçelim
        if (Number(val) > 0 && !selectedIds.has(id)) {
            const newSet = new Set(selectedIds)
            newSet.add(id)
            setSelectedIds(newSet)
        }
    }

    const handleBulkPay = async () => {
        if (selectedIds.size === 0) {
            notify.warning('Lütfen ödeme yapılacak en az bir personel seçin.')
            return
        }

        // Validate amounts
        const payload = []
        for (const id of selectedIds) {
            const emp = employeesData.find(e => e.id === id)
            const amtStr = customAmounts[id]
            const amtFloat = parseFloat(amtStr)
            
            if (!amtStr || isNaN(amtFloat) || amtFloat <= 0) {
                notify.warning(`${emp.first_name} ${emp.last_name} için geçerli bir tutar girmelisiniz. İşlem iptal edildi.`)
                return
            }

            payload.push({
                employeeId: id,
                paymentType: paymentParams.period,
                amount: amtFloat,
                paymentDate: paymentParams.paymentDate || new Date().toISOString().split('T')[0],
                salaryMonth: selectedMonth,
                status: 'paid',
                paymentMethod: paymentParams.paymentMethod,
                notes: paymentParams.commonNote
            })
        }

        if (!confirm(`Seçili ${selectedIds.size} personele toplamda ${formatCurrency(payload.reduce((s, p) => s + p.amount, 0))} değerinde toplu ${paymentTypes.find(t => t.value === paymentParams.period)?.label} kaydedilecek.\n\nEmin misiniz?`)) {
            return
        }

        setProcessing(true)
        try {
            // Paralel API call'ları
            const results = await Promise.all(payload.map(p => 
                window.electronAPI.createSalary({
                    employee_id: p.employeeId,
                    period: p.paymentType,
                    status: p.status,
                    net_salary: p.amount,
                    payment_date: p.paymentDate,
                    salary_month: p.salaryMonth,
                    payment_method: p.paymentMethod,
                    notes: p.notes
                })
            ))

            const failures = results.filter(r => !r.success)
            if (failures.length > 0) {
                notify.error(`${failures.length} işlemin kaydında hata oluştu! Kısmı başarı.`)
                console.error("Failures:", failures)
            } else {
                notify.success(`Tüm ödemeler (${selectedIds.size} işlem) başarıyla kaydedildi!`)
            }
            
            // Temizle ve tekrar yükle
            setPaymentParams(prev => ({ ...prev, commonNote: '' }))
            loadData()

        } catch (err) {
            console.error('Bulk pay error:', err)
            notify.error('İşlem sırasında beklenmeyen bir hata oluştu.')
        } finally {
            setProcessing(false)
        }
    }

    const columns = [
        {
            key: 'checkbox',
            label: (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                        type="checkbox" 
                        checked={selectedIds.size > 0 && selectedIds.size === filteredEmployees.length}
                        onChange={toggleSelectAll}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                </div>
            ),
            width: '40px',
            render: (_, item) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggleEmployee(item.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                </div>
            )
        },
        {
            key: 'name',
            label: 'Personel',
            render: (_, item) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{item.first_name} {item.last_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.department || '-'}</div>
                </div>
            )
        },
        {
            key: 'balance',
            label: 'Hedef Bakiye',
            render: (_, item) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.totalTarget)}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        (Maaş: {formatCurrency(item.baseSalaryTarget)} | Mesai: {formatCurrency(item.totalOtTarget)})
                    </span>
                </div>
            )
        },
        {
            key: 'paid',
            label: 'Ödenen',
            render: (_, item) => (
                <div style={{ fontWeight: 500, color: 'var(--success)' }}>
                    {formatCurrency(item.totalPaid)}
                </div>
            )
        },
        {
            key: 'remaining',
            label: 'Kalan Bakiye',
            render: (_, item) => (
                <div style={{ fontWeight: 600, color: item.remainingSalary > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    {formatCurrency(item.remainingSalary)}
                </div>
            )
        },
        {
            key: 'customAmount',
            label: 'İşlem Görecek Tutar',
            render: (_, item) => (
                <div style={{ padding: '4px 0' }} onClick={e => e.stopPropagation()}>
                    <input 
                        type="number" 
                        className="form-input" 
                        style={{ width: '140px', padding: '6px 12px', textAlign: 'right', fontWeight: 600, borderColor: selectedIds.has(item.id) ? 'var(--accent-primary)' : 'var(--border-color)' }}
                        placeholder="0.00"
                        value={customAmounts[item.id] !== undefined ? customAmounts[item.id] : ''}
                        onChange={(e) => handleAmountChange(item.id, e.target.value)}
                    />
                </div>
            )
        }
    ]

    return (
        <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Users size={28} style={{ color: 'var(--accent-primary)' }} />
                        Toplu Personel Ödemeleri
                    </h1>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14.5px' }}>
                        Personellere tek seferde maaş, avans veya mesai ödemesi yapın. Soldan personelleri seçip, sağ taraftan işlemi tamamlayın.
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '24px', alignItems: 'start' }}>
                {/* Left Side: Table & Filters */}
                <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input 
                                    type="text"
                                    className="form-input"
                                    placeholder="Personel ara..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '38px', width: '280px', borderRadius: 'var(--radius-full)' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Dönem Seçimi:</span>
                            <div style={{ width: '160px' }}>
                                <MonthFilter value={selectedMonth} onChange={setSelectedMonth} />
                            </div>
                            <button className="btn btn-secondary btn-icon" onClick={loadData} disabled={loading} title="Verileri Güncelle" style={{ padding: '8px' }}>
                                <RefreshCw size={18} className={loading ? 'spinning' : ''} />
                            </button>
                        </div>
                    </div>

                    <div style={{ position: 'relative', overflowX: 'auto' }}>
                        <DataTable 
                            persistenceKey="BulkPayments_table"
                            columns={columns}
                            data={filteredEmployees}
                            loading={loading}
                            emptyMessage="Bu dönem için personel kaydı bulunamadı."
                            onRowClick={(item) => toggleEmployee(item.id)}
                            disablePagination={true}
                        />
                    </div>
                </div>

                {/* Right Side: Setup & Checkout */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '24px' }}>
                    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', color: 'var(--text-primary)' }}>
                            İşlem Detayları
                        </h3>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>İşlem Tipi</label>
                            <CustomSelect 
                                options={paymentTypes}
                                value={paymentParams.period}
                                onChange={val => setPaymentParams(prev => ({ ...prev, period: val }))}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Ödeme Yöntemi</label>
                            <CustomSelect 
                                options={paymentMethods}
                                value={paymentParams.paymentMethod}
                                onChange={val => setPaymentParams(prev => ({ ...prev, paymentMethod: val }))}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Ödeme Tarihi</label>
                            <CustomDatePicker 
                                value={paymentParams.paymentDate}
                                onChange={val => setPaymentParams(prev => ({ ...prev, paymentDate: val }))}
                            />
                        </div>
                        
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>Ortak Açıklama (Not)</label>
                            <textarea 
                                className="form-input" 
                                placeholder={`Örn: ${paymentTypes.find(t => t.value === paymentParams.period)?.label || ''} toplu işlemi...`}
                                value={paymentParams.commonNote}
                                onChange={e => setPaymentParams(prev => ({ ...prev, commonNote: e.target.value }))}
                                rows={3}
                                style={{ resize: 'none' }}
                            />
                        </div>
                    </div>

                    <div className="card" style={{ padding: '24px', background: 'var(--bg-primary)', border: '2px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Seçilen Personel</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, color: selectedIds.size > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                    {selectedIds.size}
                                </span>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Toplam Tutar</span>
                                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                    {formatCurrency(
                                        Array.from(selectedIds).reduce((sum, id) => {
                                            const amt = parseFloat(customAmounts[id])
                                            return sum + (isNaN(amt) ? 0 : amt)
                                        }, 0)
                                    )}
                                </span>
                            </div>

                            <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }}></div>

                            <button 
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '14px', fontSize: '16px', justifyContent: 'center' }}
                                onClick={handleBulkPay}
                                disabled={selectedIds.size === 0 || processing || loading}
                            >
                                {processing ? (
                                    <><RefreshCw size={18} className="spinning" /> İşleniyor...</>
                                ) : (
                                    <><Check size={20} /> Ödemeyi Tamamla</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
