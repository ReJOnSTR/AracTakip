import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom' // Even though we use tabs, we might get ID from props
import { useTabs } from '../context/TabContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'
import { ArrowLeft, Plus, Pencil, Trash2, Calendar, Clock, Truck, User, DollarSign, FileText } from 'lucide-react'
import { formatDate, formatCurrency } from '../utils/helpers'
import { workItemSchema } from '../schemas/workSchema'

export default function WorkDetails(props) {
    const { id: urlId } = useParams()
    const id = props.id || urlId
    const navigate = useNavigate()
    const { openNewTab, replaceTab, activeTabId, closeTab } = useTabs()
    const [work, setWork] = useState(null)
    const [loading, setLoading] = useState(true)
    const [vehicles, setVehicles] = useState([])
    const [employees, setEmployees] = useState([])

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
        monthlyPrice: 0,
        unitPrice: 0,
        description: ''
    })

    // Confirm Delete State
    const [confirmModal, setConfirmModal] = useState(null)

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
        unitPrice: 0,
        description: ''
    })

    useEffect(() => {
        loadData()
    }, [id])

    // Auto-calculate hours for bulk form
    useEffect(() => {
        if (!isBulkModalOpen) return;

        const { startTime, endTime } = bulkFormData;
        if (startTime && endTime) {
            const [startH, startM] = startTime.split(':').map(Number);
            const [endH, endM] = endTime.split(':').map(Number);

            let diffHours = endH - startH + (endM - startM) / 60;
            if (diffHours < 0) diffHours += 24;

            let calculatedHours = 1;
            let calculatedOvertime = 0;

            if (diffHours > 9) {
                calculatedHours = 1;
                calculatedOvertime = diffHours - 9;
            } else if (diffHours < 9 && diffHours > 0) {
                calculatedHours = parseFloat((diffHours / 9).toFixed(2));
                calculatedOvertime = 0;
            }

            setBulkFormData(prev => ({
                ...prev,
                hours: calculatedHours,
                overtimeHours: calculatedOvertime
            }));
        }
    }, [bulkFormData.startTime, bulkFormData.endTime, isBulkModalOpen])

    // Auto-calculate hours for single form
    useEffect(() => {
        if (!isModalOpen) return;

        const { startTime, endTime, pricingType } = formData;
        if (startTime && endTime && pricingType !== 'travel') {
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
                if (diffHours > 9) {
                    calculatedHours = 1;
                    calculatedOvertime = parseFloat((diffHours - 9).toFixed(2));
                } else if (diffHours < 9 && diffHours > 0) {
                    calculatedHours = parseFloat((diffHours / 9).toFixed(2));
                    calculatedOvertime = 0;
                }
            }

            setFormData(prev => ({
                ...prev,
                hours: calculatedHours,
                overtimeHours: calculatedOvertime
            }));
        } else if (pricingType === 'travel') {
            setFormData(prev => ({ ...prev, hours: 1, overtimeHours: 0 }));
        }
    }, [formData.startTime, formData.endTime, formData.pricingType, isModalOpen])

    useEffect(() => {
        if (!isBulkModalOpen) return;

        const { startTime, endTime, pricingType } = bulkFormData;
        if (startTime && endTime && pricingType !== 'travel' && pricingType !== 'monthly') {
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
                if (diffHours > 9) {
                    calculatedHours = 1;
                    calculatedOvertime = parseFloat((diffHours - 9).toFixed(2));
                } else if (diffHours < 9 && diffHours > 0) {
                    calculatedHours = parseFloat((diffHours / 9).toFixed(2));
                    calculatedOvertime = 0;
                }
            }

            setBulkFormData(prev => ({
                ...prev,
                hours: calculatedHours,
                overtimeHours: calculatedOvertime
            }));
        } else if (pricingType === 'travel') {
            setBulkFormData(prev => ({ ...prev, hours: 1, overtimeHours: 0 }));
        }
    }, [bulkFormData.startTime, bulkFormData.endTime, bulkFormData.pricingType, isBulkModalOpen])

    const loadData = async () => {
        setLoading(true)
        try {
            // Load Work Details
            const workRes = await window.electronAPI.getWorkDetails(id)
            if (workRes.success) {
                setWork(workRes.data)

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
            monthlyPrice: 0,
            unitPrice: 0,
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
            unitPrice: 0,
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
        } else if (desc.startsWith('[YOL] ')) {
            determinedPricingType = 'travel';
            desc = desc.replace('[YOL] ', '');
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
            description: desc
        })
        setModalError('')
        setIsModalOpen(true)
    }

    const handleModalSubmit = async (e) => {
        e.preventDefault()
        setModalError('')

        try {
            // Validation
            const parsed = workItemSchema.parse(formData)

            // Prepare payload
            let finalDesc = parsed.description || '';
            if (formData.pricingType === 'hourly' && !finalDesc.startsWith('[SAATLİK]')) {
                finalDesc = '[SAATLİK] ' + finalDesc;
            } else if (formData.pricingType === 'travel' && !finalDesc.startsWith('[YOL]')) {
                finalDesc = '[YOL] ' + finalDesc;
            }

            const payload = {
                ...parsed,
                description: finalDesc,
                workId: id
            }

            let result
            if (editingItem) {
                result = await window.electronAPI.updateWorkItem({ ...payload, id: editingItem.id })
            } else {
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
                finalUnitPrice = parseFloat(bulkFormData.monthlyPrice) / daysCount;
            }

            while (currentDate <= end) {
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
                    description: bulkFormData.description
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

    // --- Calculations ---

    const totalHours = work?.items?.reduce((sum, item) => sum + (item.hours || 0), 0) || 0
    const totalOvertime = work?.items?.reduce((sum, item) => sum + (item.overtime_hours || 0), 0) || 0
    const grandTotal = work?.items?.reduce((sum, item) => sum + (item.total_price || 0), 0) || 0

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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <Link to="/works" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
                        <ArrowLeft size={14} /> İş Takibi
                    </Link>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 8px' }}>/</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>İş Detayı</span>
                </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon neutral">
                        <Clock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{totalHours} Saat</div>
                        <div className="stat-label">Toplam Süre</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-warning">{totalOvertime} Saat</div>
                        <div className="stat-label">Toplam Mesai</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <FileText />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-info">{work.items.length}</div>
                        <div className="stat-label">Kayıt Sayısı</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <DollarSign />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value text-success">{formatCurrency(grandTotal)}</div>
                        <div className="stat-label">Toplam Tutar</div>
                    </div>
                </div>
            </div>

            {/* Items Table Header */}
            <div className="page-header" style={{ marginTop: '24px', marginBottom: '16px' }}>
                <div>
                    <h3 className="page-title">Günlük Çalışma Kayıtları (Puantaj)</h3>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={openBulkAddModal} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                        <Calendar size={16} /> Hızlı Üretim (Toplu Ekle)
                    </button>
                    <button onClick={() => { 
                        localStorage.setItem('workPdfData', JSON.stringify(work));
                        window.open(`#/work-report/${id}`, '_blank', 'width=850,height=1000,menubar=no,toolbar=no,location=no,status=no,titlebar=no');
                    }} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} /> PDF Rapor
                    </button>
                    <button onClick={openAddModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={16} /> Yeni Kayıt
                    </button>
                </div>
            </div>

            <DataTable persistenceKey="WorkDetails_table_0"
                columns={[
                    { label: 'TARİH', key: 'date', render: (val) => formatDate(val) },
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
                onRowClick={() => { }}
                showRowNumbers={true}
                actions={(row) => (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="btn-icon" title="Düzenle" onClick={(e) => { e.stopPropagation(); openEditModal(row) }}><Pencil size={16} /></button>
                        <button className="btn-icon danger" title="Sil" onClick={(e) => { e.stopPropagation(); handleDeleteClick(row) }}><Trash2 size={16} /></button>
                    </div>
                )}
                onBulkDelete={handleBulkDelete}
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
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...vehicles.map(v => ({ value: v.id, label: v.plate + ' - ' + v.brand }))
                            ]}
                        />
                        <CustomSelect
                            label="Personel"
                            value={formData.employeeId}
                            onChange={(val) => setFormData({ ...formData, employeeId: val })}
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
                                    { value: 'travel', label: 'Yol' }
                                ]}
                            />
                            <CustomInput
                                label="Birim Fiyat"
                                type="number"
                                step="0.01"
                                value={formData.unitPrice}
                                onChange={(val) => setFormData({ ...formData, unitPrice: val })}
                            />
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
                                    d.setMonth(d.getMonth() + 1);
                                    d.setDate(d.getDate() - 1);
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
                            options={[
                                { value: '', label: 'Seçiniz' },
                                ...vehicles.map(v => ({ value: v.id, label: v.plate + ' - ' + v.brand }))
                            ]}
                        />
                        <CustomSelect
                            label="Personel"
                            value={bulkFormData.employeeId}
                            onChange={(val) => setBulkFormData({ ...bulkFormData, employeeId: val })}
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
                                        d.setMonth(d.getMonth() + 1);
                                        d.setDate(d.getDate() - 1);
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
                                    type="number"
                                    step="0.01"
                                    value={bulkFormData.monthlyPrice}
                                    onChange={(val) => setBulkFormData({ ...bulkFormData, monthlyPrice: val })}
                                />
                            ) : (
                                <CustomInput
                                    label="Birim Fiyat"
                                    type="number"
                                    step="0.01"
                                    value={bulkFormData.unitPrice}
                                    onChange={(val) => setBulkFormData({ ...bulkFormData, unitPrice: val })}
                                />
                            )}
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
