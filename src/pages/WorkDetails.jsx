import { useState, useEffect } from 'react' // Re-saved for sync
import { useParams, useNavigate, Link } from 'react-router-dom' // Even though we use tabs, we might get ID from props
import { useTabs } from '../context/TabContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, Truck, User, DollarSign, FileText, Printer, Download, FileDown, Settings } from 'lucide-react'
import { formatDate, formatCurrency } from '../utils/helpers'
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
    const [showKdv, setShowKdv] = useState(false)
    const [kdvRate, setKdvRate] = useState(20)
    const [generatingPdf, setGeneratingPdf] = useState(false)

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
            isPdfSave: true
        }))

        setGeneratingPdf(true)
        setTimeout(async () => {
            try {
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
        window.print()
    }

    // --- Calculations ---

    const totalHours = work?.items?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0
    const totalOvertime = work?.items?.reduce((sum, item) => sum + (item.overtime_hours || 0), 0) || 0

    // Replicate PDF calculation logic to guarantee "Toplam Tutar" matches exactly.
    let grandTotal = 0;
    let totalMesaiPriceAmount = 0;
    let totalPazarPriceAmount = 0;
    let totalPazarDayCount = 0;
    let totalGunTutar = 0;
    let totalYolTutar = 0;
    let totalSaatlikTutar = 0;

    const uniqueVehicles = new Set();
    const uniqueEmployees = new Set();

    if (work?.items) {
        const groupedItems = {};
        work.items.forEach(item => {
            if (item.vehicle_id) uniqueVehicles.add(item.vehicle_id);
            if (item.employee_id) uniqueEmployees.add(item.employee_id);

            const key = item.vehicle_id || 'diger';
            if (!groupedItems[key]) {
                groupedItems[key] = { items: [], totalGun: 0, totalPazar: 0, totalYol: 0, totalSaatlik: 0, totalMesai: 0, isAylik: false };
            }
            groupedItems[key].items.push(item);

            const gunSayisi = Number(item.hours) || 0;
            const descUpper = (item.description || '').toUpperCase();
            const dateObj = new Date(item.date);
            const isPazar = dateObj.getDay() === 0 || descUpper.includes('PAZAR');
            const isYol = descUpper.includes('YOL') || descUpper.includes('[YOL]');
            const isSaatlik = descUpper.includes('[SAATLİK]');
            const isAylik = descUpper.includes('[AYLIK]');

            if (isAylik) groupedItems[key].isAylik = true;

            if (isPazar) groupedItems[key].totalPazar += gunSayisi;
            else if (isYol) groupedItems[key].totalYol += gunSayisi;
            else if (isSaatlik) groupedItems[key].totalSaatlik += gunSayisi;
            else groupedItems[key].totalGun += gunSayisi;

            groupedItems[key].totalMesai += (Number(item.overtime_hours) || 0);
        });

        Object.values(groupedItems).forEach(group => {
            const sampleGunPrice = group.items.find(i => !(i.description || '').toUpperCase().includes('PAZAR') && !(i.description || '').toUpperCase().includes('YOL') && !(i.description || '').toUpperCase().includes('[SAATLİK]'))?.unit_price || 0;
            const sampleYolPrice = group.items.find(i => (i.description || '').toUpperCase().includes('YOL'))?.unit_price || 0;
            const sampleSaatlikPrice = group.items.find(i => (i.description || '').toUpperCase().includes('[SAATLİK]'))?.unit_price || 0;
            let samplePazarPrice = group.items.find(i => (i.description || '').toUpperCase().includes('PAZAR'))?.unit_price || 0;
            if (samplePazarPrice <= sampleGunPrice && sampleGunPrice > 0) samplePazarPrice = sampleGunPrice * 1.5;
            let sampleMesaiPrice = group.items.find(i => i.overtime_hours > 0)?.unit_price || 0;
            if (sampleMesaiPrice <= sampleGunPrice && sampleGunPrice > 0) sampleMesaiPrice = parseFloat(((sampleGunPrice / 8) * 1.5).toFixed(2));

            let cg = group.isAylik ? (26 * sampleGunPrice) : (group.totalGun * sampleGunPrice);
            
            const mesaiTutar = group.totalMesai * sampleMesaiPrice;
            const pazarTutar = group.totalPazar * samplePazarPrice;
            const yolTutar = group.totalYol * sampleYolPrice;
            const saatlikTutar = group.totalSaatlik * sampleSaatlikPrice;
            
            totalMesaiPriceAmount += mesaiTutar;
            totalPazarPriceAmount += pazarTutar;
            totalPazarDayCount += group.totalPazar;
            totalGunTutar += cg;
            totalYolTutar += yolTutar;
            totalSaatlikTutar += saatlikTutar;

            grandTotal += cg + pazarTutar + yolTutar + saatlikTutar + mesaiTutar;
        });
    }

    // Get dynamic date range from work items
    const getDynamicDateRange = () => {
        if (!work?.items || work.items.length === 0) {
            return `${formatDate(work?.start_date)} - ${formatDate(work?.end_date)}`;
        }
        const dates = work.items.filter(item => item.date).map(item => new Date(item.date).getTime());
        if (dates.length === 0) return `${formatDate(work?.start_date)} - ${formatDate(work?.end_date)}`;

        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));
        return `${formatDate(minDate)} - ${formatDate(maxDate)}`;
    }

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
                                <Calendar size={14} /> {getDynamicDateRange()}
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

            {/* Default Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {/* Mesai Kartı */}
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock />
                    </div>
                    <div className="stat-content" style={{ width: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{totalOvertime} Saat</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Normal Mesai</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{totalPazarDayCount} Gün</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Pazar Mesai</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(totalMesaiPriceAmount)}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Mesai Tutar</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--warning)' }}>{formatCurrency(totalPazarPriceAmount)}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Pazar Tutar</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kayıt Bilgileri Kartı */}
                <div className="stat-card">
                    <div className="stat-icon info">
                        <FileText />
                    </div>
                    <div className="stat-content" style={{ width: '100%' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{work.items.length} Adet</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Toplam Kayıt</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{uniqueVehicles.size} Adet</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Aktif Araç</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--info)' }}>{uniqueEmployees.size} Kişi</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Personel</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--info)' }}>{totalHours} Gün</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '600' }}>Toplam Gün</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Finansal Özet Kartı */}
                <div className="stat-card">
                    <div className="stat-icon success">
                        <DollarSign />
                    </div>
                    <div className="stat-content" style={{ width: '100%' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', overflow: 'hidden' }}>
                            <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--success)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={formatCurrency(grandTotal)}>
                                {formatCurrency(grandTotal)}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.02em', marginTop: '2px' }}>Genel Toplam</div>
                        </div>
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
                actions={(row) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" title="Düzenle" onClick={(e) => { e.stopPropagation(); openEditModal(row) }}><Pencil size={16} /></button>
                        <button className="btn-icon danger" title="Sil" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row) }}><Trash2 size={16} /></button>
                    </div>
                )}
                onBulkDelete={handleBulkDelete}
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
                    </div>

                    {/* Right: Live Preview */}
                    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-tertiary)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20mm', alignItems: 'center', width: '100%' }}>
                            <WorkPdfReport propWork={work} noHeader={true} isPreview={true} showPricesProp={showPrices} showKdvProp={showKdv} kdvRateProp={kdvRate} />
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
