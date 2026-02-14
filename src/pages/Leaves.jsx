import React, { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import { useCompany } from '../context/CompanyContext'
import { formatDate, getOfficialHolidays } from '../utils/helpers'
import CustomSelect from '../components/CustomSelect'
import DateRangePicker from '../components/DateRangePicker'
import { Calendar, Clock, UserCheck, XCircle, Check, X, ChevronLeft, ChevronRight, Grid, List, Save, Users, Layers, Trash2, Briefcase, HeartPulse, AlertCircle, Info } from 'lucide-react'
import { useToast } from '../context/ToastContext'
import Modal from '../components/Modal'
import CustomInput from '../components/CustomInput'

export default function Leaves() {
    const { currentCompany } = useCompany()
    const { showToast } = useToast()

    // View State
    const [viewMode, setViewMode] = useState('list') // 'list' | 'schedule'

    // List View State
    const [leaves, setLeaves] = useState([])
    const [loading, setLoading] = useState(true)
    const [filteredLeaves, setFilteredLeaves] = useState([])
    const [statusFilter, setStatusFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [dateRange, setDateRange] = useState({ start: null, end: null })

    // Schedule View State
    const [currentDate, setCurrentDate] = useState(new Date())
    const [employees, setEmployees] = useState([])
    const [attendanceData, setAttendanceData] = useState([])

    // Single Cell Edit
    const [editingCell, setEditingCell] = useState(null)
    const [modalOpen, setModalOpen] = useState(false)

    // Bulk Action State
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
    const [bulkModalOpen, setBulkModalOpen] = useState(false)
    const [bulkForm, setBulkForm] = useState({
        startDate: '',
        endDate: '',
        status: 'present',
        description: ''
    })

    // Drag Selection State
    const [lastSelectedEmployeeId, setLastSelectedEmployeeId] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [showLegend, setShowLegend] = useState(false)
    const [dragStart, setDragStart] = useState(null) // { empId, day }
    const [dragEnd, setDragEnd] = useState(null) // { empId, day }

    // Dedicated state for executing a range edit (Drag-to-Select final state)
    // This allows us to open the modal without dirtying the 'selectedEmployeeIds', thus hiding the bottom bar.
    const [rangeEditTarget, setRangeEditTarget] = useState(null) // { empIds: [], ...dates }
    const [deleteStep, setDeleteStep] = useState(null) // 'confirm' | null

    // Stats
    // Stats - Monthly / Operational
    const [stats, setStats] = useState({
        onLeaveToday: 0,
        upcomingLeaves: 0,
        pending: 0,
        usageRate: 0
    })

    // Calculate Stats whenever leaves or employees change
    useEffect(() => {
        if (!leaves) return

        const now = new Date()
        const todayStr = now.toISOString().split('T')[0]
        const next7Days = new Date(now)
        next7Days.setDate(now.getDate() + 7)
        const next7DaysStr = next7Days.toISOString().split('T')[0]

        // 1. Currently On Leave (Approved & spanning today)
        const onLeaveToday = leaves.filter(l =>
            l.status === 'approved' &&
            l.start_date <= todayStr &&
            l.end_date >= todayStr
        ).length

        // 2. Upcoming 7 Days (Approved & starting between tomorrow and +7 days)
        // We consider 'upcoming' as starting in the future, within 7 days.
        const upcomingLeaves = leaves.filter(l =>
            l.status === 'approved' &&
            l.start_date > todayStr &&
            l.start_date <= next7DaysStr
        ).length

        // 3. Pending (All)
        const pending = leaves.filter(l => l.status === 'pending').length

        // 4. Usage Rate (Unique Employees with Approved Leave in Current Month / Total Employees)
        const currentMonth = now.getMonth() + 1
        const currentYear = now.getFullYear()
        const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
        const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]

        const employeesWithLeaveThisMonth = new Set(
            leaves.filter(l =>
                l.status === 'approved' &&
                (
                    (l.start_date >= firstDayOfMonth && l.start_date <= lastDayOfMonth) ||
                    (l.end_date >= firstDayOfMonth && l.end_date <= lastDayOfMonth) ||
                    (l.start_date <= firstDayOfMonth && l.end_date >= lastDayOfMonth)
                )
            ).map(l => l.employee_id)
        )

        const totalEmployees = employees.length || 1 // Avoid division by zero
        const usageRate = Math.round((employeesWithLeaveThisMonth.size / totalEmployees) * 100)

        setStats({
            onLeaveToday,
            upcomingLeaves,
            pending,
            usageRate
        })

    }, [leaves, employees])

    // Load Data
    useEffect(() => {
        if (!currentCompany) return
        if (viewMode === 'list') {
            loadLeaves()
        } else {
            loadScheduleData()
        }
    }, [currentCompany, viewMode, currentDate])

    // Real-time Updates
    useEffect(() => {
        const cleanup = window.electronAPI.on('data-changed', () => {
            if (viewMode === 'list') loadLeaves()
            else loadScheduleData()
        })
        return () => cleanup && cleanup()
    }, [viewMode, currentDate, currentCompany])

    // Global Mouse Up for Drag End
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (isDragging && dragStart && dragEnd) {
                // Determine range
                const startDay = Math.min(dragStart.day, dragEnd.day)
                const endDay = Math.max(dragStart.day, dragEnd.day)

                // Determine Employee Range
                const startEmpIndex = employees.findIndex(e => e.id === dragStart.empId)
                const endEmpIndex = employees.findIndex(e => e.id === dragEnd.empId)

                // If valid range
                if (startEmpIndex !== -1 && endEmpIndex !== -1) {
                    const minEmpIndex = Math.min(startEmpIndex, endEmpIndex)
                    const maxEmpIndex = Math.max(startEmpIndex, endEmpIndex)

                    // Get all employees in the vertical range
                    const targetEmployees = employees.slice(minEmpIndex, maxEmpIndex + 1)
                    const targetEmpIds = targetEmployees.map(e => e.id)

                    // If distinct range selected (either multiple days OR multiple employees)
                    if (startDay !== endDay || minEmpIndex !== maxEmpIndex) {
                        const year = currentDate.getFullYear()
                        const month = currentDate.getMonth() + 1

                        const sDate = new Date(year, month - 1, startDay)
                        const eDate = new Date(year, month - 1, endDay)

                        const fmt = (d) => {
                            const offset = d.getTimezoneOffset()
                            const localDate = new Date(d.getTime() - (offset * 60 * 1000))
                            return localDate.toISOString().split('T')[0]
                        }

                        setBulkForm(prev => ({
                            ...prev,
                            startDate: fmt(sDate),
                            endDate: fmt(eDate),
                            status: 'present',
                            description: ''
                        }))

                        // Set Range Edit Target with ALL selected employees
                        setRangeEditTarget({ empIds: targetEmpIds })
                        setBulkModalOpen(true)
                    }
                }
            }
            setIsDragging(false)
            setDragStart(null)
            setDragEnd(null)
        }

        if (isDragging) {
            window.addEventListener('mouseup', handleGlobalMouseUp)
        }
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }, [isDragging, dragStart, dragEnd, currentDate])


    // Filter Logic for List View
    useEffect(() => {
        let result = leaves
        if (statusFilter) result = result.filter(l => l.status === statusFilter)
        if (typeFilter) result = result.filter(l => l.type === typeFilter)
        if (dateRange.start && dateRange.end) {
            result = result.filter(l => {
                const start = l.start_date
                const end = l.end_date
                const rStart = dateRange.start
                const rEnd = dateRange.end
                return (start >= rStart && start <= rEnd) || (end >= rStart && end <= rEnd)
            })
        }
        setFilteredLeaves(result)
    }, [leaves, statusFilter, typeFilter, dateRange])

    const loadLeaves = async () => {
        setLoading(true)
        try {
            // Parallel fetch: Leaves AND Employees (for stats denominator)
            const [leavesResult, empResult] = await Promise.all([
                window.electronAPI.getAllLeaves(currentCompany.id),
                window.electronAPI.getEmployees(currentCompany.id)
            ])

            if (leavesResult.success) {
                setLeaves(leavesResult.data)
                setFilteredLeaves(leavesResult.data)
            }
            if (empResult.success) {
                setEmployees(empResult.data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const loadScheduleData = async () => {
        setLoading(true)
        try {
            const empResult = await window.electronAPI.getEmployees(currentCompany.id)
            if (empResult.success) setEmployees(empResult.data)

            const attResult = await window.electronAPI.getAttendance(
                currentCompany.id,
                currentDate.getMonth() + 1,
                currentDate.getFullYear()
            )
            if (attResult.success) setAttendanceData(attResult.data)

            // Also fetch leaves to visualize pending requests
            const leavesResult = await window.electronAPI.getAllLeaves(currentCompany.id)
            if (leavesResult.success) setLeaves(leavesResult.data)

        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (leave, newStatus) => {
        if (!confirm(newStatus === 'approved' ? 'İzin talebini onaylamak istiyor musunuz?' : 'İzin talebini reddetmek istiyor musunuz?')) return

        try {
            const result = await window.electronAPI.updateEmployeeLeave({
                ...leave,
                startDate: leave.start_date,
                endDate: leave.end_date,
                status: newStatus
            })
            if (result.success) {
                showToast(newStatus === 'approved' ? 'İzin onaylandı' : 'İzin reddedildi', 'success')
                loadLeaves()
            } else {
                showToast('İşlem başarısız: ' + result.error, 'error')
            }
        } catch (error) {
            showToast('Bir hata oluştu', 'error')
        }
    }

    // Schedule Helpers
    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

    const handleMonthChange = (increment) => {
        const newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + increment)
        setCurrentDate(newDate)
    }

    const handleGoToToday = () => {
        setCurrentDate(new Date())
    }

    // Refined Status Colors (More Vibrant)
    const getStatusColor = (status) => {
        switch (status) {
            case 'present': return '#22c55e'; // Vibrant Green (Tailwind green-500)
            case 'absent': return '#ef4444';  // Vibrant Red (Tailwind red-500)
            case 'late': return '#f97316';    // Vibrant Orange (Tailwind orange-500)
            case 'sick_leave': return '#a855f7'; // Vibrant Purple (Tailwind purple-500)
            case 'annual_leave': return '#3b82f6'; // Vibrant Blue (Tailwind blue-500)
            case 'unpaid_leave': return '#6b7280'; // Gray 500
            case 'excuse': return '#ec4899'; // Vibrant Pink (Tailwind pink-500)
            case 'casual_leave': return '#6366f1'; // Vibrant Indigo (Tailwind indigo-500)
            case 'other': return '#8b5cf6'; // Violet 500
            default: return 'var(--border-color)';
        }
    }

    const getStatusLabel = (status) => {
        switch (status) {
            case 'present': return 'Geldi';
            case 'absent': return 'Gelmedi';
            case 'late': return 'Geç Kaldı';
            case 'sick_leave': return 'Raporlu';
            case 'annual_leave': return 'Yıllık İzin';
            case 'unpaid_leave': return 'Ücretsiz İzin';
            case 'excuse': return 'Mazeretli';
            case 'casual_leave': return 'İdari İzin';
            case 'other': return 'Diğer';
            default: return '-';
        }
    }

    // Drag Handlers
    const handleMouseDown = (e, empId, day) => {
        e.preventDefault() // Prevent text selection
        setIsDragging(true)
        setDragStart({ empId, day })
        setDragEnd({ empId, day })
        // Use separate logic for drag select vs checkmark select
        // Don't clear selectedEmployeeIds here to allow mixed usage if needed, 
        // but for now they are separate modes.
    }

    const handleMouseEnter = (empId, day) => {
        if (isDragging && dragStart) {
            setDragEnd({ empId, day })
        }
    }

    const isDaySelected = (empId, day) => {
        if (!isDragging || !dragStart) return false

        // Current Drag Selection (2D Box)
        if (dragEnd) {
            // Day Range
            const startDay = Math.min(dragStart.day, dragEnd.day)
            const endDay = Math.max(dragStart.day, dragEnd.day)
            const inDayRange = day >= startDay && day <= endDay

            // Employee Range
            const startEmpIdx = employees.findIndex(e => e.id === dragStart.empId)
            const endEmpIdx = employees.findIndex(e => e.id === dragEnd.empId)
            const currentEmpIdx = employees.findIndex(e => e.id === empId)

            if (startEmpIdx !== -1 && endEmpIdx !== -1 && currentEmpIdx !== -1) {
                const minEmpIdx = Math.min(startEmpIdx, endEmpIdx)
                const maxEmpIdx = Math.max(startEmpIdx, endEmpIdx)
                const inEmpRange = currentEmpIdx >= minEmpIdx && currentEmpIdx <= maxEmpIdx

                return inDayRange && inEmpRange
            }

            return false
        }

        // Initial Click (Single Cell)
        return dragStart.day === day && dragStart.empId === empId
    }


    // Cell Click (Only if NOT dragging)
    const handleCellClick = (employeeId, day) => {
        if (isDragging) return // Let mouseup handle it if dragging

        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        const existing = attendanceData.find(a => a.employee_id === employeeId && a.date === dateStr && a.status)

        // Check if this date belongs to a leave (Approved or Pending)
        const recordLeave = leaves.find(l =>
            l.employee_id === employeeId &&
            l.start_date <= dateStr &&
            l.end_date >= dateStr
        )

        // Consider "Edit Mode" if there is an existing record
        // If there is a pending leave, we are technically "Adding" a new attendance record to confirm it, so isNew = true.
        const isNew = !existing

        // Determine initial status
        let initialStatus = 'present'
        let initialDesc = ''

        if (existing) {
            initialStatus = existing.status || 'present'
            initialDesc = existing.description || ''
        } else if (recordLeave) {
            // Map leave type to status
            // If pending, show as pending desc. If approved, use mapped status.

            const typeMap = {
                'annual': 'annual_leave',
                'sick': 'sick_leave',
                'unpaid': 'unpaid_leave',
                'excuse': 'excuse',
                'casual': 'casual_leave'
            }
            initialStatus = typeMap[recordLeave.type] || 'present'

            if (recordLeave.status === 'pending') {
                initialDesc = `Bekleyen İzin Talebi (${recordLeave.days} Gün)`
            } else {
                initialDesc = `İzin: ${recordLeave.notes || ''}`
            }
        }

        setEditingCell({
            employeeId,
            day,
            dateString: dateStr,
            status: initialStatus,
            description: initialDesc,
            isNew: isNew,
            // Track Leave Info
            leaveId: recordLeave?.id,
            isLeave: !!recordLeave,
            leaveStatus: recordLeave?.status
        })
        setModalOpen(true)
    }

    // Save Single
    const saveAttendance = async () => {
        if (!editingCell) return
        try {
            const result = await window.electronAPI.saveAttendance({
                employeeId: editingCell.employeeId,
                date: editingCell.dateString,
                status: editingCell.status,
                description: editingCell.description
            })
            if (result.success) {
                showToast('Kaydedildi', 'success')
                setModalOpen(false)

                // Optimistic Update for immediate feedback
                setAttendanceData(prev => {
                    const newRecord = {
                        id: Date.now(), // Temp ID
                        employee_id: editingCell.employeeId,
                        date: editingCell.dateString,
                        status: editingCell.status,
                        description: editingCell.description
                    }
                    const index = prev.findIndex(a => a.employee_id === editingCell.employeeId && a.date === editingCell.dateString)
                    if (index > -1) {
                        const newData = [...prev]
                        newData[index] = { ...newData[index], status: editingCell.status, description: editingCell.description }
                        return newData
                    } else {
                        return [...prev, newRecord]
                    }
                })

                // Then reload real data
                await loadScheduleData()
            } else {
                showToast('Hata: ' + result.error, 'error')
            }
        } catch (e) {
            console.error(e)
            showToast('Kaydetme hatası', 'error')
        }
    }

    // Bulk Actions
    const toggleSelectAll = () => {
        if (selectedEmployeeIds.length === employees.length) {
            setSelectedEmployeeIds([])
        } else {
            setSelectedEmployeeIds(employees.map(e => e.id))
        }
    }

    const toggleSelectEmployee = (id, event) => {
        // Handle Shift+Click Range Selection
        if (event && event.shiftKey && lastSelectedEmployeeId) {
            const lastIndex = employees.findIndex(e => e.id === lastSelectedEmployeeId)
            const currentIndex = employees.findIndex(e => e.id === id)

            if (lastIndex !== -1 && currentIndex !== -1) {
                const start = Math.min(lastIndex, currentIndex)
                const end = Math.max(lastIndex, currentIndex)
                const rangeEmployees = employees.slice(start, end + 1)
                const rangeIds = rangeEmployees.map(e => e.id)

                setSelectedEmployeeIds(prev => {
                    const newSet = new Set([...prev, ...rangeIds])
                    return Array.from(newSet)
                })
                // Don't update lastSelectedEmployeeId on Shift+Click to allow extending range from same anchor?
                // Standard behavior usually moves anchor or keeps it. Let's keep the user's last click as new anchor?
                // Actually standard behavior: Click A (Anchor=A). Shift-Click C (Selects A-C). Shift-Click E (Selects A-E).
                // So Anchor should NOT change on Shift-Click.
                return
            }
        }

        // Standard Toggle
        if (selectedEmployeeIds.includes(id)) {
            setSelectedEmployeeIds(prev => prev.filter(eid => eid !== id))
            setLastSelectedEmployeeId(null) // Reset on deselect? Or keep?
        } else {
            setSelectedEmployeeIds(prev => [...prev, id])
            setLastSelectedEmployeeId(id)
        }
    }

    const handleBulkSave = async () => {
        if (!bulkForm.startDate || !bulkForm.endDate) {
            showToast('Lütfen tarih aralığı seçin', 'error')
            return
        }

        // Determine targets: Range Edit Target (Priority) OR Global Selection
        const targetIds = rangeEditTarget ? rangeEditTarget.empIds : selectedEmployeeIds

        if (targetIds.length === 0) {
            showToast('Personel seçilmedi', 'warning')
            return
        }

        const start = new Date(bulkForm.startDate)
        const end = new Date(bulkForm.endDate)
        const dates = []
        for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
            dates.push(new Date(dt).toISOString().split('T')[0])
        }

        try {
            // Check if status is a leave type
            const leaveTypes = {
                'annual_leave': 'annual',
                'sick_leave': 'sick',
                'unpaid_leave': 'unpaid',
                'excuse': 'excuse',
                'casual_leave': 'casual'
            }
            const leaveType = leaveTypes[bulkForm.status]

            if (leaveType) {
                // It's a leave type -> Create ONE leave record per employee
                const promises = targetIds.map(empId => {
                    // Calculate days count
                    const start = new Date(bulkForm.startDate)
                    const end = new Date(bulkForm.endDate)
                    const diffTime = Math.abs(end - start)
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

                    return window.electronAPI.addEmployeeLeave({
                        employeeId: empId,
                        type: leaveType,
                        startDate: bulkForm.startDate,
                        endDate: bulkForm.endDate,
                        days: diffDays,
                        status: 'approved', // Auto-approve since it's from schedule/admin
                        notes: bulkForm.description || 'Çizelgeden toplu giriş'
                    })
                })
                await Promise.all(promises)

            } else {
                // It's a daily status (Present, Absent, Late) -> Individual records
                // BUT we should also ensure we don't leave "ghost" leave records if overwriting?
                // The backend `saveAttendance` technically deletes *single day* leaves if status != leave.
                // For now, let's trust the existing loop for non-leave statuses.

                const promises = []
                targetIds.forEach(empId => {
                    dates.forEach(dateStr => {
                        promises.push(
                            window.electronAPI.saveAttendance({
                                employeeId: empId,
                                date: dateStr,
                                status: bulkForm.status,
                                description: bulkForm.description
                            })
                        )
                    })
                })
                await Promise.all(promises)
            }

            showToast('İşlem tamamlandı', 'success')

            // Reset States
            setBulkModalOpen(false)
            setRangeEditTarget(null)

            // Clear selection only if it wasn't a range edit
            if (!rangeEditTarget) {
                setSelectedEmployeeIds([])
            }

            // Reload Data
            await loadScheduleData()
            // Reload Data
            await loadScheduleData()
        } catch (error) {
            console.error(error)
            showToast('Hata oluştu', 'error')
        }
    }

    // Reset range target when modal closes manually
    const handleBulkModalClose = () => {
        setBulkModalOpen(false)
        setRangeEditTarget(null)
    }

    const hasDataInSelection = () => {
        if (!rangeEditTarget) return false

        const { startDate, endDate } = bulkForm
        if (!startDate || !endDate) return false

        const empId = rangeEditTarget.empIds[0]
        if (!empId) return false

        // 1. Check Leaves (excluding rejected)
        const hasLeave = leaves.some(l =>
            l.employee_id === empId &&
            l.status !== 'rejected' &&
            (
                (l.start_date >= startDate && l.start_date <= endDate) ||
                (l.end_date >= startDate && l.end_date <= endDate) ||
                (l.start_date <= startDate && l.end_date >= endDate)
            )
        )
        if (hasLeave) return true

        // 2. Check Attendance
        const hasAttendance = attendanceData.some(a =>
            a.employee_id === empId &&
            a.date >= startDate &&
            a.date <= endDate &&
            a.status // Has a status record
        )

        return hasAttendance
    }

    const handleBulkDelete = async () => {
        if (!bulkForm.startDate || !bulkForm.endDate) return

        const targetIds = rangeEditTarget ? rangeEditTarget.empIds : selectedEmployeeIds
        if (targetIds.length === 0) return

        if (!confirm('Seçili aralıktaki tüm kayıtları (İzinler dahil) silmek istediğinize emin misiniz?')) return

        try {
            const start = new Date(bulkForm.startDate)
            const end = new Date(bulkForm.endDate)
            const dateStrStart = bulkForm.startDate
            const dateStrEnd = bulkForm.endDate

            const promises = []

            // For each target employee
            for (const empId of targetIds) {
                // 1. Find overlapping leaves
                const overlappingLeaves = leaves.filter(l =>
                    l.employee_id === empId &&
                    (
                        (l.start_date >= dateStrStart && l.start_date <= dateStrEnd) || // Start inside
                        (l.end_date >= dateStrStart && l.end_date <= dateStrEnd) ||   // End inside
                        (l.start_date <= dateStrStart && l.end_date >= dateStrEnd)    // Enclosing
                    )
                )

                // Delete range from leaves found
                overlappingLeaves.forEach(l => {
                    promises.push(window.electronAPI.deleteLeaveRange(l.id, dateStrStart, dateStrEnd))
                })

                // 2. Delete attendance records for each day in range
                for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                    const dStr = new Date(dt).toISOString().split('T')[0]
                    promises.push(window.electronAPI.deleteAttendance({
                        employeeId: empId,
                        date: dStr
                    }))
                }
            }

            await Promise.all(promises)
            showToast('Kayıtlar temizlendi', 'success')
            handleBulkModalClose()
            await loadScheduleData()

        } catch (error) {
            console.error(error)
            showToast('Silme işlemi başarısız', 'error')
        }
    }

    const monthName = currentDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
    const daysInMonth = getDaysInMonth(currentDate)

    // Check if viewed month is current month
    const isCurrentMonth = new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear()
    const currentDay = new Date().getDate()

    // Helper for subtle today highlight
    // Using a subtle column background and bottom border
    const isToday = (day) => isCurrentMonth && day === currentDay

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">İzin ve Devamsızlık</h1>
                    <p className="page-subtitle">Personel izinleri ve aylık devam durumu</p>
                </div>

                {/* View Toggle */}
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('list')}
                    >
                        <List size={16} /> Liste
                    </button>
                    <button
                        className={`btn ${viewMode === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setViewMode('schedule')}
                    >
                        <Grid size={16} /> Çizelge
                    </button>
                </div>
            </div>

            {viewMode === 'list' ? (
                <>
                    {/* KPI Dashboard */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                        <div className="stat-card">
                            <div className="stat-icon success"><UserCheck /></div>
                            <div className="stat-content"><div className="stat-value">{stats.onLeaveToday}</div><div className="stat-label">Şu an İzinde</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon primary"><Calendar /></div>
                            <div className="stat-content"><div className="stat-value">{stats.upcomingLeaves}</div><div className="stat-label">Gelecek 7 Gün</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon warning"><Clock /></div>
                            <div className="stat-content"><div className="stat-value">{stats.pending}</div><div className="stat-label">Bekleyen Onay</div></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon info" style={{ color: '#9333ea' }}><Users /></div>
                            <div className="stat-content"><div className="stat-value">%{stats.usageRate}</div><div className="stat-label">İzin Kullanım Oranı</div></div>
                        </div>
                    </div>

                    <DataTable
                        persistenceKey="leaves_table"
                        columns={[
                            { key: 'employee_name', label: 'Personel', render: (_, r) => <span style={{ fontWeight: 600 }}>{r.employee_name} {r.employee_surname}</span> },
                            { key: 'department', label: 'Departman' },
                            { key: 'type', label: 'Tür', render: (v) => v === 'annual' ? 'Yıllık İzin' : v === 'sick' ? 'Rapor' : v === 'unpaid' ? 'Ücretsiz' : 'Mazeret' },
                            { key: 'start_date', label: 'Başlangıç', render: (v) => formatDate(v) },
                            { key: 'end_date', label: 'Bitiş', render: (v) => formatDate(v) },
                            { key: 'days', label: 'Gün', width: '80px', align: 'center', render: (v) => <span className="badge">{v}</span> },
                            {
                                key: 'status', label: 'Durum', width: '120px', render: (v) => (
                                    <span className={`status-badge ${v === 'approved' ? 'success' : v === 'pending' ? 'warning' : 'danger'}`}>
                                        {v === 'approved' ? 'Onaylı' : v === 'pending' ? 'Bekliyor' : 'Red'}
                                    </span>
                                )
                            },
                        ]}
                        data={filteredLeaves}
                        actions={(r) => r.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn-icon success" title="Onayla" onClick={() => handleStatusUpdate(r, 'approved')}><Check size={16} /></button>
                                <button className="btn-icon danger" title="Reddet" onClick={() => handleStatusUpdate(r, 'rejected')}><X size={16} /></button>
                            </div>
                        )}
                        emptyMessage="İzin kaydı bulunamadı"
                        extraToolbarContent={
                            <>
                                <CustomSelect
                                    value={typeFilter}
                                    onChange={setTypeFilter}
                                    options={[{ value: '', label: 'Tüm Türler' }, { value: 'annual', label: 'Yıllık İzin' }, { value: 'sick', label: 'Rapor' }, { value: 'unpaid', label: 'Ücretsiz' }, { value: 'excuse', label: 'Mazeret' }]}
                                    placeholder="İzin Türü"
                                    className="filter-select-custom"
                                />
                                <DateRangePicker startDate={dateRange.start} endDate={dateRange.end} onChange={setDateRange} />
                            </>
                        }
                    />
                </>
            ) : (
                <div className="table-wrapper" style={{ marginTop: '0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Schedule Toolbar */}
                    <div className="table-toolbar" style={{ borderBottom: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
                        {/* Month Nav */}
                        <div className="toolbar-left" style={{ gap: '10px', alignItems: 'center' }}>
                            <div className="month-nav" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '2px' }}>
                                <button className="btn-icon" onClick={() => handleMonthChange(-1)} style={{ width: '28px', height: '28px' }}><ChevronLeft size={18} /></button>
                                <div style={{ minWidth: '140px', textAlign: 'center', fontSize: '14px', fontWeight: 600, padding: '0 10px' }}>{monthName}</div>
                                <button className="btn-icon" onClick={() => handleMonthChange(1)} style={{ width: '28px', height: '28px' }}><ChevronRight size={18} /></button>
                            </div>

                            {!isCurrentMonth && (
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleGoToToday}
                                    style={{
                                        height: '32px',
                                        padding: '0 12px',
                                        fontSize: '13px',
                                        gap: '6px',
                                        background: 'transparent',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--accent-primary)'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-subtle)'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                                >
                                    <Calendar size={14} />
                                    Bugün
                                </button>
                            )}
                        </div>

                        {/* Legend / Info */}
                        <div className="toolbar-right" style={{ gap: '15px', position: 'relative' }}>
                            <button
                                className="btn-icon"
                                onClick={() => setShowLegend(!showLegend)}
                                title="Renk ve Simge Anlamları"
                                style={{ width: '32px', height: '32px', borderRadius: '50%', background: showLegend ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--border-color)' }}
                            >
                                <Info size={18} />
                            </button>

                            {showLegend && (
                                <div style={{
                                    position: 'absolute',
                                    top: '40px',
                                    right: 0,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '12px',
                                    boxShadow: 'var(--shadow-lg)',
                                    zIndex: 100,
                                    minWidth: '220px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    <div style={{ fontWeight: 600, marginBottom: '4px', fontSize: '13px', color: 'var(--text-primary)' }}>Simge Anlamları</div>
                                    {[
                                        { label: 'Geldi', icon: <Check size={14} />, status: 'present' },
                                        { label: 'Gelmedi', icon: <X size={14} />, status: 'absent' },
                                        { label: 'Geç Kaldı', icon: <Clock size={14} />, status: 'late' },
                                        { label: 'Yıllık İzin', icon: <Briefcase size={14} />, status: 'annual_leave' },
                                        { label: 'Raporlu', icon: <HeartPulse size={14} />, status: 'sick_leave' },
                                        { label: 'Mazeret', icon: <AlertCircle size={14} />, status: 'excuse' },
                                        { label: 'Ücretsiz İzin', icon: <XCircle size={14} />, status: 'unpaid_leave' },
                                        { label: 'Onay Bekleyen', icon: <Clock size={14} className="text-amber-600" />, status: 'pending', color: '#d97706' },
                                    ].map(item => (
                                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            <div style={{ color: item.color || getStatusColor(item.status), display: 'flex' }}>{item.icon}</div>
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bulk Selection Overlay (DataTable Style) - Reused for Drag Selection too */}
                    {selectedEmployeeIds.length > 0 && !isDragging && (
                        <div className="bulk-selection-overlay">
                            <span className="bulk-count">{selectedEmployeeIds.length} personel seçili</span>
                            <div className="bulk-divider" />
                            <div className="bulk-actions">
                                <button className="btn-bulk-action primary" onClick={() => setBulkModalOpen(true)}>
                                    <Layers size={15} />
                                    Toplu İşlem
                                </button>
                                <button className="btn-bulk-action secondary" onClick={toggleSelectAll}>
                                    <X size={15} />
                                    Vazgeç
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Schedule Grid */}
                    <div className="table-container" style={{ borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', borderTop: 'none', overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 250px)' }}>
                        <table className="data-table" style={{ width: '100%', tableLayout: 'fixed', userSelect: 'none', borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 30 }}>
                                <tr>
                                    {/* Checkbox Header */}
                                    <th className="th-checkbox" style={{ position: 'sticky', left: 0, zIndex: 40, width: '40px', background: 'var(--bg-secondary)', top: 0, borderBottom: '1px solid var(--border-color)' }}>
                                        <div
                                            className={`checkbox ${selectedEmployeeIds.length === employees.length && employees.length > 0 ? 'checked' : ''}`}
                                            onClick={toggleSelectAll}
                                        >
                                            {selectedEmployeeIds.length === employees.length && employees.length > 0 && <Check size={12} />}
                                        </div>
                                    </th>

                                    <th style={{ padding: '10px', textAlign: 'left', borderRight: '1px solid var(--border-color)', width: '200px', position: 'sticky', left: 40, background: 'var(--bg-secondary)', zIndex: 39, top: 0, borderBottom: '1px solid var(--border-color)' }}>
                                        <div className="th-content">Personel</div>
                                    </th>
                                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                        const dateForCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

                                        const dayOfWeek = dateForCheck.getDay() // 0 = Sunday, 6 = Saturday
                                        const isSunday = dayOfWeek === 0
                                        const isSaturday = dayOfWeek === 6
                                        const isWeekend = isSunday || isSaturday
                                        const holiday = getOfficialHolidays(currentDate.getFullYear()).find(h => h.date === dateStr)

                                        // Day Name (Pt, Sa, Ça, Pe, Cu, Ct, Pz)
                                        const dayName = new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(dateForCheck)

                                        return (
                                            <th
                                                key={day}
                                                title={holiday ? holiday.name : ''}
                                                style={{
                                                    padding: '4px 2px',
                                                    textAlign: 'center',
                                                    borderRight: '1px solid var(--border-color)',
                                                    width: '36px',
                                                    // Styling: Today > Holiday > Sunday > Saturday > Default
                                                    background: isToday(day)
                                                        ? 'rgba(20, 184, 166, 0.08)'
                                                        : holiday
                                                            ? 'rgba(239, 68, 68, 0.15)'
                                                            : isSunday
                                                                ? 'rgba(239, 68, 68, 0.04)' // Subtle Red for Sunday
                                                                : isSaturday
                                                                    ? 'var(--bg-tertiary)'
                                                                    : 'var(--bg-secondary)',
                                                    color: isToday(day)
                                                        ? 'var(--accent-primary)'
                                                        : holiday
                                                            ? 'var(--danger)' // Red Text for Holidays
                                                            : isSunday
                                                                ? 'var(--danger)' // Red Text for Sunday
                                                                : 'inherit',
                                                    borderBottom: isToday(day) ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
                                                    position: 'sticky',
                                                    top: 0,
                                                    zIndex: 35,
                                                    height: '50px',
                                                    verticalAlign: 'middle',
                                                    minWidth: '40px',
                                                    maxWidth: '40px',
                                                    boxSizing: 'border-box'
                                                }}
                                            >
                                                <div className="th-content" style={{ flexDirection: 'column', gap: '2px', justifyContent: 'center', fontWeight: isToday(day) || holiday ? 700 : 500 }}>
                                                    <span style={{ fontSize: '13px' }}>{day}</span>
                                                    <span style={{ fontSize: '9px', textTransform: 'uppercase', opacity: 0.7 }}>{dayName}</span>
                                                </div>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr><td colSpan={daysInMonth + 2} className="empty-cell">Personel bulunamadı</td></tr>
                                ) : (
                                    employees.map(emp => (
                                        <tr key={emp.id} className={selectedEmployeeIds.includes(emp.id) ? 'selected' : ''}>
                                            {/* Checkbox Cell */}
                                            <td className="td-checkbox" style={{ position: 'sticky', left: 0, zIndex: 20, background: 'var(--bg-primary)', borderRight: '1px solid var(--border-color)' }}>
                                                <div
                                                    className={`checkbox ${selectedEmployeeIds.includes(emp.id) ? 'checked' : ''}`}
                                                    onClick={(e) => toggleSelectEmployee(emp.id, e)}
                                                >
                                                    {selectedEmployeeIds.includes(emp.id) && <Check size={12} />}
                                                </div>
                                            </td>

                                            <td style={{ padding: '8px 12px', position: 'sticky', left: 40, background: 'var(--bg-primary)', zIndex: 19, borderRight: '1px solid var(--border-color)' }}>
                                                <div style={{ fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name} {emp.surname}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.position}</div>
                                            </td>
                                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                                const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                                                const record = attendanceData.find(a => a.employee_id === emp.id && a.date === dateStr)

                                                // Holiday & Weekend Check
                                                const dateForCheck = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                                                const dayOfWeek = dateForCheck.getDay()
                                                const isSunday = dayOfWeek === 0
                                                const isSaturday = dayOfWeek === 6
                                                const isWeekend = isSunday || isSaturday
                                                const holiday = getOfficialHolidays(currentDate.getFullYear()).find(h => h.date === dateStr)

                                                // Check for ANY leave (Approved or Pending) if no official record exists
                                                const effectiveLeave = !record ? leaves.find(l =>
                                                    l.employee_id === emp.id &&
                                                    l.start_date <= dateStr &&
                                                    l.end_date >= dateStr
                                                ) : null

                                                const status = record?.status
                                                const selected = isDaySelected(emp.id, day)
                                                const isTodayCol = isToday(day)

                                                let cellBg = 'transparent'
                                                let cellContent = null

                                                if (selected) {
                                                    cellBg = 'rgba(20, 184, 166, 0.2)'
                                                } else if (record) {
                                                    // Standard Attendance: Transparent background
                                                    cellBg = 'transparent'
                                                } else if (effectiveLeave) {
                                                    if (effectiveLeave.status === 'approved') {
                                                        // Approved Leave: Transparent background
                                                        cellBg = 'transparent'
                                                    } else if (effectiveLeave.status === 'pending') {
                                                        // Pending: Transparent background
                                                        cellBg = 'transparent'
                                                        cellContent = <Clock size={16} className="text-amber-600" />
                                                    }
                                                } else {
                                                    // Default Backgrounds
                                                    if (isTodayCol) cellBg = 'rgba(20, 184, 166, 0.03)'
                                                    else if (holiday) cellBg = 'rgba(239, 68, 68, 0.12)'
                                                    else if (isSunday) cellBg = 'rgba(239, 68, 68, 0.04)'
                                                    else if (isSaturday) cellBg = 'rgba(0, 0, 0, 0.03)'
                                                }

                                                return (
                                                    <td
                                                        key={day}
                                                        title={holiday ? holiday.name : (record?.description || (effectiveLeave ? (effectiveLeave.status === 'pending' ? 'Onay Bekliyor' : 'İzinli') : ''))}
                                                        onMouseDown={(e) => handleMouseDown(e, emp.id, day)}
                                                        onMouseEnter={() => handleMouseEnter(emp.id, day)}
                                                        onClick={() => { if (!isDragging) handleCellClick(emp.id, day) }}
                                                        style={{
                                                            borderRight: '1px solid var(--border-color)',
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            background: cellBg,
                                                            color: holiday ? 'var(--danger)' : 'inherit',
                                                            position: 'relative',
                                                            width: '40px',
                                                            minWidth: '40px',
                                                            maxWidth: '40px',
                                                            height: '40px',
                                                            padding: 0,
                                                            boxSizing: 'border-box'
                                                        }}
                                                    >
                                                        {cellContent && (
                                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {cellContent}
                                                            </div>
                                                        )}
                                                        {status ? (
                                                            <div className={`status-indicator ${status}`} style={{ margin: '0 auto' }}>
                                                                <div style={{
                                                                    width: '100%', height: '100%',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: getStatusColor(status)
                                                                }}>
                                                                    {status === 'present' ? <Check size={18} strokeWidth={3} /> :
                                                                        status === 'absent' ? <X size={18} strokeWidth={3} /> :
                                                                            status === 'late' ? <Clock size={16} strokeWidth={3} /> :
                                                                                status === 'sick_leave' ? <HeartPulse size={16} /> :
                                                                                    status === 'annual_leave' ? <Briefcase size={16} /> :
                                                                                        status === 'casual_leave' ? <UserCheck size={16} /> :
                                                                                            status === 'excuse' ? <AlertCircle size={16} /> :
                                                                                                status === 'unpaid_leave' ? <XCircle size={16} /> :
                                                                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />}
                                                                </div>
                                                            </div>
                                                        ) : effectiveLeave && effectiveLeave.status === 'approved' ? (
                                                            <div className={`status-indicator ${effectiveLeave.type === 'sick' ? 'sick_leave' :
                                                                effectiveLeave.type === 'annual' ? 'annual_leave' :
                                                                    effectiveLeave.type === 'casual' ? 'casual_leave' :
                                                                        effectiveLeave.type === 'excuse' ? 'excuse' :
                                                                            effectiveLeave.type === 'unpaid' ? 'unpaid_leave' : 'other'
                                                                }`} style={{ margin: '0 auto' }}>
                                                                <div style={{
                                                                    width: '100%', height: '100%',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: getStatusColor(
                                                                        effectiveLeave.type === 'sick' ? 'sick_leave' :
                                                                            effectiveLeave.type === 'annual' ? 'annual_leave' :
                                                                                effectiveLeave.type === 'casual' ? 'casual_leave' :
                                                                                    effectiveLeave.type === 'excuse' ? 'excuse' :
                                                                                        effectiveLeave.type === 'unpaid' ? 'unpaid_leave' : 'other'
                                                                    )
                                                                }}>
                                                                    {effectiveLeave.type === 'annual' ? <Briefcase size={16} /> :
                                                                        effectiveLeave.type === 'sick' ? <HeartPulse size={16} /> :
                                                                            effectiveLeave.type === 'casual' ? <UserCheck size={16} /> :
                                                                                effectiveLeave.type === 'excuse' ? <AlertCircle size={16} /> :
                                                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />}
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Single Edit Modal using Standard Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingCell?.isNew ? "Durum Ekle" : "Durum Düzenle"}
                footer={
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        {!editingCell?.isNew && (
                            <button
                                className="btn"
                                onClick={async () => {
                                    if (editingCell?.isLeave) {
                                        // Check if multi-day
                                        if (editingCell.days > 1) {
                                            // Custom Confirm for Split vs All
                                            // Since we can't show a new modal easily on top without state, let's use a simple window.confirm approach or a custom small overlay?
                                            // User requested "Partially remove".
                                            // Let's use a small "Delete Options" logic inside this function or a state.
                                            // Or: "Bu, 5 günlük bir izin. Sadece bu günü mü yoksa tamamını mı silmek istersiniz?" is hard with standard confirm.
                                            // We'll use a custom state `deleteOption`? No, simpler:
                                            // Use `window.confirm` for "Delete All?" and if they say Cancel, maybe ask "Just this day?". No, that's annoying.

                                            // Better: Show a custom dialog REPLACING the current modal content or just use a new State `showDeleteOptions`.
                                            // But for now, I will implement a "Smart Confirm".
                                            // Actually, I can use the `electronAPI.showMessageBox` if available? No.
                                            // I'll add `deleteMode` state to Leaves component.
                                            setDeleteStep('confirm') // New state
                                            return
                                        }

                                        if (!confirm(`Bu izin kaydını silmek istediğinize emin misiniz?`)) return

                                        const result = await window.electronAPI.deleteEmployeeLeave(editingCell.leaveId)
                                        if (result.success) {
                                            showToast('İzin kaydı silindi', 'success')
                                            setModalOpen(false)
                                            await loadScheduleData()
                                        } else {
                                            showToast('Hata: ' + result.error, 'error')
                                        }

                                    } else {
                                        if (!confirm('Bu günlük kaydı kaldırmak istediğinize emin misiniz?')) return

                                        // Delete single attendance
                                        const result = await window.electronAPI.deleteAttendance({
                                            employeeId: editingCell.employeeId,
                                            date: editingCell.dateString
                                        })

                                        if (result.success) {
                                            showToast('Kayıt kaldırıldı', 'success')
                                            setModalOpen(false)
                                            // Optimistic remove
                                            setAttendanceData(prev => prev.filter(a => !(a.employee_id === editingCell.employeeId && a.date === editingCell.dateString)))
                                            await loadScheduleData()
                                        } else {
                                            showToast('Hata: ' + result.error, 'error')
                                        }
                                    }
                                }}
                                style={{
                                    color: '#ef4444',
                                    background: 'transparent',
                                    border: '1px solid #ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={15} /> {editingCell?.isLeave ? 'İzni Sil' : 'Kaldır'}
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <button className="btn btn-secondary" onClick={() => { setModalOpen(false); setDeleteStep(null); }}>İptal</button>
                            <button className="btn btn-primary" onClick={saveAttendance}>
                                <Save size={18} /> {editingCell?.isNew ? 'Kaydet' : 'Güncelle'}
                            </button>
                        </div>
                    </div>
                }
            >
                {deleteStep === 'confirm' && editingCell?.isLeave ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                        <div className="alert alert-warning" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <AlertCircle size={20} />
                            <div>
                                <strong>Bu çoklu günlük bir izin ({editingCell.days} Gün).</strong>
                                <br />Nasıl silmek istersiniz?
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button
                                className="btn"
                                onClick={async () => {
                                    // Delete Only This Day
                                    const result = await window.electronAPI.deleteEmployeeLeaveDay(editingCell.leaveId, editingCell.dateString)
                                    if (result.success) {
                                        showToast('Günlük izin kaydı silindi', 'success')
                                        setModalOpen(false)
                                        setDeleteStep(null)
                                        await loadScheduleData()
                                    } else {
                                        showToast('Hata: ' + result.error, 'error')
                                    }
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                            >
                                <Calendar size={20} style={{ color: 'var(--text-primary)' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>SADECE BU GÜNÜ</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Aralığı bölerek siler</span>
                            </button>

                            <button
                                className="btn"
                                onClick={async () => {
                                    // Delete All
                                    const result = await window.electronAPI.deleteEmployeeLeave(editingCell.leaveId)
                                    if (result.success) {
                                        showToast('Tüm izin silindi', 'success')
                                        setModalOpen(false)
                                        setDeleteStep(null)
                                        await loadScheduleData()
                                    } else {
                                        showToast('Hata: ' + result.error, 'error')
                                    }
                                }}
                                style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ef4444', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
                            >
                                <Trash2 size={20} />
                                <span style={{ fontSize: '13px', fontWeight: 600 }}>TAMAMINI SİL</span>
                                <span style={{ fontSize: '11px', opacity: 0.8 }}>Tüm aralığı kaldırır</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {employees.find(e => e.id === editingCell?.employeeId)?.name || ''} - {editingCell?.day} {monthName}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Attendance Group */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Günlük Kayıt</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[
                                        { value: 'present', label: 'Geldi', icon: <Check size={16} />, color: getStatusColor('present') },
                                        { value: 'absent', label: 'Gelmedi', icon: <X size={16} />, color: getStatusColor('absent') },
                                        { value: 'late', label: 'Geç', icon: <Clock size={16} />, color: getStatusColor('late') },
                                    ].map(opt => {
                                        const isSelected = editingCell?.status === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setEditingCell(prev => ({ ...prev, status: opt.value }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: '14px 6px', // Taller buttons
                                                    borderRadius: '12px',
                                                    border: isSelected ? `2px solid ${opt.color}` : '2px solid transparent',
                                                    background: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                                    color: isSelected ? opt.color : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    boxShadow: isSelected ? `0 4px 12px ${opt.color}15` : 'none',
                                                    position: 'relative',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'var(--bg-secondary)'
                                                        e.currentTarget.style.color = 'var(--text-primary)'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'var(--bg-tertiary)'
                                                        e.currentTarget.style.color = 'var(--text-secondary)'
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    color: isSelected ? opt.color : 'currentColor',
                                                    display: 'flex'
                                                }}>
                                                    {opt.icon}
                                                </div>
                                                <span>{opt.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Leaves Group */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>İzin İşlemleri</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {[
                                        { value: 'annual_leave', label: 'Yıllık İzin', icon: <Briefcase size={16} />, color: getStatusColor('annual_leave') },
                                        { value: 'sick_leave', label: 'Raporlu', icon: <HeartPulse size={16} />, color: getStatusColor('sick_leave') },
                                        { value: 'excuse', label: 'Mazeret İzni', icon: <AlertCircle size={16} />, color: getStatusColor('excuse') },
                                        { value: 'unpaid_leave', label: 'Ücretsiz İzin', icon: <XCircle size={16} />, color: getStatusColor('unpaid_leave') },
                                    ].map(opt => {
                                        const isSelected = editingCell?.status === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setEditingCell(prev => ({ ...prev, status: opt.value }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: '14px 6px',
                                                    borderRadius: '12px',
                                                    border: isSelected ? `2px solid ${opt.color}` : '2px solid transparent',
                                                    background: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                                    color: isSelected ? opt.color : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    boxShadow: isSelected ? `0 4px 12px ${opt.color}15` : 'none',
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'var(--bg-secondary)'
                                                        e.currentTarget.style.color = 'var(--text-primary)'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) {
                                                        e.currentTarget.style.background = 'var(--bg-tertiary)'
                                                        e.currentTarget.style.color = 'var(--text-secondary)'
                                                    }
                                                }}
                                            >
                                                <div style={{
                                                    color: isSelected ? opt.color : 'currentColor',
                                                    display: 'flex'
                                                }}>
                                                    {opt.icon}
                                                </div>
                                                <span>{opt.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <CustomInput
                            label="Açıklama (Opsiyonel)"
                            value={editingCell?.description || ''}
                            onChange={(val) => setEditingCell(prev => ({ ...prev, description: val }))}
                            multiline
                            rows={3}
                        />
                    </div>
                )}
            </Modal>

            {/* Bulk Action / Range Edit Modal */}
            <Modal
                isOpen={bulkModalOpen}
                onClose={handleBulkModalClose}
                title={rangeEditTarget ? "Aralık Güncelleme" : "Toplu Durum Güncelleme"}
                footer={
                    < div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                        {rangeEditTarget && hasDataInSelection() && (
                            <button
                                className="btn"
                                onClick={handleBulkDelete}
                                style={{
                                    color: '#ef4444',
                                    background: 'transparent',
                                    border: '1px solid #ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 size={15} /> Aralığı Temizle
                            </button>
                        )}
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                            <button className="btn btn-secondary" onClick={handleBulkModalClose}>İptal</button>
                            <button className="btn btn-primary" onClick={handleBulkSave}>Uygula</button>
                        </div>
                    </div >
                }
            >
                <div>
                    {!rangeEditTarget && (
                        <div className="alert alert-info" style={{ marginBottom: '20px', padding: '10px', background: 'var(--info-bg)', color: 'var(--info)', borderRadius: '6px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={16} /> <span>{selectedEmployeeIds.length} personel seçildi</span>
                        </div>
                    )}

                    {rangeEditTarget && (
                        <div style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                            Seçili tarih aralığı için durum güncelleniyor.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <CustomInput
                                    label="Başlangıç"
                                    type="date"
                                    value={bulkForm.startDate}
                                    onChange={(val) => setBulkForm(prev => ({ ...prev, startDate: val }))}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <CustomInput
                                    label="Bitiş"
                                    type="date"
                                    value={bulkForm.endDate}
                                    onChange={(val) => setBulkForm(prev => ({ ...prev, endDate: val }))}
                                />
                            </div>
                        </div>

                        {/* Updated Status Selection for Bulk Modal (Slot/Card Design) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Attendance Group */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Günlük Kayıt</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                    {[
                                        { value: 'present', label: 'Geldi', icon: <Check size={16} />, color: getStatusColor('present') },
                                        { value: 'absent', label: 'Gelmedi', icon: <X size={16} />, color: getStatusColor('absent') },
                                        { value: 'late', label: 'Geç', icon: <Clock size={16} />, color: getStatusColor('late') },
                                    ].map(opt => {
                                        const isSelected = bulkForm.status === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setBulkForm(prev => ({ ...prev, status: opt.value }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: '14px 6px',
                                                    borderRadius: '12px',
                                                    border: isSelected ? `2px solid ${opt.color}` : '2px solid transparent',
                                                    background: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                                    color: isSelected ? opt.color : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    boxShadow: isSelected ? `0 4px 12px ${opt.color}15` : 'none',
                                                    position: 'relative',
                                                }}
                                            >
                                                <div style={{
                                                    color: isSelected ? opt.color : 'currentColor',
                                                    display: 'flex'
                                                }}>
                                                    {opt.icon}
                                                </div>
                                                <span>{opt.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Leaves Group */}
                            <div>
                                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>İzin İşlemleri</div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {[
                                        { value: 'annual_leave', label: 'Yıllık İzin', icon: <Briefcase size={16} />, color: getStatusColor('annual_leave') },
                                        { value: 'sick_leave', label: 'Raporlu', icon: <HeartPulse size={16} />, color: getStatusColor('sick_leave') },
                                        { value: 'excuse', label: 'Mazeret İzni', icon: <AlertCircle size={16} />, color: getStatusColor('excuse') },
                                        { value: 'unpaid_leave', label: 'Ücretsiz İzin', icon: <XCircle size={16} />, color: getStatusColor('unpaid_leave') },
                                    ].map(opt => {
                                        const isSelected = bulkForm.status === opt.value
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setBulkForm(prev => ({ ...prev, status: opt.value }))}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    padding: '14px 6px',
                                                    borderRadius: '12px',
                                                    border: isSelected ? `2px solid ${opt.color}` : '2px solid transparent',
                                                    background: isSelected ? 'var(--bg-primary)' : 'var(--bg-tertiary)',
                                                    color: isSelected ? opt.color : 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    boxShadow: isSelected ? `0 4px 12px ${opt.color}15` : 'none',
                                                }}
                                            >
                                                <div style={{
                                                    color: isSelected ? opt.color : 'currentColor',
                                                    display: 'flex'
                                                }}>
                                                    {opt.icon}
                                                </div>
                                                <span>{opt.label}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        <CustomInput
                            label="Açıklama"
                            value={bulkForm.description}
                            onChange={(val) => setBulkForm(prev => ({ ...prev, description: val }))}
                            multiline
                            rows={2}
                        />
                    </div>
                </div>
            </Modal>
        </div >
    )
}
