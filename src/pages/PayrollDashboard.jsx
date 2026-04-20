import TopProgressBar from '../components/TopProgressBar'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import MonthFilter from '../components/MonthFilter'
import { formatCurrency, getHistoricalBaseSalary, formatDateForInput } from '../utils/helpers'
import { Banknote, Users, Building2, Wallet, Clock, X, Plus } from 'lucide-react'

const paymentTypes = [
    { value: 'salary', label: 'Maaş' },
    { value: 'bonus', label: 'Prim' },
    { value: 'advance', label: 'Avans' },
    { value: 'loan', label: 'Borç Alma' },
    { value: 'loan_payment', label: 'Borç Ödeme' },
    { value: 'overtime_pay', label: 'Mesai Ücreti' },
    { value: 'expense', label: 'Harcırah' },
    { value: 'other', label: 'Diğer' }
]

const paymentMethods = [
    { value: 'nakit', label: 'Nakit' },
    { value: 'kasa', label: 'Kasa' },
    { value: 'bank', label: 'Banka' },
    { value: 'salary_deduction', label: 'Maaştan Düşme' }
]

export default function PayrollDashboard() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const { openNewTab } = useTabs()
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
    const [payrollData, setPayrollData] = useState([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalCurrentSalary: 0,
        totalOvertimes: 0,
        totalPaid: 0,
        totalPending: 0
    })

    const [selectedRows, setSelectedRows] = useState([])
    const [modalOpen, setModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        period: 'salary',
        amount: '',
        paymentDate: formatDateForInput(new Date()),
        paymentMethod: 'nakit',
        status: 'paid',
        notes: '',
        useRemaining: false
    })

    useEffect(() => {
        if (currentCompany) {
            loadPayroll()
        } else {
            setPayrollData([])
            setLoading(false)
        }
    }, [currentCompany, selectedMonth])

    const loadPayroll = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getPayrollSummary(currentCompany.id, selectedMonth)
            if (result.success && result.data) {
                
                let tBase = 0;
                let tOt = 0;
                let tPaid = 0;
                let tPending = 0;

                const processedData = result.data.map(emp => {
                    const historicalBase = getHistoricalBaseSalary(emp, selectedMonth);
                    const otAmount = (emp.overtimes || [])
                        .filter(o => !(o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]')))
                        .reduce((sum, o) => sum + (o.amount || 0), 0);
                    const requiredPay = historicalBase + otAmount;
                    
                    const paidAmount = (emp.salaries || [])
                        .filter(s => s.status === 'paid')
                        .filter(s => {
                            // Borç alma (loan) maaş ödemesi değildir, yansıtma.
                            if (s.period === 'loan') return false;
                            
                            // Borç ödeme (loan_payment) sadece maaştan düşülüyorsa yansıt.
                            if (s.period === 'loan_payment') {
                                return s.payment_method === 'salary_deduction';
                            }
                            
                            return true;
                        })
                        .reduce((sum, s) => sum + (s.net_salary || 0), 0);
                    
                    const remainingPay = requiredPay - paidAmount;

                    tBase += historicalBase;
                    tOt += otAmount;
                    tPaid += paidAmount;
                    tPending += remainingPay;

                    return {
                        ...emp,
                        calc_base: historicalBase,
                        calc_overtimes: otAmount,
                        calc_required: requiredPay,
                        calc_paid: paidAmount,
                        calc_remaining: remainingPay
                    };
                });

                setPayrollData(processedData)
                setStats({
                    totalCurrentSalary: tBase,
                    totalOvertimes: tOt,
                    totalPaid: tPaid,
                    totalPending: tPending
                })
            }
        } catch (err) {
            console.error('Failed to load payroll summary:', err)
        }
        setLoading(false)
    }

    const handleOpenPaymentModal = (row = null) => {
        if (row) {
            setSelectedRows([row.id])
            setFormData({
                period: 'salary',
                amount: row.calc_remaining > 0 ? row.calc_remaining : '',
                paymentDate: formatDateForInput(new Date()),
                paymentMethod: 'kasa',
                status: 'paid',
                notes: '',
                useRemaining: false,
                salary_month: selectedMonth
            })
        } else {
            setFormData({
                period: 'advance',
                amount: '',
                paymentDate: formatDateForInput(new Date()),
                paymentMethod: 'kasa',
                status: 'paid',
                notes: '',
                useRemaining: false,
                salary_month: selectedMonth
            })
        }
        setModalOpen(true)
    }

    const handlePeriodChange = (val) => {
        setFormData(prev => {
            const isSalaryOrOvertime = val === 'salary' || val === 'overtime_pay'
            return {
                ...prev,
                period: val,
                useRemaining: isSalaryOrOvertime ? true : false,
                amount: isSalaryOrOvertime ? '' : prev.amount
            }
        })
    }

    const handlePaymentSubmit = async (e) => {
        e.preventDefault()
        if (selectedRows.length === 0) return
        setSaving(true)
        
        try {
            for (const empId of selectedRows) {
                const emp = payrollData.find(e => e.id === empId)
                if (!emp) continue

                let finalAmount = parseFloat(formData.amount) || 0
                if (formData.useRemaining) {
                    finalAmount = emp.calc_remaining
                }

                if (finalAmount !== 0) {
                    await window.electronAPI.createSalary({
                        employeeId: emp.id,
                        period: formData.period,
                        baseSalary: 0,
                        bonus: 0,
                        deduction: 0,
                        netSalary: finalAmount,
                        paymentDate: formData.paymentDate,
                        salaryMonth: formData.salary_month || selectedMonth,
                        status: formData.status,
                        paymentMethod: formData.paymentMethod,
                        notes: formData.notes
                    })
                }
            }
            setModalOpen(false)
            setSelectedRows([])
            loadPayroll()
        } catch (error) {
            console.error('Payment failed:', error)
            alert('İşlem sırasında bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const columns = [
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
            render: (value) => (
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
            )
        },
        {
            key: 'calc_base',
            label: 'Aylık Maaş',
            render: (value) => (
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                    {formatCurrency(value || 0)}
                </span>
            )
        },
        {
            key: 'calc_overtimes',
            label: 'Mesailer',
            render: (value) => (
                <span style={{ color: value > 0 ? 'var(--secondary-color)' : 'var(--text-muted)' }}>
                    {value > 0 ? formatCurrency(value) : '-'}
                </span>
            )
        },
        {
            key: 'calc_required',
            label: 'Hak Ediş',
            render: (value) => (
                <span style={{ fontWeight: '700', color: 'var(--primary-color)' }}>
                    {formatCurrency(value || 0)}
                </span>
            )
        },
        {
            key: 'calc_paid',
            label: 'Ödenen',
            render: (value) => (
                <span style={{ fontWeight: '600', color: 'var(--success)' }}>
                    {formatCurrency(value || 0)}
                </span>
            )
        },
        {
            key: 'calc_remaining',
            label: 'Durum / Bakiye',
            render: (value) => {
                const isPending = value > 0
                return isPending ? (
                    <span style={{ color: 'var(--danger)', fontWeight: '600', fontSize: '13px' }}>
                        {formatCurrency(value)}
                    </span>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', opacity: 0.8 }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'currentColor' }}></div>
                        <span style={{ fontSize: '12px', fontWeight: '500' }}>Ödendi</span>
                    </div>
                )
            }
        }
    ]

    // Summary Card Component
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
                    Maaş tablosunu görüntülemek için lütfen bir şirket seçin.
                </p>
            </div>
        )
    }

    return (
        <div>
            <TopProgressBar loading={loading} />
            <div className="page-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">Maaş & Ödeme Tablosu</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>Tüm personellerin maaş bakiyeleri ve ödeme durumları.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '200px' }}>
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
                    title="Aylık Net Maaş Toplamı" 
                    value={formatCurrency(stats.totalCurrentSalary)} 
                    icon={Users} 
                    color="var(--accent-primary)" 
                    bgColor="var(--accent-subtle)"
                />
                <StatCard 
                    title="Aylık Mesai Toplamı" 
                    value={formatCurrency(stats.totalOvertimes)} 
                    icon={Clock} 
                    color="var(--info)" 
                    bgColor="var(--info-bg)"
                />
                <StatCard 
                    title="Toplam Ödenen" 
                    value={formatCurrency(stats.totalPaid)} 
                    icon={Wallet} 
                    color="var(--success)" 
                    bgColor="var(--success-bg)"
                />
                <StatCard 
                    title="Ödenmesi Gereken" 
                    value={formatCurrency(stats.totalPending)} 
                    icon={Banknote} 
                    color="var(--warning)" 
                    bgColor="var(--warning-bg)"
                    isDanger={stats.totalPending > 0} 
                />
            </div>

            {/* Data Table */}
            <DataTable 
                persistenceKey="Payroll_table_1"
                storageKey="payroll_table_cols"
                columns={columns}
                data={payrollData}
                showSearch={true}
                searchPlaceholder="Personel Ara..."
                searchKeys={['first_name', 'last_name', 'department']}
                onSelectionChange={setSelectedRows}
                customBulkActions={(selectedIds, clearSelection) => (
                    <button 
                        className="btn-bulk-action primary" 
                        onClick={() => handleOpenPaymentModal()}
                    >
                        <Wallet size={15} />
                        Toplu İşlem Yap
                    </button>
                )}
                actions={(row) => (
                    <button 
                        className="btn-icon" 
                        title="Hızlı Ödeme Ekle" 
                        onClick={(e) => {
                            e.stopPropagation()
                            handleOpenPaymentModal(row)
                        }}
                    >
                        <Wallet size={16} />
                    </button>
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
                title={selectedRows.length > 1 ? `Toplu İşlem (${selectedRows.length} Personel)` : 'İşlem Ekle'}
            >
                <form onSubmit={handlePaymentSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomSelect
                                        label="Ödeme Türü *"
                                        value={formData.period}
                                        onChange={handlePeriodChange}
                                        options={paymentTypes}
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
                                        placeholder={formData.useRemaining ? "Bakiyeler otomatik hesaplanacak" : "Elle tutar girin..."}
                                    />

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
                                </div>

                                {/* Otomatik Bakiye Toggle Card */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                                    background: formData.useRemaining ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.useRemaining ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => setFormData({ ...formData, useRemaining: !formData.useRemaining, amount: !formData.useRemaining ? '' : formData.amount })}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.useRemaining} onChange={(e) => setFormData({ ...formData, useRemaining: e.target.checked, amount: e.target.checked ? '' : formData.amount })} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Otomatik Hesaplama</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.useRemaining ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.useRemaining ? 'Personel Bakiyelerini Otomatik Çek' : 'Sabit Tutar Girişi Yap'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '12px',
                                    background: formData.status === 'paid' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.status === 'paid' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => setFormData({ ...formData, status: formData.status === 'paid' ? 'pending' : 'paid' })}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.status === 'paid'} onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'paid' : 'pending' })} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ödeme Durumu</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.status === 'paid' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    <CustomInput
                                        label="Notlar"
                                        type="textarea"
                                        rows={2}
                                        value={formData.notes}
                                        onChange={(val) => setFormData({ ...formData, notes: val })}
                                        placeholder="Eklemek istediğiniz notlar..."
                                    />
                                </div>

                    <div className="modal-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'İşlemi Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}


