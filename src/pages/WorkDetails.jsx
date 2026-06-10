import { useState, useEffect, useMemo } from 'react' // Re-saved for sync
import { useParams, useNavigate, Link } from 'react-router-dom' // Even though we use tabs, we might get ID from props
import { useTabs } from '../context/TabContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, Truck, User, DollarSign, FileText, Printer, Download, FileDown, Settings, Wallet } from 'lucide-react'
import { formatDate, formatCurrency } from '../utils/helpers'
import { calculateWorkStats } from '../utils/workCalculations'
import { workItemSchema } from '../schemas/workSchema'
import WorkPdfReport from './WorkPdfReport'

export default function WorkDetails(props) {
    const { id: urlId } = useParams()
    const id = props.id || urlId
    const navigate = useNavigate()
    const { openNewTab, replaceTab, activeTabId, closeTab, updateTabInfo } = useTabs()
    const [work, setWork] = useState(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState([])
    const [employees, setEmployees] = useState([])
    const [isPdfModalOpen, setPdfModalOpen] = useState(false)
    const [savingPdf, setSavingPdf] = useState(false)

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [modalError, setModalError] = useState('')

    // Bulk Form State
    const [bulkFormData, setBulkFormData] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        receiptNo: '',
        vehicleId: '',
        employeeId: '',
        startTime: '',
        endTime: '',
        hours: 0,
        overtimeHours: 0,
        pricingType: 'daily',
        monthlyPrice: '',
        unitPrice: '',
        additions: [],
        description: ''
    })

    const [curBulkAdditionType, setCurBulkAdditionType] = useState('Yol')
    const [curBulkAdditionPrice, setCurBulkAdditionPrice] = useState('')

    // Confirm Delete State
    const [confirmModal, setConfirmModal] = useState(null)
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [showPrices, setShowPrices] = useState(true)
    const [selectedIds, setSelectedIds] = useState([])
    const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false)
    const [bulkEditFormData, setBulkEditFormData] = useState({
        receiptNo: '',
        vehicleId: '',
        employeeId: '',
        hours: '',
        overtimeHours: '',
        pricingType: '',
        unitPrice: '',
        description: ''
    })
    const [showKdv, setShowKdv] = useState(false)
    const [kdvRate, setKdvRate] = useState(20)
    const [generatingPdf, setGeneratingPdf] = useState(false)
    const [pazarMultiplier, setPazarMultiplier] = useState("1.5")
    const [mesaiMultiplier, setMesaiMultiplier] = useState("1.5")

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        receiptNo: '',
        vehicleId: '',
        employeeId: '',
        startTime: '',
        endTime: '',
        hours: 0,
        overtimeHours: 0,
        pricingType: 'daily',
        unitPrice: '',
        additions: [], // Array of { type: 'Yol', price: 100 }
        description: ''
    })

    const [curAdditionType, setCurAdditionType] = useState('Yol')
    const [curAdditionPrice, setCurAdditionPrice] = useState('')

    useEffect(() => {
        loadData()
    }, [id])

    const calculateAutoHours = (startTime, endTime, pricingType) => {
        if (!startTime || !endTime) return { hours: 1, overtimeHours: 0 };

        const [startH, startM] = startTime.split(':').map(Number);
        const [endH, endM] = endTime.split(':').map(Number);

        let diffHours = endH - startH + (endM - startM) / 60;
        if (diffHours < 0) diffHours += 24;

        let calculatedHours = 1;
        let calculatedOvertime = 0;

        if (pricingType === 'hourly') {
            calculatedHours = parseFloat(diffHours.toFixed(2));
            calculatedOvertime = 0;
        } else {
            // 'daily' or 'monthly' pricing
            // Standard Window from work settings, defaulting to 08:00 - 17:00 (9 hours total)
            const workStartStr = work?.work_start_time || '08:00';
            const workEndStr = work?.work_end_time || '17:00';
            
            const [wSH, wSM] = workStartStr.split(':').map(Number);
            const [wEH, wEM] = workEndStr.split(':').map(Number);
            
            const workStart = wSH + (wSM / 60);
            const workEnd = wEH + (wEM / 60);
            
            // Standard workday duration in hours (e.g. 17:00 - 08:00 = 9)
            let standardDuration = workEnd - workStart;
            if (standardDuration < 0) standardDuration += 24;

            // 1. Overtime due to duration (> standard duration)
            const durationOvertime = diffHours > standardDuration ? diffHours - standardDuration : 0;

            // 2. Overtime due to window (before workStart or after workEnd)
            let windowOvertime = 0;
            
            const currentStart = startH + (startM / 60);
            const currentEnd = endH + (endM / 60);

            // Before workStart
            if (currentStart < workStart) {
                windowOvertime += (workStart - currentStart);
            }
            
            // After workEnd
            if (endH > wEH || (endH === wEH && endM > wEM)) {
                windowOvertime += (currentEnd - workEnd);
            } else if (currentEnd < currentStart) {
                // If ended next day, all hours from workEnd of day 1 to end are overtime
                windowOvertime += (24 - workEnd) + currentEnd;
            }

            calculatedHours = 1;
            calculatedOvertime = Math.max(durationOvertime, windowOvertime);
            calculatedOvertime = parseFloat(calculatedOvertime.toFixed(2));
        }

        return { hours: calculatedHours, overtimeHours: calculatedOvertime };
    }

    // Auto-calculate hours for single form
    useEffect(() => {
        if (!isModalOpen) return;
        const result = calculateAutoHours(formData.startTime, formData.endTime, formData.pricingType);
        setFormData(prev => ({ ...prev, ...result }));
    }, [formData.startTime, formData.endTime, formData.pricingType, isModalOpen, work])

    // Auto-calculate hours for bulk form
    useEffect(() => {
        if (!isBulkModalOpen) return;
        const result = calculateAutoHours(bulkFormData.startTime, bulkFormData.endTime, bulkFormData.pricingType);
        setBulkFormData(prev => ({ ...prev, ...result }));
    }, [bulkFormData.startTime, bulkFormData.endTime, bulkFormData.pricingType, isBulkModalOpen, work])



    const loadData = async () => {
        setLoading(true)
        try {
            // Load Work Details
            const workRes = await window.electronAPI.getWorkDetails(id)
            if (workRes.success) {
                setWork(workRes.data)
                setPazarMultiplier(workRes.data.pazar_multiplier !== undefined && workRes.data.pazar_multiplier !== null ? String(workRes.data.pazar_multiplier) : "1.5")
                setMesaiMultiplier(workRes.data.mesai_multiplier !== undefined && workRes.data.mesai_multiplier !== null ? String(workRes.data.mesai_multiplier) : "1.5")
                updateTabInfo(`/works/${id}`, { label: workRes.data.title || 'İş Detayı' })

                // Load Resources for Dropdowns using companyId
                if (workRes.data.company_id) {
                    const [vehiclesRes, employeesRes] = await Promise.all([
                        window.electronAPI.getVehicles(workRes.data.company_id),
                        window.electronAPI.getEmployees(workRes.data.company_id)
                    ])

                    if (vehiclesRes.success) setVehicles(vehiclesRes.data)
                    if (employeesRes.success) setEmployees(employeesRes.data)
                }
            } else {
                console.error('Failed to load work:', workRes.error)
            }

        } catch (error) {
            console.error('Error loading data:', error)
        }
        setLoading(false)
    }

    const handleBack = () => {
        // Go back to the works list in the same tab
        navigate('/works')
    }

    // --- Modal Handlers ---

    const openBulkAddModal = () => {
        setBulkFormData({
            startDate: work?.start_date ? new Date(work.start_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            endDate: work?.end_date ? new Date(work.end_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            receiptNo: '',
            vehicleId: '',
            employeeId: '',
            startTime: '08:00',
            endTime: '17:00',
            hours: 1, // Default Normal Gün Sayısı
            overtimeHours: 0,
            pricingType: 'daily',
            monthlyPrice: '',
            unitPrice: '',
            travelEnabled: false,
            travelPrice: '',
            description: ''
        })
        setModalError('')
        setIsBulkModalOpen(true)
    }

    const openBulkEditModal = () => {
        setBulkEditFormData({
            receiptNo: '',
            vehicleId: '',
            employeeId: '',
            hours: '',
            overtimeHours: '',
            pricingType: '',
            unitPrice: '',
            description: ''
        })
        setModalError('')
        setIsBulkEditModalOpen(true)
    }

    const openAddModal = () => {
        setEditingItem(null)
        setFormData({
            date: new Date().toISOString().split('T')[0],
            receiptNo: '',
            vehicleId: '',
            employeeId: '',
            startTime: '08:00',
            endTime: '17:00',
            hours: 1, // Default Normal Gün Sayısı
            overtimeHours: 0,
            pricingType: 'daily',
            unitPrice: '',
            travelEnabled: false,
            travelPrice: '',
            description: ''
        })
        setModalError('')
        setIsModalOpen(true)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        let determinedPricingType = 'daily';
        let desc = item.description || '';
        
        if (desc.startsWith('[SAATLİK] ')) {
            determinedPricingType = 'hourly';
            desc = desc.replace('[SAATLİK] ', '');
        } else if (desc.startsWith('[AYLIK] ')) {
            determinedPricingType = 'monthly';
            desc = desc.replace('[AYLIK] ', '');
        }

        // Parse custom addition tags
        const additionMatches = desc.matchAll(/\[EK:([^:]+):([^\]]+)\]/g);
        const additions = [];
        
        for (const match of additionMatches) {
            additions.push({
                type: match[1],
                price: parseFloat(match[2]) || 0
            });
            // Remove the tag from description
            desc = desc.replace(match[0], '').trim();
        }
        
        // Handle legacy travel_price if no additions found
        const hasTravelPrice = (item.travel_price || 0) > 0;
        if (additions.length === 0 && hasTravelPrice) {
            additions.push({
                type: 'Yol',
                price: item.travel_price
            });
        }

        setFormData({
            date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            receiptNo: item.receipt_no || '',
            vehicleId: item.vehicle_id || '',
            employeeId: item.employee_id || '',
            startTime: item.start_time || '',
            endTime: item.end_time || '',
            hours: item.hours || 0,
            overtimeHours: item.overtime_hours || 0,
            pricingType: determinedPricingType,
            unitPrice: item.unit_price || 0,
            additions: additions,
            description: desc
        })
        setModalError('')
        setIsModalOpen(true)
    }

    const handleModalSubmit = async (e) => {
        e.preventDefault()
        setModalError('')

        try {
            const parsed = workItemSchema.parse(formData)

            let finalDesc = parsed.description || '';
            if (formData.pricingType === 'hourly' && !finalDesc.startsWith('[SAATLİK]')) {
                finalDesc = '[SAATLİK] ' + finalDesc;
            } else if (formData.pricingType === 'monthly' && !finalDesc.startsWith('[AYLIK]')) {
                finalDesc = '[AYLIK] ' + finalDesc;
            }

            // Append custom addition tags
            if (formData.additions && formData.additions.length > 0) {
                formData.additions.forEach(add => {
                    finalDesc = `[EK:${add.type}:${add.price}] ` + finalDesc;
                });
            }

            const payload = {
                ...parsed,
                description: finalDesc,
                // Still save to travelPrice if 'Yol' is in the list for backward compatibility
                travelPrice: (formData.additions || []).find(add => add.type === 'Yol')?.price || 0,
                workId: id
            }

            let result
            if (editingItem) {
                // Single item update
                result = await window.electronAPI.updateWorkItem({ ...payload, id: editingItem.id })
            } else if (formData.pricingType === 'monthly') {
                // Auto-generate 26 work days (skipping Sundays)
                const payloadList = []
                let currentDate = new Date(parsed.date)
                const monthlyTotal = parsed.unitPrice || 0
                const dailyPrice = monthlyTotal / 26
                let workDaysAdded = 0

                while (workDaysAdded < 26) {
                    const isSunday = currentDate.getDay() === 0
                    let itemDesc = parsed.description || ''
                    
                    if (isSunday) {
                        if (!itemDesc.startsWith('[PAZAR]')) {
                            itemDesc = '[PAZAR] ' + itemDesc
                        }
                    } else {
                        workDaysAdded++
                        if (!itemDesc.startsWith('[AYLIK]')) {
                            itemDesc = '[AYLIK] ' + itemDesc
                        }
                    }

                    payloadList.push({
                        ...parsed,
                        date: currentDate.toISOString().split('T')[0],
                        unitPrice: isSunday ? 0 : dailyPrice,
                        description: itemDesc,
                        travelPrice: formData.travelEnabled ? (parseFloat(formData.travelPrice) || 0) : 0,
                        workId: id
                    })
                    
                    currentDate.setDate(currentDate.getDate() + 1)
                }
                result = await window.electronAPI.addBulkWorkItems(payloadList)
            } else {
                // Standard single item add
                result = await window.electronAPI.addWorkItem(payload)
            }

            if (result.success) {
                setIsModalOpen(false)
                loadData()
            } else {
                setModalError(result.error)
            }
        } catch (err) {
            if (err.errors) {
                setModalError(err.errors[0].message)
            } else {
                setModalError(err.message)
            }
        }
    }

    const handleBulkSubmit = async (e) => {
        e.preventDefault()
        setModalError('')

        try {
            if (!bulkFormData.startDate || !bulkFormData.endDate) {
                setModalError('Başlangıç ve bitiş tarihi zorunludur.')
                return
            }

            const start = new Date(bulkFormData.startDate)
            const end = new Date(bulkFormData.endDate)

            if (start > end) {
                setModalError('Bitiş tarihi başlangıç tarihinden küçük olamaz.')
                return
            }

            const payloadList = []
            let currentDate = new Date(start)

            let daysCount = 0;
            let tempDate = new Date(start);
            while (tempDate <= end) {
                daysCount++;
                tempDate.setDate(tempDate.getDate() + 1);
            }

            let finalUnitPrice = bulkFormData.unitPrice ? parseFloat(bulkFormData.unitPrice) : 0;
            if (bulkFormData.pricingType === 'monthly' && bulkFormData.monthlyPrice) {
                // Aylar 26 gündür (Pazar hariç)
                finalUnitPrice = parseFloat(bulkFormData.monthlyPrice) / 26;
            }

            while (currentDate <= end) {
                let itemDesc = bulkFormData.description || '';
                if (bulkFormData.pricingType === 'monthly') {
                    if (!itemDesc.includes('[AYLIK]')) {
                        itemDesc = itemDesc ? `[AYLIK] ${itemDesc}` : '[AYLIK]';
                    }
                }

                // Append custom addition tag if enabled
                if (bulkFormData.additionEnabled && bulkFormData.additionType && bulkFormData.additionPrice) {
                    itemDesc = `[EK:${bulkFormData.additionType}:${bulkFormData.additionPrice}] ` + itemDesc;
                }

                payloadList.push({
                    workId: id,
                    date: currentDate.toISOString().split('T')[0],
                    receiptNo: bulkFormData.receiptNo,
                    vehicleId: bulkFormData.vehicleId,
                    employeeId: bulkFormData.employeeId,
                    startTime: bulkFormData.startTime,
                    endTime: bulkFormData.endTime,
                    hours: bulkFormData.hours ? parseFloat(bulkFormData.hours) : 0,
                    overtimeHours: bulkFormData.overtimeHours ? parseFloat(bulkFormData.overtimeHours) : 0,
                    unitPrice: finalUnitPrice,
                    // Still save to travelPrice if type is 'Yol' for backward compatibility
                    travelPrice: (bulkFormData.additionEnabled && bulkFormData.additionType === 'Yol') ? (parseFloat(bulkFormData.additionPrice) || 0) : 0,
                    description: itemDesc || null
                })

                currentDate.setDate(currentDate.getDate() + 1)
            }

            const result = await window.electronAPI.addBulkWorkItems(payloadList)

            if (result.success) {
                setIsBulkModalOpen(false)
                loadData()
            } else {
                setModalError(result.error)
            }
        } catch (err) {
            setModalError(err.message)
        }
    }

    // --- Delete Handlers ---

    const handleBulkEditSubmit = async (e) => {
        e.preventDefault()
        setModalError('')

        // Filter out empty fields
        const updates = {}
        if (bulkEditFormData.date && bulkEditFormData.date !== '') updates.date = bulkEditFormData.date
        if (bulkEditFormData.receiptNo !== '') updates.receiptNo = bulkEditFormData.receiptNo
        if (bulkEditFormData.vehicleId !== '') updates.vehicleId = parseInt(bulkEditFormData.vehicleId)
        if (bulkEditFormData.employeeId !== '') updates.employeeId = parseInt(bulkEditFormData.employeeId)
        if (bulkEditFormData.startTime && bulkEditFormData.startTime !== '') updates.startTime = bulkEditFormData.startTime
        if (bulkEditFormData.endTime && bulkEditFormData.endTime !== '') updates.endTime = bulkEditFormData.endTime
        if (bulkEditFormData.pricingType !== '') updates.pricingType = bulkEditFormData.pricingType
        if (bulkEditFormData.unitPrice !== '') updates.unitPrice = parseFloat(bulkEditFormData.unitPrice)
        if (bulkEditFormData.description !== '') updates.description = bulkEditFormData.description

        if (Object.keys(updates).length === 0) {
            setModalError('Lütfen en az bir alanı doldurun.')
            return
        }

        try {
            const results = await Promise.all(selectedIds.map(async (id) => {
                const existingItem = work.items.find(item => item.id === id)
                if (!existingItem) return { success: false, error: 'Kayıt bulunamadı' }

                let itemDesc = updates.description !== undefined ? updates.description : (existingItem.description || '');

                if (updates.pricingType !== undefined) {
                    itemDesc = itemDesc.replace(/\[SAATLİK\]\s*/g, '').replace(/\[AYLIK\]\s*/g, '');
                    if (updates.pricingType === 'hourly') {
                        itemDesc = '[SAATLİK] ' + itemDesc;
                    } else if (updates.pricingType === 'monthly') {
                        itemDesc = '[AYLIK] ' + itemDesc;
                    }
                }

                const finalPayload = {
                    id: id,
                    date: updates.date !== undefined ? updates.date : existingItem.date,
                    receiptNo: updates.receiptNo !== undefined ? updates.receiptNo : existingItem.receipt_no,
                    vehicleId: updates.vehicleId !== undefined ? updates.vehicleId : existingItem.vehicle_id,
                    employeeId: updates.employeeId !== undefined ? updates.employeeId : existingItem.employee_id,
                    startTime: updates.startTime !== undefined ? updates.startTime : existingItem.start_time,
                    endTime: updates.endTime !== undefined ? updates.endTime : existingItem.end_time,
                    hours: existingItem.hours,
                    overtimeHours: existingItem.overtime_hours,
                    unitPrice: updates.unitPrice !== undefined ? updates.unitPrice : existingItem.unit_price,
                    travelPrice: existingItem.travel_price,
                    description: itemDesc
                }
                
                return await window.electronAPI.updateWorkItem(finalPayload)
            }))

            const failed = results.filter(r => !r.success)
            if (failed.length > 0) {
                setModalError(`${failed.length} kayıt güncellenemedi.`)
            } else {
                setIsBulkEditModalOpen(false)
                setSelectedIds([]) // Clear selection
                loadData()
            }
        } catch (err) {
            setModalError(err.message)
        }
    }

    const handleDeleteClick = (item) => {
        setConfirmModal({
            item,
            title: 'Kaydı Sil',
            message: 'Bu iş detay kaydını silmek istediğinize emin misiniz?'
        })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        if (confirmModal.isBulk) {
            const result = await window.electronAPI.deleteBulkWorkItems(confirmModal.ids)
            if (result.success) {
                setConfirmModal(null)
                loadData()
            } else {
                alert('Silme işlemi başarısız: ' + result.error)
            }
        } else {
            const result = await window.electronAPI.deleteWorkItem(confirmModal.item.id)
            if (result.success) {
                setConfirmModal(null)
                loadData()
            } else {
                alert('Silme işlemi başarısız: ' + result.error)
            }
        }
    }

    const handleBulkDelete = (selectedIds) => {
        setConfirmModal({
            isBulk: true,
            ids: selectedIds,
            title: 'Seçili Kayıtları Sil',
            message: `${selectedIds.length} adet iş detay kaydını silmek istediğinize emin misiniz?`
        })
    }

    const handleSavePdf = async () => {
        if (!window.electronAPI?.saveReportPdf) {
            alert('PDF Kaydetme özelliği sadece masaüstü uygulamasında geçerlidir.')
            return
        }

        localStorage.setItem('printData', JSON.stringify({
            isWorkReport: true,
            work: work,
            showPrices: showPrices,
            showKdv: showKdv,
            kdvRate: kdvRate,
            pazarMultiplier: pazarMultiplier,
            mesaiMultiplier: mesaiMultiplier,
            isPdfSave: true
        }))

        setGeneratingPdf(true)
        setTimeout(async () => {
            try {
                setIsReportModalOpen(false)
                const res = await window.electronAPI.saveReportPdf('/print')
                if (res && !res.success && !res.canceled) {
                    alert('PDF Kaydedilirken Hata: ' + res.error)
                }
            } catch (err) {
                console.error('PDF error:', err)
            } finally {
                setGeneratingPdf(false)
            }
        }, 100)
    }

    const handlePrintReport = () => {
        localStorage.setItem('printData', JSON.stringify({
            isWorkReport: true,
            work: work,
            showPrices: showPrices,
            showKdv: showKdv,
            kdvRate: kdvRate,
            pazarMultiplier: pazarMultiplier,
            mesaiMultiplier: mesaiMultiplier,
            isPdfSave: false
        }))
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.left = '-9999px';
        iframe.src = '#/print';
        document.body.appendChild(iframe);
        
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 3000);
    }
    const [filteredItems, setFilteredItems] = useState([])

    // Update filtered items when work.items changes
    useEffect(() => {
        if (work?.items) {
            setFilteredItems(work.items)
        }
    }, [work?.items])

    // --- Calculations based on filtered items (shared with PDF report) ---
    const stats = useMemo(() => {
        const items = filteredItems.length > 0 ? filteredItems : (work?.items || [])
        const calc = calculateWorkStats(items, pazarMultiplier, mesaiMultiplier)

        // Date range from filtered items
        let dateRangeText = `${formatDate(work?.start_date)} - ${formatDate(work?.end_date)}`
        if (items.length > 0) {
            const dates = items.filter(item => item.date).map(item => new Date(item.date).getTime())
            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates))
                const maxDate = new Date(Math.max(...dates))
                dateRangeText = `${formatDate(minDate)} - ${formatDate(maxDate)}`
            }
        }

        return { ...calc, dateRangeText }
    }, [filteredItems, work])

    if (loading) return <div className="p-8 text-center">Yükleniyor...</div>
    if (!work) return <div className="p-8 text-center">İş bulunamadı.</div>

    return (
        <div className="page-container">
            {/* Header */}
            <div className="page-header" style={{ display: 'block', marginBottom: '24px' }}>


                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="page-title">{work.title}</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={14} /> 
                                {work.customer_id ? (
                                    <Link to={`/customers/${work.customer_id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
                                        {work.customer_name || work.customer}
                                    </Link>
                                ) : (
                                    work.customer_name || work.customer
                                )}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={14} /> {stats.dateRangeText}
                            </span>
                            <span className={`badge badge-${getStatusColor(work.status)}`}>
                                {work.status === 'pending' ? 'Bekliyor' :
                                    work.status === 'in_progress' ? 'Devam Ediyor' :
                                        work.status === 'completed' ? 'Tamamlandı' : 'İptal'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hero Dashboard Style */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'stretch' }}>
                {/* Sol Taraf: Finansal Hero Kart */}
                <div className="stat-card" style={{ flex: '0 0 35%', background: 'linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%)', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'space-between', padding: '24px', gap: '0' }}>
                    {/* Arka plan süsü */}
                    <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.05, transform: 'scale(2)', pointerEvents: 'none' }}>
                        <DollarSign size={100} />
                    </div>

                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <DollarSign size={16} className="text-success" />
                            Genel Toplam Tutar
                        </div>
                        <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1 }} title={formatCurrency(stats.grandTotal)}>
                            {formatCurrency(stats.grandTotal)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Tüm mesai, pazar ve ek ödemeler dahil</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '32px', position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Clock size={14} className="text-warning" /> Mesai & Pazar
                            </span>
                            <span style={{ fontSize: '14px', color: 'var(--warning)', fontWeight: 700 }}>{formatCurrency(stats.totalMesaiPriceAmount + stats.totalPazarPriceAmount)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Wallet size={14} style={{ color: '#8b5cf6' }} /> Ek Ödemeler
                            </span>
                            <span style={{ fontSize: '14px', color: '#8b5cf6', fontWeight: 700 }}>{formatCurrency(stats.totalEkOdemeler)}</span>
                        </div>
                    </div>
                </div>

                {/* Sağ Taraf: Operasyonel Grid */}
                <div style={{ flex: '1', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    {/* Toplam Kayıt */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <FileText size={14} className="text-info" /> Toplam Kayıt
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.itemCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Adet</span></div>
                    </div>

                    {/* Aktif Araç */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <Truck size={14} className="text-info" /> Aktif Araç
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.uniqueVehicles.size} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Araç</span></div>
                    </div>

                    {/* Personel */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <User size={14} className="text-info" /> Personel
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.uniqueEmployees.size} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Kişi</span></div>
                    </div>

                    {/* Toplam Gün */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <Calendar size={14} className="text-success" /> Toplam Gün
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalHours} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Gün</span></div>
                    </div>

                    {/* Normal Mesai */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <Clock size={14} className="text-warning" /> Normal Mesai
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalOvertime} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Saat</span></div>
                    </div>

                    {/* Pazar Mesai */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <Calendar size={14} className="text-danger" /> Pazar Mesai
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.totalPazarDayCount} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 600 }}>Gün</span></div>
                    </div>
                </div>
            </div>

            {/* Items Table Header */}
            <div className="page-header" style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div>
                    <h3 className="page-title">Puantaj Kayıtları</h3>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={openBulkAddModal} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        <Calendar size={16} /> Hızlı Üretim (Toplu Ekle)
                    </button>
                    <button onClick={() => setIsReportModalOpen(true)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} /> Raporu Görüntüle
                    </button>
                    <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Yeni Kayıt
                    </button>
                </div>
            </div>

            <DataTable persistenceKey="WorkDetails_table_0"
                columns={[
                    { 
                        label: 'TARİH', 
                        key: 'date', 
                        render: (val) => {
                            const isPazar = val ? new Date(val).getDay() === 0 : false;
                            return (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    color: isPazar ? 'var(--danger)' : 'inherit',
                                    fontWeight: isPazar ? '600' : 'normal'
                                }}>
                                    <span>{formatDate(val)}</span>
                                    {isPazar && (
                                        <span style={{ 
                                            fontSize: '10px', 
                                            background: 'var(--danger-bg)', 
                                            color: 'var(--danger)', 
                                            padding: '2px 6px', 
                                            borderRadius: '4px',
                                            border: '1px solid rgba(239, 68, 68, 0.2)'
                                        }}>
                                            PAZAR
                                        </span>
                                    )}
                                </div>
                            );
                        }
                    },
                    { label: 'FİŞ NO', key: 'receipt_no' },
                    { label: 'MAKİNA', key: 'vehicle_id', render: (val, row) => row.plate || '-' },
                    { label: 'PERSONEL', key: 'employee_id', render: (val, row) => row.employee_name ? `${row.employee_name} ${row.employee_surname}` : '-' },
                    {
                        label: 'ÇALIŞMA SÜRESİ', key: 'start_time', render: (val, row) => (
                            <div style={{ fontSize: '12px' }}>
                                {row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : '-'}
                            </div>
                        )
                    },
                    {
                        label: 'GÜN SAYISI', key: 'hours', render: (val, row) => (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{row.hours}</span>
                            </div>
                        )
                    },
                    {
                        label: 'FAZLA MESAİ', key: 'overtime_hours', render: (val, row) => (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {row.overtime_hours > 0 ? <span className="text-warning">{row.overtime_hours}</span> : '-'}
                            </div>
                        )
                    },
                    { label: 'FİYAT', key: 'unit_price', render: (val) => formatCurrency(val) },
                    { label: 'AÇIKLAMA', key: 'description', render: (val) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'inline-block' }}>{val}</span> }
                ]}
                data={work.items || []}
                showSearch={true}
                showDateFilter={true}
                dateFilterKey="date"
                showRowNumbers={true}
                selectable={true}
                onSelectionChange={setSelectedIds}
                customBulkActions={() => (
                    <button className="btn-bulk-action secondary" onClick={openBulkEditModal}>
                        <Pencil size={15} />
                        Düzenle
                    </button>
                )}
                actions={(row) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" title="Düzenle" onClick={(e) => { e.stopPropagation(); openEditModal(row) }}><Pencil size={16} /></button>
                        <button className="btn-icon danger" title="Sil" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row) }}><Trash2 size={16} /></button>
                    </div>
                )}
                onBulkDelete={handleBulkDelete}
                onFilteredDataChange={setFilteredItems}
                rowClassName={(row) => row.date && new Date(row.date).getDay() === 0 ? 'pazar-row' : ''}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Kaydı Düzenle' : 'Yeni Çalışma Kaydı Ekle'}
            >
                <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Tarih"
                            type="date"
                            value={formData.date}
                            onChange={(val) => setFormData({ ...formData, date: val })}
                            required
                        />
                        <CustomInput
                            label="Fiş No"
                            type="text"
                            value={formData.receiptNo}
                            onChange={(val) => setFormData({ ...formData, receiptNo: val })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomSelect
                            label="Araç"
                            value={formData.vehicleId}
                            onChange={(val) => setFormData({ ...formData, vehicleId: val })}
                            options={vehicles.filter(v => v.type !== 'automobile').map(v => ({ value: v.id, label: `${v.plate} - ${v.brand || ''} ${v.model || ''}` }))}
                        />
                        <CustomSelect
                            label="Personel"
                            value={formData.employeeId}
                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
                            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value={formData.startTime}
                                onChange={(val) => setFormData({ ...formData, startTime: val })}
                            />
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value={formData.endTime}
                                onChange={(val) => setFormData({ ...formData, endTime: val })}
                            />
                        </div>
                        {/* 
                        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Otomatik Gün Sayısı: <strong>{formData.hours}</strong></span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Otomatik Mesai: <strong className={formData.overtimeHours > 0 ? 'text-warning' : ''}>{formData.overtimeHours}</strong></span>
                        </div>
                        */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomSelect
                                label="Fiyatlandırma"
                                value={formData.pricingType}
                                onChange={(val) => setFormData({ ...formData, pricingType: val })}
                                options={[
                                { value: 'daily', label: 'Günlük' },
                                { value: 'hourly', label: 'Saatlik' },
                                { value: 'monthly', label: 'Aylık' }
                                ]}
                            />
                            <CustomInput
                                label={formData.pricingType === 'monthly' ? "Aylık Toplam Fiyat" : "Birim Fiyat"}
                                format="currency"
                                value={formData.unitPrice}
                                onChange={(val) => setFormData({ ...formData, unitPrice: val })}
                            />
                        </div>
                    </div>

                    {/* Yol (Travel) Add-on */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Ek Ödemeler
                            </span>
                        </div>
                        
                        {/* List of current additions as Clean Rows */}
                        {formData.additions && formData.additions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {formData.additions.map((add, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        background: 'var(--bg-primary)', 
                                        padding: '8px 12px', 
                                        borderRadius: 'var(--radius-sm)', 
                                        border: '1px solid var(--border-color)',
                                        fontSize: '12px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <DollarSign size={14} style={{ color: 'var(--accent-primary)' }} />
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{add.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(add.price)}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newList = [...formData.additions];
                                                    newList.splice(idx, 1);
                                                    setFormData({ ...formData, additions: newList });
                                                }}
                                                style={{ 
                                                    border: 'none', 
                                                    background: 'none', 
                                                    color: 'var(--text-error)', 
                                                    cursor: 'pointer', 
                                                    fontSize: '16px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    padding: '0 4px'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Unified Input Group for adding new addition */}
                        <div style={{ display: 'flex', gap: '0', width: '100%', alignItems: 'center', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Tür (Örn: Yol, Yemek)"
                                value={curAdditionType}
                                onChange={(e) => setCurAdditionType(e.target.value)}
                                style={{ flex: 1, height: '34px', fontSize: '12px', border: 'none', borderRadius: 0, paddingLeft: '10px', background: 'var(--bg-primary)' }}
                            />
                            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Fiyat ₺"
                                value={curAdditionPrice ? String(curAdditionPrice).replace('.', ',') : ''}
                                onChange={(e) => {
                                    let clean = e.target.value.replace(/\./g, '').replace(/[^0-9,]/g, '');
                                    const parts = clean.split(',');
                                    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('');
                                    if (parts.length === 2 && parts[1].length > 2) clean = parts[0] + ',' + parts[1].substring(0, 2);
                                    const floatVal = clean.replace(',', '.');
                                    setCurAdditionPrice(floatVal === '' ? '' : floatVal);
                                }}
                                style={{ width: '100px', height: '34px', fontSize: '12px', border: 'none', borderRadius: 0, textAlign: 'right', paddingRight: '10px', background: 'var(--bg-primary)' }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!curAdditionType || !curAdditionPrice) return;
                                    setFormData({
                                        ...formData,
                                        additions: [...(formData.additions || []), { type: curAdditionType, price: parseFloat(curAdditionPrice) || 0 }]
                                    });
                                    setCurAdditionType('Yol');
                                    setCurAdditionPrice('');
                                }}
                                style={{ height: '34px', width: '40px', background: 'var(--accent-primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <CustomInput
                        label="Açıklama"
                        type="textarea"
                        value={formData.description}
                        onChange={(val) => setFormData({ ...formData, description: val })}
                    />

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">İptal</button>
                        <button type="submit" className="btn btn-primary">{editingItem ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Add Modal */}
            <Modal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                title="Hızlı Üretim (Toplu Kayıt Ekle)"
            >
                <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        Seçtiğiniz <strong>Başlangıç</strong> ve <strong>Bitiş</strong> tarihi aralığındaki her bir gün için girdiğiniz bilgilerle (Araç, Personel, Gün/Saat vb.) ayrı bir kayıt listeye otomatik eklenecektir.<br />
                        <em>Not: Hafta sonu, bayram tatili ayırmaz. İstemediğiniz günleri liste üzerinden tek tuşla kolayca silebilirsiniz.</em>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Başlangıç Tarihi"
                            type="date"
                            value={bulkFormData.startDate}
                            onChange={(val) => {
                                const updates = { startDate: val };
                                if (bulkFormData.pricingType === 'monthly') {
                                    const d = new Date(val);
                                    d.setDate(d.getDate() + 29);
                                    updates.endDate = d.toISOString().split('T')[0];
                                }
                                setBulkFormData({ ...bulkFormData, ...updates });
                            }}
                            required
                        />
                        <CustomInput
                            label="Bitiş Tarihi"
                            type="date"
                            value={bulkFormData.endDate}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, endDate: val })}
                            required
                        />
                        <CustomInput
                            label="Fiş No"
                            type="text"
                            value={bulkFormData.receiptNo}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, receiptNo: val })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomSelect
                            label="Araç"
                            value={bulkFormData.vehicleId}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, vehicleId: val })}
                            options={vehicles.filter(v => v.type !== 'automobile').map(v => ({ value: v.id, label: `${v.plate} - ${v.brand || ''} ${v.model || ''}` }))}
                        />
                        <CustomSelect
                            label="Personel"
                            value={bulkFormData.employeeId}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, employeeId: val })}
                            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value={bulkFormData.startTime}
                                onChange={(val) => setBulkFormData({ ...bulkFormData, startTime: val })}
                            />
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value={bulkFormData.endTime}
                                onChange={(val) => setBulkFormData({ ...bulkFormData, endTime: val })}
                            />
                        </div>
                        {/* 
                        <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: 'var(--radius-sm)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Otomatik Gün Sayısı: <strong>{bulkFormData.hours}</strong></span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Otomatik Mesai: <strong className={bulkFormData.overtimeHours > 0 ? 'text-warning' : ''}>{bulkFormData.overtimeHours}</strong></span>
                        </div>
                        */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomSelect
                                label="Fiyatlandırma"
                                value={bulkFormData.pricingType}
                                onChange={(val) => {
                                    const updates = { pricingType: val };
                                    if (val === 'monthly') {
                                        const d = new Date(bulkFormData.startDate);
                                        d.setDate(d.getDate() + 29);
                                        updates.endDate = d.toISOString().split('T')[0];
                                    }
                                    setBulkFormData({ ...bulkFormData, ...updates });
                                }}
                                options={[
                                    { value: 'daily', label: 'Günlük' },
                                    { value: 'monthly', label: 'Aylık' }
                                ]}
                            />
                            {bulkFormData.pricingType === 'monthly' ? (
                                <CustomInput
                                    label="Aylık Tutar"
                                    format="currency"
                                    value={bulkFormData.monthlyPrice}
                                    onChange={(val) => setBulkFormData({ ...bulkFormData, monthlyPrice: val })}
                                />
                            ) : (
                                <CustomInput
                                    label="Birim Fiyat"
                                    format="currency"
                                    value={bulkFormData.unitPrice}
                                    onChange={(val) => setBulkFormData({ ...bulkFormData, unitPrice: val })}
                                />
                            )}
                        </div>
                    </div>

                    {/* Yol (Travel) Add-on Replaced with Dynamic Additions */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                Ek Ödemeler
                            </span>
                        </div>
                        
                        {/* List of current additions as Clean Rows */}
                        {bulkFormData.additions && bulkFormData.additions.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {bulkFormData.additions.map((add, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center', 
                                        background: 'var(--bg-primary)', 
                                        padding: '8px 12px', 
                                        borderRadius: 'var(--radius-sm)', 
                                        border: '1px solid var(--border-color)',
                                        fontSize: '12px',
                                        transition: 'all 0.2s'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <DollarSign size={14} style={{ color: 'var(--accent-primary)' }} />
                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{add.type}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{formatCurrency(add.price)}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newList = [...bulkFormData.additions];
                                                    newList.splice(idx, 1);
                                                    setBulkFormData({ ...bulkFormData, additions: newList });
                                                }}
                                                style={{ 
                                                    border: 'none', 
                                                    background: 'none', 
                                                    color: 'var(--text-error)', 
                                                    cursor: 'pointer', 
                                                    fontSize: '16px', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    padding: '0 4px'
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Unified Input Group for adding new addition */}
                        <div style={{ display: 'flex', gap: '0', width: '100%', alignItems: 'center', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Tür (Örn: Yol, Yemek)"
                                value={curBulkAdditionType}
                                onChange={(e) => setCurBulkAdditionType(e.target.value)}
                                style={{ flex: 1, height: '34px', fontSize: '12px', border: 'none', borderRadius: 0, paddingLeft: '10px', background: 'var(--bg-primary)' }}
                            />
                            <div style={{ width: '1px', height: '20px', background: 'var(--border-color)' }}></div>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Fiyat ₺"
                                value={curBulkAdditionPrice ? String(curBulkAdditionPrice).replace('.', ',') : ''}
                                onChange={(e) => {
                                    let clean = e.target.value.replace(/\./g, '').replace(/[^0-9,]/g, '');
                                    const parts = clean.split(',');
                                    if (parts.length > 2) clean = parts[0] + ',' + parts.slice(1).join('');
                                    if (parts.length === 2 && parts[1].length > 2) clean = parts[0] + ',' + parts[1].substring(0, 2);
                                    const floatVal = clean.replace(',', '.');
                                    setCurBulkAdditionPrice(floatVal === '' ? '' : floatVal);
                                }}
                                style={{ width: '100px', height: '34px', fontSize: '12px', border: 'none', borderRadius: 0, textAlign: 'right', paddingRight: '10px', background: 'var(--bg-primary)' }}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!curBulkAdditionType || !curBulkAdditionPrice) return;
                                    setBulkFormData({
                                        ...bulkFormData,
                                        additions: [...(bulkFormData.additions || []), { type: curBulkAdditionType, price: parseFloat(curBulkAdditionPrice) || 0 }]
                                    });
                                    setCurBulkAdditionType('Yol');
                                    setCurBulkAdditionPrice('');
                                }}
                                style={{ height: '34px', width: '40px', background: 'var(--accent-primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>

                    <CustomInput
                        label="Ortak Açıklama"
                        type="textarea"
                        value={bulkFormData.description}
                        onChange={(val) => setBulkFormData({ ...bulkFormData, description: val })}
                    />

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn btn-secondary">İptal</button>
                        <button type="submit" className="btn btn-primary">Toplu Oluştur</button>
                    </div>
                </form>
            </Modal>

            {/* Bulk Edit Modal */}
            <Modal
                isOpen={isBulkEditModalOpen}
                onClose={() => setIsBulkEditModalOpen(false)}
                title={`Toplu Düzenle (${selectedIds.length} Kayıt)`}
            >
                <form onSubmit={handleBulkEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                        ⚠️ Boş bıraktığınız alanlar mevcut kayıtlarda değiştirilmeyecektir.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomInput
                            label="Tarih"
                            type="date"
                            value=""
                            disabled={true}
                        />
                        <CustomInput
                            label="Fiş No"
                            type="text"
                            value={bulkEditFormData.receiptNo}
                            onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, receiptNo: val })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomSelect
                            label="Makina / Araç"
                            value={bulkEditFormData.vehicleId}
                            onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, vehicleId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...vehicles.map(v => ({ value: v.id, label: `${v.plate} (${v.brand})` }))
                            ]}
                        />
                        <CustomSelect
                            label="Personel"
                            value={bulkEditFormData.employeeId}
                            onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, employeeId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))
                            ]}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value=""
                                disabled={true}
                            />
                            <CustomInput
                                type="time"
                                label="B. Saati"
                                value=""
                                disabled={true}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <CustomSelect
                                label="Fiyatlandırma"
                                value={bulkEditFormData.pricingType}
                                onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, pricingType: val })}
                                options={[
                                    { value: '', label: 'Seçiniz' },
                                    { value: 'daily', label: 'Günlük' },
                                    { value: 'hourly', label: 'Saatlik' },
                                    { value: 'monthly', label: 'Aylık' }
                                ]}
                            />
                            <CustomInput
                                label="Birim Fiyat"
                                type="number"
                                value={bulkEditFormData.unitPrice}
                                onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, unitPrice: val })}
                            />
                        </div>
                    </div>

                    {/* Ek Ödemeler (Disabled representation) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexDirection: 'column',
                        gap: '12px',
                        padding: '14px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)',
                        opacity: 0.6
                    }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Ek Ödemeler (Toplu düzenlemede kullanılamaz)
                        </span>
                    </div>

                    <CustomInput
                        label="Açıklama"
                        type="textarea"
                        value={bulkEditFormData.description}
                        onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, description: val })}
                    />

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsBulkEditModalOpen(false)} className="btn btn-secondary">İptal</button>
                        <button type="submit" className="btn btn-primary">Toplu Güncelle</button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={!!confirmModal}
                title={confirmModal?.title}
                message={confirmModal?.message}
                onConfirm={handleConfirmDelete}
                onClose={() => setConfirmModal(null)}
                type="danger"
            />

            {/* Report Preview Modal */}
            <Modal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                title={`Puantaj Raporu: ${work.title}`}
                size="fullscreen"
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={() => setIsReportModalOpen(false)}>Kapat</button>
                        <div style={{ marginRight: 'auto' }}></div>
                        <button className="btn btn-primary" onClick={handleSavePdf} disabled={generatingPdf} style={{ gap: '6px' }}>
                            <FileDown size={16} /> {generatingPdf ? 'Hazırlanıyor...' : 'PDF Olarak Kaydet'}
                        </button>
                        <button className="btn btn-primary" onClick={handlePrintReport} style={{ gap: '6px' }}>
                            <Printer size={16} /> Yazdır
                        </button>
                    </>
                }
            >
                <div style={{ display: 'flex', gap: '0', height: '100%', background: 'var(--bg-primary)', overflow: 'hidden' }}>
                    {/* Left: Configuration - Sticky Sidebar */}
                    <div style={{ width: '280px', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0', flexShrink: 0, overflowY: 'auto', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)' }}>
                        
                        {/* Content Toggles */}
                        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                                <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rapor Seçenekleri</h4>
                            </div>
                            <div style={{ padding: '12px 16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '7px 10px', borderRadius: '8px', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ fontSize: '13px', color: showPrices ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: showPrices ? 500 : 400, transition: 'all 0.15s' }}>Tabloda Fiyatları Göster</span>
                                        <label className="toggle-switch" style={{ flexShrink: 0, transform: 'scale(0.8)' }} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </label>

                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '7px 10px', borderRadius: '8px', transition: 'background 0.15s', marginTop: '4px' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ fontSize: '13px', color: showKdv ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: showKdv ? 500 : 400, transition: 'all 0.15s' }}>KDV Ekle (+%20)</span>
                                        <label className="toggle-switch" style={{ flexShrink: 0, transform: 'scale(0.8)' }} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={showKdv} onChange={e => setShowKdv(e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Katsayı Ayarları */}
                        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                                <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesai Katsayıları</h4>
                            </div>
                            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                <div>
                                    <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Pazar Katsayısı</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        className="form-input"
                                        value={pazarMultiplier}
                                        onChange={e => setPazarMultiplier(e.target.value)}
                                        style={{ fontSize: '12px', padding: '6px 10px', width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Mesai Farkı Katsayısı</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        className="form-input"
                                        value={mesaiMultiplier}
                                        onChange={e => setMesaiMultiplier(e.target.value)}
                                        style={{ fontSize: '12px', padding: '6px 10px', width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Live Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-tertiary)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20mm', alignItems: 'center', width: '100%' }}>
                            <WorkPdfReport 
                                propWork={work} 
                                noHeader={true} 
                                isPreview={true} 
                                showPricesProp={showPrices} 
                                showKdvProp={showKdv} 
                                kdvRateProp={kdvRate}
                                pazarMultiplierProp={pazarMultiplier}
                                mesaiMultiplierProp={mesaiMultiplier}
                            />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    )
}

function getStatusColor(status) {
    switch (status) {
        case 'pending': return 'warning'
        case 'in_progress': return 'info'
        case 'completed': return 'success'
        case 'cancelled': return 'important' // or danger based on css
        default: return 'secondary'
    }
}
