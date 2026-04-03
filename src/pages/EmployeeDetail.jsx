import { useState, useEffect } from 'react'
import TopProgressBar from '../components/TopProgressBar'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import EmployeeForm from '../components/forms/EmployeeForm'
import AssignmentForm from '../components/forms/AssignmentForm'
import { usePersistentTab } from '../hooks/usePersistentTab'
import { formatCurrency, formatDate } from '../utils/helpers'
import {
    ArrowLeft, Pencil, Trash2, Plus, AlertCircle, Users,
    Banknote, CalendarOff, Clock, Package, FileText, Settings,
    UserCheck, DollarSign, Calendar, CreditCard, User, Briefcase, Wallet
} from 'lucide-react'

const paymentTypes = [
    { value: 'salary', label: 'Maaş' },
    { value: 'bonus', label: 'Prim' },
    { value: 'advance', label: 'Avans' },
    { value: 'overtime_pay', label: 'Mesai Ücreti' },
    { value: 'expense', label: 'Harcırah' },
    { value: 'other', label: 'Diğer' }
]

const leaveTypes = [
    { value: 'annual', label: 'Yıllık İzin' },
    { value: 'sick', label: 'Hastalık İzni' },
    { value: 'unpaid', label: 'Ücretsiz İzin' },
    { value: 'maternity', label: 'Doğum İzni' },
    { value: 'other', label: 'Diğer' }
]

const leaveStatuses = [
    { value: 'approved', label: 'Onaylandı' },
    { value: 'pending', label: 'Bekliyor' },
    { value: 'rejected', label: 'Reddedildi' }
]

const paymentStatuses = [
    { value: 'paid', label: 'Ödendi' },
    { value: 'pending', label: 'Bekliyor' }
]

const assignmentStatuses = [
    { value: 'active', label: 'Aktif' },
    { value: 'returned', label: 'İade Edildi' }
]

const overtimeTypes = [
    { value: 'weekday', label: 'Hafta İçi Mesai' },
    { value: 'sunday', label: 'Pazar Mesaisi' }
]

const today = () => new Date().toISOString().split('T')[0]

const emptyForms = {
    salary: { paymentType: 'salary', amount: '', paymentDate: '', status: 'pending', notes: '' },
    leave: { type: 'annual', status: 'approved', startDate: '', endDate: '', days: 1, notes: '' },
    overtime: { overtimeType: 'weekday', date: '', hours: '', rate: 0, amount: '', notes: '' },
    assignment: { itemName: '', quantity: 1, assignedDate: '', returnDate: '', status: 'active', notes: '' }
}

const StatCard = ({ label, value, valueColor }) => (
    <div style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        padding: '14px 16px', 
        borderRadius: '12px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '4px',
        border: '1px solid var(--border-color)'
    }}>
        <div style={{ 
            fontSize: '11px', 
            color: 'var(--text-muted)', 
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.3px'
        }}>
            {label}
        </div>
        <div style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: valueColor || 'var(--text-primary)', 
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
        }}>
            {value}
        </div>
    </div>
)

export default function EmployeeDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentCompany } = useCompany()
    const { updateTabInfo } = useTabs()

    const [employee, setEmployee] = useState(null)
    const [activeTab, setActiveTab] = usePersistentTab('EmployeeDetail', 'salary')
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    const [loading, setLoading] = useState(true)

    const [salaries, setSalaries] = useState([])
    const [leaves, setLeaves] = useState([])
    const [overtimes, setOvertimes] = useState([])
    const [assignments, setAssignments] = useState([])
    const [documents, setDocuments] = useState([])

    const [modalType, setModalType] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [confirmModal, setConfirmModal] = useState(null)

    useEffect(() => {
        if (currentCompany) loadEmployeeData()
    }, [currentCompany, id])

    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({ left: activeElement.offsetLeft, width: activeElement.offsetWidth })
        }
    }, [activeTab, tabsRef, salaries, leaves, overtimes, assignments, documents])

    const loadEmployeeData = async () => {
        setLoading(true)
        try {
            const [empRes, salRes, leaveRes, otRes, assRes, docRes] = await Promise.all([
                window.electronAPI.getEmployeeById(parseInt(id)),
                window.electronAPI.getSalaries(parseInt(id)),
                window.electronAPI.getLeaves(parseInt(id)),
                window.electronAPI.getOvertimes(parseInt(id)),
                window.electronAPI.getEmployeeAssignments(parseInt(id)),
                window.electronAPI.getEmployeeDocuments(parseInt(id))
            ])
            if (empRes.success) {
                setEmployee(empRes.data)
                updateTabInfo(`/employees/${id}`, `${empRes.data.first_name} ${empRes.data.last_name}`)
            }
            if (salRes.success) setSalaries(salRes.data || [])
            if (leaveRes.success) setLeaves(leaveRes.data || [])
            if (otRes.success) setOvertimes(otRes.data || [])
            if (assRes.success) setAssignments(assRes.data || [])
            if (docRes.success) setDocuments(docRes.data || [])
        } catch (err) {
            console.error('Failed to load employee data:', err)
        }
        setLoading(false)
    }

    const getDefaultAmount = (paymentType) => {
        if (!employee) return ''
        if (paymentType === 'salary') return employee.salary || ''
        return ''
    }

    const calcOvertimeRate = (type) => {
        if (!employee || !employee.salary) return 0
        const dailyRate = employee.salary / 30
        const hourlyRate = dailyRate / 10
        if (type === 'weekday') return Math.round(hourlyRate * 1.5 * 100) / 100
        if (type === 'sunday') return Math.round(dailyRate * 1.5 * 100) / 100
        return 0
    }

    const openAddModal = (type) => {
        setModalType(type)
        setEditingItem(null)
        if (type === 'salary') {
            setFormData({ paymentType: 'salary', amount: getDefaultAmount('salary'), paymentDate: today(), status: 'pending', notes: '' })
        } else if (type === 'overtime') {
            const rate = calcOvertimeRate('weekday')
            setFormData({ overtimeType: 'weekday', date: today(), hours: '', rate, amount: '', notes: '' })
        } else if (type === 'leave') {
            setFormData({ type: 'annual', status: 'approved', startDate: today(), endDate: today(), days: 1, notes: '' })
        } else {
            setFormData({ ...(emptyForms[type] || {}) })
        }
        setError('')
    }

    const openEditModal = (type, item) => {
        setModalType(type)
        setEditingItem(item)
        setError('')
        if (type === 'salary') {
            setFormData({ paymentType: item.period || 'salary', amount: item.net_salary || '', paymentDate: item.payment_date || '', status: item.status || 'pending', notes: item.notes || '' })
        } else if (type === 'leave') {
            setFormData({ type: item.type || 'annual', status: item.status || 'approved', startDate: item.start_date || '', endDate: item.end_date || '', days: item.days || 1, notes: item.notes || '' })
        } else if (type === 'overtime') {
            const otType = item.rate && employee?.salary ? (Math.abs(item.rate - calcOvertimeRate('weekday')) < 1 ? 'weekday' : 'sunday') : 'weekday'
            setFormData({ overtimeType: otType, date: item.date || '', hours: item.hours || '', rate: item.rate || 0, amount: item.amount || '', notes: item.notes || '' })
        } else if (type === 'assignment') {
            setFormData({ itemName: item.item_name || '', quantity: item.quantity || 1, assignedDate: item.assigned_date || '', returnDate: item.return_date || '', status: item.status || 'active', notes: item.notes || '' })
        }
    }

    const closeModal = () => {
        setModalType(null)
        setEditingItem(null)
        setFormData({})
        setError('')
    }

    const updateField = (key, value) => {
        if (key === 'paymentType') {
            const defAmount = getDefaultAmount(value)
            setFormData(prev => ({ ...prev, paymentType: value, amount: defAmount }))
        } else if (key === 'overtimeType') {
            const rate = calcOvertimeRate(value)
            setFormData(prev => {
                const hours = parseFloat(prev.hours) || 0
                return { ...prev, overtimeType: value, rate, amount: hours > 0 ? Math.round(hours * rate * 100) / 100 : '' }
            })
        } else if (key === 'hours' && modalType === 'overtime') {
            const hours = parseFloat(value) || 0
            setFormData(prev => {
                const rate = prev.rate || 0
                return { ...prev, hours: value, amount: hours > 0 ? Math.round(hours * rate * 100) / 100 : '' }
            })
        } else if (modalType === 'leave' && ['startDate', 'endDate', 'days'].includes(key)) {
            setFormData(prev => {
                let newData = { ...prev, [key]: value }

                if (key === 'startDate' && newData.startDate) {
                    const days = parseInt(newData.days) || 1
                    const start = new Date(newData.startDate)
                    start.setDate(start.getDate() + days - 1)
                    newData.endDate = start.toISOString().split('T')[0]
                } else if (key === 'days' && newData.startDate) {
                    const days = parseInt(value) || 1
                    const start = new Date(newData.startDate)
                    start.setDate(start.getDate() + days - 1)
                    newData.endDate = start.toISOString().split('T')[0]
                } else if (key === 'endDate' && newData.startDate && newData.endDate) {
                    const start = new Date(newData.startDate)
                    const end = new Date(newData.endDate)
                    if (end >= start) {
                        const diffTime = end - start
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
                        newData.days = diffDays
                    }
                }

                return newData
            })
        } else {
            setFormData(prev => ({ ...prev, [key]: value }))
        }
    }

    const handleDeleteClick = (type, item, ids = null) => {
        let title = 'Silme Onayı'
        let message = 'Bu kaydı silmek istediğinize emin misiniz?'
        if (ids) {
            title = 'Toplu Silme Onayı'
            message = `${ids.length} adet kaydı silmek istediğinize emin misiniz?`
        }
        setConfirmModal({ type, item, ids, title, message })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return
        const { type, item, ids } = confirmModal
        const apiMap = { salary: 'deleteSalary', leave: 'deleteLeave', overtime: 'deleteOvertime', assignment: 'deleteEmployeeAssignment', documents: 'deleteEmployeeDocument' }
        try {
            if (ids) {
                for (const delId of ids) {
                    await window.electronAPI[apiMap[type]](delId)
                }
            } else {
                await window.electronAPI[apiMap[type]](item.id)
            }
            loadEmployeeData()
        } catch (err) { console.error('Delete failed:', err) }
        setConfirmModal(null)
    }

    const handleEmployeeSave = async (data) => {
        setSaving(true); setError('')
        try {
            const result = await window.electronAPI.updateEmployee({ id: parseInt(id), ...data })
            if (result.success) { closeModal(); loadEmployeeData() }
            else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError('Beklenmeyen hata: ' + err.message) }
        setSaving(false)
    }

    // ========== SUBMIT HANDLERS ==========

    const handleSalarySubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { employeeId: parseInt(id), period: formData.paymentType || 'salary', baseSalary: 0, bonus: 0, deduction: 0, netSalary: parseFloat(formData.amount) || 0, paymentDate: formData.paymentDate || null, status: formData.status || 'pending', notes: formData.notes || null }
        try {
            const result = editingItem ? await window.electronAPI.updateSalary({ id: editingItem.id, ...data }) : await window.electronAPI.createSalary(data)
            if (result.success) { closeModal(); loadEmployeeData() } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleLeaveSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { employeeId: parseInt(id), type: formData.type || 'annual', startDate: formData.startDate, endDate: formData.endDate, days: parseInt(formData.days) || 1, status: formData.status || 'approved', notes: formData.notes || null }
        try {
            const result = editingItem ? await window.electronAPI.updateLeave({ id: editingItem.id, ...data }) : await window.electronAPI.createLeave(data)
            if (result.success) { closeModal(); loadEmployeeData() } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleOvertimeSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { employeeId: parseInt(id), date: formData.date, hours: parseFloat(formData.hours) || 0, rate: parseFloat(formData.rate) || 1.5, amount: parseFloat(formData.amount) || 0, notes: formData.notes || null }
        try {
            const result = editingItem ? await window.electronAPI.updateOvertime({ id: editingItem.id, ...data }) : await window.electronAPI.createOvertime(data)
            if (result.success) { closeModal(); loadEmployeeData() } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { employeeId: parseInt(id), itemName: formData.itemName, quantity: parseInt(formData.quantity) || 1, assignedDate: formData.assignedDate || null, returnDate: formData.returnDate || null, status: formData.status || 'active', notes: formData.notes || null }
        try {
            const result = editingItem ? await window.electronAPI.updateEmployeeAssignment({ id: editingItem.id, ...data }) : await window.electronAPI.createEmployeeAssignment(data)
            if (result.success) { closeModal(); loadEmployeeData() } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleDocumentUpload = async () => {
        try {
            const result = await window.electronAPI.selectFile()
            if (!result || (result.canceled) || (Array.isArray(result) && result.length === 0)) return
            const filePath = Array.isArray(result) ? result[0] : result.filePaths?.[0]
            if (!filePath) return
            const fileName = filePath.split('/').pop().split('\\').pop()
            const ext = fileName.split('.').pop().toLowerCase()
            const res = await window.electronAPI.createEmployeeDocument({ employeeId: parseInt(id), fileName, filePath, fileType: ext, category: null })
            if (res.success) loadEmployeeData()
        } catch (err) { console.error('Document upload failed:', err) }
    }

    const handleDocumentOpen = async (doc) => {
        try { await window.electronAPI.openFile(doc.file_path) } catch (err) { console.error('Failed to open document:', err) }
    }

    // ========== COMPUTED VALUES ==========

    const totalPayments = salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.net_salary || 0), 0)
    const pendingPaymentCount = salaries.filter(s => s.status === 'pending').length
    const totalLeaveDays = leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0)
    const totalOvertimeHours = overtimes.reduce((sum, o) => sum + (o.hours || 0), 0)
    const activeAssignments = assignments.filter(a => a.status === 'active')

    // ========== TAB & COLUMN DEFINITIONS ==========

    const tabs = [
        { id: 'salary', label: 'Ödeme', icon: CreditCard, count: salaries.length },
        { id: 'leave', label: 'İzin', icon: CalendarOff, count: leaves.length },
        { id: 'overtime', label: 'Mesai', icon: Clock, count: overtimes.length },
        { id: 'documents', label: 'Belgeler', icon: FileText, count: documents.length }
    ]

    const salaryColumns = [
        { key: 'period', label: 'Ödeme Türü', render: (v) => paymentTypes.find(t => t.value === v)?.label || v },
        { key: 'net_salary', label: 'Tutar', render: (v) => formatCurrency(v) },
        { key: 'payment_date', label: 'Ödeme Tarihi', render: (v) => v ? formatDate(v) : '-' },
        { key: 'status', label: 'Durum', render: (v) => <span className={`badge badge-${v === 'paid' ? 'success' : 'warning'}`}>{v === 'paid' ? 'Ödendi' : 'Bekliyor'}</span> },
        { key: 'notes', label: 'Not' }
    ]

    const leaveColumns = [
        { key: 'type', label: 'Tür', render: (v) => leaveTypes.find(t => t.value === v)?.label || v },
        { key: 'start_date', label: 'Başlangıç', render: (v) => formatDate(v) },
        { key: 'end_date', label: 'Bitiş', render: (v) => formatDate(v) },
        { key: 'days', label: 'Gün' },
        { key: 'status', label: 'Durum', render: (v) => { const c = { approved: 'success', pending: 'warning', rejected: 'danger' }; const l = { approved: 'Onaylandı', pending: 'Bekliyor', rejected: 'Reddedildi' }; return <span className={`badge badge-${c[v] || 'secondary'}`}>{l[v] || v}</span> } },
        { key: 'notes', label: 'Not' }
    ]

    const overtimeColumns = [
        {
            key: 'rate', label: 'Tür', render: (v, row) => {
                if (!employee?.salary) return '-'
                const weekdayRate = calcOvertimeRate('weekday')
                return Math.abs(v - weekdayRate) < 1 ? 'Hafta İçi' : 'Pazar'
            }
        },
        { key: 'date', label: 'Tarih', render: (v) => formatDate(v) },
        { key: 'hours', label: 'Saat' },
        { key: 'amount', label: 'Tutar', render: (v) => formatCurrency(v) },
        { key: 'notes', label: 'Not' }
    ]

    const assignmentColumns = [
        { key: 'item_name', label: 'Demirbaş' },
        { key: 'quantity', label: 'Adet' },
        { key: 'assigned_date', label: 'Teslim Tarihi', render: (v) => v ? formatDate(v) : '-' },
        { key: 'return_date', label: 'İade Tarihi', render: (v) => v ? formatDate(v) : <span className="badge badge-success">Aktif</span> },
        { key: 'status', label: 'Durum', render: (v) => <span className={`badge badge-${v === 'active' ? 'success' : 'secondary'}`}>{v === 'active' ? 'Aktif' : 'İade Edildi'}</span> },
        { key: 'notes', label: 'Not' }
    ]

    const documentColumns = [
        { key: 'file_name', label: 'Dosya Adı' },
        { key: 'file_type', label: 'Tür' },
        { key: 'category', label: 'Kategori', render: (v) => v || '-' },
        { key: 'created_at', label: 'Yükleme Tarihi', render: (v) => formatDate(v) }
    ]

    // ========== RENDER ==========

    if (!employee) {
        return (
            <div className="empty-state">
                <h2 className="empty-state-title">Personel Bulunamadı</h2>
                <button className="btn btn-primary" onClick={() => navigate('/employees')}>
                    Personellere Dön
                </button>
            </div>
        )
    }

    const statusInfo = employee.status === 'active' ? { label: 'Aktif', color: 'success' } : { label: 'Pasif', color: 'secondary' }

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
                            {employee.first_name[0]}{employee.last_name[0]}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                                {employee.first_name} {employee.last_name}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <span className={`badge badge-${statusInfo.color}`}>{statusInfo.label}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>
                                    {employee.position || 'POZİSYON BELİRTİLMEDİ'} {employee.department ? `• ${employee.department}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal('employee', employee)}>
                            <Pencil size={18} /> Düzenle
                        </button>
                    </div>
                </div>
            </div>


            {/* Employee Info Section - Minimal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* Kişisel Bilgiler */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} /> Kişisel Bilgiler
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>TC Kimlik No</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{employee.tc_no || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Doğum Tarihi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {employee.birth_date ? (
                                    `${formatDate(employee.birth_date)} (${Math.floor((new Date() - new Date(employee.birth_date)) / (1000 * 60 * 60 * 24 * 365.25))} yaş)`
                                ) : '-'}
                            </div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Telefon</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{employee.phone || '-'}</div>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>E-posta</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{employee.email || '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Şirket Bilgileri */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Briefcase size={13} /> Şirket Bilgileri
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Departman</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{employee.department || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Pozisyon</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{employee.position || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>İşe Başlama</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{employee.start_date ? formatDate(employee.start_date) : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Çalışma Süresi</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                                {employee.start_date ? (() => {
                                    const start = new Date(employee.start_date);
                                    const now = new Date();
                                    const totalMonths = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth() - (now.getDate() < start.getDate() ? 1 : 0);
                                    const years = Math.floor(totalMonths / 12);
                                    const months = totalMonths % 12;
                                    if (years === 0 && months === 0) return '1 Aydan Az';
                                    let parts = [];
                                    if (years > 0) parts.push(`${years} Yıl`);
                                    if (months > 0) parts.push(`${months} Ay`);
                                    return parts.join(', ');
                                })() : '-'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Finansal Bilgiler */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wallet size={13} /> Finansal Bilgiler
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Maaş (Net)</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.salary ? formatCurrency(employee.salary) : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Hafta İçi Mesai</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{employee.salary ? formatCurrency(calcOvertimeRate('weekday')) + ' / saat' : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Pazar Mesaisi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{employee.salary ? formatCurrency(calcOvertimeRate('sunday')) + ' / gün' : '-'}</div>
                        </div>
                        {employee.notes && (
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Notlar</div>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>{employee.notes}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs - Same style as VehicleDetail */}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        {tabs.find(t => t.id === activeTab)?.label} Kayıtları
                    </h3>
                    <button className="btn btn-primary" onClick={() => activeTab === 'documents' ? handleDocumentUpload() : openAddModal(activeTab)}>
                        <Plus size={18} />
                        Ekle
                    </button>
                </div>

                {activeTab === 'salary' && (
                    <div className="tab-pane">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Toplam Ödeme</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{formatCurrency(salaries.reduce((s, i) => s + (i.net_salary || 0), 0))}</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ödenen</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>{formatCurrency(totalPayments)}</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bekleyen</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: pendingPaymentCount > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{pendingPaymentCount} kayıt</div>
                            </div>
                        </div>
                        <DataTable persistenceKey="EmployeeDetail_table_0"
                            storageKey="emp_salary_cols"
                            columns={salaryColumns}
                            data={salaries}
                            emptyMessage="Henüz ödeme kaydı bulunmuyor."
                            filters={[
                                { key: 'period', label: 'Ödeme Türü', options: paymentTypes },
                                { key: 'status', label: 'Durum', options: paymentStatuses }
                            ]}
                            onBulkDelete={(ids) => handleDeleteClick('salary', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('salary', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('salary', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'leave' && (
                    <div className="tab-pane">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Kalan Yıllık İzin</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-primary)' }}>
                                    {(() => {
                                        if (!employee.start_date) return '-'
                                        const start = new Date(employee.start_date)
                                        const birth = employee.birth_date ? new Date(employee.birth_date) : null
                                        const now = new Date()

                                        const yearsMilli = now - start
                                        const years = Math.floor(yearsMilli / (1000 * 60 * 60 * 24 * 365.25))

                                        let totalAccrued = 0
                                        for (let i = 1; i <= years; i++) {
                                            let daysThisYear = 0
                                            if (i <= 5) daysThisYear = 14 // 1 to 5 years (inclusive 5th year)
                                            else if (i < 15) daysThisYear = 20 // 6 to 14 years
                                            else daysThisYear = 26 // 15+ years

                                            // 4857 rule on age limits:
                                            if (birth) {
                                                const ageAtThatYear = Math.floor((start.getTime() + (i * 365.25 * 24 * 60 * 60 * 1000) - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
                                                if (ageAtThatYear <= 18 || ageAtThatYear >= 50) {
                                                    daysThisYear = Math.max(daysThisYear, 20)
                                                }
                                            }

                                            totalAccrued += daysThisYear
                                        }

                                        const pastUsed = employee.past_used_leaves || 0
                                        const systemUsedAnnual = leaves.filter(l => l.status === 'approved' && l.type === 'annual').reduce((acc, l) => acc + (l.days || 1), 0)
                                        return Math.max(0, totalAccrued - pastUsed - systemUsedAnnual) + ' gün'
                                    })()}
                                </div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bu Ay Kullanılan</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                                    {(() => {
                                        const now = new Date()
                                        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                        const usedThisMonth = leaves.filter(l =>
                                            l.status === 'approved' &&
                                            (l.start_date.startsWith(currentMonth) || l.end_date.startsWith(currentMonth))
                                        ).reduce((acc, l) => acc + (l.days || 1), 0)
                                        return usedThisMonth + ' gün'
                                    })()}
                                </div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bekleyen</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: leaves.filter(l => l.status === 'pending').length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{leaves.filter(l => l.status === 'pending').length} kayıt</div>
                            </div>
                        </div>
                        <DataTable persistenceKey="EmployeeDetail_table_1"
                            storageKey="emp_leave_cols"
                            columns={leaveColumns}
                            data={leaves}
                            emptyMessage="Henüz izin kaydı bulunmuyor."
                            filters={[
                                { key: 'type', label: 'İzin Türü', options: leaveTypes },
                                { key: 'status', label: 'Durum', options: leaveStatuses }
                            ]}
                            onBulkDelete={(ids) => handleDeleteClick('leave', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('leave', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('leave', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'overtime' && (
                    <div className="tab-pane">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Toplam Saat</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{totalOvertimeHours} saat</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Toplam Tutar</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{formatCurrency(overtimes.reduce((s, o) => s + (o.amount || 0), 0))}</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Kayıt Sayısı</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{overtimes.length}</div>
                            </div>
                        </div>
                        <DataTable persistenceKey="EmployeeDetail_table_2"
                            storageKey="emp_overtime_cols"
                            columns={overtimeColumns}
                            data={overtimes}
                            emptyMessage="Henüz mesai kaydı bulunmuyor."
                            onBulkDelete={(ids) => handleDeleteClick('overtime', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('overtime', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('overtime', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'assignment' && (
                    <div className="tab-pane">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Aktif Zimmet</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-primary)' }}>{activeAssignments.length}</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>İade Edilen</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{assignments.filter(a => a.status === 'returned').length}</div>
                            </div>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Toplam</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{assignments.length}</div>
                            </div>
                        </div>
                        <DataTable persistenceKey="EmployeeDetail_table_3"
                            storageKey="emp_assignment_cols"
                            columns={assignmentColumns}
                            data={assignments}
                            emptyMessage="Henüz zimmet kaydı bulunmuyor."
                            filters={[
                                { key: 'status', label: 'Durum', options: assignmentStatuses }
                            ]}
                            onBulkDelete={(ids) => handleDeleteClick('assignment', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('assignment', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('assignment', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="tab-pane">
                        <DataTable persistenceKey="EmployeeDetail_table_4"
                            storageKey="emp_document_cols"
                            columns={documentColumns}
                            data={documents}
                            emptyMessage="Belge bulunamadı"
                            onBulkDelete={(ids) => handleDeleteClick('documents', null, ids)}
                            actions={(item) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleDocumentOpen(item) }} title="Aç"><FileText size={16} /></button>
                                    <button className="danger" onClick={(e) => { e.stopPropagation(); handleDeleteClick('documents', item) }}><Trash2 size={16} /></button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* ========== MODALS ========== */}

            {/* Edit Employee Modal */}
            <Modal
                isOpen={!!modalType}
                onClose={closeModal}
                title={modalType === 'employee' ? 'Personel Düzenle' : `${editingItem ? 'Düzenle' : 'Yeni'} ${tabs.find(t => t.id === modalType)?.label || ''}`}
                size={modalType === 'employee' ? 'xl' : 'lg'}
                footer={null}
            >
                {modalType === 'employee' ? (
                    <EmployeeForm initialData={editingItem} onSubmit={handleEmployeeSave} onCancel={closeModal} loading={saving} />
                ) : (
                    <>
                        {error && (
                            <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', marginBottom: '20px' }}>
                                <AlertCircle size={20} /><span>{error}</span>
                            </div>
                        )}

                        {modalType === 'salary' && (
                            <form onSubmit={handleSalarySubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomSelect label="Ödeme Türü *" value={formData.paymentType || 'salary'} options={paymentTypes} onChange={(val) => updateField('paymentType', val)} />
                                    <CustomInput label="Tutar (₺) *" type="number" value={formData.amount || ''} onChange={(val) => updateField('amount', val)} step="0.01" required />
                                    <CustomInput label="Ödeme Tarihi" type="date" value={formData.paymentDate || ''} onChange={(val) => updateField('paymentDate', val)} />
                                    <CustomSelect label="Durum" value={formData.status || 'pending'} options={paymentStatuses} onChange={(val) => updateField('status', val)} />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <CustomInput label="Notlar" value={formData.notes || ''} onChange={(val) => updateField('notes', val)} type="textarea" rows={2} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                                </div>
                            </form>
                        )}

                        {modalType === 'leave' && (
                            <form onSubmit={handleLeaveSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomSelect label="İzin Türü *" value={formData.type || 'annual'} options={leaveTypes} onChange={(val) => updateField('type', val)} />
                                    <CustomSelect label="Durum" value={formData.status || 'approved'} options={leaveStatuses} onChange={(val) => updateField('status', val)} />
                                    <CustomInput label="Başlangıç *" type="date" value={formData.startDate || ''} onChange={(val) => updateField('startDate', val)} required />
                                    <CustomInput label="Bitiş *" type="date" value={formData.endDate || ''} onChange={(val) => updateField('endDate', val)} required />
                                    <CustomInput label="Gün Sayısı" type="number" value={formData.days || 1} onChange={(val) => updateField('days', val)} min={1} />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <CustomInput label="Notlar" value={formData.notes || ''} onChange={(val) => updateField('notes', val)} type="textarea" rows={2} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                                </div>
                            </form>
                        )}

                        {modalType === 'overtime' && (
                            <form onSubmit={handleOvertimeSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                    <CustomSelect label="Mesai Türü *" value={formData.overtimeType || 'weekday'} options={overtimeTypes} onChange={(val) => updateField('overtimeType', val)} />
                                    <CustomInput label="Tarih *" type="date" value={formData.date || ''} onChange={(val) => updateField('date', val)} required />
                                    <CustomInput label={formData.overtimeType === 'sunday' ? 'Süre (Gün) *' : 'Süre (Saat) *'} type="number" value={formData.hours || ''} onChange={(val) => updateField('hours', val)} step="0.5" min={0} required />
                                </div>
                                {employee?.salary && (
                                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            <strong>Birim Ücret:</strong> {formData.overtimeType === 'sunday' ? `${formatCurrency(calcOvertimeRate('sunday'))} / gün` : `${formatCurrency(calcOvertimeRate('weekday'))} / saat`} (Maaş üzerinden otomatik hesaplandı)
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '10px', marginTop: '4px' }}>
                                            <span>Toplam Hak Ediş:</span>
                                            <span style={{ color: 'var(--accent-primary)', fontSize: '20px', fontWeight: 700 }}>{formatCurrency(formData.amount || 0)}</span>
                                        </div>
                                    </div>
                                )}
                                <div style={{ marginTop: '16px' }}>
                                    <CustomInput label="Notlar" value={formData.notes || ''} onChange={(val) => updateField('notes', val)} type="textarea" rows={2} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                                </div>
                            </form>
                        )}

                        {modalType === 'assignment' && (
                            <form onSubmit={handleAssignmentSubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomInput label="Demirbaş Adı *" value={formData.itemName || ''} onChange={(val) => updateField('itemName', val)} required />
                                    <CustomInput label="Adet" type="number" value={formData.quantity || 1} onChange={(val) => updateField('quantity', val)} min={1} />
                                    <CustomInput label="Teslim Tarihi" type="date" value={formData.assignedDate || ''} onChange={(val) => updateField('assignedDate', val)} />
                                    <CustomInput label="İade Tarihi" type="date" value={formData.returnDate || ''} onChange={(val) => updateField('returnDate', val)} />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <CustomSelect label="Durum" value={formData.status || 'active'} options={assignmentStatuses} onChange={(val) => updateField('status', val)} />
                                </div>
                                <div style={{ marginTop: '12px' }}>
                                    <CustomInput label="Notlar" value={formData.notes || ''} onChange={(val) => updateField('notes', val)} type="textarea" rows={2} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </Modal>

            <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={handleConfirmDelete} title={confirmModal?.title} message={confirmModal?.message} />
        </div>
    )
}
