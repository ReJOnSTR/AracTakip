import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'

import CustomInput from '../components/CustomInput'
import ConfirmModal from '../components/ConfirmModal'

import {
    getVehicleTypeLabel,
    getVehicleStatusInfo,
    maintenanceTypes,
    getMaintenanceTypeLabel,
    insuranceTypes,
    getInsuranceTypeLabel,
    formatDate,
    formatCurrency,
    getDaysUntilText,
    getStatusColor
} from '../utils/helpers'
import {
    ArrowLeft,
    Car,
    Wrench,
    ClipboardCheck,
    Shield,
    UserCheck,
    Plus,
    Pencil,
    Trash2,
    Calendar,
    Settings,
    Building2,
    Activity,
    FileText,
    X,
    ExternalLink,
    Upload,
    Eye,
    Trash
} from 'lucide-react'
import VehicleForm from '../components/VehicleForm'
import FileUploader from '../components/FileUploader'
import MaintenanceForm from '../components/forms/MaintenanceForm'
import ServiceForm from '../components/forms/ServiceForm'
import InspectionForm from '../components/forms/InspectionForm'
import InsuranceForm from '../components/forms/InsuranceForm'
import AssignmentForm from '../components/forms/AssignmentForm'

export default function VehicleDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentCompany } = useCompany()

    const [vehicle, setVehicle] = useState(null)
    const [activeTab, setActiveTab] = useState('maintenance')
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    const [loading, setLoading] = useState(true)

    // Data states
    const [maintenances, setMaintenances] = useState([])
    const [inspections, setInspections] = useState([])
    const [insurances, setInsurances] = useState([])
    const [assignments, setAssignments] = useState([])
    const [services, setServices] = useState([])
    const [documents, setDocuments] = useState([])

    // Preview state
    const [previewDoc, setPreviewDoc] = useState(null)

    // Upload Modal state
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [selectedUploadFile, setSelectedUploadFile] = useState(null)

    // Modal states
    const [modalType, setModalType] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})

    // File upload state for operation modals
    const [selectedFile, setSelectedFile] = useState(null)

    const [activeUploadContext, setActiveUploadContext] = useState(null) // { type, id }

    const [saving, setSaving] = useState(false)

    const [error, setError] = useState('')

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState(null) // { type, item, ids, title, message }

    useEffect(() => {
        if (currentCompany) {
            loadVehicleData()
        }
    }, [currentCompany, id])

    // Calculate indicator position
    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({
                left: activeElement.offsetLeft,
                width: activeElement.offsetWidth
            })
        }
    }, [activeTab, tabsRef, maintenances, services, inspections, insurances, assignments, documents]) // Recalculate if counts change

    const loadVehicleData = async () => {
        setLoading(true)
        try {
            const [vehicleRes, maintRes, inspRes, insRes, assignRes, servRes, docsRes] = await Promise.all([
                window.electronAPI.getVehicleById(parseInt(id)),
                window.electronAPI.getMaintenancesByVehicle(parseInt(id)),
                window.electronAPI.getInspectionsByVehicle(parseInt(id)),
                window.electronAPI.getInsurancesByVehicle(parseInt(id)),
                window.electronAPI.getAssignmentsByVehicle(parseInt(id)),
                window.electronAPI.getServicesByVehicle(parseInt(id)),
                window.electronAPI.getDocumentsByVehicle(parseInt(id))
            ])

            if (vehicleRes.success) setVehicle(vehicleRes.data)
            if (maintRes.success) setMaintenances(maintRes.data)
            if (inspRes.success) setInspections(inspRes.data)
            if (insRes.success) setInsurances(insRes.data)
            if (assignRes.success) setAssignments(assignRes.data)
            if (servRes.success) setServices(servRes.data)
            if (docsRes.success) setDocuments(docsRes.data)
            if (insRes.success) setInsurances(insRes.data)
            if (assignRes.success) setAssignments(assignRes.data)
            if (servRes.success) setServices(servRes.data)
        } catch (error) {
            console.error('Failed to load vehicle data:', error)
        }
        setLoading(false)
    }

    const openAddModal = (type) => {
        setModalType(type)
        setEditingItem(null)
        setError('')
    }

    const openEditModal = (type, item) => {
        setModalType(type)
        setEditingItem(item)
        setError('')
    }

    const closeModal = () => {
        setModalType(null)
        setEditingItem(null)
        // setFormData({}) // Not needed
        setError('')
    }

    const handleVehicleSave = async (data) => {
        setSaving(true)
        setError('')

        try {
            const result = await window.electronAPI.updateVehicle({
                id: vehicle.id,
                ...data,
                year: data.year ? parseInt(data.year) : null
            })

            if (result.success) {
                closeModal()
                loadVehicleData()
            } else {
                setError(result.error)
            }
        } catch (err) {
            console.error('Vehicle save error:', err)
            setError('Bağlantı hatası')
        }
        setSaving(false)
    }

    const handleOperationSubmit = async (data) => {
        setSaving(true)
        setError('')

        let result
        let newId
        const vehicleId = parseInt(id)

        try {
            if (modalType === 'maintenance') {
                // Format data if needed (though schemas handle most coercion now)
                // Ensure vehicleId is number
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), cost: data.cost ? parseFloat(data.cost) : 0, nextKm: data.nextKm ? parseInt(data.nextKm) : null }

                if (editingItem) {
                    result = await window.electronAPI.updateMaintenance({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createMaintenance(payload)
                    newId = result.lastInsertRowid
                }
            } else if (modalType === 'inspection') {
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), cost: data.cost ? parseFloat(data.cost) : 0, type: 'traffic' }

                if (editingItem) {
                    result = await window.electronAPI.updateInspection({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createInspection(payload)
                    newId = result.lastInsertRowid
                }
            } else if (modalType === 'periodic_inspection') {
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), cost: data.cost ? parseFloat(data.cost) : 0, type: 'periodic' }

                if (editingItem) {
                    result = await window.electronAPI.updateInspection({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createInspection(payload)
                    newId = result.lastInsertRowid
                }
            } else if (modalType === 'insurance') {
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), premium: data.premium ? parseFloat(data.premium) : 0 }

                if (editingItem) {
                    result = await window.electronAPI.updateInsurance({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createInsurance(payload)
                    newId = result.lastInsertRowid
                }
            } else if (modalType === 'assignment') {
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), quantity: parseInt(data.quantity) || 1 }

                if (editingItem) {
                    result = await window.electronAPI.updateAssignment({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createAssignment(payload)
                    newId = result.lastInsertRowid
                }
            } else if (modalType === 'service') {
                const payload = { ...data, vehicleId: parseInt(data.vehicleId), cost: data.cost ? parseFloat(data.cost) : 0, km: data.km ? parseInt(data.km) : null }

                if (editingItem) {
                    result = await window.electronAPI.updateService({ id: editingItem.id, ...payload })
                    newId = editingItem.id
                } else {
                    result = await window.electronAPI.createService(payload)
                    newId = result.lastInsertRowid
                }
            }

            if (result?.success) {
                // Upload file if selected
                if (selectedFile) {
                    let relatedType = modalType
                    if (modalType === 'periodic_inspection') relatedType = 'inspection'

                    await window.electronAPI.addDocument({
                        vehicleId: parseInt(id),
                        relatedType: relatedType,
                        relatedId: parseInt(newId),
                        filePath: selectedFile.path
                    })
                }

                closeModal()
                loadVehicleData()
            } else {
                setError(result?.error || 'İşlem başarısız')
            }
        } catch (err) {
            console.error(err)
            setError('Bağlantı hatası')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteClick = (type, item, ids = null) => {
        let title = 'Silme Onayı'
        let message = 'Bu kaydı silmek istediğinize emin misiniz?'

        if (ids) {
            title = 'Toplu Silme Onayı'
            message = `${ids.length} adet kaydı silmek istediğinize emin misiniz?`
        } else {
            if (type === 'maintenance') message = 'Bu bakım kaydını silmek istediğinize emin misiniz?'
            if (type === 'inspection') message = 'Bu muayene kaydını silmek istediğinize emin misiniz?'
            if (type === 'periodic_inspection') message = 'Bu periyodik kontrol kaydını silmek istediğinize emin misiniz?'
            if (type === 'insurance') message = 'Bu sigorta kaydını silmek istediğinize emin misiniz?'
            if (type === 'assignment') message = 'Bu zimmet kaydını silmek istediğinize emin misiniz?'
            if (type === 'service') message = 'Bu servis kaydını silmek istediğinize emin misiniz?'
            if (type === 'documents') {
                title = 'Belge Sil'
                message = 'Bu belgeyi silmek istediğinize emin misiniz?'
            }
        }

        setConfirmModal({ type, item, ids, title, message })
    }

    const handleConfirmDelete = async () => {
        if (!confirmModal) return

        const { type, item, ids } = confirmModal
        let result = { success: true }

        if (ids) {
            // Bulk delete
            for (const id of ids) {
                let res
                if (type === 'maintenance') res = await window.electronAPI.deleteMaintenance(id)
                else if (type === 'inspection') res = await window.electronAPI.deleteInspection(id)
                else if (type === 'periodic_inspection') res = await window.electronAPI.deleteInspection(id)
                else if (type === 'insurance') res = await window.electronAPI.deleteInsurance(id)
                else if (type === 'assignment') res = await window.electronAPI.deleteAssignment(id)
                else if (type === 'insurance') res = await window.electronAPI.deleteInsurance(id)
                else if (type === 'assignment') res = await window.electronAPI.deleteAssignment(id)
                else if (type === 'service') res = await window.electronAPI.deleteService(id)
                else if (type === 'documents') res = await window.electronAPI.deleteDocument(id)

                if (!res?.success) {
                    result = res // Capture error if any fails
                    break
                }
            }
        } else {
            // Single delete
            if (type === 'maintenance') result = await window.electronAPI.deleteMaintenance(item.id)
            else if (type === 'inspection') result = await window.electronAPI.deleteInspection(item.id)
            else if (type === 'periodic_inspection') result = await window.electronAPI.deleteInspection(item.id)
            else if (type === 'insurance') result = await window.electronAPI.deleteInsurance(item.id)
            else if (type === 'assignment') result = await window.electronAPI.deleteAssignment(item.id)
            else if (type === 'service') result = await window.electronAPI.deleteService(item.id)
            else if (type === 'documents') result = await window.electronAPI.deleteDocument(item.id)
        }

        setConfirmModal(null)
        if (result?.success) loadVehicleData()
    }

    if (loading && !vehicle) {
        return (
            <div className="loading-screen" style={{ height: 'auto', padding: '60px' }}>
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        )
    }

    if (!vehicle) {
        return (
            <div className="empty-state">
                <h2 className="empty-state-title">Araç Bulunamadı</h2>
                <button className="btn btn-primary" onClick={() => navigate('/vehicles')}>
                    Araçlara Dön
                </button>
            </div>
        )
    }

    const statusInfo = getVehicleStatusInfo(vehicle.status)

    // Calculate quick stats (Traffic Inspection)
    const trafficInspections = inspections.filter(i => i.type !== 'periodic')
    // Get latest traffic inspection
    const lastTrafficInspection = trafficInspections.sort((a, b) => new Date(b.inspection_date) - new Date(a.inspection_date))[0]

    const nextInspectionDate = lastTrafficInspection ? new Date(lastTrafficInspection.next_inspection) : (vehicle.next_inspection ? new Date(vehicle.next_inspection) : null)
    const inspectionDays = nextInspectionDate ? Math.ceil((nextInspectionDate - new Date()) / (1000 * 60 * 60 * 24)) : null
    const upcomingInspection = inspectionDays !== null && inspectionDays <= 30

    const activeInsurance = insurances.find(i => new Date(i.end_date) > new Date())
    const insuranceDays = activeInsurance ? Math.ceil((new Date(activeInsurance.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
    const upcomingInsurance = insuranceDays !== null && insuranceDays <= 30

    const currentAssignment = assignments.find(a => !a.end_date)

    const periodicInspections = inspections.filter(i => i.type === 'periodic')

    const handleOpenUpload = (type, relatedId = null) => {
        setActiveUploadContext({ type, id: relatedId })
        setUploadModalOpen(true)
        setSelectedUploadFile(null)
    }

    const handleSelectUploadFile = async () => {
        try {
            const result = await window.electronAPI.selectFile()
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0]
                const fileName = filePath.split(/[\\/]/).pop()
                setSelectedUploadFile({ path: filePath, name: fileName })
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleUploadConfirm = async () => {
        if (!selectedUploadFile) return

        try {
            const addRes = await window.electronAPI.addDocument({
                vehicleId: parseInt(id),
                relatedType: activeUploadContext?.type || 'vehicle',
                relatedId: activeUploadContext?.id ? parseInt(activeUploadContext.id) : parseInt(id),
                filePath: selectedUploadFile.path
            })
            if (addRes.success) {
                await loadVehicleData()
                setUploadModalOpen(false)
                setSelectedUploadFile(null)
                // Optional: Show success toast instead of alert
            } else {
                alert('Dosya yüklenirken hata oluştu: ' + addRes.error)
            }
        } catch (err) {
            console.error('Document add error:', err)
            alert('Dosya yükleme hatası: ' + err.message)
        }
    }

    const handleDocumentOpen = async (docOrPath) => {
        let fileName = docOrPath
        let docObject = null

        if (typeof docOrPath === 'object') {
            fileName = docOrPath.file_path
            docObject = docOrPath
        }

        console.log('Opening document:', fileName)
        if (!fileName) {
            alert('Dosya adı bulunamadı!')
            return
        }

        // Check if it is an image
        const ext = fileName.split('.').pop().toLowerCase()
        if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
            const res = await window.electronAPI.readDocumentData(fileName)
            if (res.success) {
                setPreviewDoc({
                    data: res.data,
                    type: res.type,
                    name: fileName,
                    path: fileName,
                    doc: docObject // Store full doc object for deletion
                })
                return
            }
            // If preview fails, fall back to external open
            console.log('Preview failed, opening externally', res.error)
        }

        const error = await window.electronAPI.openDocument(fileName)
        if (error) {
            alert('Dosya açılamadı: ' + error)
        }
    }

    const hasDocument = (type, relatedId) => {
        return documents.some(d => d.related_type === type && d.related_id === relatedId)
    }


    const getDocument = (type, relatedId) => {
        return documents.find(d => d.related_type === type && d.related_id === relatedId)
    }

    const renderDocumentCell = (type, row) => {
        const doc = getDocument(type, row.id)
        return (
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                {doc ? (
                    <div
                        onClick={(e) => { e.stopPropagation(); handleDocumentOpen(doc) }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '4px 8px', borderRadius: '6px',
                            background: 'var(--accent-subtle)', color: 'var(--accent-primary)',
                            fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: '1px solid transparent',
                            transition: 'all 0.2s', width: 'fit-content'
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                        title={doc.file_name}
                    >
                        <Eye size={12} />
                        <span>Gör</span>
                    </div>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenUpload(type, row.id) }}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            border: '1px dashed var(--border-color)', background: 'transparent',
                            padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                            color: 'var(--text-muted)', fontSize: '11px', width: 'fit-content', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-primary)'; e.currentTarget.style.color = 'var(--accent-primary)' }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                        title="Dosya Ekle"
                    >
                        <Plus size={12} />
                        <span>Ekle</span>
                    </button>
                )}
            </div>
        )
    }

    const tabs = [
        { id: 'maintenance', label: 'Bakım', icon: Wrench, count: maintenances.length },
        { id: 'service', label: 'Servis', icon: Settings, count: services.length },
        { id: 'inspection', label: 'Muayene', icon: ClipboardCheck, count: trafficInspections.length },
        { id: 'periodic_inspection', label: 'Periyodik', icon: Activity, count: periodicInspections.length },
        { id: 'insurance', label: 'Sigorta', icon: Shield, count: insurances.length },
        { id: 'assignment', label: 'Zimmet', icon: UserCheck, count: assignments.length },
        { id: 'documents', label: 'Belgeler', icon: FileText, count: documents.length }
    ]

    const resultOptions = [
        { value: 'passed', label: 'Geçti' },
        { value: 'failed', label: 'Kaldı' },
        { value: 'conditional', label: 'Şartlı Geçti' }
    ]

    const serviceTypes = [
        { value: 'Genel Bakım', label: 'Genel Bakım' },
        { value: 'Arıza', label: 'Arıza/Tamir' },
        { value: 'Lastik', label: 'Lastik Değişimi/Tamiri' },
        { value: 'Kaporta', label: 'Kaporta/Boya' },
        { value: 'Elektrik', label: 'Elektrik Aksamı' },
        { value: 'Diğer', label: 'Diğer' }
    ]

    return (
        <div>
            {/* Header / Breadcrumb / Actions */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                    <Link to="/vehicles" style={{ color: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowLeft size={14} /> Araçlar
                    </Link>
                    <span>/</span>
                    <span>{vehicle.plate}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Icon removed */}
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>{vehicle.plate}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <span className={`badge badge-${statusInfo.color}`}>{statusInfo.label}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px', textTransform: 'uppercase' }}>
                                    {vehicle.brand} {vehicle.model} • {vehicle.year || '-'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => openEditModal('vehicle', vehicle)}>
                            <Pencil size={18} /> Düzenle
                        </button>
                    </div>
                </div>

                {/* Quick Status Cards - Only Key Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                    {/* Inspection Status */}
                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: upcomingInspection ? 'var(--warning-bg)' : 'var(--success-bg)',
                            color: upcomingInspection ? 'var(--warning)' : 'var(--success)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <ClipboardCheck size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Muayene Durumu</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: upcomingInspection ? 'var(--warning)' : 'var(--text-primary)' }}>
                                {nextInspectionDate ? getDaysUntilText(nextInspectionDate) : 'Bilgi Yok'}
                            </div>
                            {nextInspectionDate && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {formatDate(nextInspectionDate)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Insurance Status */}
                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: upcomingInsurance ? 'var(--warning-bg)' : 'var(--info-bg)',
                            color: upcomingInsurance ? 'var(--warning)' : 'var(--info)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Shield size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Sigorta Durumu</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: upcomingInsurance ? 'var(--warning)' : 'var(--text-primary)' }}>
                                {activeInsurance ? getDaysUntilText(activeInsurance.end_date) : 'Poliçe Yok'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>
                                {activeInsurance ? activeInsurance.company : 'Kayıt bulunamadı'}
                            </div>
                        </div>
                    </div>

                    {/* Assignment Status */}
                    <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: currentAssignment ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                            color: currentAssignment ? 'var(--accent-primary)' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <UserCheck size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Zimmet Bilgisi</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, textTransform: 'uppercase' }}>
                                {currentAssignment ? currentAssignment.assigned_to : 'Boşta'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>
                                {currentAssignment ? currentAssignment.department : 'Kullanıma hazır'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Vehicle Info Card */}
            <div className="card" style={{ marginBottom: '28px', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Settings size={18} style={{ color: 'var(--accent-primary)' }} />
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Araç Detayları</h3>
                </div>
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>
                        {/* Left Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Araç Türü</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, textTransform: 'uppercase' }}>
                                        {getVehicleTypeLabel(vehicle.type)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Yıl</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                                        {vehicle.year || '-'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Marka</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'uppercase' }}>{vehicle.brand || '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Model</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500, textTransform: 'uppercase' }}>{vehicle.model || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Renk</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, textTransform: 'uppercase' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)' }}></div>
                                    {vehicle.color || '-'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notlar</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', textTransform: 'uppercase' }}>
                                    {vehicle.notes || 'Not eklenmemiş.'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs - Modern Segmented Control Style */}
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
                        <span style={{
                            background: activeTab === tab.id ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                            color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600
                        }}>
                            {tab.count}
                        </span>
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
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tabs.find(t => t.id === activeTab)?.label} Kayıtları
                    </h3>
                    <button className="btn btn-primary" onClick={() => activeTab === 'documents' ? handleOpenUpload('vehicle') : openAddModal(activeTab)}>
                        <Plus size={18} />
                        Ekle
                    </button>
                </div>

                {activeTab === 'maintenance' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'type', label: 'Tür', render: v => getMaintenanceTypeLabel(v) },
                                { key: 'description', label: 'Açıklama' },
                                { key: 'date', label: 'Tarih', render: v => formatDate(v) },
                                { key: 'cost', label: 'Maliyet', render: v => formatCurrency(v) },
                                { key: 'next_date', label: 'Sonraki', render: v => v ? getDaysUntilText(v) : '-' },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('maintenance', row)
                                }
                            ]}
                            data={maintenances}
                            emptyMessage="Bakım kaydı yok"
                            onBulkDelete={(ids) => handleDeleteClick('maintenance', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('maintenance', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('maintenance', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'service' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'type', label: 'İşlem' },
                                { key: 'service_name', label: 'Servis Yeri' },
                                { key: 'description', label: 'Açıklama' },
                                { key: 'date', label: 'Tarih', render: v => formatDate(v) },
                                { key: 'cost', label: 'Maliyet', render: v => formatCurrency(v) },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('service', row)
                                }
                            ]}
                            data={services}
                            emptyMessage="Servis kaydı yok"
                            onBulkDelete={(ids) => handleDeleteClick('service', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('service', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('service', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'inspection' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'inspection_date', label: 'Tarih', render: v => formatDate(v) },
                                { key: 'result', label: 'Sonuç', render: v => <span className={`badge badge-${v === 'passed' ? 'success' : v === 'failed' ? 'danger' : 'warning'}`}>{resultOptions.find(r => r.value === v)?.label || v}</span> },
                                { key: 'cost', label: 'Ücret', render: v => formatCurrency(v) },
                                { key: 'next_inspection', label: 'Sonraki', render: v => v ? getDaysUntilText(v) : '-' },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('inspection', row)
                                }
                            ]}
                            data={trafficInspections}
                            emptyMessage="Muayene kaydı yok"
                            onBulkDelete={(ids) => handleDeleteClick('inspection', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('inspection', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('inspection', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'periodic_inspection' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'inspection_date', label: 'Tarih', render: v => formatDate(v) },
                                { key: 'result', label: 'Sonuç', render: v => <span className={`badge badge-${v === 'passed' ? 'success' : v === 'failed' ? 'danger' : 'warning'}`}>{resultOptions.find(r => r.value === v)?.label || v}</span> },
                                { key: 'cost', label: 'Ücret', render: v => formatCurrency(v) },
                                { key: 'next_inspection', label: 'Sonraki', render: v => v ? getDaysUntilText(v) : '-' },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('periodic_inspection', row)
                                }
                            ]}
                            data={periodicInspections}
                            emptyMessage="Periyodik kontrol kaydı yok"
                            onBulkDelete={(ids) => handleDeleteClick('periodic_inspection', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('periodic_inspection', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('periodic_inspection', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'insurance' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'company', label: 'Şirket' },
                                { key: 'type', label: 'Tür', render: v => getInsuranceTypeLabel(v) },
                                { key: 'start_date', label: 'Başlangıç', render: v => formatDate(v) },
                                { key: 'end_date', label: 'Bitiş', render: v => getDaysUntilText(v) },
                                { key: 'premium', label: 'Prim', render: v => formatCurrency(v) },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('insurance', row)
                                }
                            ]}
                            data={insurances}
                            emptyMessage="Sigorta kaydı yok"
                            onBulkDelete={(ids) => handleDeleteClick('insurance', null, ids)}
                            actions={(item) => (
                                <>
                                    <button onClick={() => openEditModal('insurance', item)}><Pencil size={16} /></button>
                                    <button className="danger" onClick={() => handleDeleteClick('insurance', item)}><Trash2 size={16} /></button>
                                </>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'assignment' && (
                    <div className="tab-pane">
                        <DataTable
                            columns={[
                                { key: 'item_name', label: 'Malzeme' },
                                { key: 'quantity', label: 'Adet' },
                                { key: 'assigned_to', label: 'Sorumlu' },
                                { key: 'start_date', label: 'Başlangıç', render: v => formatDate(v) },
                                { key: 'end_date', label: 'Bitiş', render: v => v ? formatDate(v) : <span className="badge badge-success">Aktif</span> },
                                {
                                    key: 'has_file', label: 'Belge', width: '100px', align: 'center', render: (_, row) => renderDocumentCell('assignment', row)
                                }
                            ]}
                            data={assignments}
                            emptyMessage="Demirbaş kaydı yok"
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
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                            {/* Override parent button if needed or just use the one in header */}
                        </div>
                        <DataTable
                            columns={[
                                { key: 'file_name', label: 'Dosya Adı' },
                                {
                                    key: 'related_info', label: 'İlgili Kayıt', width: '200px', render: (_, row) => {
                                        if (row.related_type === 'vehicle') return <span className="badge badge-primary">Araç Geneli</span>;

                                        let info = null;
                                        if (row.related_type === 'maintenance') {
                                            const item = maintenances.find(m => m.id === row.related_id);
                                            if (item) info = `Bakım: ${getMaintenanceTypeLabel(item.type)} (${formatDate(item.date)})`;
                                        } else if (row.related_type === 'service') {
                                            const item = services.find(s => s.id === row.related_id);
                                            if (item) info = `Servis: ${item.service_name} (${formatDate(item.date)})`;
                                        } else if (row.related_type === 'inspection') {
                                            const item = trafficInspections.find(i => i.id === row.related_id);
                                            if (item) info = `Muayene: ${formatDate(item.inspection_date)}`;
                                        } else if (row.related_type === 'periodic_inspection') {
                                            const item = periodicInspections.find(i => i.id === row.related_id);
                                            if (item) info = `Periyodik: ${formatDate(item.inspection_date)}`;
                                        } else if (row.related_type === 'insurance') {
                                            const item = insurances.find(i => i.id === row.related_id);
                                            if (item) info = `Sigorta: ${insuranceTypes.find(t => t.value === item.type)?.label || item.type} (${item.company})`;
                                        } else if (row.related_type === 'assignment') {
                                            const item = assignments.find(a => a.id === row.related_id);
                                            if (item) info = `Zimmet: ${item.item_name} (${item.assigned_to || '-'})`;
                                        }

                                        return info ? (
                                            <span style={{ fontSize: '12px' }}>{info}</span>
                                        ) : (
                                            <span className="text-muted">{row.related_type}</span>
                                        );
                                    }
                                },
                                { key: 'created_at', label: 'Yükleme Tarihi', render: v => formatDate(v) },
                                { key: 'file_type', label: 'Tür' }
                            ]}
                            data={documents}
                            emptyMessage="Belge bulunamadı"
                            onBulkDelete={(ids) => handleDeleteClick('documents', null, ids)}
                            actions={(item) => (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={(e) => { e.stopPropagation(); handleDocumentOpen(item.file_path) }} title="Aç"><FileText size={16} /></button>
                                    <button className="danger" onClick={(e) => { e.stopPropagation(); handleDeleteClick('documents', item) }}><Trash2 size={16} /></button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </div>

            {/* Dynamic Modal */}
            <Modal
                isOpen={!!modalType}
                onClose={closeModal}
                title={modalType === 'vehicle' ? 'Araç Düzenle' : `${editingItem ? 'Düzenle' : 'Yeni'} ${tabs.find(t => t.id === modalType)?.label || ''}`}
                size={modalType === 'vehicle' ? 'xl' : 'lg'}
                footer={null}
            >
                {modalType === 'vehicle' ? (
                    <VehicleForm
                        initialData={editingItem}
                        onSubmit={handleVehicleSave}
                        onCancel={closeModal}
                        loading={saving}
                    />
                ) : (
                    <>
                        {modalType === 'maintenance' && (
                            <MaintenanceForm
                                initialData={editingItem}
                                onSubmit={handleOperationSubmit}
                                onCancel={closeModal}
                                vehicles={vehicle ? [vehicle] : []}
                                loading={saving}
                            />
                        )}

                        {modalType === 'service' && (
                            <ServiceForm
                                initialData={editingItem}
                                onSubmit={handleOperationSubmit}
                                onCancel={closeModal}
                                vehicles={vehicle ? [vehicle] : []}
                                loading={saving}
                            />
                        )}

                        {(modalType === 'inspection' || modalType === 'periodic_inspection') && (
                            <InspectionForm
                                initialData={editingItem}
                                onSubmit={handleOperationSubmit}
                                onCancel={closeModal}
                                vehicles={vehicle ? [vehicle] : []}
                                type={modalType === 'inspection' ? 'traffic' : 'periodic'}
                                loading={saving}
                            />
                        )}

                        {modalType === 'insurance' && (
                            <InsuranceForm
                                initialData={editingItem}
                                onSubmit={handleOperationSubmit}
                                onCancel={closeModal}
                                vehicles={vehicle ? [vehicle] : []}
                                loading={saving}
                            />
                        )}

                        {modalType === 'assignment' && (
                            <AssignmentForm
                                initialData={editingItem}
                                onSubmit={handleOperationSubmit}
                                onCancel={closeModal}
                                vehicles={vehicle ? [vehicle] : []}
                                loading={saving}
                            />
                        )}
                    </>
                )}
            </Modal>

            <ConfirmModal
                isOpen={!!confirmModal}
                onClose={() => setConfirmModal(null)}
                onConfirm={handleConfirmDelete}
                title={confirmModal?.title}
                message={confirmModal?.message}
                confirmText={confirmModal?.confirmText}
                confirmButtonClass={confirmModal?.confirmButtonClass}
            />

            {/* Preview Modal */}
            {
                previewDoc && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={() => setPreviewDoc(null)}>
                        <div className="modal-content" style={{
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden',
                            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{
                                padding: '16px 24px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        backgroundColor: 'var(--accent-subtle)',
                                        color: 'var(--accent-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <FileText size={20} />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            Belge Önizleme
                                        </h3>
                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {previewDoc.name}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setPreviewDoc(null)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Body - Image Container */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#1a1a1a', // Dark background for contrast
                                backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                                backgroundSize: '20px 20px',
                                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                                padding: '32px',
                                minHeight: '300px'
                            }}>
                                <img
                                    src={previewDoc.data}
                                    alt={previewDoc.name}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '65vh',
                                        objectFit: 'contain',
                                        borderRadius: '4px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px'
                            }}>
                                <div>
                                    {previewDoc.doc && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPreviewDoc(null)
                                                handleDeleteClick('documents', previewDoc.doc)
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                background: 'transparent', border: '1px solid var(--error)',
                                                borderRadius: '8px', padding: '0 12px', height: '36px',
                                                color: 'var(--error)', fontSize: '13px', fontWeight: 500,
                                                cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--error-bg)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                                        >
                                            <Trash2 size={16} /> Sil
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                                        Kapat
                                    </button>
                                    <button className="btn btn-primary" onClick={async () => {
                                        const error = await window.electronAPI.openDocument(previewDoc.path)
                                        if (error) alert('Dosya açılamadı: ' + error)
                                    }}>
                                        <ExternalLink size={16} />
                                        Dışarıda Aç
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Upload Modal */}
            {
                uploadModalOpen && (
                    <div className="modal-overlay" style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }} onClick={() => setUploadModalOpen(false)}>
                        <div className="modal-content" style={{
                            width: '100%',
                            maxWidth: '500px',
                            display: 'flex',
                            flexDirection: 'column',
                            backgroundColor: 'var(--bg-elevated)',
                            borderRadius: '16px',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                            overflow: 'hidden',
                            animation: 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }} onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div style={{
                                padding: '16px 24px',
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg-secondary)'
                            }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                    Belge Yükle
                                </h3>
                                <button
                                    onClick={() => setUploadModalOpen(false)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '24px' }}>
                                {!selectedUploadFile ? (
                                    <div
                                        onClick={handleSelectUploadFile}
                                        style={{
                                            border: '2px dashed var(--border-color)',
                                            borderRadius: '12px',
                                            padding: '40px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '16px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            backgroundColor: 'var(--bg-secondary)'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.borderColor = 'var(--accent-primary)'
                                            e.currentTarget.style.backgroundColor = 'var(--accent-subtle)'
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.borderColor = 'var(--border-color)'
                                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                                        }}
                                    >
                                        <div style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--bg-elevated)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'var(--accent-primary)',
                                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
                                        }}>
                                            <Upload size={32} />
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                                Dosya Seçmek İçin Tıklayın
                                            </div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                                veya buraya sürükleyin
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        backgroundColor: 'var(--bg-secondary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '16px'
                                    }}>
                                        <div style={{
                                            width: '48px',
                                            height: '48px',
                                            borderRadius: '8px',
                                            backgroundColor: 'var(--accent-subtle)',
                                            color: 'var(--accent-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <FileText size={24} />
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {selectedUploadFile.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '2px' }}>
                                                Yüklemeye hazır
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedUploadFile(null)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--error)',
                                                cursor: 'pointer',
                                                padding: '8px'
                                            }}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                )}

                                {/* Help Text */}
                                <div style={{ marginTop: '20px', display: 'flex', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <div style={{ minWidth: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'currentColor', marginTop: '6px' }} />
                                    Desteklenen formatlar: Resimler (PNG, JPG), PDF ve diğer belgeler.
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: '16px 24px',
                                borderTop: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                                gap: '12px'
                            }}>
                                <button className="btn btn-secondary" onClick={() => setUploadModalOpen(false)}>
                                    İptal
                                </button>
                                <button
                                    className="btn btn-primary"
                                    disabled={!selectedUploadFile}
                                    onClick={handleUploadConfirm}
                                    style={{ opacity: !selectedUploadFile ? 0.5 : 1 }}
                                >
                                    <Upload size={16} />
                                    Yükle
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    )
}
