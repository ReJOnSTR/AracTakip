import { useState, useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import TopProgressBar from '../components/TopProgressBar'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import { useTabs } from '../context/TabContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import MonthFilter from '../components/MonthFilter'
import EmployeeForm from '../components/forms/EmployeeForm'
import AssignmentForm from '../components/forms/AssignmentForm'
import DocumentForm from '../components/forms/DocumentForm'
import DocumentGeneratorModal from '../components/DocumentGeneratorModal'
import DocumentPreviewModal from '../components/DocumentPreviewModal'
import { usePersistentTab } from '../hooks/usePersistentTab'
import { formatCurrency, formatDate, getHistoricalBaseSalary, formatDateForInput, formatDateTime, calculateLeaveDays, calculateLeaveEndDate, checkDateHolidayStatus, getLeaveBreakdown } from '../utils/helpers'
import {
    Pencil, Trash2, Plus, AlertCircle, Users,
    Banknote, CalendarOff, Clock, Package, FileText, Settings,
    UserCheck, DollarSign, Calendar, CreditCard, User, Briefcase, Wallet,
    Upload, X, ExternalLink, Archive, ArchiveRestore, Folder, ChevronRight
} from 'lucide-react'

const paymentTypes = [
    { value: 'salary', label: 'Maaş' },
    { value: 'bonus', label: 'Prim' },
    { value: 'advance', label: 'Avans' },
    { value: 'loan', label: 'Borç Alma' },
    { value: 'loan_payment', label: 'Borç Ödeme' },
    { value: 'overtime_pay', label: 'Mesai Ücreti' },
    { value: 'expense', label: 'Harcırah' },
    { value: 'carryover', label: 'Devir Bakiyesi' },
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

const paymentMethods = [
    { value: 'nakit', label: 'Nakit' },
    { value: 'kasa', label: 'Kasa' },
    { value: 'bank', label: 'Banka' },
    { value: 'salary_deduction', label: 'Maaştan Düşme' }
]

const assignmentStatuses = [
    { value: 'active', label: 'Aktif' },
    { value: 'returned', label: 'İade Edildi' }
]

const overtimeTypes = [
    { value: 'weekday', label: 'Hafta İçi Mesai' },
    { value: 'sunday', label: 'Pazar Mesaisi' },
    { value: 'holiday', label: 'Bayram Mesaisi' }
]

const today = () => new Date().toISOString().split('T')[0]

const emptyForms = {
    salary: { paymentType: 'salary', amount: '', paymentDate: '', status: 'pending', paymentMethod: 'nakit', notes: '' },
    leave: { type: 'annual', status: 'approved', startDate: '', endDate: '', days: 1, notes: '' },
    overtime: { overtimeType: 'weekday', date: '', hours: '', rate: 0, amount: '', notes: '', useAsLeave: false },
    assignment: { itemName: '', quantity: 1, assignedDate: '', returnDate: '', status: 'active', notes: '' },
    documents: { category: '', startDate: '', expiryDate: '', fileName: '', filePath: '' },
    salary_history: { amount: '', startDate: '', type: 'raise', description: '' }
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

const calculateEarnedOtDays = (o, employee, whpl, sdpl, hdpl) => {
    const isHoliday = o.notes && o.notes.includes('[BAYRAM]')
    if (isHoliday) {
        return (o.hours || 0) / hdpl
    }
    const oRate = o.rate || 0
    let isWeekday = false
    if (oRate > 0 && oRate < 5) {
        isWeekday = Math.abs(oRate - 1.5) < 0.1
    } else {
        const oDateStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString()
        const oMonth = oDateStr.slice(0, 7)
        const oSalary = getHistoricalBaseSalary(employee, oMonth) || employee.salary || 0
        const oDailyRate = oSalary / 30
        const oHourlyRate = oDailyRate / 10
        const oExpectedWeekdayRate = Math.round(oHourlyRate * 1.5 * 100) / 100
        isWeekday = Math.abs(oRate - oExpectedWeekdayRate) < (oExpectedWeekdayRate * 0.3)
    }
    const divisor = isWeekday ? whpl : sdpl
    return (o.hours || 0) / divisor
}

export default function EmployeeDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentCompany, companies } = useCompany()
    const { updateTabInfo } = useTabs()

    const [employee, setEmployee] = useState(null)
    const [activeTab, setActiveTab ] = usePersistentTab('EmployeeDetail', 'salary')
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const saved = localStorage.getItem(`payroll_selected_month_${currentCompany?.id || 'default'}`)
        return saved || new Date().toISOString().slice(0, 7)
    })
    
    // Sync with global payroll month
    useEffect(() => {
        if (currentCompany) {
            const saved = localStorage.getItem(`payroll_selected_month_${currentCompany.id}`)
            if (saved && saved !== selectedMonth) {
                setSelectedMonth(saved)
            }
        }
    }, [currentCompany])

    useEffect(() => {
        if (selectedMonth && currentCompany) {
            localStorage.setItem(`payroll_selected_month_${currentCompany.id}`, selectedMonth)
        }
    }, [selectedMonth, currentCompany])
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    const [loading, setLoading] = useState(true)

    const [salaries, setSalaries] = useState([])
    const [leaves, setLeaves] = useState([])
    const [overtimes, setOvertimes] = useState([])
    const [assignments, setAssignments] = useState([])
    const [documents, setDocuments] = useState([])
    const [currentFolder, setCurrentFolder] = useState(null)

    const [modalType, setModalType] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [departments, setDepartments] = useState([])
    const [leaveTypes, setLeaveTypes] = useState([])
    const [documentCategories, setDocumentCategories] = useState([])
    const [publicHolidays, setPublicHolidays] = useState([])
    const [documentFolders, setDocumentFolders] = useState([])
    const [customFolders, setCustomFolders] = useState([])
    const [confirmModal, setConfirmModal] = useState(null)
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [selectedUploadFile, setSelectedUploadFile] = useState(null)
    const [uploadCategory, setUploadCategory] = useState('')
    const [uploadFolder, setUploadFolder] = useState('')
    const [uploadFileName, setUploadFileName] = useState('')
    const [uploadIssueDate, setUploadIssueDate] = useState('')
    const [uploadStartDate, setUploadStartDate] = useState('')
    const [uploadExpiryDate, setUploadExpiryDate] = useState('')
    const [editDocModalOpen, setEditDocModalOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState(null)
    const [previewDoc, setPreviewDoc] = useState(null)

    // Bulk Move and Folder Operations States
    const [bulkMoveIds, setBulkMoveIds] = useState([])
    const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false)
    const [bulkMoveSelectedFolder, setBulkMoveSelectedFolder] = useState('')
    const [bulkMoveClearSelection, setBulkMoveClearSelection] = useState(null)

    // Folder Modal States
    const [folderModalOpen, setFolderModalOpen] = useState(false)
    const [folderModalMode, setFolderModalMode] = useState('create') // 'create' | 'rename'
    const [folderModalValue, setFolderModalValue] = useState('')
    const [folderModalOldValue, setFolderModalOldValue] = useState('')
    const [showLoanHistory, setShowLoanHistory] = useState(false)
    const [isDocArchiveView, setIsDocArchiveView] = useState(false)
    const [isGenModalOpen, setIsGenModalOpen] = useState(false)
    const confettiCanvasRef = useRef(null)

    useEffect(() => {
        if (currentCompany) loadEmployeeData()
    }, [currentCompany, id, isDocArchiveView])

    // Real-time synchronization listener
    const loadEmployeeDataRef = useRef(null)
    useEffect(() => {
        loadEmployeeDataRef.current = loadEmployeeData
    })
    useEffect(() => {
        if (!id) return
        const unsub = window.electronAPI?.onDbUpdate?.((change) => {
            if ([
                'employees', 'salaries', 'leaves', 'overtimes',
                'employee_assignments', 'employee_documents', 'employee_movements'
            ].includes(change?.table)) {
                console.log(`[RealTime] EmployeeDetail reloading for change in ${change.table}`)
                loadEmployeeDataRef.current(true)
            }
        })
        return () => { if (unsub) unsub() }
    }, [id])

    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({ left: activeElement.offsetLeft, width: activeElement.offsetWidth })
        }
    }, [activeTab, tabsRef, salaries, leaves, overtimes, assignments, documents])

    useEffect(() => {
        if (employee?.start_date) {
            const hireMonth = new Date(employee.start_date).toISOString().slice(0, 7)
            if (selectedMonth < hireMonth) {
                setSelectedMonth(hireMonth)
            }
        }
    }, [employee, selectedMonth])

    // Birthday Confetti Effect
    useEffect(() => {
        if (employee?.birth_date) {
            const today = new Date();
            const bDay = new Date(employee.birth_date);
            
            // Check if today matches the birth day and month
            const isBirthday = today.getMonth() === bDay.getMonth() && today.getDate() === bDay.getDate();
            
            if (isBirthday && confettiCanvasRef.current) {
                const myConfetti = confetti.create(confettiCanvasRef.current, {
                    resize: true,
                    useWorker: true
                });

                const duration = 15 * 1000;
                const animationEnd = Date.now() + duration;
                const colors = ['#FD6400', '#ff7e2e', '#f59e0b', '#0ea5e9', '#ffffff'];

                const interval = setInterval(() => {
                    const timeLeft = animationEnd - Date.now();

                    if (timeLeft <= 0) {
                        return clearInterval(interval);
                    }

                    myConfetti({
                        particleCount: 1,
                        startVelocity: 0,
                        ticks: 400,
                        gravity: 0.5,
                        origin: {
                            x: Math.random(),
                            y: Math.random() * -0.2
                        },
                        colors: [colors[Math.floor(Math.random() * colors.length)]],
                        shapes: ['circle', 'square'],
                        scalar: Math.random() * 0.7 + 0.6,
                        drift: Math.random() * 2 - 1
                    });
                }, 60);

                return () => {
                    clearInterval(interval);
                    myConfetti.reset();
                };
            }
        }
    }, [employee])

    const loadEmployeeData = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        try {
            const [empRes, salRes, leaveRes, otRes, assRes, docRes, ltRes, dcRes, deptRes, dfRes, holidaysRes] = await Promise.all([
                window.electronAPI.getEmployeeById(parseInt(id)),
                window.electronAPI.getSalaries(parseInt(id)),
                window.electronAPI.getLeaves(parseInt(id)),
                window.electronAPI.getOvertimes(parseInt(id)),
                window.electronAPI.getEmployeeAssignments(parseInt(id)),
                window.electronAPI.getEmployeeDocuments(parseInt(id), isDocArchiveView),
                window.electronAPI.getLeaveTypes(currentCompany.id),
                window.electronAPI.getDocumentCategories(currentCompany.id, 'employee'),
                window.electronAPI.getDepartments(currentCompany.id),
                window.electronAPI.getDocumentFolders(currentCompany.id, 'employee', id),
                window.electronAPI.getPublicHolidays(currentCompany.id)
            ])
            if (empRes.success) {
                setEmployee(empRes.data)
                updateTabInfo(`/employees/${id}`, { label: `${empRes.data.first_name} ${empRes.data.last_name}` })
            }
            if (salRes.success) setSalaries(salRes.data || [])
            if (leaveRes.success) setLeaves(leaveRes.data || [])
            if (otRes.success) {
                const sortedOvertimes = (otRes.data || []).sort((a, b) => new Date(b.date) - new Date(a.date));
                setOvertimes(sortedOvertimes);
            }
            if (assRes.success) setAssignments(assRes.data || [])
            if (docRes.success) setDocuments(docRes.data || [])
            if (ltRes.success) setLeaveTypes(ltRes.data.filter(t => t.status !== 'passive').map(t => ({ value: t.name, label: t.name })))
            if (dcRes.success) setDocumentCategories(dcRes.data.filter(t => t.status !== 'passive').map(t => ({ value: t.name, label: t.name, id: t.id })))
            if (deptRes.success) setDepartments(deptRes.data || [])
            if (dfRes && dfRes.success) setDocumentFolders(dfRes.data.map(t => ({ value: t.name, label: t.name, id: t.id, is_archived: t.is_archived })))
            if (holidaysRes && holidaysRes.success) setPublicHolidays(holidaysRes.data || [])
        } catch (err) {
            console.error('Failed to load employee data:', err)
        }
        if (!isBackground) setLoading(false)
    }

    const handleOpenCreateFolder = () => {
        setFolderModalMode('create')
        setFolderModalValue('')
        setFolderModalOpen(true)
    }

    const handleOpenRenameFolder = (oldName) => {
        setFolderModalMode('rename')
        setFolderModalValue(oldName)
        setFolderModalOldValue(oldName)
        setFolderModalOpen(true)
    }

    const handleFolderSubmit = async () => {
        const name = folderModalValue.trim()
        if (!name) return

        const exists = documentFolders.some(f => f.value.toLowerCase() === name.toLowerCase())
        if (exists && (folderModalMode === 'create' || name !== folderModalOldValue)) {
            alert('Bu isimde bir klasör zaten mevcut!')
            return
        }

        setSaving(true)
        try {
            if (folderModalMode === 'create') {
                const res = await window.electronAPI.createDocumentFolder({
                    companyId: currentCompany.id,
                    name: name,
                    relatedType: 'employee',
                    relatedId: id
                })
                if (res.success) {
                    const dfRes = await window.electronAPI.getDocumentFolders(currentCompany.id, 'employee', id)
                    if (dfRes.success) setDocumentFolders(dfRes.data.map(t => ({ value: t.name, label: t.name, id: t.id, is_archived: t.is_archived })))
                    setCurrentFolder(name)
                    setFolderModalOpen(false)
                } else {
                    alert('Klasör oluşturulurken hata oluştu: ' + res.error)
                }
            } else if (folderModalMode === 'rename') {
                const folderObj = documentFolders.find(f => f.value === folderModalOldValue)
                if (!folderObj) return
                const res = await window.electronAPI.updateDocumentFolder({ id: folderObj.id, name: name })
                if (res.success) {
                    const docsToUpdate = documents.filter(d => d.folder === folderModalOldValue)
                    for (const d of docsToUpdate) {
                        await window.electronAPI.updateEmployeeDocument({
                            id: d.id,
                            fileName: d.file_name,
                            folder: name,
                            startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                            expiryDate: d.expiry_date ? new Date(d.expiry_date).toISOString().split('T')[0] : null
                        })
                    }
                    setCustomFolders(prev => prev.map(f => f === folderModalOldValue ? name : f))
                    setCurrentFolder(name)
                    loadEmployeeData()
                    setFolderModalOpen(false)
                } else {
                    alert('Klasör güncellenirken hata oluştu: ' + res.error)
                }
            }
        } catch (err) {
            console.error('Folder action error:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteFolder = (folderName) => {
        const folderObj = documentFolders.find(f => f.value === folderName)
        
        setConfirmModal({
            type: 'delete_folder',
            title: 'Klasör Silme Onayı',
            message: `"${folderName}" klasörünü silmek istediğinize emin misiniz? Klasör içindeki dosyalar silinmeyecek, Klasörsüz olacaktır.`,
            confirmText: 'Sil',
            styleType: 'danger',
            onConfirm: async () => {
                setSaving(true)
                try {
                    if (folderObj) {
                        await window.electronAPI.deleteDocumentFolder(folderObj.id)
                    }
                    const docsToUpdate = documents.filter(d => d.folder === folderName)
                    for (const d of docsToUpdate) {
                        await window.electronAPI.updateEmployeeDocument({
                            id: d.id,
                            fileName: d.file_name,
                            folder: null,
                            startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                            expiryDate: d.expiry_date ? new Date(d.expiry_date).toISOString().split('T')[0] : null
                        })
                    }
                    setCustomFolders(prev => prev.filter(f => f !== folderName))
                    setCurrentFolder(null)
                    loadEmployeeData()
                } catch (err) {
                    console.error('Delete folder error:', err)
                } finally {
                    setSaving(false)
                    setConfirmModal(null)
                }
            }
        })
    }

    const handleBulkMoveConfirm = async () => {
        if (!bulkMoveIds || bulkMoveIds.length === 0) return
        setSaving(true)
        try {
            for (const id of bulkMoveIds) {
                if (typeof id === 'string' && id.startsWith('folder_')) {
                    const folderNameStr = id.replace('folder_', '')
                    const folderObj = documentFolders.find(f => String(f.id) === String(folderNameStr) || f.value === folderNameStr)
                    const targetFolderName = folderObj?.value || folderNameStr
                    const docsInFolder = documents.filter(d => d.folder === targetFolderName)
                    for (const d of docsInFolder) {
                        await window.electronAPI.updateEmployeeDocument({
                            id: d.id,
                            fileName: d.file_name,
                            folder: bulkMoveSelectedFolder || null,
                            startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                            expiryDate: d.expiry_date ? new Date(d.expiry_date).toISOString().split('T')[0] : null
                        })
                    }
                    continue
                }
                const doc = documents.find(d => Number(d.id) === Number(id) || d.id === id)
                if (doc) {
                    await window.electronAPI.updateEmployeeDocument({
                        id: doc.id,
                        fileName: doc.file_name,
                        folder: bulkMoveSelectedFolder || null,
                        startDate: doc.start_date ? new Date(doc.start_date).toISOString().split('T')[0] : null,
                        expiryDate: doc.expiry_date ? new Date(doc.expiry_date).toISOString().split('T')[0] : null
                    })
                }
            }
            if (bulkMoveClearSelection) bulkMoveClearSelection()
            setBulkMoveModalOpen(false)
            setBulkMoveSelectedFolder('')
            loadEmployeeData()
        } catch (err) {
            console.error('Bulk move error:', err)
            alert('Belgeler taşınırken hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const getDefaultAmount = (paymentType) => {
        if (!employee) return ''
        if (paymentType === 'salary') return getHistoricalBaseSalary(employee, selectedMonth)
        if (paymentType === 'overtime_pay') {
            const monthlyOvertimes = overtimes.filter(o => o.date && o.date.startsWith(selectedMonth))
            return monthlyOvertimes.reduce((sum, o) => sum + (o.amount || 0), 0)
        }
        if (paymentType === 'advance') {
            return parseFloat(localStorage.getItem('hr_default_advance_amount')) || 0
        }
        return ''
    }

    const calcOvertimeRate = (type, customSalary) => {
        if (!employee) return 0
        const activeSalary = customSalary !== undefined ? customSalary : getHistoricalBaseSalary(employee, selectedMonth)
        if (!activeSalary) return 0
        const dailyRate = activeSalary / 30
        const hourlyRate = dailyRate / 10
        const weekdayMultiplier = parseFloat(localStorage.getItem('hr_overtime_weekday_multiplier')) || 1.5
        const sundayMultiplier = parseFloat(localStorage.getItem('hr_overtime_sunday_multiplier')) || 1.5
        const holidayMultiplier = parseFloat(localStorage.getItem('hr_overtime_holiday_multiplier')) || 2.0
        if (type === 'weekday') return Math.round(hourlyRate * weekdayMultiplier * 100) / 100
        if (type === 'sunday') return Math.round(dailyRate * sundayMultiplier * 100) / 100
        if (type === 'holiday') return Math.round(dailyRate * holidayMultiplier * 100) / 100
        return 0
    }

    const formatDayBalance = (days, customWhpl) => {
        if (!days && days !== 0) return '-'
        const whpl = customWhpl || parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
        const absDays = Math.abs(days)
        const hours = Math.round(absDays * whpl * 100) / 100
        const sign = days < 0 ? '-' : ''
        if (hours % whpl === 0) {
            return `${sign}${absDays} gün`
        }
        return `${sign}${hours} saat`
    }

    const openAddModal = (type) => {
        setModalType(type)
        setEditingItem(null)
        if (type === 'salary') {
            setFormData({ paymentType: 'salary', amount: getDefaultAmount('salary'), paymentDate: today(), salaryMonth: selectedMonth, status: 'paid', paymentMethod: 'nakit', notes: '' })
        } else if (type === 'overtime') {
            const rate = calcOvertimeRate('weekday')
            setFormData({ overtimeType: 'weekday', date: today(), hours: '', rate, amount: '', notes: '' })
        } else if (type === 'leave') {
            const defaultType = leaveTypes[0]?.value || 'annual';
            const autoDays = 1;
            const startDt = today();
            const endDt = new Date(startDt);
            endDt.setDate(endDt.getDate() + autoDays - 1);

            setFormData({ 
                type: defaultType, 
                status: 'approved', 
                startDate: startDt, 
                endDate: formatDateForInput(endDt), 
                days: autoDays, 
                leaveUnit: 'daily',
                hours: '',
                notes: '' 
            });
        } else if (type === 'salary_history') {
            setFormData({ amount: employee.salary || '', startDate: today(), type: 'raise', description: '' })
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
            setFormData({ 
                paymentType: item.period || 'salary', 
                amount: item.net_salary || '', 
                paymentDate: formatDateForInput(item.payment_date) || formatDateForInput(new Date()), 
                salaryMonth: item.salary_month || selectedMonth, 
                status: item.status || 'pending', 
                paymentMethod: item.payment_method || 'nakit', 
                notes: item.notes || '' 
            })
        } else if (type === 'leave') {
            const strippedNotes = (item.notes || '').replace(/\[OTID:\d+\]/g, '').trim()
            setFormData({ 
                type: item.type || 'annual', 
                status: item.status || 'approved', 
                startDate: formatDateForInput(item.start_date), 
                endDate: formatDateForInput(item.end_date), 
                days: item.days || 1, 
                leaveUnit: item.hours ? 'hourly' : 'daily',
                hours: item.hours || '',
                notes: strippedNotes 
            })
        } else if (type === 'overtime') {
            const isHoliday = item.notes && item.notes.includes('[BAYRAM]')
            const otType = isHoliday ? 'holiday' : (Math.abs((item.rate || 0) - calcOvertimeRate('weekday')) < 1 ? 'weekday' : 'sunday')
            const isUsedAsLeave = item.notes && item.notes.includes('[İZİN OLARAK KULLANILDI]')
            const strippedNotes = (item.notes || '').replace(/\[İZİN OLARAK KULLANILDI\]/g, '').replace(/\[BAYRAM\]/g, '').replace(/\[LID:\d+\]/g, '').trim()
            setFormData({ 
                overtimeType: otType, 
                date: formatDateForInput(item.date), 
                hours: item.hours || '', 
                rate: item.rate || 0, 
                amount: item.amount || '', 
                notes: strippedNotes,
                useAsLeave: !!isUsedAsLeave
            })
        } else if (type === 'assignment') {
            setFormData({ 
                itemName: item.item_name || '', 
                serialNumber: item.serial_number || '',
                quantity: item.quantity || 1, 
                assignedDate: formatDateForInput(item.assign_date), 
                returnDate: formatDateForInput(item.return_date), 
                status: item.status || 'active', 
                notes: item.notes || '' 
            })
        } else if (type === 'salary_history') {
            setFormData({ 
                amount: item.amount || '', 
                startDate: formatDateForInput(item.start_date), 
                endDate: formatDateForInput(item.end_date), 
                type: item.type || 'raise', 
                description: item.description || '' 
            })
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
            setFormData(prev => {
                const prevType = prev.paymentType || 'salary';
                const prevDefault = getDefaultAmount(prevType);
                const currentAmount = prev.amount;
                
                // Check if user modified the amount (it's not empty and differs from previous default)
                const userModified = currentAmount !== undefined && currentAmount !== null && currentAmount !== '' && String(currentAmount) !== String(prevDefault);
                
                const nextDefault = getDefaultAmount(value);
                
                return {
                    ...prev,
                    paymentType: value,
                    amount: userModified ? currentAmount : (nextDefault || '')
                };
            });
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
        } else if (modalType === 'leave' && ['startDate', 'endDate', 'days', 'type', 'leaveUnit', 'hours'].includes(key)) {
            setFormData(prev => {
                let newData = { ...prev, [key]: value }
                const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8

                if (newData.leaveUnit === 'hourly') {
                    if (key === 'startDate') {
                        newData.endDate = newData.startDate
                    } else if (key === 'hours') {
                        const hr = parseFloat(value) || 0
                        newData.days = hr / whpl
                    } else if (key === 'leaveUnit') {
                        newData.endDate = newData.startDate
                        const hr = parseFloat(newData.hours) || 1
                        newData.hours = hr
                        newData.days = hr / whpl
                    }
                } else {
                    if (key === 'leaveUnit') {
                        newData.hours = ''
                        newData.days = 1
                    }

                    const offDaysStr = employee ? employee.off_days : '0';
                    const holidayDates = publicHolidays;

                    if (key === 'type') {
                        const autoDays = newData.days || 1;
                        newData.days = autoDays;
                        if (newData.startDate) {
                            newData.endDate = calculateLeaveEndDate(newData.startDate, autoDays, offDaysStr, holidayDates)
                        }
                    }

                    if (key === 'startDate' && newData.startDate) {
                        const days = parseInt(newData.days) || 1
                        newData.endDate = calculateLeaveEndDate(newData.startDate, days, offDaysStr, holidayDates)
                    } else if (key === 'days' && newData.startDate) {
                        const days = parseInt(value) || 1
                        newData.endDate = calculateLeaveEndDate(newData.startDate, days, offDaysStr, holidayDates)
                    } else if (key === 'endDate' && newData.startDate && newData.endDate) {
                        newData.days = calculateLeaveDays(newData.startDate, newData.endDate, offDaysStr, holidayDates)
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

    const handleConfirmArchive = async (status) => {
        const title = status === 1 ? 'Personeli Arşivle' : 'Personeli Geri Yükle'
        const message = status === 1 
            ? `"${employee.first_name} ${employee.last_name}" personelini arşivlemek istediğinize emin misiniz? Arşivlenen personellere yeni veri girişi yapılamaz.`
            : `"${employee.first_name} ${employee.last_name}" personelini tekrar aktif etmek istediğinize emin misiniz?`
        
        setConfirmModal({ 
            type: 'archive_employee', 
            status, 
            title, 
            message,
            onConfirm: async () => {
                const res = await window.electronAPI.archiveItem('employees', parseInt(id), status)
                if (res.success) {
                    await loadEmployeeData()
                    if (window.showToast) window.showToast(status === 1 ? 'Personel arşivlendi.' : 'Personel aktif edildi.', 'success')
                }
                setConfirmModal(null)
            }
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return
        const { type, item, ids } = confirmModal
        const apiMap = { salary: 'deleteSalary', leave: 'deleteLeave', overtime: 'deleteOvertime', assignment: 'deleteEmployeeAssignment', documents: 'deleteEmployeeDocument', salary_history: 'deleteSalaryHistory' }
        
        const deleteRecord = async (recType, recId) => {
            // Find linked record before deleting this one
            let linkedId = null
            let linkedType = null
            
            const currentItem = recType === 'overtime' 
                ? overtimes.find(o => parseInt(o.id) === parseInt(recId)) 
                : (recType === 'leave' ? leaves.find(l => parseInt(l.id) === parseInt(recId)) : null)
            
            if (currentItem && currentItem.notes) {
                if (recType === 'overtime') {
                    // Match [LID:123]
                    const match = currentItem.notes.match(/\[LID:(\d+)\]/)
                    if (match) { linkedId = parseInt(match[1]); linkedType = 'leave' }
                } else if (recType === 'leave') {
                    // Match [OTID:123]
                    const match = currentItem.notes.match(/\[OTID:(\d+)\]/)
                    if (match) { linkedId = parseInt(match[1]); linkedType = 'overtime' }
                }
            }

            // Delete the primary record first
            await window.electronAPI[apiMap[recType]](recId)
            
            // Delete the linked record if found and it exists
            if (linkedId && linkedType) {
                try {
                    await window.electronAPI[apiMap[linkedType]](linkedId)
                } catch (linkErr) {
                    console.error('Bağlı kayıt silinemedi (muhtemelen zaten silinmiş):', linkErr)
                }
            }
        }

        try {
            if (ids) {
                for (const delId of ids) {
                    if (type === 'documents' && typeof delId === 'string' && delId.startsWith('folder_')) {
                        const folderIdStr = delId.replace('folder_', '')
                        const folderObj = documentFolders.find(f => String(f.id) === String(folderIdStr) || f.value === folderIdStr)
                        if (folderObj) {
                            await window.electronAPI.deleteDocumentFolder(folderObj.id)
                        }
                        const docsToUpdate = documents.filter(d => d.folder === (folderObj?.value || folderIdStr))
                        for (const d of docsToUpdate) {
                            await window.electronAPI.updateEmployeeDocument({
                                id: d.id,
                                fileName: d.file_name,
                                folder: null,
                                startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                                expiryDate: d.expiry_date ? new Date(d.expiry_date).toISOString().split('T')[0] : null
                            })
                        }
                        continue
                    }
                    await deleteRecord(type, delId)
                }
            } else {
                await deleteRecord(type, item.id)
            }
            await loadEmployeeData()
        } catch (err) { console.error('Delete failed:', err) }
        setConfirmModal(null)
    }

    const handleEmployeeSave = async (data) => {
        setSaving(true); setError('')
        try {
            const result = await window.electronAPI.updateEmployee({ id: parseInt(id), ...data })
            if (result.success) { 
                await loadEmployeeData();
                closeModal(); 
                if (window.showToast) window.showToast('Personel bilgileri güncellendi.', 'success');
            }
            else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError('Beklenmeyen hata: ' + err.message) }
        setSaving(false)
    }

    const handleSalaryHistorySubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { 
            employeeId: parseInt(id), 
            amount: parseFloat(formData.amount) || 0, 
            startDate: formData.startDate, 
            endDate: formData.endDate || null, 
            type: formData.type || 'raise', 
            description: formData.description || null 
        }
        try {
            const result = editingItem ? await window.electronAPI.updateSalaryHistory({ id: editingItem.id, ...data }) : await window.electronAPI.createSalaryHistory(data)
            if (result.success) { await loadEmployeeData(); closeModal(); } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    // ========== SUBMIT HANDLERS ==========

    const handleSalarySubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { employeeId: parseInt(id), period: formData.paymentType || 'salary', baseSalary: 0, bonus: 0, deduction: 0, netSalary: parseFloat(formData.amount) || 0, paymentDate: formData.paymentDate || null, salaryMonth: formData.salaryMonth || selectedMonth, status: formData.status || 'pending', paymentMethod: formData.paymentMethod || 'nakit', notes: formData.notes || null }
        try {
            const result = editingItem ? await window.electronAPI.updateSalary({ id: editingItem.id, ...data }) : await window.electronAPI.createSalary(data)
            if (result.success) { await loadEmployeeData(); closeModal(); } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const getNextMonth = (monthStr) => {
        const [year, month] = monthStr.split('-').map(Number)
        const nextDate = new Date(year, month, 1)
        const y = nextDate.getFullYear()
        const m = String(nextDate.getMonth() + 1).padStart(2, '0')
        return `${y}-${m}`
    }

    const handleCarryOver = async (netRemaining) => {
        const nextMonth = getNextMonth(selectedMonth)
        const existing = salaries.find(s => s.salary_month === nextMonth && s.period === 'carryover')

        if (existing) {
            setConfirmModal({
                type: 'cancel_carryover',
                title: 'Devri İptal Et',
                message: `Gelecek aya yapılan ${formatCurrency(existing.net_salary)} tutarındaki devri iptal etmek istediğinize emin misiniz?`,
                confirmText: 'Onaylıyorum',
                styleType: 'primary',
                onConfirm: async () => {
                    try {
                        const res = await window.electronAPI.deleteSalary(existing.id)
                        if (res.success) {
                            showToast('Devir işlemi iptal edildi.', 'success')
                            await loadEmployeeData()
                        } else {
                            showToast(res.error || 'İptal edilemedi.', 'danger')
                        }
                    } catch (e) {
                        showToast(e.message, 'danger')
                    }
                    setConfirmModal(null)
                }
            })
        } else {
            if (netRemaining === 0) {
                showToast('Kalan bakiye 0 olduğu için devredilemez.', 'warning')
                return
            }

            setConfirmModal({
                type: 'carryover',
                title: 'Bakiyeyi Devret',
                message: `${selectedMonth} ayından kalan ${formatCurrency(netRemaining)} bakiye ${nextMonth} ayına devredilecek. Onaylıyor musunuz?`,
                confirmText: 'Onaylıyorum',
                styleType: 'primary',
                onConfirm: async () => {
                    try {
                        const data = {
                            employeeId: parseInt(id),
                            period: 'carryover',
                            baseSalary: 0,
                            bonus: 0,
                            deduction: 0,
                            netSalary: netRemaining,
                            paymentDate: `${nextMonth}-01`,
                            salaryMonth: nextMonth,
                            status: 'paid',
                            paymentMethod: 'other',
                            notes: `${selectedMonth} ayından devreden bakiye`
                        }

                        const res = await window.electronAPI.createSalary(data)
                        if (res.success) {
                            showToast('Bakiye devredildi.', 'success')
                            await loadEmployeeData()
                        } else {
                            showToast(res.error || 'Devir başarısız.', 'danger')
                        }
                    } catch (e) {
                        showToast(e.message, 'danger')
                    }
                    setConfirmModal(null)
                }
            })
        }
    }

    const handleLeaveSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')

        const type = formData.type || 'annual'
        let days = formData.leaveUnit === 'hourly' ? parseFloat(formData.days) : (parseInt(formData.days) || 0)
        let notes = formData.notes || ''

        // Preserve internal tags [OTID:...] if they exist in editingItem
        if (editingItem && editingItem.notes) {
            const otidMatch = editingItem.notes.match(/\[OTID:(\d+)\]/);
            if (otidMatch && !notes.includes(otidMatch[0])) {
                notes = (notes + ' ' + otidMatch[0]).trim();
            }
        }

        if (type.toLowerCase().includes('mesai')) {
            const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
            const sdpl = parseFloat(localStorage.getItem('hr_overtime_sunday_days_per_leave')) || 1
            const hdpl = parseFloat(localStorage.getItem('hr_overtime_holiday_days_per_leave')) || 1
            
            // Sort earned overtimes by date (FIFO)
            const earnedOts = [...overtimes]
                .filter(o => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'))
                .sort((a, b) => new Date(a.date) - new Date(b.date))

            const earnedData = earnedOts.map(o => ({
                date: o.date,
                days: calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl)
            }))

            const totalEarned = earnedData.reduce((sum, d) => sum + d.days, 0)
            const totalUsedOT = leaves
                .filter(l => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset') && (editingItem ? l.id !== editingItem.id : true))
                .reduce((sum, l) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0)
            
            const otBalance = Math.round((totalEarned - totalUsedOT) * 100) / 100

            if (days > otBalance) {
                setError(`Yetersiz mesai izni bakiyesi. Mevcut: ${formatDayBalance(otBalance, whpl)}.`)
                setSaving(false)
                return
            }

            // FIFO Note Generation: Identify which overtimes are being used
            let remainingSkip = totalUsedOT
            let needed = days
            const usedDates = []

            for (const ot of earnedData) {
                if (needed <= 0) break
                
                if (remainingSkip >= ot.days) {
                    remainingSkip -= ot.days
                    continue
                }

                // This OT has at least some remaining contribution
                const available = ot.days - remainingSkip
                remainingSkip = 0 // Used up the skip
                
                const consumed = Math.min(available, needed)
                needed -= consumed
                usedDates.push(formatDate(ot.date))
            }

            if (usedDates.length > 0) {
                const consumptionNote = `[Kullanılan Mesailer: ${usedDates.join(', ')}]`
                if (!notes.includes(consumptionNote)) {
                    notes = notes ? `${notes}\n${consumptionNote}` : consumptionNote
                }
            }
        }

        const data = { 
            employeeId: parseInt(id), 
            type, 
            startDate: formData.startDate, 
            endDate: formData.endDate, 
            days, 
            hours: formData.leaveUnit === 'hourly' && formData.hours ? parseFloat(formData.hours) : null,
            status: formData.status || 'approved', 
            notes: notes || null 
        }
        try {
            const result = editingItem ? await window.electronAPI.updateLeave({ id: editingItem.id, ...data }) : await window.electronAPI.createLeave(data)
            if (result.success) { 
                await loadEmployeeData();
                closeModal(); 
                if (window.showToast) window.showToast(editingItem ? 'İzin güncellendi.' : 'İzin kaydedildi.', 'success');
            } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleOffsetLeave = async (amount, currentAnnualBalance, currentOtBalance) => {
        const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
        const amountInHours = Math.round(amount * whpl * 10) / 10
        const amountText = amount % 1 === 0 ? `${amount} günlük` : `${amountInHours} saatlik`
        if (!window.confirm(`${amountText} yıllık izin borcunu mesai izninden mahsup etmek istediğinize emin misiniz?`)) return
        
        setSaving(true)
        try {
            const today = new Date().toISOString().split('T')[0]
            
            const hdpl = parseFloat(localStorage.getItem('hr_overtime_holiday_days_per_leave')) || 1
            const earnedOts = [...overtimes]
                .filter(o => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'))
                .sort((a, b) => new Date(a.date) - new Date(b.date))

            const earnedData = earnedOts.map(o => ({
                date: o.date,
                days: calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl)
            }))

            const totalUsedOT = leaves
                .filter(l => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset'))
                .reduce((sum, l) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0)

            let remainingSkip = totalUsedOT
            let needed = amount
            const usedDates = []

            for (const ot of earnedData) {
                if (needed <= 0) break
                if (remainingSkip >= ot.days) {
                    remainingSkip -= ot.days
                    continue
                }
                const available = ot.days - remainingSkip
                remainingSkip = 0
                const consumed = Math.min(available, needed)
                needed -= consumed
                usedDates.push(formatDate(ot.date))
            }

            const consumptionNote = usedDates.length > 0 ? ` [Kullanılan Mesailer: ${usedDates.join(', ')}]` : ''
            
             const durationText = amount % 1 === 0 ? `${amount} gün` : `${amount * whpl} saat`
             
             // Create a single "offset" record
             await window.electronAPI.createLeave({
                 employeeId: parseInt(id),
                 type: 'Mahsup',
                 startDate: today,
                 endDate: today,
                 days: amount,
                 hours: amount * whpl,
                 status: 'approved',
                 notes: `[MAHSUP] Yıllık izin borcu kapatıldı. (${durationText})${consumptionNote}`
             })
            
            loadEmployeeData()
        } catch (err) {
            setError('Mahsup işlemi sırasında bir hata oluştu: ' + err.message)
        }
        setSaving(false)
    }

    const handleOvertimeSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        
        const isCurrentlyUsedAsLeave = editingItem && editingItem.notes && editingItem.notes.includes('[İZİN OLARAK KULLANILDI]')
        const shouldBeUsedAsLeave = formData.useAsLeave
        
        let finalNotes = formData.notes || ''
        const marker = '[İZİN OLARAK KULLANILDI]'
        const holidayMarker = '[BAYRAM]'
        
        // Ensure holiday marker is in sync
        finalNotes = finalNotes.replace(holidayMarker, '').trim()
        if (formData.overtimeType === 'holiday') {
            finalNotes = (holidayMarker + ' ' + finalNotes).trim()
        }
        
        const lidMatch = editingItem?.notes?.match(/\[LID:(\d+)\]/)
        const linkedLeaveId = lidMatch ? parseInt(lidMatch[1]) : null
        
        if (shouldBeUsedAsLeave && !finalNotes.includes(marker)) {
            finalNotes = (marker + ' ' + finalNotes).trim()
        } else if (!shouldBeUsedAsLeave && isCurrentlyUsedAsLeave) {
            // Remove both markers and LID tags
            finalNotes = finalNotes.replace(marker, '').replace(/\[LID:\d+\]/, '').trim()
        }
        
        const data = { 
            employeeId: parseInt(id), 
            date: formData.date, 
            hours: parseFloat(formData.hours) || 0, 
            rate: parseFloat(formData.rate) || 1.5, 
            amount: parseFloat(formData.amount) || 0, 
            notes: finalNotes || null 
        }
        
        try {
            const result = editingItem ? await window.electronAPI.updateOvertime({ id: editingItem.id, ...data }) : await window.electronAPI.createOvertime(data)
            
            if (result.success) {
                // We no longer automatically create a leave record.
                // We just mark the overtime as "Use as leave" in the notes.
                // The balance system will handle the rest.
                
                // Reversal: If it was used as leave but now converted back to paid
                if (!shouldBeUsedAsLeave && isCurrentlyUsedAsLeave && linkedLeaveId) {
                    await window.electronAPI.deleteLeave(linkedLeaveId)
                }
                
                await loadEmployeeData()
                closeModal()
            } else {
                setError(result.error || 'Bir hata oluştu.')
            }
        } catch (err) { 
            setError(err.message) 
        }
        setSaving(false)
    }

    const handleAssignmentSubmit = async (e) => {
        e.preventDefault()
        setSaving(true); setError('')
        const data = { 
            employeeId: parseInt(id), 
            itemName: formData.itemName, 
            serialNumber: formData.serialNumber || null,
            quantity: parseInt(formData.quantity) || 1, 
            assignDate: formData.assignedDate || null, 
            returnDate: formData.returnDate || null, 
            status: formData.status || 'active', 
            notes: formData.notes || null 
        }
        try {
            const result = editingItem ? await window.electronAPI.updateEmployeeAssignment({ id: editingItem.id, ...data }) : await window.electronAPI.createEmployeeAssignment(data)
            if (result.success) { await loadEmployeeData(); closeModal(); } else setError(result.error || 'Bir hata oluştu.')
        } catch (err) { setError(err.message) }
        setSaving(false)
    }

    const handleOpenUpload = () => {
        const todayStr = new Date().toISOString().split('T')[0]
        setSelectedUploadFile(null)
        setUploadCategory('')
        setUploadIssueDate(todayStr)
        setUploadStartDate('')
        setUploadExpiryDate('')
        setUploadModalOpen(true)
    }

    const handleSelectUploadFile = async () => {
        try {
            const result = await window.electronAPI.selectFile()
            if (!result || result.canceled || (Array.isArray(result) && result.length === 0)) return
            const filePath = Array.isArray(result) ? result[0] : result.filePaths?.[0]
            if (!filePath) return
            const fileName = filePath.split('/').pop().split('\\').pop()
            setSelectedUploadFile({ path: filePath, name: fileName })
        } catch (err) { console.error('Failed to select file:', err) }
    }

    const handleUploadConfirm = async (docs) => {
        if (!docs || docs.length === 0) return
        setSaving(true)
        try {
            for (const doc of docs) {
                const ext = doc.originalName.split('.').pop().toLowerCase()
                await window.electronAPI.createEmployeeDocument({
                    employeeId: parseInt(id),
                    fileName: doc.displayName,
                    filePath: doc.path,
                    fileType: ext,
                    category: doc.docType || null,
                    folder: doc.folder || null,
                    issueDate: doc.startDate || null,
                    startDate: doc.startDate || null,
                    expiryDate: doc.endDate || null
                })
            }
            await loadEmployeeData()
        } catch (err) { 
            console.error('Upload failed:', err)
            alert('Belgeler yüklenirken bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const handleEditDoc = (doc) => {
        setEditingDoc(doc)
        setUploadCategory(doc.category || '')
        setUploadFolder(doc.folder || '')
        setUploadFileName(doc.file_name || '')
        setUploadIssueDate(doc.issue_date ? new Date(doc.issue_date).toISOString().split('T')[0] : '')
        setUploadStartDate(doc.start_date ? new Date(doc.start_date).toISOString().split('T')[0] : '')
        setUploadExpiryDate(doc.expiry_date ? new Date(doc.expiry_date).toISOString().split('T')[0] : '')
        setSelectedUploadFile(null)
        setError('')
        setEditDocModalOpen(true)
    }

    const handleUpdateDocConfirm = async () => {
        if (!editingDoc) return
        setSaving(true)
        setError('')
        try {
            const updatePayload = {
                id: editingDoc.id,
                fileName: uploadFileName || editingDoc.file_name,
                category: uploadCategory || null,
                folder: uploadFolder || null,
                issueDate: new Date().toISOString().split('T')[0], // Always today on modification
                startDate: uploadStartDate || null,
                expiryDate: uploadExpiryDate || null
            }
            if (selectedUploadFile) {
                const ext = selectedUploadFile.name.split('.').pop().toLowerCase()
                updatePayload.fileName = selectedUploadFile.name
                updatePayload.filePath = selectedUploadFile.path
                updatePayload.fileType = ext
            }
            const res = await window.electronAPI.updateEmployeeDocument(updatePayload)
            if (res.success) {
                await loadEmployeeData()
                setEditDocModalOpen(false)
            } else {
                setError(res.error || 'Güncelleme başarısız oldu.')
            }
        } catch (err) { 
            console.error('Update failed:', err)
            setError('Bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    const handleArchiveDoc = async (docId, isArchived) => {
        try {
            const res = await window.electronAPI.archiveItem('employee_documents', docId, isArchived ? 1 : 0)
            if (res.success) {
                loadEmployeeData()
            } else {
                alert(res.error || 'İşlem başarısız oldu.')
            }
        } catch (err) {
            console.error('Archive failed:', err)
        }
    }

    const handleArchiveFolder = async (folderId, isArchived) => {
        try {
            const res = await window.electronAPI.archiveItem('document_folders', folderId, isArchived ? 1 : 0)
            if (res.success) {
                loadEmployeeData(true)
            }
        } catch (err) {
            console.error('Folder archive failed:', err)
        }
    }

    const handleBulkArchiveDocs = async (ids, isArchived) => {
        try {
            for (const id of ids) {
                if (typeof id === 'string' && id.startsWith('folder_')) {
                    const folderIdStr = id.replace('folder_', '')
                    const folderObj = documentFolders.find(f => String(f.id) === String(folderIdStr) || f.value === folderIdStr)
                    if (folderObj) {
                        await window.electronAPI.archiveItem('document_folders', folderObj.id, isArchived ? 1 : 0)
                    }
                } else {
                    await window.electronAPI.archiveItem('employee_documents', id, isArchived ? 1 : 0)
                }
            }
            loadEmployeeData()
        } catch (err) {
            console.error('Bulk archive failed:', err)
        }
    }

    const handleDocumentOpen = async (doc) => {
        if (!doc) return
        const filePath = typeof doc === 'string' ? doc : (doc.file_path || doc.path || doc.file_name || doc.name)
        const fileName = typeof doc === 'string' ? doc : (doc.file_name || doc.name || doc.file_path?.split(/[\\/]/).pop())

        if (filePath || fileName) {
            try {
                const res = await window.electronAPI.readDocumentData(filePath || fileName)
                if (res && res.success) {
                    setPreviewDoc({
                        data: res.data,
                        name: fileName || res.fileName,
                        path: res.path || filePath,
                        ext: res.ext,
                        doc: typeof doc === 'object' ? doc : null
                    })
                    return
                }
            } catch (error) {
                console.error('Failed to read document:', error)
            }

            setPreviewDoc({
                name: fileName,
                path: filePath,
                doc: typeof doc === 'object' ? doc : null
            })
        }
    }

    // ========== COMPUTED VALUES ==========

    const monthlySalaries = salaries.filter(s => {
        // Use salary_month if available, otherwise fall back to payment_date
        if (s.salary_month) {
            return s.salary_month === selectedMonth
        }
        if (!s.payment_date && !s.created_at) return false
        try {
            const d = s.payment_date || s.created_at
            const dStr = typeof d === 'string' ? d : new Date(d).toISOString()
            return dStr.startsWith(selectedMonth)
        } catch (e) {
            return false
        }
    })

    const totalPayments = monthlySalaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.net_salary || 0), 0)
    const pendingPaymentCount = monthlySalaries.filter(s => s.status === 'pending').length
    const totalLeaveDays = leaves.filter(l => l.status === 'approved').reduce((sum, l) => sum + (l.days || 0), 0)
    const totalOvertimeHours = overtimes.reduce((sum, o) => sum + (o.hours || 0), 0)
    const activeAssignments = assignments.filter(a => a.status === 'active')

    // ========== TAB & COLUMN DEFINITIONS ==========

    const tabs = [
        { id: 'salary', label: 'Ödeme', icon: CreditCard, count: salaries.length },
        { id: 'leave', label: 'İzin', icon: CalendarOff, count: leaves.length },
        { id: 'overtime', label: 'Mesai', icon: Clock, count: overtimes.length },
        { id: 'assignment', label: 'Zimmet', icon: Package, count: assignments.length },
        { id: 'documents', label: 'Belgeler', icon: FileText, count: documents.length },
        { id: 'salary_history', label: 'Maaş Geçmişi', icon: Banknote, count: employee?.employee_salary_history?.length || 0 }
    ]

    const salaryHistoryColumns = [
        { key: 'amount', label: 'Maaş Tutarı', render: (v) => formatCurrency(v) },
        { key: 'start_date', label: 'Başlangıç Tarihi', render: (v) => formatDate(v) },
        { key: 'end_date', label: 'Bitiş Tarihi', render: (v) => v ? formatDate(v) : <span className="badge badge-success">Güncel</span> },
        { key: 'type', label: 'Tür', render: (v) => v === 'initial' ? 'İşe Giriş' : 'Zam' },
        { key: 'description', label: 'Açıklama' }
    ]

    const salaryColumns = [
        { key: 'period', label: 'Ödeme Türü', render: (v) => paymentTypes.find(t => t.value === v)?.label || v },
        { key: 'net_salary', label: 'Tutar', render: (v) => formatCurrency(v) },
        { key: 'payment_date', label: 'Ödeme Tarihi', render: (v) => v ? formatDate(v) : '-' },
        { key: 'salary_month', label: 'Ait Olduğu Ay', render: (v) => {
            if (!v) return '-'
            const [y, m] = v.split('-')
            const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
            return `${monthNames[parseInt(m) - 1]} ${y}`
        }},
        { key: 'status', label: 'Durum', render: (v) => <span className={`badge badge-${v === 'paid' ? 'success' : 'warning'}`}>{v === 'paid' ? 'Ödendi' : 'Bekliyor'}</span> },
        { key: 'payment_method', label: 'Ödeme Yöntemi', render: (v) => paymentMethods.find(t => t.value === v)?.label || (v === 'bank' ? 'Banka' : (v === 'kasa' ? 'Kasa' : 'Nakit')) },
        { key: 'notes', label: 'Not' }
    ]

    const leaveColumns = [
        { key: 'type', label: 'Tür', render: (v) => {
            const lt = leaveTypes.find(t => t.value === v)
            if (v === 'offset' || v === 'Mahsup') return <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Mahsup</span>
            return lt?.label || v
        }},
        { key: 'start_date', label: 'Başlangıç', render: (v) => formatDate(v) },
        { key: 'end_date', label: 'Bitiş', render: (v) => formatDate(v) },
        { key: 'days', label: 'Süre', render: (v, row) => {
            const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8;
            const displayVal = (() => {
                if (row.hours) return `${row.hours} Saat`;
                if (v && v % 1 !== 0) {
                    return `${Math.round(v * whpl * 100) / 100} Saat`;
                }
                return `${v} Gün`;
            })();
            return <span style={{ fontWeight: 600 }}>{displayVal}</span>;
        }},
        {key: 'status', label: 'Durum', render: (v, row) => { 
            const c = { approved: 'success', pending: 'warning', rejected: 'danger' }; 
            let l = { approved: 'Onaylandı', pending: 'Bekliyor', rejected: 'Reddedildi' }; 
            
            // Custom label for overtime accruals
            if (v === 'pending' && row.type.toLowerCase().includes('mesai')) {
                return <span className="badge badge-info" style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>Tanımlandı</span>
            }
            
            return <span className={`badge badge-${c[v] || 'secondary'}`}>{l[v] || v}</span> 
        }},
        { key: 'notes', label: 'Not', render: (v) => v ? v.replace(/\[OTID:\d+\]/g, '').trim() || '-' : '-' }
    ]

    const overtimeColumns = [
        {
            key: 'rate', label: 'Tür', render: (v, row) => {
                const isHoliday = row.notes && row.notes.includes('[BAYRAM]')
                const isUsedAsLeave = row.notes && row.notes.includes('[İZİN OLARAK KULLANILDI]')
                let typeLabel = 'Hafta İçi'
                if (isHoliday) {
                    typeLabel = 'Bayram'
                } else {
                    let isWeekday = false
                    const oRate = row.rate || 0
                    if (oRate > 0 && oRate < 5) {
                        isWeekday = Math.abs(oRate - 1.5) < 0.1
                    } else {
                        const oDateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString()
                        const oMonth = oDateStr.slice(0, 7)
                        const oSalary = getHistoricalBaseSalary(employee, oMonth) || employee.salary || 0
                        const oDailyRate = oSalary / 30
                        const oHourlyRate = oDailyRate / 10
                        const oExpectedWeekdayRate = Math.round(oHourlyRate * 1.5 * 100) / 100
                        isWeekday = Math.abs(oRate - oExpectedWeekdayRate) < (oExpectedWeekdayRate * 0.3)
                    }
                    if (!isWeekday) {
                        typeLabel = 'Pazar'
                    }
                }
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{typeLabel}</span>
                        {isUsedAsLeave && <span className="badge badge-info" style={{ fontSize: '9px' }}>İZİN</span>}
                    </div>
                )
            }
        },
        { key: 'date', label: 'Tarih', render: (v) => formatDate(v) },
        { 
            key: 'hours', 
            label: 'Süre', 
            render: (v, row) => {
                const isHoliday = row.notes && row.notes.includes('[BAYRAM]')
                let isWeekday = false
                const oRate = row.rate || 0
                if (oRate > 0 && oRate < 5) {
                    isWeekday = Math.abs(oRate - 1.5) < 0.1
                } else {
                    const oDateStr = typeof row.date === 'string' ? row.date : new Date(row.date).toISOString()
                    const oMonth = oDateStr.slice(0, 7)
                    const oSalary = getHistoricalBaseSalary(employee, oMonth) || employee.salary || 0
                    const oDailyRate = oSalary / 30
                    const oHourlyRate = oDailyRate / 10
                    const oExpectedWeekdayRate = Math.round(oHourlyRate * 1.5 * 100) / 100
                    isWeekday = Math.abs(oRate - oExpectedWeekdayRate) < (oExpectedWeekdayRate * 0.3)
                }
                const isSunday = !isHoliday && !isWeekday
                return `${v} ${isSunday || isHoliday ? 'Gün' : 'Saat'}`
            }
        },
        { key: 'amount', label: 'Tutar', render: (v) => formatCurrency(v) },
        { key: 'notes', label: 'Not', render: (v) => v ? v.replace(/\[İZİN OLARAK KULLANILDI\]/g, '').replace(/\[BAYRAM\]/g, '').replace(/\[LID:\d+\]/g, '').trim() || '-' : '-' }
    ]

    const assignmentColumns = [
        { key: 'item_name', label: 'Demirbaş' },
        { key: 'serial_number', label: 'Seri No' },
        { key: 'quantity', label: 'Adet' },
        { key: 'assign_date', label: 'Teslim Tarihi', render: (v) => v ? formatDate(v) : '-' },
        { key: 'return_date', label: 'İade Tarihi', render: (v) => v ? formatDate(v) : <span className="badge badge-success">Aktif</span> },
        { key: 'status', label: 'Durum', render: (v) => <span className={`badge badge-${v === 'active' ? 'success' : 'secondary'}`}>{v === 'active' ? 'Aktif' : 'İade Edildi'}</span> },
        { key: 'notes', label: 'Not' }
    ]

    const documentColumns = [
        { 
            key: 'file_name', 
            label: 'Dosya Adı', 
            render: (v, row) => {
                if (row.isFolder) {
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                            <Folder size={18} style={{ color: 'var(--accent-primary)', fill: 'var(--accent-subtle)' }} />
                            <span>{v}</span>
                        </div>
                    );
                }
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} style={{ color: 'var(--text-secondary)' }} />
                        <span>{v}</span>
                    </div>
                );
            }
        },
        { key: 'category', label: 'Kategori', render: (v, row) => row.isFolder ? '' : (<span style={{ fontWeight: 600 }}>{v || 'Belirtilmedi'}</span>) },
        { key: 'folder', label: 'Klasör', render: (v, row) => row.isFolder ? '' : (<span style={{ color: 'var(--text-secondary)' }}>{v || 'Klasörsüz'}</span>) },
        { key: 'issue_date', label: 'Düzenlenme', render: (v, row) => row.isFolder ? '' : (v ? formatDateTime(v) : '-') },
        { key: 'start_date', label: 'Başlangıç Tarihi', render: (v, row) => row.isFolder ? '' : (v ? formatDate(v) : '-') },
        { 
            key: 'expiry_date', 
            label: 'Bitiş Tarihi', 
            render: (v, row) => row.isFolder ? '' : (v ? formatDate(v) : '-')
        },
        {
            key: 'remaining_time',
            label: 'Kalan Süre',
            render: (_, row) => {
                if (row.isFolder) return '';
                if (!row.expiry_date) return '-';
                const target = new Date(row.expiry_date);
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                const diffTime = target - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays < 0) return <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '12px' }}>SÜRESİ DOLDU</span>;
                if (diffDays === 0) return <span style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '12px' }}>BUGÜN</span>;
                
                if (diffDays < 30) {
                    const color = diffDays < 10 ? 'var(--danger)' : 'var(--warning)';
                    return <span style={{ color, fontWeight: 600 }}>{diffDays} Gün</span>;
                }
                
                const months = Math.floor(diffDays / 30);
                const remainingDays = diffDays % 30;
                
                return (
                    <span style={{ color: 'var(--text-secondary)' }}>
                        {months} Ay {remainingDays > 0 ? `${remainingDays} Gün` : ''}
                    </span>
                );
            }
        },
        { key: 'created_at', label: 'Yükleme Tarihi', render: (v, row) => row.isFolder ? '' : (<span style={{ opacity: 0.7 }}>{formatDate(v)}</span>) }
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

    const isArchived = employee.status !== 'active'
    const statusInfo = !isArchived ? { label: 'Aktif', color: 'success' } : { label: 'Arşivlenmiş', color: 'secondary' }

    return (
        <div className="page-container fade-in" style={{ paddingBottom: '40px', position: 'relative' }}>
            <canvas 
                ref={confettiCanvasRef} 
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    width: '100%', 
                    height: '100%', 
                    pointerEvents: 'none', 
                    zIndex: 99999,
                    background: 'transparent'
                }} 
            />
            <TopProgressBar loading={loading} />

            {/* Header / Breadcrumb / Actions */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
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
                                    <>
                                        {(() => {
                                            const today = new Date();
                                            const bDay = new Date(employee.birth_date);
                                            const isBirthday = today.getMonth() === bDay.getMonth() && today.getDate() === bDay.getDate();
                                            
                                            if (isBirthday) {
                                                return (
                                                    <span style={{ 
                                                        background: 'linear-gradient(135deg, #ff7e2e, #0ea5e9, #a855f7)',
                                                        WebkitBackgroundClip: 'text',
                                                        backgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        color: 'transparent',
                                                        fontWeight: '700',
                                                        display: 'inline-block'
                                                    }}>
                                                        {formatDate(employee.birth_date)}
                                                    </span>
                                                )
                                            }
                                            
                                            return (
                                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                                    {formatDate(employee.birth_date)}
                                                </span>
                                            )
                                        })()}
                                        <span style={{ opacity: 0.6, fontSize: '12px', marginLeft: '6px' }}>
                                            ({Math.floor((new Date() - new Date(employee.birth_date)) / (1000 * 60 * 60 * 24 * 365.25))} yaş)
                                        </span>
                                    </>
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
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>IBAN</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>{employee.iban || '-'}</div>
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px 20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Güncel Maaş (Net)</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{employee.salary ? formatCurrency(employee.salary) : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Hafta İçi Mesai (Güncel)</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{employee.salary ? formatCurrency(calcOvertimeRate('weekday', employee.salary)) + ' / saat' : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Pazar Mesaisi (Güncel)</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{employee.salary ? formatCurrency(calcOvertimeRate('sunday', employee.salary)) + ' / gün' : '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Bayram Mesaisi (Güncel)</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--success)' }}>{employee.salary ? formatCurrency(calcOvertimeRate('holiday', employee.salary)) + ' / gün' : '-'}</div>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {(activeTab === 'salary' || activeTab === 'overtime') && (
                            <div style={{ width: '240px' }}>
                                <MonthFilter 
                                    value={selectedMonth} 
                                    onChange={setSelectedMonth} 
                                    minDate={employee?.start_date ? new Date(employee.start_date).toISOString().slice(0, 7) : null}
                                />
                            </div>
                        )}
                        {activeTab === 'documents' ? (
                            !isDocArchiveView && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button 
                                        onClick={handleOpenCreateFolder} 
                                        className="btn btn-secondary" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Plus size={16} /> Yeni Klasör
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setIsGenModalOpen(true)}>
                                        <FileText size={18} /> Belge Oluştur
                                    </button>
                                    <button 
                                        className="btn btn-primary" 
                                        onClick={handleOpenUpload}
                                    >
                                        <Plus size={18} /> Ekle
                                    </button>
                                </div>
                            )
                        ) : (
                            <button 
                                className="btn btn-primary" 
                                onClick={() => openAddModal(activeTab)}
                                disabled={isArchived}
                                style={{ opacity: isArchived ? 0.5 : 1, cursor: isArchived ? 'not-allowed' : 'pointer' }}
                            >
                                <Plus size={18} />
                                Ekle
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'salary' && (
                    <div className="tab-pane">
                        {(() => {
                            const monthlyOvertimes = overtimes.filter(o => 
                                o.date && 
                                o.date.startsWith(selectedMonth) && 
                                (!o.notes || !o.notes.includes('[İZİN OLARAK KULLANILDI]'))
                            )
                            const totalOtTarget = monthlyOvertimes.reduce((sum, o) => sum + (o.amount || 0), 0)
                            const baseSalaryTarget = getHistoricalBaseSalary(employee, selectedMonth) || 0
                            
                            const carryOverAmount = monthlySalaries.filter(s => s.period === 'carryover' && s.status === 'paid').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                            
                            const netTarget = baseSalaryTarget + totalOtTarget + carryOverAmount

                            const paidSalary = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'salary').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                            const paidOt = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'overtime_pay').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                            const paidAdvance = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'advance').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                            const paidLoanDeduction = monthlySalaries.filter(s => s.status === 'paid' && s.period === 'loan_payment' && s.payment_method === 'salary_deduction').reduce((sum, s) => sum + (s.net_salary || 0), 0)
                            
                            const totalPaid = paidSalary + paidOt + paidAdvance + paidLoanDeduction

                            const remainingSalary = baseSalaryTarget - paidSalary - paidAdvance - paidLoanDeduction
                            const remainingOt = totalOtTarget - paidOt
                            
                            const nextMonthForDevir = getNextMonth(selectedMonth)
                            const outboundCarryOver = salaries.find(s => s.salary_month === nextMonthForDevir && s.period === 'carryover')
                            const outboundCarryOverAmount = outboundCarryOver ? (outboundCarryOver.net_salary || 0) : 0

                            const netRemaining = remainingSalary + remainingOt + carryOverAmount - outboundCarryOverAmount

                            const lastPaidDate = (() => {
                                const paidRecords = monthlySalaries.filter(s => s.status === 'paid' && (s.payment_date || s.created_at))
                                if (paidRecords.length === 0) return null
                                return new Date(Math.max(...paidRecords.map(r => new Date(r.payment_date || r.created_at))))
                            })()

                            const pendingCount = monthlySalaries.filter(s => s.status === 'pending').length
                            const progress = netTarget > 0 ? Math.round((totalPaid / netTarget) * 100) : 0

                            // Active Loan Calculation (Only currently unclosed debt cycle)
                            const sortedLoans = salaries
                                .filter(s => s.status === 'paid' && (s.period === 'loan' || s.period === 'loan_payment'))
                                .sort((a, b) => new Date(a.payment_date || a.created_at) - new Date(b.payment_date || b.created_at));

                            let activeLoanTaken = 0;
                            let activeLoanPaid = 0;

                            for (const s of sortedLoans) {
                                if (s.period === 'loan') {
                                    activeLoanTaken += (s.net_salary || 0);
                                } else if (s.period === 'loan_payment') {
                                    activeLoanPaid += (s.net_salary || 0);
                                }
                                
                                // If debt is fully paid, close the cycle
                                if (activeLoanTaken > 0 && (activeLoanTaken - activeLoanPaid) <= 0) {
                                    activeLoanTaken = 0;
                                    activeLoanPaid = 0;
                                }
                            }

                            const activeRemainingLoan = activeLoanTaken - activeLoanPaid;
                            const hasLoanHistory = sortedLoans.length > 0;

                            return (
                                <div style={{ display: 'grid', gridTemplateColumns: hasLoanHistory ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                    {/* Ödenecek Tutar */}
                                    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ödenecek Tutar (Maaş+Mesai+Devir)</div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                                            {formatCurrency(netTarget)}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                            <span style={{ opacity: 0.8 }}>Maaş:</span> {formatCurrency(baseSalaryTarget)}
                                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)' }}></span>
                                            <span style={{ opacity: 0.8 }}>Mesai:</span> {formatCurrency(totalOtTarget)}
                                            {carryOverAmount !== 0 && (
                                                <>
                                                    <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)' }}></span>
                                                    <span style={{ opacity: 0.8 }}>Devir:</span> {formatCurrency(carryOverAmount)}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Ödenen */}
                                    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Ödenen (Maaş+Avans)</div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--success)' }}>
                                            {formatCurrency(totalPaid)}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                            <span>{monthlySalaries.filter(s => s.status === 'paid').length} İşlem</span>
                                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)' }}></span>
                                            <span>{lastPaidDate ? `Son: ${formatDate(lastPaidDate)}` : 'Ödeme Yok'}</span>
                                        </div>
                                    </div>

                                    {/* Kalan Bakiye */}
                                    <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Kalan Maaş Bakiyesi</div>
                                            {(() => {
                                                const nextMonth = getNextMonth(selectedMonth)
                                                const hasCarryOver = salaries.some(s => s.salary_month === nextMonth && s.period === 'carryover')
                                                return (
                                                    <button 
                                                        style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-primary)', padding: '2px 8px', fontSize: '11px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, borderRadius: '4px' }}
                                                        onClick={() => handleCarryOver(netRemaining)}
                                                    >
                                                        {hasCarryOver ? 'Devri İptal Et' : 'Devret'}
                                                    </button>
                                                )
                                            })()}
                                        </div>
                                        <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--warning)' }}>
                                            {formatCurrency(netRemaining)}
                                        </div>
                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                            <span style={{ color: progress >= 100 ? 'var(--success)' : 'var(--warning)' }}>%{progress} Ödendi</span>
                                            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)' }}></span>
                                            <span>{pendingCount} Kayıt Bekliyor</span>
                                        </div>
                                    </div>

                                    {/* Borç Bakiyesi (Conditional) */}
                                    {hasLoanHistory && (
                                        <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Güncel Borç Bakiyesi</div>
                                                <button 
                                                    style={{ background: 'none', border: 'none', padding: '2px 6px', fontSize: '10px', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, borderRadius: '4px' }}
                                                    onClick={() => setShowLoanHistory(true)}
                                                >
                                                    Geçmiş
                                                </button>
                                            </div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)' }}>
                                                {formatCurrency(activeRemainingLoan > 0 ? activeRemainingLoan : 0)}
                                            </div>
                                            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                                                <span style={{ opacity: 0.8 }}>Alınan:</span> {formatCurrency(activeLoanTaken)}
                                                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border-color)' }}></span>
                                                <span style={{ opacity: 0.8 }}>Ödenen:</span> {formatCurrency(activeLoanPaid)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                        <DataTable persistenceKey="EmployeeDetail_table_0"
                            storageKey="emp_salary_cols"
                            columns={salaryColumns}
                            data={monthlySalaries}
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
                {activeTab === 'salary_history' && (
                    <div className="tab-pane">
                        <DataTable 
                            persistenceKey="EmployeeDetail_salary_history_0"
                            columns={salaryHistoryColumns}
                            data={employee.employee_salary_history || []}
                            emptyMessage="Maaş geçmişi bulunmuyor."
                            onBulkDelete={(ids) => handleDeleteClick('salary_history', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('salary_history', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('salary_history', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'leave' && (
                    <div className="tab-pane">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
                            <div className="card" style={{ padding: '14px 16px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Kalan Yıllık İzin</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
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
                                         const isAdditiveAnnual = (type) => {
                                             if (!type) return false;
                                             const normalized = type
                                                 .replace(/İ/g, 'i')
                                                 .replace(/I/g, 'ı')
                                                 .replace(/ı/g, 'i')
                                                 .replace(/ö/g, 'o')
                                                 .replace(/ü/g, 'u')
                                                 .replace(/ş/g, 's')
                                                 .replace(/ğ/g, 'g')
                                                 .replace(/ç/g, 'c')
                                                 .toLowerCase()
                                                 .normalize('NFD')
                                                 .replace(/[\u0300-\u036f]/g, '');
                                             const hasYillik = normalized.includes('yillik') || normalized === 'annual';
                                             const hasAdditiveKeyword = ['ekleme', 'ilave', 'arti', 'arttir', 'kazanilan', 'devir'].some(keyword => normalized.includes(keyword));
                                             return hasYillik && hasAdditiveKeyword;
                                         };
                                         // Count both 'annual' and localized names like 'Yıllık Ücretli İzin' (excluding additive ones)
                                         const systemUsedAnnual = leaves.filter(l => 
                                             l.status === 'approved' && 
                                             ((l.type === 'annual' || (l.type && l.type.toLowerCase().includes('yıllık'))) && !isAdditiveAnnual(l.type))
                                         ).reduce((acc, l) => acc + (l.days || 0), 0)
                                        
                                        // Calculate OT balance for the offset button
                                        const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
                                        const sdpl = parseFloat(localStorage.getItem('hr_overtime_sunday_days_per_leave')) || 1
                                        const hdpl = parseFloat(localStorage.getItem('hr_overtime_holiday_days_per_leave')) || 1
                                        const earnedOts = overtimes.filter(o => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'))
                                        const totalEarned = earnedOts.reduce((sum, o) => sum + calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl), 0)
                                         const totalUsedOT = leaves
                                             .filter(l => l.status === 'approved' && l.type && (l.type.toLowerCase().includes('mesai') || l.type.toLowerCase().includes('mahsup') || l.type === 'offset'))
                                             .reduce((sum, l) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0)
                                         const otBalance = Math.round((totalEarned - totalUsedOT) * 100) / 100

                                         const totalOffsets = leaves
                                             .filter(l => l.status === 'approved' && l.type && (l.type === 'offset' || l.type.toLowerCase() === 'mahsup' || isAdditiveAnnual(l.type)))
                                             .reduce((acc, l) => acc + (l.hours ? l.hours / whpl : (l.days || 0)), 0)
                                        const balance = totalAccrued - pastUsed - systemUsedAnnual + totalOffsets

                                        return (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                                <span style={{ color: balance < 0 ? 'var(--danger)' : 'var(--accent-primary)' }}>{formatDayBalance(balance, whpl)}</span>
                                                {balance < 0 && otBalance > 0 && (
                                                    <button 
                                                        onClick={() => handleOffsetLeave(Math.min(Math.abs(balance), otBalance), balance, otBalance)}
                                                        style={{ padding: '4px 8px', fontSize: '10px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                                                    >
                                                        Mahsup Et
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })()}
                                </div>
                            </div>
                             <div className="card" style={{ padding: '14px 16px' }}>
                                 <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bu Ay Kullanılan</div>
                                 <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                                     {(() => {
                                         const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
                                         const now = new Date()
                                         const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                         const usedThisMonth = leaves.filter(l =>
                                             l.status === 'approved' &&
                                             ((l.start_date && (typeof l.start_date === 'string' ? l.start_date : new Date(l.start_date).toISOString()).startsWith(currentMonth)) || 
                                              (l.end_date && (typeof l.end_date === 'string' ? l.end_date : new Date(l.end_date).toISOString()).startsWith(currentMonth)))
                                         ).reduce((acc, l) => acc + (l.days || 1), 0)
                                         return formatDayBalance(usedThisMonth, whpl)
                                     })()}
                                 </div>
                             </div>
                             <div className="card" style={{ padding: '14px 16px' }}>
                                 <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bekleyen</div>
                                 <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: leaves.filter(l => l.status === 'pending').length > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>{leaves.filter(l => l.status === 'pending').length} kayıt</div>
                             </div>
                             {(() => {
                                 const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
                                 const sdpl = parseFloat(localStorage.getItem('hr_overtime_sunday_days_per_leave')) || 1
                                 const hdpl = parseFloat(localStorage.getItem('hr_overtime_holiday_days_per_leave')) || 1
                                 const earnedOts = overtimes.filter(o => o.notes && o.notes.includes('[İZİN OLARAK KULLANILDI]'))
                                 const totalEarned = earnedOts.reduce((sum, o) => sum + calculateEarnedOtDays(o, employee, whpl, sdpl, hdpl), 0)
                                 const totalUsedOT = leaves
                                     .filter(l => l.status === 'approved' && l.type && (
                                         l.type.toLowerCase().includes('mesai') || 
                                         l.type.toLowerCase().includes('mahsup') || 
                                         l.type === 'offset'
                                     ))
                                     .reduce((sum, l) => sum + (l.hours ? l.hours / whpl : (l.days || 0)), 0)
                                 const otBalance = Math.round((totalEarned - totalUsedOT) * 100) / 100

                                 const displayBalance = (() => {
                                     const hours = Math.round(otBalance * whpl * 100) / 100
                                     if (hours === 0) return '0 gün'
                                     if (hours % whpl === 0) {
                                         return `${otBalance} gün`
                                     }
                                     return `${hours} saat`
                                 })()

                                 let cardStyle = { padding: '14px 16px' }
                                 let textColor = 'var(--text-primary)'
                                 let labelColor = 'var(--text-muted)'
                                 let fontWeight = 700

                                 if (otBalance > 0) {
                                     cardStyle = { ...cardStyle, background: 'var(--accent-subtle)', border: '1px solid var(--accent-primary)' }
                                     labelColor = 'var(--accent-primary)'
                                     fontWeight = 800
                                 } else if (otBalance < 0) {
                                     cardStyle = { ...cardStyle, background: '#fff5f5', border: '1px solid #feb2b2' }
                                     textColor = '#c53030'
                                 }

                                 return (
                                     <div className="card" style={cardStyle}>
                                         <div style={{ fontSize: '11px', color: labelColor, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Kalan Mesai İzni</div>
                                         <div style={{ fontSize: '20px', fontWeight: fontWeight, marginTop: '4px', color: textColor }}>{displayBalance}</div>
                                     </div>
                                 )
                             })()}
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
                        {(() => {
                            const monthlyOvertimesList = overtimes.filter(o => {
                                if (!o.date) return false;
                                const dStr = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString()
                                return dStr.startsWith(selectedMonth)
                            });
                             const weekdayRate = calcOvertimeRate('weekday');
                             const monthlyWeekdayHours = monthlyOvertimesList
                                 .filter(o => Math.abs((o.rate || 0) - weekdayRate) < 1)
                                 .reduce((sum, o) => sum + (o.hours || 0), 0);
                             const monthlySundayDays = monthlyOvertimesList
                                 .filter(o => Math.abs((o.rate || 0) - weekdayRate) >= 1)
                                 .reduce((sum, o) => sum + (o.hours || 0), 0);
                             
                             const monthlyTotalAmount = monthlyOvertimesList.reduce((sum, o) => sum + (o.amount || 0), 0)

                             return (
                                 <>
                                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                                         <div className="card" style={{ padding: '14px 16px' }}>
                                             <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bu Ay Toplam Mesai</div>
                                             <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px', color: 'var(--text-primary)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                 {monthlyWeekdayHours > 0 && <span>{monthlyWeekdayHours} sa</span>}
                                                 {monthlyWeekdayHours > 0 && monthlySundayDays > 0 && <span>/</span>}
                                                 {monthlySundayDays > 0 && <span>{monthlySundayDays} Pazar</span>}
                                                 {monthlyWeekdayHours === 0 && monthlySundayDays === 0 && <span>0 sa</span>}
                                             </div>
                                         </div>
                                        <div className="card" style={{ padding: '14px 16px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bu Ay Toplam Tutar</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px', color: 'var(--accent-primary)' }}>{formatCurrency(monthlyTotalAmount)}</div>
                                        </div>
                                        <div className="card" style={{ padding: '14px 16px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Bu Ay Kayıt Sayısı</div>
                                            <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{monthlyOvertimesList.length}</div>
                                        </div>
                                    </div>
                                    <DataTable persistenceKey="EmployeeDetail_table_2"
                                        storageKey="emp_overtime_cols"
                                        columns={overtimeColumns}
                                        data={monthlyOvertimesList}
                                        emptyMessage="Bu döneme ait mesai kaydı bulunmuyor."
                                        onBulkDelete={(ids) => handleDeleteClick('overtime', null, ids)}
                                        actions={(item) => (
                                            <>
                                                <button onClick={() => openEditModal('overtime', item)}><Pencil size={16} /></button>
                                                <button className="danger" onClick={() => handleDeleteClick('overtime', item)}><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    />
                                </>
                            )
                        })()}
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
                        {/* Klasör Yolu Navigasyonu */}
                        {currentFolder && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px', 
                                marginBottom: '16px',
                                padding: '10px 16px',
                                background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)',
                                borderRadius: '10px',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                            }}>
                                <button 
                                    onClick={() => setCurrentFolder(null)} 
                                    style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        padding: '5px 12px', 
                                        fontSize: '13px',
                                        fontWeight: 500,
                                        height: 'auto',
                                        background: 'var(--bg-primary)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-subtle)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--bg-primary)'; }}
                                >
                                    <Folder size={14} />
                                    Tüm Dosyalar
                                </button>
                                <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '5px 12px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    color: 'var(--accent-primary)',
                                    background: 'var(--accent-subtle)',
                                    borderRadius: '8px',
                                    border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, transparent)'
                                }}>
                                    <Folder size={14} style={{ fill: 'color-mix(in srgb, var(--accent-primary) 30%, transparent)' }} />
                                    {currentFolder}
                                </div>
                            </div>
                        )}

                        <DataTable persistenceKey="EmployeeDetail_documents_table"
                            columns={documentColumns}
                            data={(() => {
                                if (currentFolder === null) {
                                    const filteredFolders = documentFolders.filter(f => 
                                        isDocArchiveView ? f.is_archived === 1 : f.is_archived !== 1
                                    );
                                    const existingFolderNames = new Set(filteredFolders.map(f => f.value));
                                    const dynamicFolderNames = Array.from(new Set(documents.map(d => d.folder).filter(Boolean)))
                                        .filter(folderName => !existingFolderNames.has(folderName));

                                    const folderRows = [
                                        ...filteredFolders.map(f => ({
                                            id: `folder_${f.id}`,
                                            file_name: f.value,
                                            isFolder: true,
                                            category: '',
                                            folder: '',
                                            issue_date: null,
                                            start_date: null,
                                            expiry_date: null,
                                            created_at: null,
                                            file_type: 'Klasör'
                                        })),
                                        ...dynamicFolderNames.map(name => ({
                                            id: `folder_${name}`,
                                            file_name: name,
                                            isFolder: true,
                                            category: '',
                                            folder: '',
                                            issue_date: null,
                                            start_date: null,
                                            expiry_date: null,
                                            created_at: null,
                                            file_type: 'Klasör'
                                        }))
                                    ];
                                    const fileRows = documents.filter(d => !d.folder);
                                    return [...folderRows, ...fileRows];
                                }
                                return documents.filter(d => d.folder === currentFolder);
                            })()}
                            emptyMessage={isDocArchiveView ? "Arşivlenmiş belge bulunmuyor." : "Kayıtlı belge bulunmamaktadır."}
                            onRowClick={(row) => {
                                if (row.isFolder) {
                                    setCurrentFolder(row.file_name);
                                } else {
                                    handleDocumentOpen(row);
                                }
                            }}
                            onBulkDelete={(ids) => handleDeleteClick('documents', null, ids)}
                            isArchiveView={isDocArchiveView}
                            onToggleArchiveView={setIsDocArchiveView}
                            onBulkArchive={(ids) => handleBulkArchiveDocs(ids, !isDocArchiveView)}
                            customBulkActions={(selectedIds, clearSelection) => (
                                <button 
                                    className="btn-bulk-action secondary" 
                                    onClick={() => {
                                        setBulkMoveIds(selectedIds);
                                        setBulkMoveClearSelection(() => clearSelection);
                                        setBulkMoveModalOpen(true);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Folder size={15} />
                                    Klasöre Taşı
                                </button>
                            )}
                            actions={(item) => {
                                if (item.isFolder) {
                                    const folderObj = documentFolders.find(f => f.value === item.file_name)
                                    return !isDocArchiveView ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleOpenRenameFolder(item.file_name) }} title="Klasör Adını Değiştir"><Pencil size={16} /></button>
                                            {folderObj && <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleArchiveFolder(folderObj.id, true) }} title="Klasörü Arşivle"><Archive size={16} /></button>}
                                            <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.file_name) }} title="Klasörü Sil"><Trash2 size={16} /></button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {folderObj && <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleArchiveFolder(folderObj.id, false) }} title="Arşivden Çıkar"><ArchiveRestore size={16} /></button>}
                                            <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.file_name) }} title="Klasörü Sil"><Trash2 size={16} /></button>
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleDocumentOpen(item) }} title="Aç"><FileText size={16} /></button>
                                        {!isDocArchiveView && <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEditDoc(item) }} title="Düzenle"><Pencil size={16} /></button>}
                                        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteClick('documents', item) }} title="Sil"><Trash2 size={16} /></button>
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}
            </div>

            {/* ========== MODALS ========== */}

            {/* Loan History Modal */}
            <Modal
                isOpen={showLoanHistory}
                onClose={() => setShowLoanHistory(false)}
                title="Tüm Borç / Ödeme Geçmişi"
                size="xl"
                footer={null}
            >
                <DataTable
                    persistenceKey="EmployeeLoanHistory"
                    storageKey="emp_loan_cols"
                    columns={salaryColumns}
                    data={salaries.filter(s => s.period === 'loan' || s.period === 'loan_payment')}
                    emptyMessage="Herhangi bir borç veya borç ödeme kaydı bulunmuyor."
                    actions={(item) => (
                        <>
                            <button onClick={() => { setShowLoanHistory(false); openEditModal('salary', item); }}><Pencil size={16} /></button>
                            <button className="danger" onClick={() => { setShowLoanHistory(false); handleDeleteClick('salary', item); }}><Trash2 size={16} /></button>
                        </>
                    )}
                />
            </Modal>

            {/* Edit Employee Modal */}
            <Modal
                isOpen={!!modalType}
                onClose={closeModal}
                title={modalType === 'employee' ? 'Personel Düzenle' : `${editingItem ? 'Düzenle' : 'Yeni'} ${tabs.find(t => t.id === modalType)?.label || ''}`}
                size={modalType === 'employee' ? 'xl' : 'lg'}
                footer={null}
            >
                {modalType === 'employee' ? (
                    <EmployeeForm 
                        initialData={editingItem} 
                        onSubmit={handleEmployeeSave} 
                        onCancel={closeModal} 
                        loading={saving}
                        departmentOptions={departments.filter(d => d.status !== 'passive').map(d => ({ value: d.name, label: d.name }))}
                        onEditSalary={() => {
                            closeModal();
                            setActiveTab('salary_history');
                        }}
                    />
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
                                    <CustomInput label="Tutar (₺) *" format="currency" value={formData.amount || ''} onChange={(val) => updateField('amount', val)} required />
                                    <CustomInput label="Ödeme Tarihi" type="date" value={formData.paymentDate || ''} onChange={(val) => updateField('paymentDate', val)} />
                                    <CustomInput label="Ait Olduğu Ay" type="month" value={formData.salaryMonth || selectedMonth} onChange={(val) => updateField('salaryMonth', val)} />
                                    <CustomSelect label="Ödeme Kanalı" value={formData.paymentMethod || 'nakit'} options={paymentMethods} onChange={(val) => updateField('paymentMethod', val)} />
                                </div>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                                    background: formData.status === 'paid' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.status === 'paid' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => updateField('status', formData.status === 'paid' ? 'pending' : 'paid')}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.status === 'paid'} onChange={(e) => updateField('status', e.target.checked ? 'paid' : 'pending')} />
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
                                    <CustomInput label="Notlar" value={formData.notes || ''} onChange={(val) => updateField('notes', val)} type="textarea" rows={2} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                    <button type="button" className="btn btn-secondary" onClick={closeModal}>İptal</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
                                </div>
                            </form>
                        )}

                        {modalType === 'salary_history' && (
                            <form onSubmit={handleSalaryHistorySubmit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <CustomInput label="Maaş Tutarı (₺) *" format="currency" value={formData.amount || ''} onChange={(val) => updateField('amount', val)} required />
                                    <CustomSelect label="Kayıt Türü" value={formData.type || 'raise'} options={[{value: 'initial', label: 'İşe Giriş'}, {value: 'raise', label: 'Zam'}]} onChange={(val) => updateField('type', val)} />
                                    <CustomInput label="Başlangıç Tarihi *" type="date" value={formData.startDate || ''} onChange={(val) => updateField('startDate', val)} required />
                                    <CustomInput label="Bitiş Tarihi" type="date" value={formData.endDate || ''} onChange={(val) => updateField('endDate', val)} />
                                </div>
                                <div style={{ marginTop: '16px' }}>
                                    <CustomInput label="Açıklama" value={formData.description || ''} onChange={(val) => updateField('description', val)} type="textarea" rows={2} />
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
                                    <CustomSelect 
                                        label="Giriş Şekli" 
                                        value={formData.leaveUnit || 'daily'} 
                                        options={[{ value: 'daily', label: 'Günlük' }, { value: 'hourly', label: 'Saatlik' }]} 
                                        onChange={(val) => updateField('leaveUnit', val)} 
                                    />
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <CustomSelect label="İzin Türü *" value={formData.type || 'annual'} options={leaveTypes} onChange={(val) => updateField('type', val)} />
                                        {(() => {
                                            const selectedType = leaveTypes.find(t => t.value === (formData.type || 'annual'));
                                            const name = selectedType?.label?.toLowerCase() || '';
                                            let hint = '';
                                            if (name.includes('yıllık')) {
                                                const start = employee.start_date ? new Date(employee.start_date) : null;
                                                const years = start ? Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
                                                let legalDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
                                                hint = `Kıdem: ${years} Yıl. Yasal Hak: ${legalDays} Gün`;
                                            }
                                            else if (name.includes('evlilik')) hint = 'Yasal Hak: 3 Gün';
                                            else if (name.includes('ölüm')) hint = 'Yasal Hak: 3 Gün';
                                            else if (name.includes('babalık')) hint = 'Yasal Hak: 5 Gün';
                                            else if (name.includes('engelli')) hint = 'Yasal Hak: 10 Gün';
                                            
                                            if (hint) return (
                                                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ padding: '3px 8px', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent-primary)', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, border: '1px solid rgba(20, 184, 166, 0.2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <AlertCircle size={10} /> {hint}
                                                    </div>
                                                </div>
                                            );
                                            return null;
                                        })()}
                                    </div>
                                    
                                    {formData.leaveUnit === 'hourly' ? (
                                        <>
                                            <div>
                                                <CustomInput label="Tarih *" type="date" value={formData.startDate || ''} onChange={(val) => updateField('startDate', val)} required />
                                                {formData.startDate && (() => {
                                                    const offDaysStr = employee ? employee.off_days : '0';
                                                    const holidayDates = publicHolidays;
                                                    const status = checkDateHolidayStatus(formData.startDate, offDaysStr, holidayDates);
                                                    if (!status) return null;
                                                    return (
                                                        <div style={{ fontSize: '11px', color: 'var(--warning-primary, #eab308)', marginTop: '-8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={12} />
                                                            <span>Seçilen Tarih: {status.label}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <CustomInput label="Süre (Saat) *" type="number" value={formData.hours ?? ''} onChange={(val) => updateField('hours', val)} step="0.5" min="0.5" required />
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <CustomInput label="Başlangıç *" type="date" value={formData.startDate || ''} onChange={(val) => updateField('startDate', val)} required />
                                                {formData.startDate && (() => {
                                                    const offDaysStr = employee ? employee.off_days : '0';
                                                    const holidayDates = publicHolidays;
                                                    const status = checkDateHolidayStatus(formData.startDate, offDaysStr, holidayDates);
                                                    if (!status) return null;
                                                    return (
                                                        <div style={{ fontSize: '11px', color: 'var(--warning-primary, #eab308)', marginTop: '-8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={12} />
                                                            <span>{status.label}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div>
                                                <CustomInput label="Bitiş *" type="date" value={formData.endDate || ''} onChange={(val) => updateField('endDate', val)} required />
                                                {formData.endDate && (() => {
                                                    const offDaysStr = employee ? employee.off_days : '0';
                                                    const holidayDates = publicHolidays;
                                                    const status = checkDateHolidayStatus(formData.endDate, offDaysStr, holidayDates);
                                                    if (!status) return null;
                                                    return (
                                                        <div style={{ fontSize: '11px', color: 'var(--warning-primary, #eab308)', marginTop: '-8px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                            <AlertCircle size={12} />
                                                            <span>{status.label}</span>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <CustomInput label="Gün Sayısı" format="numeric" value={formData.days ?? ''} onChange={(val) => updateField('days', val)} />
                                        </>
                                    )}
                                </div>

                                {formData.leaveUnit !== 'hourly' && formData.startDate && formData.endDate && (() => {
                                    const offDaysStr = employee ? employee.off_days : '0';
                                    const holidayDates = publicHolidays;
                                    const breakdown = getLeaveBreakdown(formData.startDate, formData.endDate, offDaysStr, holidayDates);
                                    if (!breakdown || (breakdown.offDays === 0 && breakdown.holidays === 0)) return null;
                                    return (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '10px 14px',
                                            background: 'rgba(59, 130, 246, 0.08)',
                                            border: '1px dashed rgba(59, 130, 246, 0.3)',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: 'var(--text-secondary)',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '12.5px' }}>
                                                <Clock size={14} />
                                                <span style={{ fontWeight: 600 }}>İzin Süresi Detayı</span>
                                            </div>
                                            <div>
                                                Toplam <strong>{breakdown.totalDays}</strong> takvim gününden;
                                                {breakdown.offDays > 0 && <span> <strong>{breakdown.offDays}</strong> gün haftalık izin</span>}
                                                {breakdown.offDays > 0 && breakdown.holidays > 0 && <span> ve</span>}
                                                {breakdown.holidays > 0 && <span> <strong>{breakdown.holidays}</strong> gün resmi tatil</span>} düşülmüştür.
                                                Maaştan kesilecek net izin süresi: <strong>{breakdown.workingDays} gün</strong>.
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                                    background: formData.status === 'approved' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.status === 'approved' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => updateField('status', formData.status === 'approved' ? 'pending' : 'approved')}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.status === 'approved'} onChange={(e) => updateField('status', e.target.checked ? 'approved' : 'pending')} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>İzin Durumu</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.status === 'approved' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.status === 'approved' ? 'Onaylandı' : 'Bekliyor'}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ marginTop: '16px' }}>
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
                                    <CustomInput label={formData.overtimeType === 'weekday' ? 'Süre (Saat) *' : 'Süre (Gün) *'} type="number" value={formData.hours || ''} onChange={(val) => updateField('hours', val)} step="0.5" min={0} required />
                                </div>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                                    background: formData.useAsLeave ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.useAsLeave ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => updateField('useAsLeave', !formData.useAsLeave)}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.useAsLeave || false} onChange={(e) => updateField('useAsLeave', e.target.checked)} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesaiyi İzin Olarak Kullan</span>
                                            {formData.useAsLeave && formData.hours > 0 && (
                                                <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                                                    + {(() => {
                                                        const whpl = parseFloat(localStorage.getItem('hr_overtime_weekday_hours_per_leave')) || 8
                                                        const sdpl = parseFloat(localStorage.getItem('hr_overtime_sunday_days_per_leave')) || 1
                                                        const hdpl = parseFloat(localStorage.getItem('hr_overtime_holiday_days_per_leave')) || 1
                                                        const hours = parseFloat(formData.hours) || 0
                                                        let days = 0
                                                        if (formData.overtimeType === 'weekday') days = hours / whpl
                                                        else if (formData.overtimeType === 'holiday') days = hours / hdpl
                                                        else days = hours / sdpl
                                                        return Math.round(days * 100) / 100
                                                    })()} Gün İzin
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.useAsLeave ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.useAsLeave ? 'Aktif - İzin Tabına Eklenecek' : 'Pasif - Ücret Olarak Ödenecek'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ 
                                    marginTop: '16px', 
                                    padding: '12px 14px', 
                                    backgroundColor: 'var(--bg-secondary)', 
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    display: formData.useAsLeave ? 'none' : 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Hesaplanan Tutar</div>
                                    <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)' }}>{formatCurrency(formData.amount || 0)}</div>
                                </div>

                                {employee?.salary && !formData.useAsLeave && (
                                    <div style={{ marginTop: '16px', padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--bg-tertiary)' }}>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                            <strong>Birim Ücret:</strong> {formData.overtimeType === 'sunday' ? `${formatCurrency(calcOvertimeRate('sunday'))} / gün` : formData.overtimeType === 'holiday' ? `${formatCurrency(calcOvertimeRate('holiday'))} / gün` : `${formatCurrency(calcOvertimeRate('weekday'))} / saat`} (Maaş üzerinden otomatik hesaplandı)
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
                                    <CustomInput label="Seri No" value={formData.serialNumber || ''} onChange={(val) => updateField('serialNumber', val)} />
                                    <CustomInput label="Adet" format="numeric" value={formData.quantity ?? ''} onChange={(val) => updateField('quantity', val)} />
                                    <div />
                                    <CustomInput label="Teslim Tarihi" type="date" value={formData.assignedDate || ''} onChange={(val) => updateField('assignedDate', val)} />
                                    <CustomInput label="İade Tarihi" type="date" value={formData.returnDate || ''} onChange={(val) => updateField('returnDate', val)} />
                                </div>

                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                                    background: formData.status === 'active' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                    border: `1px solid ${formData.status === 'active' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                    borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                                }} onClick={() => updateField('status', formData.status === 'active' ? 'returned' : 'active')}>
                                    <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={formData.status === 'active'} onChange={(e) => updateField('status', e.target.checked ? 'active' : 'returned')} />
                                        <span className="toggle-slider"></span>
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Demirbaş Durumu</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: formData.status === 'active' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                            {formData.status === 'active' ? 'Aktif' : 'İade Edildi'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '16px' }}>
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

            <DocumentGeneratorModal 
                isOpen={isGenModalOpen}
                onClose={() => setIsGenModalOpen(false)}
                employee={employee}
                company={companies.find(c => c.id === employee?.company_id) || currentCompany}
                onSuccess={loadEmployeeData}
            />

            <ConfirmModal 
                isOpen={!!confirmModal} 
                onClose={() => setConfirmModal(null)} 
                onConfirm={confirmModal?.onConfirm || handleConfirmDelete} 
                title={confirmModal?.title} 
                message={confirmModal?.message} 
                confirmText={confirmModal?.confirmText}
                type={confirmModal?.styleType}
            />

            {/* Document Preview Modal */}
            <DocumentPreviewModal
                doc={previewDoc}
                onClose={() => setPreviewDoc(null)}
                onDelete={previewDoc?.doc ? () => {
                    setPreviewDoc(null)
                    handleDeleteClick('documents', previewDoc.doc)
                } : null}
            />

            {/* Upload Modal */}
            <Modal
                isOpen={uploadModalOpen}
                onClose={() => setUploadModalOpen(false)}
                title="Belge Yükle"
                size="lg"
            >
                <DocumentForm
                    onSubmit={handleUploadConfirm}
                    onCancel={() => setUploadModalOpen(false)}
                    loading={saving}
                    options={documentCategories}
                    targetType="employee"
                />
            </Modal>
            
            {/* Document Edit Modal */}
            <Modal
                isOpen={editDocModalOpen}
                onClose={() => { setEditDocModalOpen(false); setError(''); }}
                title="Belge Bilgilerini Düzenle"
                size="md"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {error && (
                        <div style={{ padding: '10px 14px', backgroundColor: 'var(--error-bg)', color: 'var(--error)', borderRadius: '8px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                        <CustomInput 
                            label="Dosya Adı *"
                            value={uploadFileName}
                            onChange={setUploadFileName}
                            required
                        />
                        <CustomSelect 
                            label="Belge Kategorisi *"
                            value={uploadCategory}
                            onChange={setUploadCategory}
                            options={documentCategories}
                            placeholder="Kategori seçin..."
                        />
                        <CustomSelect 
                            label="Klasör"
                            value={uploadFolder}
                            onChange={setUploadFolder}
                            options={documentFolders}
                            placeholder="Klasör seçin..."
                        />
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <CustomInput 
                                label="Başlangıç Tarihi"
                                type="date"
                                value={uploadStartDate}
                                onChange={setUploadStartDate}
                            />
                            <CustomInput 
                                label="Bitiş Tarihi"
                                type="date"
                                value={uploadExpiryDate}
                                onChange={setUploadExpiryDate}
                            />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '-8px', fontWeight: 500 }}>
                            * Kaydedildiğinde Düzenlenme tarihi otomatik olarak bugünün tarihi ve saati (<strong>{new Date().toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>) ile güncellenecektir.
                        </div>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>Belge Dosyası</div>
                        
                        {!selectedUploadFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                        <FileText size={18} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingDoc?.file_name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mevcut Dosya</div>
                                    </div>
                                </div>
                                <button className="btn btn-secondary btn-sm" onClick={handleSelectUploadFile}>
                                    Dosyayı Değiştir
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--accent-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                                        <Upload size={18} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedUploadFile.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--success)' }}>Yeni Dosya Seçildi</div>
                                    </div>
                                </div>
                                <button className="btn btn-icon danger" onClick={() => setSelectedUploadFile(null)} title="Vazgeç">
                                    <X size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setEditDocModalOpen(false)}>İptal</button>
                        <button 
                            className="btn btn-primary" 
                            disabled={!uploadCategory || saving} 
                            onClick={handleUpdateDocConfirm}
                        >
                            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </div>
            </Modal>

            {bulkMoveModalOpen && (
                <Modal
                    isOpen={bulkMoveModalOpen}
                    onClose={() => setBulkMoveModalOpen(false)}
                    title="Belgeleri Klasöre Taşı"
                    size="md"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Seçilen {bulkMoveIds.length} belgeyi hangi klasöre taşımak istiyorsunuz?
                        </p>
                        <CustomSelect 
                            label="Hedef Klasör"
                            value={bulkMoveSelectedFolder}
                            onChange={setBulkMoveSelectedFolder}
                            options={[
                                { value: '', label: 'Klasörsüz (Klasörden Çıkart)' },
                                ...documentFolders
                            ]}
                            placeholder="Klasör seçin..."
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                            <button className="btn btn-secondary" onClick={() => setBulkMoveModalOpen(false)}>İptal</button>
                            <button 
                                className="btn btn-primary" 
                                disabled={saving} 
                                onClick={handleBulkMoveConfirm}
                            >
                                {saving ? 'Taşınıyor...' : 'Klasöre Taşı'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {folderModalOpen && (
                <Modal
                    isOpen={folderModalOpen}
                    onClose={() => setFolderModalOpen(false)}
                    title={folderModalMode === 'create' ? 'Yeni Klasör Oluştur' : 'Klasör Adını Değiştir'}
                    size="sm"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <CustomInput
                            label="Klasör Adı"
                            value={folderModalValue}
                            onChange={setFolderModalValue}
                            placeholder="Klasör adı girin..."
                            required
                            autoFocus
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                            <button className="btn btn-secondary" onClick={() => setFolderModalOpen(false)}>İptal</button>
                            <button 
                                className="btn btn-primary" 
                                disabled={saving || !folderModalValue.trim()} 
                                onClick={handleFolderSubmit}
                            >
                                {saving ? 'Kaydediliyor...' : (folderModalMode === 'create' ? 'Klasör Oluştur' : 'Kaydet')}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
