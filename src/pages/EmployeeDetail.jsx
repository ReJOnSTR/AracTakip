import React, { useState, useEffect, useRef } from 'react'
import TopProgressBar from '../components/TopProgressBar'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
    ArrowLeft,
    Briefcase,
    Building2,
    Calendar,
    ChevronRight,
    CreditCard,
    DollarSign,
    Mail,
    Phone,
    Plus,
    Trash2,
    Edit2,
    Pencil,
    Settings,
    UserCheck,
    FileText,
    ExternalLink,
    Check,
    Clock,
    ChevronDown,
    History,
    CheckCircle,
    Wallet
} from 'lucide-react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import ConfirmModal from '../components/ConfirmModal'
import AssignmentForm from '../components/forms/AssignmentForm'
import DocumentForm from '../components/forms/DocumentForm'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import DateRangePicker from '../components/DateRangePicker'
import { formatCurrency, formatDate } from '../utils/helpers'
import { useCompany } from '../context/CompanyContext'
import { useToast } from '../context/ToastContext'
import { useTab } from '../context/TabContext'


export default function EmployeeDetail(props) {
    const params = useParams()
    const id = props.id || params.id
    const navigate = useNavigate()
    const { currentCompany } = useCompany()
    const { showToast } = useToast()
    const { openTab, replaceTab, activeTabId } = useTab()

    const handleBack = (e) => {
        if (e.ctrlKey || e.metaKey || e.button === 1) {
            openTab('employees')
        } else {
            replaceTab(activeTabId, 'employees', 'Personeller')
        }
    }

    // Core Data State
    const [employee, setEmployee] = useState(null)
    const [loading, setLoading] = useState(true)

    // UI State
    const [activeTab, setActiveTab] = useState('movements')
    const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false)
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })

    // Tab Data
    const [movements, setMovements] = useState([])
    const [leaves, setLeaves] = useState([])
    const [overtimes, setOvertimes] = useState([])
    const [assignments, setAssignments] = useState([])
    const [salaryHistory, setSalaryHistory] = useState([])
    const [documents, setDocuments] = useState([])
    const [vehicles, setVehicles] = useState([]) // For assignment modal

    // Edit Employee Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editForm, setEditForm] = useState({})

    // Sub-Modals State
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false)
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false)

    const [showHolidays, setShowHolidays] = useState(false)
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false)
    const [confirmModal, setConfirmModal] = useState(null)
    const [isSaving, setIsSaving] = useState(false) // Correction for saving state if needed, though 'saving' exists.

    // ... existing states ...

    // Forms
    const [movementForm, setMovementForm] = useState({})
    const [leaveForm, setLeaveForm] = useState({})
    const [overtimeForm, setOvertimeForm] = useState({})

    // Auto-calculate End Date
    useEffect(() => {
        if (leaveForm.start_date && leaveForm.days) {
            const start = new Date(leaveForm.start_date)
            const days = parseInt(leaveForm.days)
            if (!isNaN(start.getTime()) && !isNaN(days) && days > 0) {
                const end = new Date(start)
                end.setDate(start.getDate() + days - 1)
                const newEnd = end.toISOString().split('T')[0]

                if (leaveForm.end_date !== newEnd) {
                    setLeaveForm(prev => ({ ...prev, end_date: newEnd }))
                }
            }
        }
    }, [leaveForm.start_date, leaveForm.days])

    // Filter State
    // Filter State
    // 1. General/Financial Range (Defaults to This Month)
    // Filter State
    // 1. Payment Range (Defaults to This Month) -> For "Movements" tab
    const [paymentDateRange, setPaymentDateRange] = useState(() => {
        const now = new Date()
        // First day of current month
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        // Last day of current month (day 0 of next month)
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const formatDate = (d) => {
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        return {
            startDate: formatDate(start),
            endDate: formatDate(end)
        }
    })

    // 2. General List Range (Defaults to Empty/All Time) -> For Assignments, Overtimes, Documents
    const [generalDateRange, setGeneralDateRange] = useState({
        startDate: '',
        endDate: ''
    })

    // 3. Leave Range (Defaults to Empty/All Time)
    const [leaveDateRange, setLeaveDateRange] = useState({
        startDate: '',
        endDate: ''
    })

    const [movementTypeFilter, setMovementTypeFilter] = useState('all')

    // Computed DateRange for current view
    let currentDateRange = generalDateRange
    if (activeTab === 'movements') currentDateRange = paymentDateRange
    else if (activeTab === 'leaves') currentDateRange = leaveDateRange

    const setDateRange = (newRange) => {
        if (activeTab === 'movements') {
            setPaymentDateRange(newRange)
        } else if (activeTab === 'leaves') {
            setLeaveDateRange(newRange)
        } else {
            setGeneralDateRange(newRange)
        }
    }

    // Service Duration Calculation
    const serviceDuration = React.useMemo(() => {
        if (!employee || !employee.start_date) return null
        const start = new Date(employee.start_date)
        const now = new Date()

        let years = now.getFullYear() - start.getFullYear()
        let months = now.getMonth() - start.getMonth()
        let days = now.getDate() - start.getDate()

        if (days < 0) {
            months--
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0)
            days += prevMonthDate.getDate()
        }
        if (months < 0) {
            years--
            months += 12
        }
        return { years, months, days }
    }, [employee])

    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadEmployeeData()
        const cleanup = window.electronAPI.on('data-changed', () => {
            loadEmployeeData()
        })
        return () => cleanup && cleanup()
    }, [id])

    // Tab Indicator Logic
    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({
                left: activeElement.offsetLeft,
                width: activeElement.offsetWidth
            })
        }
    }, [activeTab, tabsRef, employee]) // Depend on employee to ensure render settles

    const loadEmployeeData = async () => {
        if (!id) return
        setLoading(true)
        try {
            const empRes = await window.electronAPI.getEmployeeById(id)
            let empName = ''
            if (empRes.success && empRes.data) {
                setEmployee(empRes.data)
                empName = empRes.data.name + ' ' + empRes.data.surname // Construct full name for search
            }

            const movRes = await window.electronAPI.getEmployeeMovements(id)
            if (movRes.success) setMovements(movRes.data)

            const leaveRes = await window.electronAPI.getEmployeeLeaves(id)
            if (leaveRes.success) setLeaves(leaveRes.data)

            const overtimeRes = await window.electronAPI.getEmployeeOvertimes(id)
            if (overtimeRes.success) setOvertimes(overtimeRes.data)

            // Salary History
            const salaryHistoryRes = await window.electronAPI.getSalaryHistory(id)
            if (salaryHistoryRes.success) setSalaryHistory(salaryHistoryRes.data)

            // Fetch Assignments by Name (using loose match on name)
            if (empName) {
                const assignRes = await window.electronAPI.getEmployeeAssignments(empRes.data.name) // Search by First Name usually sufficient or specific logic
                if (assignRes.success) setAssignments(assignRes.data)
            }

            // Fetch Vehicles for Assignment Modal
            // Standard 'getVehicles' requires companyId
            const vehRes = await window.electronAPI.getVehicles(currentCompany.id)
            if (vehRes.success) setVehicles(vehRes.data)

            // Fetch Documents
            const docRes = await window.electronAPI.getDocumentsByRelatedId('employee', id)
            if (docRes.success) setDocuments(docRes.data)

        } catch (error) {
            console.error('Failed to load employee data:', error)
        } finally {
            setLoading(false)
        }
    }

    const openEditModal = () => {
        setEditForm({
            name: employee.name,
            surname: employee.surname,
            tc_no: employee.tc_no || '',
            phone: employee.phone || '',
            email: employee.email || '',
            position: employee.position || '',
            department: employee.department || '',
            salary: employee.salary || '',
            start_date: employee.start_date ? employee.start_date.split('T')[0] : '',
            overtime_rate: employee.overtime_rate || '',
            sunday_overtime_rate: employee.sunday_overtime_rate || '',
            status: employee.status || 'active',
            notes: employee.notes || ''
        })
        setIsEditModalOpen(true)
    }

    const handleEditSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = {
                id: employee.id,
                companyId: currentCompany.id,
                name: editForm.name,
                surname: editForm.surname,
                tcNo: editForm.tc_no,
                phone: editForm.phone,
                email: editForm.email,
                position: editForm.position,
                department: editForm.department,
                salary: editForm.salary,
                startDate: editForm.start_date,
                overtime_rate: editForm.overtime_rate,
                sunday_overtime_rate: editForm.sunday_overtime_rate,
                status: editForm.status,
                notes: editForm.notes
            }

            const result = await window.electronAPI.updateEmployee(payload)
            if (result.success) {
                setIsEditModalOpen(false)
                loadEmployeeData()
            } else {
                alert('Güncelleme hatası: ' + result.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteEmployee = async () => {
        if (confirm(`${employee.name} ${employee.surname} isimli personeli silmek istediğinize emin misiniz?`)) {
            const result = await window.electronAPI.deleteEmployee(employee.id)
            if (result.success) {
                navigate('/employees')
            } else {
                alert('Silme işlemi başarısız: ' + result.error)
            }
        }
    }

    // State for editing items
    const [editingMovement, setEditingMovement] = useState(null)
    const [editingLeave, setEditingLeave] = useState(null)

    const openMovementModal = (item = null) => {
        setEditingMovement(item)
        setMovementForm(item ? {
            type: item.type,
            amount: item.amount,
            date: item.date,
            description: item.description || '',
            isPaid: !!item.is_paid,
            paymentMethod: item.payment_method || 'cash'
        } : {
            type: 'salary',
            amount: employee.salary || '',
            date: new Date().toISOString().split('T')[0],
            description: 'Maaş Ödemesi',
            isPaid: false,
            paymentMethod: 'cash'
        })
        setIsMovementModalOpen(true)
    }

    const openLeaveModal = (item = null) => {
        setEditingLeave(item)
        setLeaveForm(item ? {
            type: item.type,
            start_date: item.start_date,
            end_date: item.end_date,
            days: item.days,
            notes: item.notes || '',
            status: item.status
        } : {
            type: 'annual',
            start_date: new Date().toISOString().split('T')[0],
            end_date: new Date().toISOString().split('T')[0],
            days: 1,
            notes: ''
        })
        setIsLeaveModalOpen(true)
    }

    const [editingOvertime, setEditingOvertime] = useState(null)

    const [showHistoryModal, setShowHistoryModal] = useState(false)

    const openOvertimeModal = (item = null) => {
        setEditingOvertime(item)
        setOvertimeForm(item ? {
            type: item.type || 'normal',
            date: item.date,
            hours: item.hours,
            amount: item.amount,
            description: item.description || ''
        } : {
            type: 'normal',
            date: new Date().toISOString().split('T')[0],
            hours: '',
            amount: '',
            description: ''
        })
        setIsOvertimeModalOpen(true)
    }

    const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false)
    const [editingSalaryHistory, setEditingSalaryHistory] = useState(null)
    const [salaryForm, setSalaryForm] = useState({
        amount: '',
        start_date: new Date().toISOString().split('T')[0], // Changed to start_date for consistency
        type: 'raise',
        description: ''
    })

    const openSalaryModal = () => {
        setEditingSalaryHistory(null) // Ensure we're adding, not editing
        setSalaryForm({
            amount: employee?.salary || '',
            start_date: new Date().toISOString().split('T')[0], // Changed to start_date
            type: 'raise',
            description: ''
        })
        setIsSalaryModalOpen(true)
    }

    const handleDeleteSalary = (id) => {
        setConfirmModal({
            type: 'salary',
            title: 'Maaş Kaydını Sil',
            message: 'Bu maaş kaydını silmek istediğinize emin misiniz? Eğer bu güncel maaş ise, personelin maaşı bir önceki kayda dönecektir.',
            id
        })
    }

    const handleBulkDeleteSalary = (ids) => {
        setConfirmModal({
            type: 'salary_bulk',
            title: 'Toplu Maaş Kaydı Silme',
            message: `${ids.length} adet maaş kaydını silmek istediğinize emin misiniz?`,
            ids
        })
    }

    // --- Bulk Delete Handlers ---
    const handleBulkDeleteMovement = (ids) => {
        setConfirmModal({
            type: 'movement_bulk',
            title: 'Toplu Hareket Silme',
            message: `${ids.length} adet hareket kaydını silmek istediğinize emin misiniz?`,
            ids
        })
    }

    const handleBulkDeleteLeave = (ids) => {
        setConfirmModal({
            type: 'leave_bulk',
            title: 'Toplu İzin Silme',
            message: `${ids.length} adet izin kaydını silmek istediğinize emin misiniz?`,
            ids
        })
    }

    const handleBulkDeleteOvertime = (ids) => {
        setConfirmModal({
            type: 'overtime_bulk',
            title: 'Toplu Mesai Silme',
            message: `${ids.length} adet mesai kaydını silmek istediğinize emin misiniz?`,
            ids
        })
    }

    const handleBulkDeleteDocument = (ids) => {
        setConfirmModal({
            type: 'document_bulk',
            title: 'Toplu Belge Silme',
            message: `${ids.length} adet belgeyi silmek istediğinize emin misiniz?`,
            ids
        })
    }

    const handleBulkDeleteAssignment = (ids) => {
        setConfirmModal({
            type: 'assignment_bulk',
            title: 'Toplu Zimmet Silme',
            message: `${ids.length} adet zimmet kaydını silmek istediğinize emin misiniz?`,
            ids
        })
    }

    // --- Assignment Handlers ---
    const [editingAssignment, setEditingAssignment] = useState(null)

    const openAssignmentModal = (item = null) => {
        setEditingAssignment(item)
        setIsAssignmentModalOpen(true)
    }

    const handleAssignmentSubmit = async (data) => {
        setSaving(true)
        try {
            const payload = {
                vehicleId: parseInt(data.vehicleId),
                itemName: data.itemName || 'Araç Zimmeti',
                quantity: parseInt(data.quantity) || 1,
                assignedTo: employee.name + ' ' + employee.surname, // Auto-assign to this employee
                department: employee.department || '',
                startDate: data.startDate,
                endDate: data.endDate,
                notes: data.notes
            }

            let result
            if (editingAssignment) {
                result = await window.electronAPI.updateAssignment({ id: editingAssignment.id, ...payload })
            } else {
                result = await window.electronAPI.createAssignment(payload)
            }

            if (result.success) {
                setIsAssignmentModalOpen(false)
                loadEmployeeData()
            } else {
                alert('İşlem başarısız: ' + result.error)
            }
        } catch (error) {
            console.error('Assignment save error:', error)
            alert('Bir hata oluştu.')
        } finally {
            setSaving(false)
        }
    }


    // ---------------------------

    const handleSalarySubmit = async (e) => {
        e.preventDefault()

        // Validation: Start Date cannot be before Starting Salary or Employee Start Date
        // Using string comparison (YYYY-MM-DD) to avoid timezone issues
        let limitDateStr = employee?.start_date || null

        if (salaryHistory && salaryHistory.length > 0) {
            // Find explicit 'start' record (Broadened check)
            const startRecord = salaryHistory.find(r => {
                const type = r.type?.toLowerCase() || ''
                return ['start', 'starting', 'baslangic', 'başlangıç', 'initial'].some(t => type.includes(t))
            })

            if (startRecord) {
                limitDateStr = startRecord.start_date
            }
        }

        if (limitDateStr && salaryForm.start_date < limitDateStr) {
            showToast(`Maaş tarihi, başlangıç tarihinden (${formatDate(limitDateStr)}) önce olamaz!`, 'error')
            return
        }

        setSaving(true)
        try {
            if (editingSalaryHistory) {
                // Update existing history
                const res = await window.electronAPI.updateSalaryHistory({
                    id: editingSalaryHistory.id,
                    amount: salaryForm.amount,
                    startDate: salaryForm.start_date, // Use start_date from form
                    description: salaryForm.description
                })
                if (res.success) {
                    showToast('Geçmiş maaş kaydı güncellendi', 'success')
                    setIsSalaryModalOpen(false)
                    setEditingSalaryHistory(null)
                    loadEmployeeData()
                } else {
                    showToast('Hata: ' + res.error, 'error')
                }
            } else {
                // Add new salary record (Raise/Change)
                const res = await window.electronAPI.addSalaryRecord({
                    employeeId: id,
                    amount: salaryForm.amount,
                    startDate: salaryForm.start_date, // Use start_date from form
                    type: salaryForm.type,
                    description: salaryForm.description
                })
                if (res.success) {
                    showToast('Maaş güncellendi', 'success')
                    setIsSalaryModalOpen(false)
                    loadEmployeeData()
                } else {
                    showToast('Hata: ' + res.error, 'error')
                }
            }
        } catch (error) {
            console.error(error)
            showToast('Bir hata oluştu', 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleEditHistory = (row) => {
        setEditingSalaryHistory(row)
        setSalaryForm({
            amount: row.amount,
            type: row.type || 'adjustment',
            start_date: row.start_date,
            description: row.description || ''
        })
        // Close history modal, open edit modal
        setShowHistoryModal(false)
        setIsSalaryModalOpen(true)
    }

    const handleDeleteHistory = (row) => {
        setConfirmModal({
            type: 'salary',
            title: 'Maaş Geçmişini Sil',
            message: 'Bu maaş geçmişi kaydını silmek istediğinize emin misiniz?',
            id: row.id
        })
    }

    const handleMakeActiveHistory = (row) => {
        setConfirmModal({
            type: 'make_active',
            title: 'Maaşı Güncelle',
            message: `Personelin güncel maaşını ${formatCurrency(row.amount)} olarak güncellemek istiyor musunuz? (Yeni kayıt oluşturulmaz, sadece güncel tutar değişir)`,
            id: row.id,
            amount: row.amount,
            confirmText: 'Güncelle',
            confirmButtonType: 'success' // Passing to 'type' prop in ConfirmModal
        })
    }

    const handleMovementSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const payload = { ...movementForm, employeeId: id }
            let result

            if (editingMovement) {
                result = await window.electronAPI.updateEmployeeMovement({ id: editingMovement.id, ...payload })
            } else {
                result = await window.electronAPI.addEmployeeMovement(payload)
            }

            if (result.success) {
                setIsMovementModalOpen(false)
                loadEmployeeData()
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleLeaveSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            // FIX: Map snake_case state to camelCase payload expected by DB
            const payload = {
                employeeId: id,
                type: leaveForm.type,
                startDate: leaveForm.start_date,
                endDate: leaveForm.end_date,
                days: leaveForm.days,
                notes: leaveForm.notes,
                status: leaveForm.status
            }
            let result

            if (editingLeave) {
                result = await window.electronAPI.updateEmployeeLeave({ id: editingLeave.id, ...payload })
            } else {
                result = await window.electronAPI.addEmployeeLeave(payload)
            }

            if (result.success) {
                setIsLeaveModalOpen(false)
                loadEmployeeData()
            } else {
                alert('Hata: ' + result.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleOvertimeSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            // Recalculate amount to ensure accuracy
            const rate = overtimeForm.type === 'sunday' ? (employee.sunday_overtime_rate || 0) : (employee.overtime_rate || 0)
            const calculatedAmount = (parseFloat(overtimeForm.hours) || 0) * rate

            const payload = {
                employeeId: id,
                ...overtimeForm,
                amount: calculatedAmount
            }
            let result

            if (editingOvertime) {
                result = await window.electronAPI.updateEmployeeOvertime({ id: editingOvertime.id, ...payload })
            } else {
                result = await window.electronAPI.addEmployeeOvertime(payload)
            }

            if (result.success) {
                setIsOvertimeModalOpen(false)
                loadEmployeeData()
            } else {
                alert('Hata: ' + result.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteMovement = (item) => {
        setConfirmModal({
            type: 'movement',
            title: 'Hareket Sil',
            message: 'Bu finansal hareket kaydını silmek istediğinize emin misiniz?',
            id: item.id
        })
    }

    const handleDeleteLeave = (item) => {
        setConfirmModal({
            type: 'leave',
            title: 'İzin Sil',
            message: 'Bu izin kaydını silmek istediğinize emin misiniz?',
            id: item.id
        })
    }

    const handleDeleteOvertime = (itemId) => {
        setConfirmModal({
            type: 'overtime',
            title: 'Mesai Sil',
            message: 'Bu mesai kaydını silmek istediğinize emin misiniz?',
            id: itemId
        })
    }

    const handleDeleteDocument = (docId) => {
        setConfirmModal({
            type: 'document',
            title: 'Belge Sil',
            message: 'Bu belgeyi silmek istediğinize emin misiniz?',
            id: docId
        })
    }

    const handleDeleteAssignment = (itemId) => {
        setConfirmModal({
            type: 'assignment',
            title: 'Zimmet Sil',
            message: 'Bu zimmet kaydını silmek istediğinize emin misiniz?',
            id: itemId
        })
    }

    const handleConfirmAction = async () => {
        if (!confirmModal) return
        setSaving(true)
        try {
            let result

            // Handlers based on type
            if (confirmModal.type === 'delete') {
                // Delete Employee
                result = await window.electronAPI.deleteEmployee(confirmModal.id)
                if (result.success) {
                    navigate('/employees')
                    showToast('Personel silindi', 'success')
                    return // Redirecting, no need to clear modal/load data
                }
            } else if (confirmModal.type === 'movement') {
                result = await window.electronAPI.deleteEmployeeMovement(confirmModal.id)
            } else if (confirmModal.type === 'leave') {
                result = await window.electronAPI.deleteEmployeeLeave(confirmModal.id)
            } else if (confirmModal.type === 'overtime') {
                result = await window.electronAPI.deleteEmployeeOvertime(confirmModal.id)
            } else if (confirmModal.type === 'document') {
                result = await window.electronAPI.deleteDocument(confirmModal.id)
            } else if (confirmModal.type === 'assignment') {
                result = await window.electronAPI.deleteAssignment(confirmModal.id)
            } else if (confirmModal.type === 'salary') {
                result = await window.electronAPI.deleteSalaryHistory(confirmModal.id)
                if (result.success) {
                    showToast('Maaş geçmişi silindi', 'success')
                    loadEmployeeData()
                }
            } else if (confirmModal.type === 'salary_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteSalaryHistory(id)
                }
                result = { success: true }
                showToast('Seçilen kayıtlar silindi', 'success')
                loadEmployeeData()
            } else if (confirmModal.type === 'make_active') {
                result = await window.electronAPI.setSalaryHistoryActive({
                    id: confirmModal.id,
                    employeeId: id,
                    amount: confirmModal.amount
                })
                if (result.success) {
                    showToast('Maaş aktif edildi ve güncellendi', 'success')
                    loadEmployeeData()
                }
            } else if (confirmModal.type === 'movement_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteEmployeeMovement(id)
                }
                result = { success: true }
                showToast('Seçilen hareketler silindi', 'success')
            } else if (confirmModal.type === 'leave_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteEmployeeLeave(id)
                }
                result = { success: true }
                showToast('Seçilen izinler silindi', 'success')
            } else if (confirmModal.type === 'overtime_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteEmployeeOvertime(id)
                }
                result = { success: true }
                showToast('Seçilen mesailer silindi', 'success')
            } else if (confirmModal.type === 'document_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteDocument(id)
                }
                result = { success: true }
                showToast('Seçilen belgeler silindi', 'success')
            } else if (confirmModal.type === 'assignment_bulk') {
                for (const id of confirmModal.ids) {
                    await window.electronAPI.deleteAssignment(id)
                }
                result = { success: true }
                showToast('Seçilen zimmetler silindi', 'success')
            }

            if (result && result.success) {
                if (confirmModal.type !== 'delete') {
                    loadEmployeeData()
                }
                setConfirmModal(null)
            } else if (result && !result.success) {
                showToast('İşlem başarısız: ' + (result.error || ''), 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Bir hata oluştu', 'error')
        } finally {
            setSaving(false)
        }
    }


    const handleDocumentSubmit = async (formData) => {
        try {
            const { file, docType, startDate, endDate } = formData

            const result = await window.electronAPI.addDocument({
                companyId: currentCompany.id,
                relatedType: 'employee',
                relatedId: id,
                filePath: file.path,
                fileName: file.name,
                fileType: file.type || 'application/octet-stream',
                fileSize: file.size,
                docType,
                startDate,
                endDate
            })

            if (result.success) {
                setIsDocumentModalOpen(false)
                loadEmployeeData()
            } else {
                alert('Dosya yüklenemedi: ' + result.error)
            }
        } catch (error) {
            console.error(error)
            alert('Yükleme hatası')
        }
    }

    const handleOpenDocument = async (path) => {
        const error = await window.electronAPI.openDocument(path)
        if (error) alert('Dosya açılamadı: ' + error)
    }

    if (!employee && !loading) return <div>Personel bulunamadı</div>

    // Filtered Data
    // Date Filter Logic
    // Filtered Data
    // Date Filter Logic
    const isDateInRange = (dateStr, range) => {
        // Allow empty range (All Time)
        if (!range.startDate || !range.endDate) return true

        if (!dateStr) return false
        const date = typeof dateStr === 'string' ? dateStr.split('T')[0] : ''
        if (!date) return false

        const start = range.startDate
        const end = range.endDate
        return date >= start && date <= end
    }

    // Filtered Data
    // Filtered Data
    const filteredMovements = movements.filter(m => {
        const dateMatch = isDateInRange(m.date, paymentDateRange)
        const typeMatch = movementTypeFilter === 'all' || m.type === movementTypeFilter
        return dateMatch && typeMatch
    })
    const filteredOvertimes = overtimes.filter(o => isDateInRange(o.date, generalDateRange))
    const filteredLeaves = leaves.filter(l => isDateInRange(l.start_date, leaveDateRange))
    const filteredAssignments = assignments.filter(a => isDateInRange(a.start_date, generalDateRange))
    const filteredDocuments = documents.filter(d => isDateInRange(d.created_at, generalDateRange))

    const tabs = [
        { id: 'movements', label: 'Ödemeler', icon: DollarSign },
        { id: 'leaves', label: 'İzinler', icon: Calendar },
        { id: 'overtimes', label: 'Mesailer', icon: Clock },
        { id: 'assignments', label: 'Zimmetler', icon: UserCheck },
        { id: 'documents', label: 'Belgeler', icon: FileText }
    ]

    return (
        <div className="detail-page">
            <TopProgressBar loading={loading} />
            {/* Header / Breadcrumb / Actions matching VehicleDetail */}
            {/* Keep existing header code but ensure we put our filter before/inside the tabs content */}

            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                    <div
                        onClick={handleBack}
                        style={{
                            color: 'inherit',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                        }}
                        title="Yeni sekmede açmak için Ctrl+Click"
                    >
                        <ArrowLeft size={14} /> Personeller
                    </div>
                    <span>/</span>
                    <span>{employee.name} {employee.surname}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    {/* ... Title ... */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>
                                {employee.name.toLocaleUpperCase('tr-TR')} {employee.surname.toLocaleUpperCase('tr-TR')}
                            </h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <span className={`badge badge-${employee.status === 'active' ? 'success' : 'neutral'}`}>
                                    {employee.status === 'active' ? 'Aktif' : 'Pasif'}
                                </span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                                    {employee.position} • {employee.department}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={openEditModal}>
                            <Pencil size={18} /> Düzenle
                        </button>
                    </div>
                </div>
            </div>

            {/* ... Employee Info Card ... */}
            <div className="card" style={{ marginBottom: '28px', padding: '0', overflow: 'hidden' }}>
                {/* ... Existing Info Card Content ... */}
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Briefcase size={18} style={{ color: 'var(--accent-primary)' }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Personel Detayları</h3>
                </div>
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
                        {/* Left Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>TC Kimlik No</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 500 }}>
                                        {employee.tcNo || '-'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Telefon</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: 500 }}>
                                        {employee.phone || '-'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>E-posta</div>
                                <div style={{ fontSize: '16px', fontWeight: 500 }}>{employee.email || '-'}</div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Maaş</div>
                                    <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {formatCurrency(employee.salary)}
                                        <button
                                            onClick={() => setShowHistoryModal(true)}
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: '6px',
                                                padding: '4px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-secondary)'
                                            }}
                                            title="Maaş Geçmişini Görüntüle"
                                        >
                                            <History size={14} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Mesai / Pazar (Günlük)</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>
                                        {formatCurrency(employee.overtime_rate || 0)} / {formatCurrency(employee.sunday_overtime_rate || 0)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>İşe Giriş</div>
                                    <div style={{ fontSize: '16px', fontWeight: 500 }}>
                                        {formatDate(employee.start_date)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Hizmet Süresi</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {serviceDuration ? (
                                            <>
                                                {serviceDuration.years > 0 && `${serviceDuration.years} Yıl `}
                                                {serviceDuration.months > 0 && `${serviceDuration.months} Ay `}
                                                {serviceDuration.days} Gün
                                            </>
                                        ) : '-'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notlar</div>
                                <div style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', textTransform: 'uppercase' }}>
                                    {employee.notes || 'Not eklenmemiş.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Tabs */}
            <div className="detail-content">
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

                    {/* ... Indicator ... */}
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
            </div>

            {/* Tab Content */}
            <div className="tab-content" style={{ marginTop: '24px' }}>
                {activeTab === 'movements' && (
                    <div className="tab-pane">
                        {/* Financial Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                            {(() => {
                                // Calculate Financial Stats based on Selected Month
                                // 1. Total Earnings (Hakediş) = (Base Salary * Months Spanned) + Bonuses/Expenses + Overtimes
                                const monthlySalary = parseFloat(employee.salary) || 0

                                // Calculate Base Salary with History Awareness
                                let baseSalary = 0
                                if (paymentDateRange.startDate && paymentDateRange.endDate) {
                                    let current = new Date(paymentDateRange.startDate)
                                    const end = new Date(paymentDateRange.endDate)
                                    // Normalize to start of month to avoid skipping if started mid-month (though paymentDateRange 'This Month' starts at 1st)
                                    // For safety, we iterate month by month.

                                    /* Corrected Monthly Calculation Logic */
                                    while (current <= end) {
                                        // valid range for this specific iteration month
                                        const loopYear = current.getFullYear()
                                        const loopMonth = current.getMonth()
                                        const monthStartStr = new Date(loopYear, loopMonth, 1).toLocaleDateString('en-CA') // YYYY-MM-DD
                                        const monthEndStr = new Date(loopYear, loopMonth + 1, 0).toLocaleDateString('en-CA') // YYYY-MM-DD local

                                        // Find effective salary for this month
                                        // Logic: Find the LATEST salary record that starts anywhere on or before the END of this month
                                        // AND ends on or after the START of this month (overlap).
                                        let effectiveSalaryForMonth = monthlySalary // Default

                                        if (salaryHistory && salaryHistory.length > 0) {
                                            // Find overlaps
                                            const overlapping = salaryHistory.filter(h => {
                                                const hStart = h.start_date
                                                const hEnd = h.end_date || '9999-12-31'
                                                // Standard overlap: StartA <= EndB && EndA >= StartB
                                                return hStart <= monthEndStr && hEnd >= monthStartStr
                                            })

                                            if (overlapping.length > 0) {
                                                // Sort by start_date DESC to get the latest valid salary for this period
                                                overlapping.sort((a, b) => b.start_date.localeCompare(a.start_date))
                                                const match = overlapping[0]

                                                // USER REQ: "geçmiş gelecek hepsi hesaplanacak ama aktif olan doğru aralıkta edişe yansımalı"
                                                // Logic: 
                                                // - If the matched record covers TODAY, it is the "Current Active Period".
                                                //   In this case, we use 'employee.salary' to respect any Manual Overrides (Make Active) 
                                                //   that might differ from the stored history record.
                                                // - Otherwise (Past or Future records), we trust the history amount.

                                                const today = new Date().toISOString().split('T')[0]
                                                const isCurrentPeriod = match.start_date <= today && (!match.end_date || match.end_date > today)

                                                if (isCurrentPeriod) {
                                                    effectiveSalaryForMonth = monthlySalary // employee.salary
                                                } else {
                                                    effectiveSalaryForMonth = parseFloat(match.amount)
                                                }
                                            } else {
                                                // No overlapping history? usage oldest or fallback?
                                                // If history exists but none overlap this month (e.g. this month is BEFORE first record),
                                                // we might check if there's any record starting AFTER this month.
                                                // Often fallback to sortedHistory last item (oldest) if it's logically valid, or just employee.salary
                                                // Let's stick to default/fallback.
                                            }
                                        }

                                        baseSalary += effectiveSalaryForMonth

                                        // Move to next month safely
                                        current.setMonth(current.getMonth() + 1)
                                    }
                                } else {
                                    // If no range selected (defaulting to 1 month effectively in UI usage usually), use current
                                    baseSalary = monthlySalary
                                }

                                const bonusesAndExpenses = filteredMovements
                                    .filter(m => ['bonus', 'expense'].includes(m.type))
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

                                // Overtimes must be calculated based on the PAYMENT range context, not the General/Table range
                                const paymentContextOvertimes = overtimes.filter(o => isDateInRange(o.date, paymentDateRange))
                                const overtimeEarnings = paymentContextOvertimes
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

                                const totalEarnings = baseSalary + bonusesAndExpenses + overtimeEarnings

                                // 2. Total Paid = 'salary' (payments) + 'advance' + 'bonus' (if marked paid) + 'expense' (if marked paid)
                                const totalPaid = filteredMovements
                                    .filter(m => {
                                        // ONLY count if marked as paid regardless of type
                                        if (!m.is_paid) return false
                                        // Exclude Debt/Lending related transactions from Salary Payment context
                                        if (['lending', 'debt', 'repayment'].includes(m.type)) return false
                                        return true
                                    })
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

                                const balance = totalEarnings - totalPaid

                                // 3. Debt Calculation (Global History)
                                const totalDebtGiven = movements
                                    .filter(m => (m.type === 'lending' || m.type === 'debt') && m.is_paid) // Only if actually given/paid
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

                                const totalDebtRepaid = movements
                                    .filter(m => m.type === 'repayment' && m.is_paid) // Only if actually repaid/collected
                                    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)

                                const currentDebt = totalDebtGiven - totalDebtRepaid

                                return (
                                    <>
                                        <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Genel Hakediş</div>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                                                {formatCurrency(totalEarnings)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                Maaş + Prim + <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>Mesai ({formatCurrency(overtimeEarnings)})</span>
                                            </div>
                                        </div>

                                        <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Ödeme Durumu</div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--success-color)' }}>
                                                    {formatCurrency(totalPaid)}
                                                </div>
                                                <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/</div>
                                                <div style={{ fontSize: '24px', fontWeight: 700, color: balance > 0 ? 'var(--warning-color)' : 'var(--text-muted)' }}>
                                                    {formatCurrency(balance)}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                <span style={{ color: 'var(--success-color)' }}>Ödenen</span> / <span style={{ color: balance > 0 ? 'var(--warning-color)' : 'var(--text-muted)' }}>Kalan</span>
                                            </div>
                                        </div>

                                        <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Güncel Borç Bakiyesi (Genel)</div>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--danger-color)' }}>
                                                {formatCurrency(currentDebt)}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                Personele Verilen Borçlar
                                            </div>
                                        </div>
                                    </>
                                )
                            })()}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                Finansal Hareketler
                            </h3>
                            <button className="btn btn-primary" onClick={() => openMovementModal()}>
                                <Plus size={16} /> Yeni Kayıt
                            </button>
                        </div>
                        <DataTable
                            persistenceKey="employee_movements_table"
                            columns={[
                                { key: 'date', label: 'Tarih', render: (v) => formatDate(v) },
                                {
                                    key: 'type', label: 'Tür', render: (v) => {
                                        switch (v) {
                                            case 'salary': return 'Maaş Ödemesi'
                                            case 'payment': return 'Mesai/Ödeme'
                                            case 'advance': return 'Avans'
                                            case 'bonus': return 'Prim'
                                            case 'expense': return 'Harcama'
                                            case 'lending':
                                            case 'debt': return <span style={{ color: 'var(--danger-color)', fontWeight: 500 }}>Borç Verme</span>
                                            case 'repayment': return <span style={{ color: 'var(--success-color)', fontWeight: 500 }}>Borç Tahsilat</span>
                                            default: return v
                                        }
                                    }
                                },
                                { key: 'description', label: 'Açıklama' },
                                { key: 'amount', label: 'Tutar', render: (v) => formatCurrency(v) },
                                {
                                    key: 'is_paid',
                                    label: 'Durum',
                                    render: (v, r) => {
                                        if (v) {
                                            const method = r.payment_method === 'bank' ? 'Banka' : 'Elden'
                                            let badgeClass = 'badge badge-success'
                                            let text = 'Ödendi'

                                            if (r.type === 'lending' || r.type === 'debt') {
                                                badgeClass = 'badge badge-warning'
                                                text = 'Verildi'
                                            } else if (r.type === 'repayment') {
                                                badgeClass = 'badge badge-info'
                                                text = 'Tahsil Edildi'
                                            } else if (r.type === 'advance') {
                                                text = 'Verildi'
                                            }

                                            return <span className={badgeClass}>{text} ({method})</span>
                                        }
                                        return <span className="badge badge-warning">Bekliyor</span>
                                    }
                                }
                            ]}
                            data={filteredMovements}
                            emptyMessage="Bu aya ait kayıt bulunamadı"
                            extraToolbarContent={
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ width: '150px' }}>
                                        <CustomSelect
                                            value={movementTypeFilter}
                                            onChange={(val) => setMovementTypeFilter(val)}
                                            variant="filter"
                                            options={[
                                                { value: 'all', label: 'Tümü' },
                                                { value: 'salary', label: 'Maaş' },
                                                { value: 'advance', label: 'Avans' },
                                                { value: 'bonus', label: 'Prim' },
                                                { value: 'expense', label: 'Harcama' },
                                                { value: 'lending', label: 'Borç Verme' },
                                                { value: 'repayment', label: 'Borç Tahsilat' }
                                            ]}
                                            placeholder="İşlem Türü"
                                        />
                                    </div>
                                    <DateRangePicker
                                        startDate={currentDateRange.startDate}
                                        endDate={currentDateRange.endDate}
                                        onChange={setDateRange}
                                        minDate={employee?.start_date ? employee.start_date.split('T')[0] : undefined}
                                    />
                                </div>
                            }
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={() => openMovementModal(row)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDeleteMovement(row)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'leaves' && (
                    <div className="tab-pane">
                        {/* Leave Summary Cards */}
                        {(() => {
                            // Entitlement based on completed years (using component level serviceDuration)
                            const yearsWorked = serviceDuration ? serviceDuration.years : 0

                            let entitlement = 0
                            if (yearsWorked >= 1 && yearsWorked < 5) entitlement = 14
                            else if (yearsWorked >= 5 && yearsWorked < 15) entitlement = 20
                            else if (yearsWorked >= 15) entitlement = 26

                            const currentYear = new Date().getFullYear()
                            const usedAnnualThisYear = leaves
                                .filter(l => l.type === 'annual' && l.start_date && l.start_date.startsWith(currentYear) && l.status === 'approved') // Only approved annual leaves
                                .reduce((acc, curr) => acc + parseInt(curr.days || 0), 0)

                            const totalUsedThisYearAllTypes = leaves
                                .filter(l => l.start_date && l.start_date.startsWith(currentYear) && l.status === 'approved') // All approved leaves
                                .reduce((acc, curr) => acc + parseInt(curr.days || 0), 0)

                            // Calculate used leaves in the SELECTED RANGE (filteredLeaves)
                            const usedInSelectedRange = filteredLeaves
                                .filter(l => l.status === 'approved')
                                .reduce((acc, curr) => acc + parseInt(curr.days || 0), 0)

                            return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', minHeight: '110px' }}>

                                    {leaveDateRange.startDate && usedInSelectedRange > 0 ? (
                                        <>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                Seçili Aralıkta Kullanılan
                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '4px', fontWeight: 'normal' }}>
                                                    ({formatDate(leaveDateRange.startDate)} - {formatDate(leaveDateRange.endDate)})
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--accent-primary)' }}>{usedInSelectedRange} Gün</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Filtrelenen Tarihlerde</div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                                Seçili Aralıkta Kullanılan
                                            </div>
                                            <div style={{
                                                fontSize: '24px',
                                                fontWeight: 700,
                                                color: 'var(--text-muted)',
                                                filter: 'blur(6px)',
                                                opacity: 0.6,
                                                userSelect: 'none',
                                                display: 'inline-block'
                                            }}>
                                                99 Gün
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                                                Filtreleme Yapılmadı
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Bu Yıl Toplam ({currentYear})</div>
                                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--info)' }}>{totalUsedThisYearAllTypes} Gün</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Tüm İzin Türleri</div>
                                </div>
                                <div style={{ padding: '20px', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Yıllık İzin Durumu ({currentYear})</div>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--warning-color)' }}>{usedAnnualThisYear}</div>
                                        <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/</div>
                                        <div style={{ fontSize: '24px', fontWeight: 700, color: (entitlement - usedAnnualThisYear) < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}>
                                            {Math.max(0, entitlement - usedAnnualThisYear)}
                                        </div>
                                        <div style={{ fontSize: '16px', color: 'var(--text-muted)', fontWeight: 500 }}>/ {entitlement} Gün</div>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        <span style={{ color: 'var(--warning-color)' }}>Kullanılan</span> /
                                        <span style={{ color: (entitlement - usedAnnualThisYear) < 0 ? 'var(--danger-color)' : 'var(--success-color)' }}> Kalan</span> /
                                        <span> Hak</span>
                                    </div>
                                </div>
                            </div>
                        })()}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                    İzin Geçmişi
                                </h3>
                                <button className="btn btn-secondary" onClick={() => setShowHolidays(true)} style={{ fontSize: '13px', padding: '6px 12px', height: '32px' }}>
                                    <Calendar size={14} style={{ marginRight: '6px' }} /> Resmi Tatiller
                                </button>
                            </div>
                            <button className="btn btn-primary" onClick={() => openLeaveModal()}>
                                <Plus size={16} /> İzin Ekle
                            </button>
                        </div>
                        <DataTable
                            persistenceKey="employee_leaves_detail_table"
                            columns={[
                                { key: 'type', label: 'Tür', render: (v) => v === 'annual' ? 'Yıllık İzin' : v === 'sick' ? 'Rapor' : 'Ücretsiz' },
                                { key: 'start_date', label: 'Başlangıç', render: (v) => formatDate(v) },
                                { key: 'end_date', label: 'Bitiş', render: (v) => formatDate(v) },
                                { key: 'days', label: 'Gün', render: (v) => v + ' Gün' },
                                { key: 'status', label: 'Durum', render: (v) => v === 'approved' ? <span className="badge badge-success">Onaylı</span> : <span className="badge badge-warning">Bekliyor</span> }
                            ]}
                            data={filteredLeaves}
                            emptyMessage="Bu aya ait izin kaydı bulunamadı"
                            extraToolbarContent={
                                <DateRangePicker
                                    startDate={currentDateRange.startDate}
                                    endDate={currentDateRange.endDate}
                                    onChange={setDateRange}
                                />
                            }
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={() => openLeaveModal(row)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDeleteLeave(row)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'overtimes' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                Mesai Kayıtları
                            </h3>
                            <button className="btn btn-primary" onClick={() => openOvertimeModal()}>
                                <Plus size={16} /> Mesai Ekle
                            </button>
                        </div>
                        <DataTable
                            persistenceKey="employee_overtimes_table"
                            columns={[
                                { key: 'date', label: 'Tarih', render: (v) => formatDate(v) },
                                { key: 'type', label: 'Tür', render: (v) => v === 'sunday' ? <span className="badge badge-warning">Pazar</span> : <span className="badge badge-success">Normal</span> },
                                { key: 'hours', label: 'Süre', render: (v, r) => v + (r.type === 'sunday' ? ' Gün' : ' Saat') },
                                { key: 'amount', label: 'Tutar', render: (v) => formatCurrency(v) },
                                { key: 'description', label: 'Açıklama' }
                            ]}
                            data={filteredOvertimes}
                            emptyMessage="Bu aya ait mesai kaydı bulunamadı"
                            extraToolbarContent={
                                <DateRangePicker
                                    startDate={currentDateRange.startDate}
                                    endDate={currentDateRange.endDate}
                                    onChange={setDateRange}
                                />
                            }
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={(e) => { e.stopPropagation(); openOvertimeModal(row) }}>
                                        <Pencil size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); handleDeleteOvertime(row.id) }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'assignments' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                Zimmetler
                            </h3>
                            <button className="btn btn-primary" onClick={() => openAssignmentModal()}>
                                <Plus size={16} /> Zimmet Ekle
                            </button>
                        </div>
                        <DataTable
                            persistenceKey="employee_assignments_table"
                            columns={[
                                {
                                    key: 'description',
                                    label: 'Zimmetlenen',
                                    render: (_, r) => r.plate ? (
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600 }}>{r.plate}</span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.brand} {r.model}</span>
                                        </div>
                                    ) : (
                                        <span style={{ fontWeight: 600 }}>{r.item_name}</span>
                                    )
                                },
                                { key: 'quantity', label: 'Adet', width: '80px' },
                                { key: 'start_date', label: 'Verilme Tarihi', render: (v) => formatDate(v) },
                                { key: 'end_date', label: 'Bitiş', render: (v) => v ? formatDate(v) : 'Devam Ediyor' },
                                { key: 'notes', label: 'Notlar' }
                            ]}
                            data={filteredAssignments}
                            emptyMessage={`Bu aya ait zimmet kaydı bulunamadı`}
                            onBulkDelete={handleBulkDeleteAssignment}
                            extraToolbarContent={
                                <DateRangePicker
                                    startDate={currentDateRange.startDate}
                                    endDate={currentDateRange.endDate}
                                    onChange={setDateRange}
                                />
                            }
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={() => openAssignmentModal(row)}>
                                        <Pencil size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDeleteAssignment(row.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                Personel Belgeleri
                            </h3>
                            <button className="btn btn-primary" onClick={() => setIsDocumentModalOpen(true)}>
                                <Plus size={16} /> Belge Ekle
                            </button>
                        </div>
                        <DataTable
                            persistenceKey="employee_documents_table"
                            columns={[
                                { key: 'doc_type', label: 'Belge Türü', render: (v) => v ? v.toUpperCase() : 'DİĞER' },
                                { key: 'file_name', label: 'Dosya Adı' },
                                { key: 'start_date', label: 'Başlangıç', render: (v) => v ? formatDate(v) : '-' },
                                { key: 'end_date', label: 'Bitiş', render: (v) => v ? formatDate(v) : '-' },
                                { key: 'created_at', label: 'Yüklenme Tarihi', render: (v) => formatDate(v) }
                            ]}
                            data={filteredDocuments}
                            emptyMessage={`Bu aya ait belge bulunamadı`}
                            onBulkDelete={handleBulkDeleteDocument}
                            extraToolbarContent={
                                <DateRangePicker
                                    startDate={currentDateRange.startDate}
                                    endDate={currentDateRange.endDate}
                                    onChange={setDateRange}
                                />
                            }
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button className="btn-icon" onClick={() => handleOpenDocument(row.file_path)} title="Görüntüle">
                                        <ExternalLink size={16} />
                                    </button>
                                    <button className="btn-icon danger" onClick={() => handleDeleteDocument(row.id)} title="Sil">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Movement Modal */}
            <Modal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                title={editingMovement ? 'Hareket Düzenle' : 'Yeni Hareket Ekle'}
            >
                <form onSubmit={handleMovementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                label="Hareket Türü"
                                value={movementForm.type}
                                onChange={(val) => {
                                    let suggestedAmount = ''
                                    let description = ''

                                    switch (val) {
                                        case 'salary':
                                            description = 'Maaş Ödemesi'
                                            // Respect current period salary logic roughly or just profile
                                            suggestedAmount = employee.salary || ''
                                            break
                                        case 'payment':
                                            description = 'Mesai Ödemesi'
                                            const relevantOvertimes = overtimes.filter(o => isDateInRange(o.date, paymentDateRange))
                                            const totalOvertime = relevantOvertimes.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0)
                                            if (totalOvertime > 0) suggestedAmount = totalOvertime
                                            break
                                        case 'advance': description = 'Avans Ödemesi'; break
                                        case 'bonus': description = 'Prim Ödemesi'; break
                                        case 'expense': description = 'Harcama Fişi'; break
                                        case 'lending': description = 'Borç Verildi'; break
                                        case 'repayment': description = 'Borç Tahsilat'; break
                                        default: description = '';
                                    }

                                    setMovementForm({ ...movementForm, type: val, amount: suggestedAmount, description })
                                }}
                                options={[
                                    { value: 'salary', label: 'Maaş Ödemesi' },
                                    { value: 'payment', label: 'Mesai Ödemesi' },
                                    { value: 'advance', label: 'Avans' },
                                    { value: 'bonus', label: 'Prim / İkramiye' },
                                    { value: 'expense', label: 'Gider / Harcama' },
                                    { value: 'lending', label: 'Borç Verme' },
                                    { value: 'repayment', label: 'Borç Tahsilat/Kesinti' }
                                ]}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Tarih"
                                type="date"
                                value={movementForm.date}
                                onChange={(val) => setMovementForm({ ...movementForm, date: val })}
                                required
                            />
                        </div>
                    </div>

                    <CustomInput
                        label="Tutar"
                        type="text"
                        format="currency"
                        value={movementForm.amount}
                        onChange={(val) => setMovementForm({ ...movementForm, amount: val })}
                        required
                    />

                    <CustomInput
                        label="Açıklama"
                        value={movementForm.description}
                        onChange={(val) => setMovementForm({ ...movementForm, description: val })}
                        multiline
                        rows={3}
                    />

                    {/* Styled Checkbox for "Ödendi" */}
                    <div
                        onClick={() => setMovementForm({ ...movementForm, isPaid: !movementForm.isPaid })}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px 16px',
                            background: movementForm.isPaid ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                            border: `1px solid ${movementForm.isPaid ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            userSelect: 'none'
                        }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '6px',
                            border: `2px solid ${movementForm.isPaid ? 'var(--accent-primary)' : 'var(--text-muted)'}`,
                            background: movementForm.isPaid ? 'var(--accent-primary)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}>
                            {movementForm.isPaid && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: 500, color: movementForm.isPaid ? 'var(--text-primary)' : 'var(--text-secondary)' }}>Ödendi Olarak İşaretle</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bu işlem kasadan düşülecektir</span>
                        </div>
                    </div>

                    {movementForm.isPaid && (
                        <div style={{ marginTop: '8px' }}>
                            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                                Ödeme Yöntemi
                            </label>
                            <div className="toggle-container">
                                <button
                                    type="button"
                                    className={`toggle-btn ${movementForm.paymentMethod === 'cash' ? 'active' : ''}`}
                                    onClick={() => setMovementForm({ ...movementForm, paymentMethod: 'cash' })}
                                >
                                    <Wallet size={18} />
                                    <span>Elden / Nakit</span>
                                </button>
                                <button
                                    type="button"
                                    className={`toggle-btn ${movementForm.paymentMethod === 'bank' ? 'active' : ''}`}
                                    onClick={() => setMovementForm({ ...movementForm, paymentMethod: 'bank' })}
                                >
                                    <CreditCard size={18} />
                                    <span>Banka Havalesi</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsMovementModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Leave Modal */}
            <Modal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                title={editingLeave ? 'İzin Düzenle' : 'İzin Talebi Ekle'}
            >
                <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <CustomSelect
                        label="İzin Türü"
                        value={leaveForm.type}
                        onChange={(val) => setLeaveForm({ ...leaveForm, type: val })}
                        options={[
                            { value: 'annual', label: 'Yıllık İzin' },
                            { value: 'sick', label: 'Raporlu/Hasta' },
                            { value: 'unpaid', label: 'Ücretsiz İzin' }
                        ]}
                        required
                    />

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Başlangıç"
                                type="date"
                                value={leaveForm.start_date}
                                onChange={(val) => setLeaveForm({ ...leaveForm, start_date: val })}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Bitiş"
                                type="date"
                                value={leaveForm.end_date}
                                onChange={(val) => setLeaveForm({ ...leaveForm, end_date: val })}
                                required
                            />
                        </div>
                    </div>

                    <CustomInput
                        label="Gün Sayısı"
                        type="number"
                        value={leaveForm.days}
                        onChange={(val) => setLeaveForm({ ...leaveForm, days: val })}
                        required
                    />

                    {/* Status Selection (Only if editing, or by role - we'll allow it for now if editing) */}
                    {editingLeave && (
                        <CustomSelect
                            label="Durum"
                            value={leaveForm.status}
                            onChange={(val) => setLeaveForm({ ...leaveForm, status: val })}
                            options={[
                                { value: 'pending', label: 'Bekliyor' },
                                { value: 'approved', label: 'Onaylı' },
                                { value: 'rejected', label: 'Reddedildi' }
                            ]}
                        />
                    )}

                    <CustomInput
                        label="Notlar"
                        value={leaveForm.notes}
                        onChange={(val) => setLeaveForm({ ...leaveForm, notes: val })}
                        multiline
                        rows={3}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsLeaveModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Overtime Modal */}
            <Modal
                isOpen={isOvertimeModalOpen}
                onClose={() => setIsOvertimeModalOpen(false)}
                title={editingOvertime ? 'Mesai Düzenle' : 'Yeni Mesai Ekle'}
            >
                <form onSubmit={handleOvertimeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomSelect
                                label="Mesai Türü"
                                value={overtimeForm.type}
                                onChange={(val) => {
                                    // Reset calculation on type change
                                    const rate = val === 'sunday' ? employee.sunday_overtime_rate : employee.overtime_rate
                                    const amount = overtimeForm.hours * (rate || 0)
                                    setOvertimeForm({ ...overtimeForm, type: val, amount: amount || '' })
                                }}
                                options={[
                                    { value: 'normal', label: 'Normal Mesai' },
                                    { value: 'sunday', label: 'Pazar Mesaisi' }
                                ]}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Tarih"
                                type="date"
                                value={overtimeForm.date}
                                onChange={(val) => setOvertimeForm({ ...overtimeForm, date: val })}
                                required
                            />
                        </div>
                    </div>

                    <CustomInput
                        label={overtimeForm.type === 'sunday' ? 'Gün Sayısı' : 'Saat'}
                        type="number"
                        value={overtimeForm.hours}
                        onChange={(val) => setOvertimeForm({ ...overtimeForm, hours: val })}
                        required
                    />

                    <CustomInput
                        label="Açıklama"
                        value={overtimeForm.description}
                        onChange={(val) => setOvertimeForm({ ...overtimeForm, description: val })}
                        multiline
                        rows={3}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsOvertimeModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Salary Update Modal */}
            <Modal
                isOpen={isSalaryModalOpen}
                onClose={() => {
                    setIsSalaryModalOpen(false)
                    setEditingSalaryHistory(null) // Reset on close
                }}
                title={editingSalaryHistory ? 'Geçmiş Maaş Kaydını Düzenle' : 'Maaş Güncelle / Zam Yap'}
            >
                <form onSubmit={handleSalarySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {!editingSalaryHistory && (
                        <div className="alert alert-info">
                            <DollarSign size={16} />
                            <span>
                                Bu işlem çalışanın <strong>güncel maaşını</strong> değiştirecek ve eski maaşı <strong>tarihçeye</strong> kaydedecektir.
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Yeni Maaş"
                                type="text"
                                format="currency"
                                value={salaryForm.amount}
                                onChange={(val) => setSalaryForm({ ...salaryForm, amount: val })}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Geçerlilik Tarihi"
                                type="date"
                                value={salaryForm.start_date}
                                onChange={(val) => setSalaryForm({ ...salaryForm, start_date: val })}
                                required
                            />
                            {(() => {
                                let limit = employee?.start_date || null
                                if (salaryHistory && salaryHistory.length > 0) {
                                    const startRecord = salaryHistory.find(r =>
                                        ['start', 'starting', 'baslangic', 'başlangıç', 'initial'].some(t => r.type?.toLowerCase().includes(t))
                                    )
                                    if (startRecord) limit = startRecord.start_date
                                }
                                if (limit && salaryForm.start_date < limit) {
                                    return (
                                        <div style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>
                                            ⚠️ Tarih {formatDate(limit)}'den önce olamaz
                                        </div>
                                    )
                                }
                            })()}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            {/* Disable Type Selection when Editing History? Or allow?
                                Usually history type is fixed, but let's allow changing it if it was entered wrong. */}
                            <CustomSelect
                                label="İşlem Türü"
                                value={salaryForm.type}
                                onChange={(val) => setSalaryForm({ ...salaryForm, type: val })}
                                options={[
                                    { value: 'raise', label: 'Zam' },
                                    { value: 'promotion', label: 'Terfi' },
                                    { value: 'adjustment', label: 'Düzeltme' },
                                    { value: 'initial', label: 'Başlangıç' },
                                    { value: 'update', label: 'Güncelleme' } // Added 'update'
                                ]}
                                disabled={!!editingSalaryHistory} // Maybe disable type change for existing? Let's disable for simplicity.
                            />
                        </div>
                    </div>

                    <CustomInput
                        label="Açıklama"
                        value={salaryForm.description}
                        onChange={(val) => setSalaryForm({ ...salaryForm, description: val })}
                        multiline
                        rows={3}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsSalaryModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Edit Employee Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Personel Bilgilerini Düzenle"
            >
                <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Ad"
                                value={editForm.name}
                                onChange={(val) => setEditForm({ ...editForm, name: val })}
                                required
                                format="uppercase"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Soyad"
                                value={editForm.surname}
                                onChange={(val) => setEditForm({ ...editForm, surname: val })}
                                required
                                format="uppercase"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="TC Kimlik No"
                                value={editForm.tc_no}
                                onChange={(val) => setEditForm({ ...editForm, tc_no: val })}
                                maxLength={11}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Telefon"
                                value={editForm.phone}
                                onChange={(val) => setEditForm({ ...editForm, phone: val })}
                                type="tel"
                                format="phone"
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Departman"
                                value={editForm.department}
                                onChange={(val) => setEditForm({ ...editForm, department: val })}
                                format="title"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Pozisyon"
                                value={editForm.position}
                                onChange={(val) => setEditForm({ ...editForm, position: val })}
                                format="title"
                            />
                        </div>
                    </div>

                    <CustomInput
                        label="E-posta"
                        type="email"
                        value={editForm.email}
                        onChange={(val) => setEditForm({ ...editForm, email: val })}
                    />

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Maaş (TL)"
                                type="text"
                                format="currency"
                                value={editForm.salary}
                                disabled={true}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="İşe Başlama Tarihi"
                                type="date"
                                value={editForm.start_date}
                                onChange={(val) => setEditForm({ ...editForm, start_date: val })}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Mesai Ücreti (Saat)"
                                type="number"
                                value={editForm.overtime_rate}
                                onChange={(val) => setEditForm({ ...editForm, overtime_rate: val })}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <CustomInput
                                label="Pazar Mesai Ücreti (Günlük)"
                                type="number"
                                value={editForm.sunday_overtime_rate}
                                onChange={(val) => setEditForm({ ...editForm, sunday_overtime_rate: val })}
                            />
                        </div>
                    </div>

                    <CustomSelect
                        label="Durum"
                        value={editForm.status}
                        onChange={(val) => setEditForm({ ...editForm, status: val })}
                        options={[
                            { value: 'active', label: 'Aktif' },
                            { value: 'passive', label: 'Pasif' }
                        ]}
                    />

                    <CustomInput
                        label="Notlar"
                        value={editForm.notes}
                        onChange={(val) => setEditForm({ ...editForm, notes: val })}
                        multiline
                        rows={3}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>



            {/* Salary History View Modal */}
            <Modal
                isOpen={showHistoryModal}
                onClose={() => setShowHistoryModal(false)}
                title="Maaş Geçmişi"
                size="xl"
            >
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                    <button className="btn btn-primary" onClick={() => {
                        setShowHistoryModal(false)
                        setEditingSalaryHistory(null) // Ensure fresh state
                        openSalaryModal()
                    }}>
                        <Plus size={16} />
                        <span>Maaş Güncelle / Zam Yap</span>
                    </button>
                </div>

                <DataTable
                    persistenceKey="employee_salary_history_table"
                    data={salaryHistory}
                    onBulkDelete={handleBulkDeleteSalary}
                    columns={[
                        { key: 'start_date', label: 'Tarih', render: (val) => formatDate(val) },
                        { key: 'amount', label: 'Miktar', render: (val) => <span style={{ fontWeight: 600 }}>{formatCurrency(val)}</span> },
                        {
                            key: 'type',
                            label: 'Tür',
                            render: (val) => {
                                const types = {
                                    'initial': 'Başlangıç',
                                    'raise': 'Zam',
                                    'adjustment': 'Düzeltme',
                                    'promotion': 'Terfi'
                                }
                                return types[val] || val
                            }
                        },
                        { key: 'description', label: 'Açıklama' },
                        {
                            key: 'end_date',
                            label: 'Durum',
                            render: (_, row) => {
                                const today = new Date().toISOString().split('T')[0]
                                const isFuture = row.start_date > today
                                // Active if amounts match exactly (handles manual overrides)
                                // Note: parseFloat to handle potential string/number mismatch
                                const isActive = parseFloat(row.amount) === parseFloat(employee.salary)

                                if (isActive) return <span className="badge badge-success">Aktif</span>
                                if (isFuture) return <span className="badge badge-warning">Gelecek</span>
                                return <span className="badge badge-neutral">Pasif</span>
                            }
                        }
                    ]}
                    emptyMessage="Maaş geçmişi bulunamadı."
                    actions={(row) => (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                className="btn-icon success table-action-btn"
                                onClick={() => handleMakeActiveHistory(row)}
                                title="Bu maaşı güncel olarak ayarla (Bugünün tarihiyle yeni kayıt oluşturur)"
                            >
                                <CheckCircle size={16} />
                            </button>


                            <button
                                className="btn-icon table-action-btn"
                                onClick={() => handleEditHistory(row)}
                                title="Düzenle"
                            >
                                <Pencil size={16} />
                            </button>

                            <button
                                className="btn-icon danger table-action-btn"
                                onClick={() => handleDeleteHistory(row)}
                                title="Sil"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />

            </Modal>

            {/* Assignment Modal */}
            <Modal
                isOpen={isAssignmentModalOpen}
                onClose={() => setIsAssignmentModalOpen(false)}
                title={editingAssignment ? 'Zimmet Düzenle' : 'Yeni Araç Zimmeti'}
            >
                <AssignmentForm
                    initialData={editingAssignment ? {
                        ...editingAssignment,
                        // Ensure defaults for this context
                        assignedTo: employee.name + ' ' + employee.surname,
                        itemName: editingAssignment.item_name || 'Araç Zimmeti'
                    } : {
                        assignedTo: employee.name + ' ' + employee.surname,
                        itemName: 'Araç Zimmeti'
                    }}
                    vehicles={vehicles}
                    onSubmit={handleAssignmentSubmit}
                    onCancel={() => setIsAssignmentModalOpen(false)}
                    loading={saving}
                />
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title}
                message={confirmModal?.message}
                onConfirm={handleConfirmAction}
                onClose={() => setConfirmModal(null)}
                confirmText={confirmModal?.confirmText}
                type={confirmModal?.confirmButtonType || 'danger'}
            />

            {/* Official Holidays Modal */}
            <Modal
                isOpen={showHolidays}
                onClose={() => setShowHolidays(false)}
                title="Resmi Tatiller (2025)"
            >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {[
                        { date: '2025-01-01', name: 'Yılbaşı' },
                        { date: '2025-03-30', name: 'Ramazan Bayramı 1. Gün' },
                        { date: '2025-03-31', name: 'Ramazan Bayramı 2. Gün' },
                        { date: '2025-04-01', name: 'Ramazan Bayramı 3. Gün' },
                        { date: '2025-04-23', name: 'Ulusal Egemenlik ve Çocuk Bayramı' },
                        { date: '2025-05-01', name: 'Emek ve Dayanışma Günü' },
                        { date: '2025-05-19', name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı' },
                        { date: '2025-06-06', name: 'Kurban Bayramı 1. Gün' },
                        { date: '2025-06-07', name: 'Kurban Bayramı 2. Gün' },
                        { date: '2025-06-08', name: 'Kurban Bayramı 3. Gün' },
                        { date: '2025-06-09', name: 'Kurban Bayramı 4. Gün' },
                        { date: '2025-07-15', name: 'Demokrasi ve Milli Birlik Günü' },
                        { date: '2025-08-30', name: 'Zafer Bayramı' },
                        { date: '2025-10-29', name: 'Cumhuriyet Bayramı' }
                    ].sort((a, b) => a.date.localeCompare(b.date)).map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '8px', borderLeft: '4px solid var(--accent-primary)' }}>
                            <span style={{ fontWeight: 600 }}>{h.name}</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{formatDate(h.date)}</span>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Document Modal */}
            <Modal
                isOpen={isDocumentModalOpen}
                onClose={() => setIsDocumentModalOpen(false)}
                title="Yeni Belge Ekle"
                width="600px"
            >
                <DocumentForm
                    onSubmit={handleDocumentSubmit}
                    onCancel={() => setIsDocumentModalOpen(false)}
                    loading={false}
                />
            </Modal>
            {/* Styles for Toggle */}
            <style>{`
                .toggle-container {
                    display: flex; gap: 8px; margin-top: 4px;
                }
                .toggle-btn {
                    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
                    padding: 12px; border: 1px solid var(--border-color); border-radius: 8px;
                    background: var(--bg-secondary); color: var(--text-muted); cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                }
                .toggle-btn:hover { background: var(--bg-tertiary); }
                .toggle-btn.active {
                    border-color: var(--accent-primary);
                    background: var(--accent-subtle);
                    color: var(--accent-primary);
                    font-weight: 500;
                }
            `}</style>
        </div >
    )
}

