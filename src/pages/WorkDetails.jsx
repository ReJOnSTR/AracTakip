import { useState, useEffect, useMemo, useRef } from 'react' // Re-saved for sync
import { useParams, useNavigate, Link } from 'react-router-dom' // Even though we use tabs, we might get ID from props
import { useTabs } from '../context/TabContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, Truck, User, DollarSign, FileText, Printer, Download, FileDown, Settings, Wallet, ChevronDown, Save } from 'lucide-react'
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
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
    const [isColorModalOpen, setIsColorModalOpen] = useState(false)
    const [isMultiplierModalOpen, setIsMultiplierModalOpen] = useState(false)

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
    const [savingToSystem, setSavingToSystem] = useState(false)
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
    const [reportScale, setReportScale] = useState(100)
    const [showPageBreaks, setShowPageBreaks] = useState(true)
    const [sidebarCollapsed, setSidebarCollapsed] = useState({
        options: false,
        multipliers: false
    })

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

    // Real-time synchronization listener
    const loadDataRef = useRef(null)
    useEffect(() => {
        loadDataRef.current = loadData
    })
    useEffect(() => {
        if (!id) return
        const unsub = window.electronAPI?.onDbUpdate?.((change) => {
            if (['works', 'work_items', 'customers', 'employees', 'vehicles'].includes(change?.table)) {
                console.log(`[RealTime] WorkDetails reloading for change in ${change.table}`)
                loadDataRef.current(true)
            }
        })
        return () => { if (unsub) unsub() }
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
            
            const currentStart = startH + (startM / 60);
            const currentEnd = endH + (endM / 60);

            let standardOverlap = 0;
            if (currentEnd >= currentStart) {
                // Same day interval
                standardOverlap = Math.max(0, Math.min(currentEnd, workEnd) - Math.max(currentStart, workStart));
            } else {
                // Overnight interval (spans midnight)
                const day1Overlap = Math.max(0, Math.min(24, workEnd) - Math.max(currentStart, workStart));
                const day2Overlap = Math.max(0, Math.min(currentEnd, workEnd) - Math.max(0, workStart));
                standardOverlap = day1Overlap + day2Overlap;
            }

            const overtimeHours = Math.max(0, diffHours - standardOverlap);
            calculatedHours = 1;
            calculatedOvertime = parseFloat(Math.min(diffHours, overtimeHours).toFixed(2));
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



    const loadData = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
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
        if (!isBackground) setLoading(false)
    }

    const handleSaveToSystem = async () => {
        if (!window.electronAPI?.saveReportPdf) {
            alert('PDF Kaydetme özelliği sadece masaüstü uygulamasında geçerlidir.')
            return
        }

        // Store the print configuration in localStorage
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

        setSavingToSystem(true)
        try {
            // Generate PDF silently in temp folder
            const res = await window.electronAPI.saveReportPdf('/print', { silent: true })
            if (res && res.success && res.filePath) {
                // Save the PDF as a document linked to this work
                const docRes = await window.electronAPI.addDocument({
                    vehicleId: work.vehicle_id || null,
                    relatedType: 'work',
                    relatedId: work.id,
                    filePath: res.filePath,
                    fileName: `${work.title}_Raporu_${new Date().toISOString().split('T')[0]}.pdf`
                })

                if (docRes.success) {
                    setIsReportModalOpen(false)
                    alert('Rapor sisteme başarıyla kaydedildi.')
                } else {
                    alert('Rapor sisteme eklenirken hata: ' + docRes.error)
                }
            } else {
                alert('PDF Raporu oluşturulurken hata: ' + (res?.error || 'Bilinmeyen hata'))
            }
        } catch (err) {
            console.error('Save report to system error:', err)
            alert('Hata: ' + err.message)
        } finally {
            setSavingToSystem(false)
        }
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
            multiplier: '1',
            customColor: '',
            travelEnabled: false,
            travelPrice: '',
            description: ''
        })
        setShowAdvancedOptions(false)
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

        // Parse multiplier tag
        let multiplier = '1';
        const multMatch = desc.match(/\[KATSAYI:([^\]]+)\]/);
        if (multMatch) {
            multiplier = multMatch[1];
            desc = desc.replace(multMatch[0], '').trim();
        }

        // Parse custom color tag
        let customColor = '';
        const colorMatch = desc.match(/\[RENK:([^\]]+)\]/);
        if (colorMatch) {
            customColor = colorMatch[1];
            desc = desc.replace(colorMatch[0], '').trim();
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

        if ((multiplier && multiplier !== '1') || customColor) {
            setShowAdvancedOptions(true)
        } else {
            setShowAdvancedOptions(false)
        }

        setFormData({
            date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            receiptNo: item.receipt_no || '',
            vehicleId: item.vehicle_id || item.custom_vehicle || '',
            employeeId: item.employee_id || item.custom_employee || '',
            startTime: item.start_time || '',
            endTime: item.end_time || '',
            hours: item.hours || 0,
            overtimeHours: item.overtime_hours || 0,
            pricingType: determinedPricingType,
            unitPrice: item.unit_price || 0,
            multiplier: multiplier,
            customColor: customColor,
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

            if (formData.multiplier && parseFloat(formData.multiplier) !== 1) {
                finalDesc = `[KATSAYI:${formData.multiplier}] ` + finalDesc;
            }

            if (formData.customColor) {
                finalDesc = `[RENK:${formData.customColor}] ` + finalDesc;
            }

            // Append custom addition tags
            if (formData.additions && formData.additions.length > 0) {
                formData.additions.forEach(add => {
                    finalDesc = `[EK:${add.type}:${add.price}] ` + finalDesc;
                });
            }

            const payload = {
                ...parsed,
                unitPrice: parsed.unitPrice,
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
        if (bulkEditFormData.vehicleId !== '') {
            const num = Number(bulkEditFormData.vehicleId)
            updates.vehicleId = isNaN(num) ? bulkEditFormData.vehicleId : num
        }
        if (bulkEditFormData.employeeId !== '') {
            const num = Number(bulkEditFormData.employeeId)
            updates.employeeId = isNaN(num) ? bulkEditFormData.employeeId : num
        }
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
                    vehicleId: updates.vehicleId !== undefined ? updates.vehicleId : (existingItem.vehicle_id || existingItem.custom_vehicle),
                    employeeId: updates.employeeId !== undefined ? updates.employeeId : (existingItem.employee_id || existingItem.custom_employee),
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

        const sanitizeFileName = (str) => (str || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\-\s]/g, '').trim().replace(/\s+/g, '_');
        const getWorkMonthLabel = (workObj) => {
            if (workObj?.date) {
                const d = new Date(workObj.date);
                if (!isNaN(d.getTime())) {
                    const m = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                    return m.charAt(0).toUpperCase() + m.slice(1);
                }
            }
            const now = new Date();
            const m = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
            return m.charAt(0).toUpperCase() + m.slice(1);
        };

        const monthStr = sanitizeFileName(getWorkMonthLabel(work));
        const compStr = work?.company_name ? `${sanitizeFileName(work.company_name)}_` : (work?.company?.name ? `${sanitizeFileName(work.company.name)}_` : '');
        const workNoStr = work?.work_no ? sanitizeFileName(work.work_no) : 'Is_Raporu';

        const defaultFileName = `Is_Raporu_${compStr}${workNoStr}_${monthStr}.pdf`;

        setGeneratingPdf(true)
        setTimeout(async () => {
            try {
                setIsReportModalOpen(false)
                const res = await window.electronAPI.saveReportPdf('/print', { defaultPath: defaultFileName })
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
    const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('ALL')

    const availableVehiclesInWork = useMemo(() => {
        if (!work?.items) return []
        const map = new Map()
        work.items.forEach(item => {
            const vehicleKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
            if (!map.has(vehicleKey)) {
                let label = 'Diğer / Ekipman'
                if (item.plate) {
                    label = `${item.plate}${item.model ? ` (${item.model})` : ''}`
                } else if (item.custom_vehicle) {
                    label = item.custom_vehicle
                }
                map.set(vehicleKey, {
                    key: vehicleKey,
                    label: label,
                    count: 0
                })
            }
            map.get(vehicleKey).count += 1
        })
        return Array.from(map.values())
    }, [work?.items])

    const vehicleFilteredItems = useMemo(() => {
        const items = work?.items || []
        if (selectedVehicleFilter === 'ALL') return items
        return items.filter(item => {
            const itemKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger')
            return itemKey === selectedVehicleFilter
        })
    }, [work?.items, selectedVehicleFilter])

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

        const isHourly = items.length > 0 && items.some(item => (item.description || '').toUpperCase().includes('[SAATLİK]') || item.pricingType === 'hourly')

        return { ...calc, dateRangeText, isHourly }
    }, [filteredItems, work, pazarMultiplier, mesaiMultiplier])

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

                    {/* Toplam Süre */}
                    <div className="stat-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', letterSpacing: '0.5px' }}>
                            <Calendar size={14} className="text-success" /> Toplam Süre
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>{stats.durationText}</div>
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
                    { label: 'MAKİNA', key: 'vehicle_id', searchValue: (row) => `${row.plate || ''} ${row.custom_vehicle || ''} ${row.brand || ''} ${row.model || ''}`, render: (val, row) => row.plate || row.custom_vehicle || '-' },
                    { label: 'PERSONEL', key: 'employee_id', searchValue: (row) => `${row.employee_name || ''} ${row.employee_surname || ''} ${row.custom_employee || ''}`, render: (val, row) => row.employee_name ? `${row.employee_name} ${row.employee_surname}` : (row.custom_employee || '-') },
                    {
                        label: 'ÇALIŞMA SÜRESİ', key: 'start_time', render: (val, row) => (
                            <div style={{ fontSize: '12px' }}>
                                {row.start_time && row.end_time ? `${row.start_time} - ${row.end_time}` : '-'}
                            </div>
                        )
                    },
                    {
                        label: 'SÜRE', key: 'hours', render: (val, row) => {
                            const descUpper = (row.description || '').toUpperCase();
                            const isHourly = row.pricingType === 'hourly' || descUpper.includes('[SAATLİK]') || row.unit === 'saat';
                            const unitLabel = isHourly ? 'Saat' : 'Gün';
                            return (
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{row.hours ?? 0} {unitLabel}</span>
                                </div>
                            );
                        }
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
                filters={[
                    {
                        key: 'vehicle_filter',
                        label: 'Tüm Araçlar',
                        options: availableVehiclesInWork.map(v => ({
                            value: v.key,
                            label: `${v.label} (${v.count})`
                        })),
                        filterFn: (row, value) => {
                            const itemKey = row.vehicle_id ? String(row.vehicle_id) : (row.custom_vehicle ? `custom_${row.custom_vehicle}` : 'diger');
                            return itemKey === value;
                        }
                    }
                ]}
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
                rowClassName={(row) => {
                    const desc = row.description || '';
                    if (desc.includes('[RENK:red]') || (row.date && new Date(row.date).getDay() === 0)) return 'pazar-row';
                    if (desc.includes('[RENK:orange]')) return 'orange-row';
                    if (desc.includes('[RENK:blue]')) return 'blue-row';
                    if (desc.includes('[RENK:green]')) return 'green-row';
                    if (desc.includes('[RENK:purple]')) return 'purple-row';
                    return '';
                }}
            />

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingItem ? 'Kaydı Düzenle' : 'Yeni Çalışma Kaydı Ekle'}
            >
                <form onSubmit={handleModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <CustomSelect
                            label="Araç"
                            value={formData.vehicleId}
                            onChange={(val) => setFormData({ ...formData, vehicleId: val })}
                            options={vehicles.filter(v => v.type !== 'automobile').map(v => ({ value: v.id, label: `${v.plate} - ${v.brand || ''} ${v.model || ''}` }))}
                            creatable={true}
                        />
                        <CustomSelect
                            label="Personel"
                            value={formData.employeeId}
                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
                            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                            creatable={true}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Wallet size={15} style={{ color: 'var(--accent-primary)' }} /> Ek Ödemeler
                            </span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--accent-primary)',
                                background: 'var(--accent-subtle)',
                                border: '1px solid var(--accent-primary)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}>
                                Toplam: {formatCurrency((formData.additions || []).reduce((sum, add) => sum + (parseFloat(add.price) || 0), 0))}
                            </span>
                        </div>

                        {/* Quick Selection Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0 0 2px 0' }}>
                            {['Yol', 'Yemek', 'Mesai', 'Prim', 'Avans', 'Diğer'].map(type => {
                                const isActive = curAdditionType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setCurAdditionType(type)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--border-color)'),
                                            background: isActive ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontWeight: isActive ? '600' : '500',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* List of current additions as Clean Chips inside a scrollable box */}
                        <div style={{ 
                            height: '42px', 
                            overflowX: 'auto', 
                            overflowY: 'hidden',
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)', 
                            background: 'var(--bg-primary)', 
                            padding: '0 8px',
                            display: 'flex',
                            flexWrap: 'nowrap',
                            alignItems: 'center',
                            justifyContent: (formData.additions && formData.additions.length > 3) ? 'flex-start' : 'center',
                            gap: '6px',
                            width: '100%'
                        }}>
                            {formData.additions && formData.additions.length > 0 ? (
                                formData.additions.map((add, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        background: 'var(--bg-secondary)', 
                                        padding: '4px 10px', 
                                        borderRadius: 'var(--radius-full)', 
                                        border: '1px solid var(--border-color)',
                                        fontSize: '11px',
                                        color: 'var(--text-primary)',
                                        height: '24px'
                                    }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{add.type}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)', marginLeft: '2px' }}>{formatCurrency(add.price)}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newList = [...formData.additions];
                                                newList.splice(idx, 1);
                                                setFormData({ ...formData, additions: newList });
                                            }}
                                            style={{ 
                                                border: 'none', 
                                                background: 'transparent', 
                                                color: 'var(--text-muted)', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                padding: '2px',
                                                marginLeft: '4px',
                                                borderRadius: '50%',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'var(--text-error)';
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--text-muted)';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}>
                                    Ek ödeme bulunmuyor.
                                </div>
                            )}
                        </div>

                        {/* Modern Input Group for adding new addition using CustomInput */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', marginTop: '0' }}>
                            <div style={{ flex: 1 }}>
                                <CustomInput
                                    label="Ek Ödeme Türü"
                                    value={curAdditionType}
                                    onChange={(val) => setCurAdditionType(val)}
                                    placeholder="Tür (Örn: Yol, Yemek)"
                                    className="mb-0"
                                />
                            </div>
                            <div style={{ width: '120px' }}>
                                <CustomInput
                                    label="Fiyat ₺"
                                    format="currency"
                                    value={curAdditionPrice}
                                    onChange={(val) => setCurAdditionPrice(val)}
                                    placeholder="0,00"
                                    className="mb-0"
                                />
                            </div>
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
                                className="btn btn-primary"
                                style={{
                                    height: '40px',
                                    padding: '0 16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            >
                                <Plus size={16} /> Ekle
                            </button>
                        </div>
                    </div>

                    {/* Dedicated Sub-Option Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        <button
                            type="button"
                            onClick={() => setIsColorModalOpen(true)}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '8px 12px',
                                border: '1px solid var(--border-color)',
                                background: formData.customColor ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                color: formData.customColor ? 'var(--accent-primary)' : 'var(--text-primary)'
                            }}
                        >
                            <span>🎨 Gün Rengi / Etiket</span>
                            {formData.customColor && (
                                <span style={{ fontSize: '10px', background: 'var(--accent-primary)', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                                    {formData.customColor === 'red' ? 'Kırmızı' : formData.customColor === 'orange' ? 'Turuncu' : formData.customColor === 'blue' ? 'Mavi' : formData.customColor === 'green' ? 'Yeşil' : 'Mor'}
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsMultiplierModalOpen(true)}
                            className="btn btn-secondary"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '12px',
                                fontWeight: 600,
                                padding: '8px 12px',
                                border: '1px solid var(--border-color)',
                                background: (formData.multiplier && formData.multiplier !== '1') ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                color: (formData.multiplier && formData.multiplier !== '1') ? 'var(--accent-primary)' : 'var(--text-primary)'
                            }}
                        >
                            <span>🔢 Manuel Katsayı</span>
                            {(formData.multiplier && formData.multiplier !== '1') && (
                                <span style={{ fontSize: '10px', background: 'var(--accent-primary)', color: '#fff', padding: '1px 6px', borderRadius: '10px' }}>
                                    {formData.multiplier}x
                                </span>
                            )}
                        </button>
                    </div>

                    <CustomInput
                        label="Açıklama"
                        type="text"
                        value={formData.description}
                        onChange={(val) => setFormData({ ...formData, description: val })}
                    />

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">İptal</button>
                        <button type="submit" className="btn btn-primary">{editingItem ? 'Güncelle' : 'Ekle'}</button>
                    </div>
                </form>
            </Modal>

            {/* Sub Modal 1: Color Picker Modal */}
            <Modal
                isOpen={isColorModalOpen}
                onClose={() => setIsColorModalOpen(false)}
                title="🎨 Gün Rengi / Etiketi Seçin"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Bu çalışma kaydı için tabloda ve raporda görünecek özel satır rengini seçin:
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        {[
                            { id: '', label: '⚪ Standart Renk', desc: 'Varsayılan beyaz/şeffaf satır' },
                            { id: 'red', label: '🔴 Kırmızı', desc: 'Resmi Tatil / Özel Vurgu' },
                            { id: 'orange', label: '🟠 Turuncu', desc: 'Yarım Gün / Cumartesi' },
                            { id: 'blue', label: '🔵 Mavi', desc: 'Gece Vardiyası' },
                            { id: 'green', label: '🟢 Yeşil', desc: 'Özel Saha Görüşmesi' },
                            { id: 'purple', label: '🟣 Mor', desc: 'Özel Durum' }
                        ].map(col => (
                            <button
                                key={col.id}
                                type="button"
                                onClick={() => {
                                    setFormData({ ...formData, customColor: col.id });
                                    setIsColorModalOpen(false);
                                }}
                                style={{
                                    padding: '10px 12px',
                                    borderRadius: 'var(--radius-md)',
                                    border: '2px solid ' + (formData.customColor === col.id ? 'var(--accent-primary)' : 'var(--border-color)'),
                                    background: formData.customColor === col.id ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{col.label}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{col.desc}</div>
                            </button>
                        ))}
                    </div>
                    <div className="modal-footer" style={{ marginTop: '12px' }}>
                        <button type="button" onClick={() => setIsColorModalOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>Tamam</button>
                    </div>
                </div>
            </Modal>

            {/* Sub Modal 2: Multiplier Modal */}
            <Modal
                isOpen={isMultiplierModalOpen}
                onClose={() => setIsMultiplierModalOpen(false)}
                title="🔢 Manuel Fiyat Katsayısı (Çarpan)"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                        Normal birim fiyat üzerine uygulanacak çarpan oranını (katsayıyı) belirleyin:
                    </p>

                    <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                            Katsayı Oranı
                        </label>
                        <CustomInput
                            type="number"
                            step="0.05"
                            min="0.1"
                            max="10"
                            value={formData.multiplier || '1'}
                            onChange={(val) => setFormData({ ...formData, multiplier: val })}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                            Hızlı Oran Seçimi
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                            {[
                                { label: '1.0x (Standart Fiyat)', val: '1' },
                                { label: '1.25x (%25 Zammı)', val: '1.25' },
                                { label: '1.5x (%50 Zammı)', val: '1.5' },
                                { label: '2.0x (%100 Çift Ücret)', val: '2' }
                            ].map(b => (
                                <button
                                    key={b.val}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, multiplier: b.val })}
                                    style={{
                                        padding: '8px 10px',
                                        fontSize: '12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid ' + (String(formData.multiplier || '1') === b.val ? 'var(--accent-primary)' : 'var(--border-color)'),
                                        background: String(formData.multiplier || '1') === b.val ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                        color: String(formData.multiplier || '1') === b.val ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        fontWeight: String(formData.multiplier || '1') === b.val ? '700' : '500'
                                    }}
                                >
                                    {b.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {parseFloat(formData.multiplier) > 0 && parseFloat(formData.multiplier) !== 1 && (
                        <div style={{ background: 'var(--accent-subtle)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-primary)', fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            💡 Birim fiyat {formData.multiplier} katı olarak uygulanacaktır.<br />
                            Etkili Fiyat: {formatCurrency((parseFloat(formData.unitPrice) || 0) * parseFloat(formData.multiplier))}
                        </div>
                    )}

                    <div className="modal-footer">
                        <button type="button" onClick={() => setIsMultiplierModalOpen(false)} className="btn btn-primary" style={{ width: '100%' }}>Tamam</button>
                    </div>
                </div>
            </Modal>

            {/* Bulk Add Modal */}
            <Modal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                title="Hızlı Üretim (Toplu Kayıt Ekle)"
            >
                <form onSubmit={handleBulkSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ background: 'var(--bg-secondary)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Seçtiğiniz <strong>Başlangıç</strong> ve <strong>Bitiş</strong> tarihi aralığındaki her bir gün için girdiğiniz bilgilerle (Araç, Personel, Gün/Saat vb.) ayrı bir kayıt listeye otomatik eklenecektir.<br />
                        <em>Not: Hafta sonu, bayram tatili ayırmaz. İstemediğiniz günleri liste üzerinden tek tuşla kolayca silebilirsiniz.</em>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <CustomSelect
                            label="Araç"
                            value={bulkFormData.vehicleId}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, vehicleId: val })}
                            options={vehicles.filter(v => v.type !== 'automobile').map(v => ({ value: v.id, label: `${v.plate} - ${v.brand || ''} ${v.model || ''}` }))}
                            creatable={true}
                        />
                        <CustomSelect
                            label="Personel"
                            value={bulkFormData.employeeId}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, employeeId: val })}
                            options={employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))}
                            creatable={true}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-sm)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Wallet size={15} style={{ color: 'var(--accent-primary)' }} /> Ek Ödemeler
                            </span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: 'var(--accent-primary)',
                                background: 'var(--accent-subtle)',
                                border: '1px solid var(--accent-primary)',
                                padding: '3px 8px',
                                borderRadius: 'var(--radius-full)',
                                display: 'inline-flex',
                                alignItems: 'center'
                            }}>
                                Toplam: {formatCurrency((bulkFormData.additions || []).reduce((sum, add) => sum + (parseFloat(add.price) || 0), 0))}
                            </span>
                        </div>

                        {/* Quick Selection Tags */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0 0 2px 0' }}>
                            {['Yol', 'Yemek', 'Mesai', 'Prim', 'Avans', 'Diğer'].map(type => {
                                const isActive = curBulkAdditionType === type;
                                return (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setCurBulkAdditionType(type)}
                                        style={{
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            borderRadius: 'var(--radius-full)',
                                            border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'var(--border-color)'),
                                            background: isActive ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            fontWeight: isActive ? '600' : '500',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        {type}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* List of current additions as Clean Chips inside a scrollable box */}
                        <div style={{ 
                            height: '42px', 
                            overflowX: 'auto', 
                            overflowY: 'hidden',
                            border: '1px solid var(--border-color)', 
                            borderRadius: 'var(--radius-sm)', 
                            background: 'var(--bg-primary)', 
                            padding: '0 8px',
                            display: 'flex',
                            flexWrap: 'nowrap',
                            alignItems: 'center',
                            justifyContent: (bulkFormData.additions && bulkFormData.additions.length > 3) ? 'flex-start' : 'center',
                            gap: '6px',
                            width: '100%'
                        }}>
                            {bulkFormData.additions && bulkFormData.additions.length > 0 ? (
                                bulkFormData.additions.map((add, idx) => (
                                    <div key={idx} style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        background: 'var(--bg-secondary)', 
                                        padding: '4px 10px', 
                                        borderRadius: 'var(--radius-full)', 
                                        border: '1px solid var(--border-color)',
                                        fontSize: '11px',
                                        color: 'var(--text-primary)',
                                        height: '24px'
                                    }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{add.type}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--accent-primary)', marginLeft: '2px' }}>{formatCurrency(add.price)}</span>
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                const newList = [...bulkFormData.additions];
                                                newList.splice(idx, 1);
                                                setBulkFormData({ ...bulkFormData, additions: newList });
                                            }}
                                            style={{ 
                                                border: 'none', 
                                                background: 'transparent', 
                                                color: 'var(--text-muted)', 
                                                cursor: 'pointer', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                padding: '2px',
                                                marginLeft: '4px',
                                                borderRadius: '50%',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = 'var(--text-error)';
                                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = 'var(--text-muted)';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <Plus size={12} style={{ transform: 'rotate(45deg)' }} />
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div style={{ 
                                    fontSize: '11px', 
                                    color: 'var(--text-muted)', 
                                    width: '100%', 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}>
                                    Ek ödeme bulunmuyor.
                                </div>
                            )}
                        </div>

                        {/* Modern Input Group for adding new addition using CustomInput */}
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', width: '100%', marginTop: '0' }}>
                            <div style={{ flex: 1 }}>
                                <CustomInput
                                    label="Ek Ödeme Türü"
                                    value={curBulkAdditionType}
                                    onChange={(val) => setCurBulkAdditionType(val)}
                                    placeholder="Tür (Örn: Yol, Yemek)"
                                    className="mb-0"
                                />
                            </div>
                            <div style={{ width: '120px' }}>
                                <CustomInput
                                    label="Fiyat ₺"
                                    format="currency"
                                    value={curBulkAdditionPrice}
                                    onChange={(val) => setCurBulkAdditionPrice(val)}
                                    placeholder="0,00"
                                    className="mb-0"
                                />
                            </div>
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
                                className="btn btn-primary"
                                style={{
                                    height: '40px',
                                    padding: '0 16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    borderRadius: 'var(--radius-sm)'
                                }}
                            >
                                <Plus size={16} /> Ekle
                            </button>
                        </div>
                    </div>

                    <CustomInput
                        label="Ortak Açıklama"
                        type="text"
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
                <form onSubmit={handleBulkEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {modalError && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '14px' }}>{modalError}</div>}

                    <div style={{ background: 'var(--bg-tertiary)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        ⚠️ Boş bıraktığınız alanlar mevcut kayıtlarda değiştirilmeyecektir.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <CustomSelect
                            label="Makina / Araç"
                            value={bulkEditFormData.vehicleId}
                            onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, vehicleId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...vehicles.map(v => ({ value: v.id, label: `${v.plate} (${v.brand})` }))
                            ]}
                            creatable={true}
                        />
                        <CustomSelect
                            label="Personel"
                            value={bulkEditFormData.employeeId}
                            onChange={(val) => setBulkEditFormData({ ...bulkEditFormData, employeeId: val })}
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...employees.map(e => ({ value: e.id, label: `${e.first_name} ${e.last_name}` }))
                            ]}
                            creatable={true}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '10px 12px',
                        background: 'var(--bg-secondary)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        opacity: 0.6
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Wallet size={15} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                Ek Ödemeler (Toplu düzenlemede kullanılamaz)
                            </span>
                        </div>
                    </div>

                    <CustomInput
                        label="Açıklama"
                        type="text"
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
                        <button className="btn btn-success" onClick={handleSaveToSystem} disabled={savingToSystem || generatingPdf} style={{ gap: '6px' }}>
                            <Save size={16} /> {savingToSystem ? 'Kaydediliyor...' : 'Sisteme Kaydet'}
                        </button>
                        <button className="btn btn-primary" onClick={handleSavePdf} disabled={savingToSystem || generatingPdf} style={{ gap: '6px' }}>
                            <FileDown size={16} /> {generatingPdf ? 'Hazırlanıyor...' : 'PDF Olarak Kaydet'}
                        </button>
                        <button className="btn btn-primary" onClick={handlePrintReport} disabled={savingToSystem} style={{ gap: '6px' }}>
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
                            <div 
                                onClick={() => setSidebarCollapsed(prev => ({ ...prev, options: !prev.options }))}
                                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rapor Seçenekleri</h4>
                                </div>
                                <ChevronDown 
                                    size={14} 
                                    style={{ 
                                        color: 'var(--text-muted)', 
                                        transform: sidebarCollapsed.options ? 'rotate(-90deg)' : 'none', 
                                        transition: 'transform 0.2s ease' 
                                    }} 
                                />
                            </div>
                            {!sidebarCollapsed.options && (
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
                            )}
                        </div>

                        {/* Katsayı Ayarları */}
                        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div 
                                onClick={() => setSidebarCollapsed(prev => ({ ...prev, multipliers: !prev.multipliers }))}
                                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mesai Katsayıları</h4>
                                </div>
                                <ChevronDown 
                                    size={14} 
                                    style={{ 
                                        color: 'var(--text-muted)', 
                                        transform: sidebarCollapsed.multipliers ? 'rotate(-90deg)' : 'none', 
                                        transition: 'transform 0.2s ease' 
                                    }} 
                                />
                            </div>
                            {!sidebarCollapsed.multipliers && (
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Pazar Katsayısı</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            className="form-input"
                                            value={pazarMultiplier}
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setPazarMultiplier(val);
                                                const numVal = parseFloat(val);
                                                if (!isNaN(numVal) && work?.id) {
                                                    await window.electronAPI.updateWork({ id: work.id, pazar_multiplier: numVal });
                                                }
                                            }}
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
                                            onChange={async (e) => {
                                                const val = e.target.value;
                                                setMesaiMultiplier(val);
                                                const numVal = parseFloat(val);
                                                if (!isNaN(numVal) && work?.id) {
                                                    await window.electronAPI.updateWork({ id: work.id, mesai_multiplier: numVal });
                                                }
                                            }}
                                            style={{ fontSize: '12px', padding: '6px 10px', width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sayfa Düzeni & Sıkıştırma */}
                        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div 
                                onClick={() => setSidebarCollapsed(prev => ({ ...prev, layout: !prev.layout }))}
                                style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Settings size={14} style={{ color: 'var(--text-muted)' }} />
                                    <h4 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sayfa Sonu & Sıkıştırma</h4>
                                </div>
                                <ChevronDown 
                                    size={14} 
                                    style={{ 
                                        color: 'var(--text-muted)', 
                                        transform: sidebarCollapsed.layout ? 'rotate(-90deg)' : 'none', 
                                        transition: 'transform 0.2s ease' 
                                    }} 
                                />
                            </div>
                            {!sidebarCollapsed.layout && (
                                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', marginBottom: '4px', display: 'block', color: 'var(--text-muted)', fontWeight: 500 }}>Sıkıştırma Oranı (Ölçek)</label>
                                        <select
                                            className="form-select"
                                            value={reportScale}
                                            onChange={(e) => setReportScale(Number(e.target.value))}
                                            style={{ fontSize: '12px', padding: '6px 10px', width: '100%', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)' }}
                                        >
                                            <option value={100}>%100 (Standart)</option>
                                            <option value={90}>%90 (Sıkışık)</option>
                                            <option value={80}>%80 (Çok Sıkışık)</option>
                                            <option value={70}>%70 (Maksimum Sıkışık)</option>
                                        </select>
                                    </div>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '6px 0', marginTop: '2px' }} onClick={e => e.stopPropagation()}>
                                        <span style={{ fontSize: '12px', color: showPageBreaks ? 'var(--text-primary)' : 'var(--text-muted)' }}>Sayfa Sonu Çizgileri</span>
                                        <label className="toggle-switch" style={{ flexShrink: 0, transform: 'scale(0.8)' }} onClick={e => e.stopPropagation()}>
                                            <input type="checkbox" checked={showPageBreaks} onChange={e => setShowPageBreaks(e.target.checked)} />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </label>
                                </div>
                            )}
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
                                scaleProp={reportScale}
                                showPageBreaksProp={showPageBreaks}
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
