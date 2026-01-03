import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'

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
    Building2
} from 'lucide-react'
import VehicleForm from '../components/VehicleForm'

export default function VehicleDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentCompany } = useCompany()

    const [vehicle, setVehicle] = useState(null)
    const [activeTab, setActiveTab] = useState('maintenance')
    const [loading, setLoading] = useState(true)

    // Data states
    const [maintenances, setMaintenances] = useState([])
    const [inspections, setInspections] = useState([])
    const [insurances, setInsurances] = useState([])
    const [assignments, setAssignments] = useState([])

    // Modal states
    const [modalType, setModalType] = useState(null)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({})
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (id) {
            loadVehicleData()
        }
    }, [id])

    const loadVehicleData = async () => {
        setLoading(true)
        try {
            const [vehicleRes, maintRes, inspRes, insRes, assignRes] = await Promise.all([
                window.electronAPI.getVehicleById(parseInt(id)),
                window.electronAPI.getMaintenancesByVehicle(parseInt(id)),
                window.electronAPI.getInspectionsByVehicle(parseInt(id)),
                window.electronAPI.getInsurancesByVehicle(parseInt(id)),
                window.electronAPI.getAssignmentsByVehicle(parseInt(id))
            ])

            if (vehicleRes.success) setVehicle(vehicleRes.data)
            if (maintRes.success) setMaintenances(maintRes.data)
            if (inspRes.success) setInspections(inspRes.data)
            if (insRes.success) setInsurances(insRes.data)
            if (assignRes.success) setAssignments(assignRes.data)
        } catch (error) {
            console.error('Failed to load vehicle data:', error)
        }
        setLoading(false)
    }

    const openAddModal = (type) => {
        setModalType(type)
        setEditingItem(null)
        setError('')

        const today = new Date().toISOString().split('T')[0]
        const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        if (type === 'maintenance') {
            setFormData({ type: 'general', description: '', date: today, cost: '', nextKm: '', nextDate: '', notes: '' })
        } else if (type === 'inspection') {
            setFormData({ inspectionDate: today, nextInspection: nextYear, result: 'passed', cost: '', notes: '' })
        } else if (type === 'insurance') {
            setFormData({ company: '', policyNo: '', type: 'traffic', startDate: today, endDate: nextYear, premium: '', notes: '' })
        } else if (type === 'assignment') {
            setFormData({ assignedTo: '', department: '', startDate: today, endDate: '', notes: '' })
        }
    }

    const openEditModal = (type, item) => {
        setModalType(type)
        setEditingItem(item)
        setError('')

        if (type === 'maintenance') {
            setFormData({
                type: item.type,
                description: item.description || '',
                date: item.date,
                cost: item.cost?.toString() || '',
                nextKm: item.next_km?.toString() || '',
                nextDate: item.next_date || '',
                notes: item.notes || ''
            })
        } else if (type === 'inspection') {
            setFormData({
                inspectionDate: item.inspection_date,
                nextInspection: item.next_inspection || '',
                result: item.result || 'passed',
                cost: item.cost?.toString() || '',
                notes: item.notes || ''
            })
        } else if (type === 'insurance') {
            setFormData({
                company: item.company,
                policyNo: item.policy_no || '',
                type: item.type,
                startDate: item.start_date,
                endDate: item.end_date,
                premium: item.premium?.toString() || '',
                notes: item.notes || ''
            })
        } else if (type === 'assignment') {
            setFormData({
                itemName: item?.item_name || '',
                quantity: item?.quantity?.toString() || '1',
                assignedTo: item?.assigned_to || '',
                department: item?.department || '',
                startDate: item?.start_date ? item.start_date : new Date().toISOString().split('T')[0],
                endDate: item?.end_date || '',
                notes: item?.notes || ''
            })
        } else if (type === 'vehicle') {
            setFormData({
                plate: item.plate,
                brand: item.brand,
                model: item.model,
                year: item.year?.toString() || '',
                color: item.color || '',
                type: item.type,
                status: item.status,
                notes: item.notes || ''
            })
        }
    }

    const closeModal = () => {
        setModalType(null)
        setEditingItem(null)
        setFormData({})
        setError('')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        setError('')

        let result
        const vehicleId = parseInt(id)

        try {
            if (modalType === 'maintenance') {
                const data = {
                    vehicleId,
                    type: formData.type,
                    description: formData.description,
                    date: formData.date,
                    cost: formData.cost ? parseFloat(formData.cost) : 0,
                    nextKm: formData.nextKm ? parseInt(formData.nextKm) : null,
                    nextDate: formData.nextDate || null,
                    notes: formData.notes
                }
                result = editingItem
                    ? await window.electronAPI.updateMaintenance({ id: editingItem.id, ...data })
                    : await window.electronAPI.createMaintenance(data)
            } else if (modalType === 'inspection') {
                const data = {
                    vehicleId,
                    inspectionDate: formData.inspectionDate,
                    nextInspection: formData.nextInspection || null,
                    result: formData.result,
                    cost: formData.cost ? parseFloat(formData.cost) : 0,
                    notes: formData.notes
                }
                result = editingItem
                    ? await window.electronAPI.updateInspection({ id: editingItem.id, ...data })
                    : await window.electronAPI.createInspection(data)
            } else if (modalType === 'insurance') {
                const data = {
                    vehicleId,
                    company: formData.company,
                    policyNo: formData.policyNo,
                    type: formData.type,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    premium: formData.premium ? parseFloat(formData.premium) : 0,
                    notes: formData.notes
                }
                result = editingItem
                    ? await window.electronAPI.updateInsurance({ id: editingItem.id, ...data })
                    : await window.electronAPI.createInsurance(data)
            } else if (modalType === 'assignment') {
                const data = {
                    vehicleId,
                    itemName: formData.itemName,
                    quantity: parseInt(formData.quantity) || 1,
                    assignedTo: formData.assignedTo,
                    department: formData.department,
                    startDate: formData.startDate,
                    endDate: formData.endDate || null,
                    notes: formData.notes
                }
                result = editingItem
                    ? await window.electronAPI.updateAssignment({ id: editingItem.id, ...data })
                    : await window.electronAPI.createAssignment(data)
            } else if (modalType === 'vehicle') {
                const data = {
                    plate: formData.plate,
                    brand: formData.brand,
                    model: formData.model,
                    year: formData.year ? parseInt(formData.year) : null,
                    color: formData.color,
                    type: formData.type,
                    status: formData.status,
                    notes: formData.notes
                }
                // Vehicle updates usually don't need create logic here as we are in detail view, 
                // but if we were strictly reusing this for create (which we aren't here), we'd need it.
                // We are only editing the current vehicle.
                result = await window.electronAPI.updateVehicle({ id: vehicleId, ...data })
            }

            if (result?.success) {
                closeModal()
                loadVehicleData()
            } else {
                setError(result?.error || 'İşlem başarısız')
            }
        } catch (err) {
            setError('Bağlantı hatası')
        }

        setSaving(false)
    }

    const handleDelete = async (type, item) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return

        let result
        if (type === 'maintenance') result = await window.electronAPI.deleteMaintenance(item.id)
        else if (type === 'inspection') result = await window.electronAPI.deleteInspection(item.id)
        else if (type === 'insurance') result = await window.electronAPI.deleteInsurance(item.id)
        else if (type === 'assignment') result = await window.electronAPI.deleteAssignment(item.id)

        if (result?.success) loadVehicleData()
    }

    if (loading) {
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

    // Calculate quick stats
    const nextInspection = vehicle.next_inspection ? new Date(vehicle.next_inspection) : null
    const inspectionDays = nextInspection ? Math.ceil((nextInspection - new Date()) / (1000 * 60 * 60 * 24)) : null
    const upcomingInspection = inspectionDays !== null && inspectionDays <= 30

    const activeInsurance = insurances.find(i => new Date(i.end_date) > new Date())
    const insuranceDays = activeInsurance ? Math.ceil((new Date(activeInsurance.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : null
    const upcomingInsurance = insuranceDays !== null && insuranceDays <= 30

    const currentAssignment = assignments.find(a => !a.end_date)

    const tabs = [
        { id: 'maintenance', label: 'Bakım', icon: Wrench, count: maintenances.length },
        { id: 'inspection', label: 'Muayene', icon: ClipboardCheck, count: inspections.length },
        { id: 'insurance', label: 'Sigorta', icon: Shield, count: insurances.length },
        { id: 'assignment', label: 'Zimmet', icon: UserCheck, count: assignments.length }
    ]

    const resultOptions = [
        { value: 'passed', label: 'Geçti' },
        { value: 'failed', label: 'Kaldı' },
        { value: 'conditional', label: 'Şartlı Geçti' }
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
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: 'var(--bg-elevated)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-color)',
                            color: 'var(--accent-primary)'
                        }}>
                            <Car size={24} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>{vehicle.plate}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                                <span className={`badge badge-${statusInfo.color}`}>{statusInfo.label}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
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

                {/* Quick Status Cards */}
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
                                {nextInspection ? getDaysUntilText(vehicle.next_inspection) : 'Bilgi Yok'}
                            </div>
                            {nextInspection && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                    {formatDate(vehicle.next_inspection)}
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
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                            <div style={{ fontSize: '18px', fontWeight: 600 }}>
                                {currentAssignment ? currentAssignment.assigned_to : 'Boşta'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                                        <Car size={16} style={{ color: 'var(--text-muted)' }} />
                                        {getVehicleTypeLabel(vehicle.type)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Yıl</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                                        <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                                        {vehicle.year || '-'}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Marka</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{vehicle.brand || '-'}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Model</div>
                                    <div style={{ fontSize: '14px', fontWeight: 500 }}>{vehicle.model || '-'}</div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Renk</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'white', border: '1px solid var(--border-color)' }}></div>
                                    {vehicle.color || '-'}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Notlar</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
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
                gap: '24px'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 4px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                            color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: activeTab === tab.id ? 600 : 500,
                            cursor: 'pointer',
                            fontSize: '14px',
                            transition: 'all 0.2s ease',
                            marginBottom: '-1px'
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
            </div>

            {/* Tab Content */}
            {/* Tab Content */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tabs.find(t => t.id === activeTab)?.label} Kayıtları
                    </h3>
                    <button className="btn btn-primary" onClick={() => openAddModal(activeTab)}>
                        <Plus size={18} />
                        Ekle
                    </button>
                </div>

                {activeTab === 'maintenance' && (
                    <DataTable
                        columns={[
                            { key: 'type', label: 'Tür', render: v => getMaintenanceTypeLabel(v) },
                            { key: 'description', label: 'Açıklama' },
                            { key: 'date', label: 'Tarih', render: v => formatDate(v) },
                            { key: 'cost', label: 'Maliyet', render: v => formatCurrency(v) },
                            { key: 'next_date', label: 'Sonraki', render: v => v ? getDaysUntilText(v) : '-' }
                        ]}
                        data={maintenances}
                        emptyMessage="Bakım kaydı yok"
                        actions={(item) => (
                            <>
                                <button onClick={() => openEditModal('maintenance', item)}><Pencil size={16} /></button>
                                <button className="danger" onClick={() => handleDelete('maintenance', item)}><Trash2 size={16} /></button>
                            </>
                        )}
                    />
                )}

                {activeTab === 'inspection' && (
                    <DataTable
                        columns={[
                            { key: 'inspection_date', label: 'Tarih', render: v => formatDate(v) },
                            { key: 'result', label: 'Sonuç', render: v => <span className={`badge badge-${v === 'passed' ? 'success' : v === 'failed' ? 'danger' : 'warning'}`}>{resultOptions.find(r => r.value === v)?.label || v}</span> },
                            { key: 'cost', label: 'Ücret', render: v => formatCurrency(v) },
                            { key: 'next_inspection', label: 'Sonraki', render: v => v ? getDaysUntilText(v) : '-' }
                        ]}
                        data={inspections}
                        emptyMessage="Muayene kaydı yok"
                        actions={(item) => (
                            <>
                                <button onClick={() => openEditModal('inspection', item)}><Pencil size={16} /></button>
                                <button className="danger" onClick={() => handleDelete('inspection', item)}><Trash2 size={16} /></button>
                            </>
                        )}
                    />
                )}

                {activeTab === 'insurance' && (
                    <DataTable
                        columns={[
                            { key: 'company', label: 'Şirket' },
                            { key: 'type', label: 'Tür', render: v => getInsuranceTypeLabel(v) },
                            { key: 'start_date', label: 'Başlangıç', render: v => formatDate(v) },
                            { key: 'end_date', label: 'Bitiş', render: v => getDaysUntilText(v) },
                            { key: 'premium', label: 'Prim', render: v => formatCurrency(v) }
                        ]}
                        data={insurances}
                        emptyMessage="Sigorta kaydı yok"
                        actions={(item) => (
                            <>
                                <button onClick={() => openEditModal('insurance', item)}><Pencil size={16} /></button>
                                <button className="danger" onClick={() => handleDelete('insurance', item)}><Trash2 size={16} /></button>
                            </>
                        )}
                    />
                )}

                {activeTab === 'assignment' && (
                    <DataTable
                        columns={[
                            { key: 'item_name', label: 'Malzeme' },
                            { key: 'quantity', label: 'Adet' },
                            { key: 'assigned_to', label: 'Sorumlu' },
                            { key: 'start_date', label: 'Başlangıç', render: v => formatDate(v) },
                            { key: 'end_date', label: 'Bitiş', render: v => v ? formatDate(v) : <span className="badge badge-success">Aktif</span> }
                        ]}
                        data={assignments}
                        emptyMessage="Demirbaş kaydı yok"
                        actions={(item) => (
                            <>
                                <button onClick={() => openEditModal('assignment', item)}><Pencil size={16} /></button>
                                <button className="danger" onClick={() => handleDelete('assignment', item)}><Trash2 size={16} /></button>
                            </>
                        )}
                    />
                )}
            </div>

            {/* Dynamic Modal */}
            <Modal
                isOpen={!!modalType}
                onClose={closeModal}
                title={modalType === 'vehicle' ? 'Araç Düzenle' : `${editingItem ? 'Düzenle' : 'Yeni'} ${tabs.find(t => t.id === modalType)?.label || ''}`}
                size="lg"
                footer={modalType !== 'vehicle' ? (
                    <>
                        <button className="btn btn-secondary" onClick={closeModal}>İptal</button>
                        <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </>
                ) : null}
            >
                {modalType === 'vehicle' ? (
                    <VehicleForm
                        initialData={editingItem}
                        onSubmit={handleSubmit}
                        onCancel={closeModal}
                        loading={saving}
                    />
                ) : (
                    <form onSubmit={handleSubmit}>


                        {modalType === 'maintenance' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Bakım Türü</label>
                                        <CustomSelect
                                            className="form-select-custom"
                                            value={formData.type}
                                            onChange={(value) => setFormData({ ...formData, type: value })}
                                            options={maintenanceTypes}
                                            placeholder="Seçiniz"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Tarih" type="date" required={true} value={formData.date} onChange={(value) => setFormData({ ...formData, date: value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <CustomInput label="Açıklama" value={formData.description} onChange={(value) => setFormData({ ...formData, description: value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Maliyet (₺)" type="number" value={formData.cost} onChange={(value) => setFormData({ ...formData, cost: value })} placeholder="0.00" />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Sonraki KM" type="number" value={formData.nextKm} onChange={(value) => setFormData({ ...formData, nextKm: value })} placeholder="0" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <CustomInput label="Sonraki Bakım Tarihi" type="date" value={formData.nextDate} onChange={(value) => setFormData({ ...formData, nextDate: value })} />
                                </div>
                            </>
                        )}

                        {modalType === 'inspection' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Muayene Tarihi" type="date" required={true} value={formData.inspectionDate} onChange={(value) => setFormData({ ...formData, inspectionDate: value })} />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Sonraki Muayene" type="date" value={formData.nextInspection} onChange={(value) => setFormData({ ...formData, nextInspection: value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Sonuç</label>
                                        <CustomSelect
                                            className="form-select-custom"
                                            value={formData.result}
                                            onChange={(value) => setFormData({ ...formData, result: value })}
                                            options={resultOptions}
                                            placeholder="Seçiniz"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Ücret (₺)" type="number" value={formData.cost} onChange={(value) => setFormData({ ...formData, cost: value })} placeholder="0.00" />
                                    </div>
                                </div>
                            </>
                        )}

                        {modalType === 'insurance' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Sigorta Şirketi" required={true} value={formData.company} onChange={(value) => setFormData({ ...formData, company: value })} format="title" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Sigorta Türü</label>
                                        <CustomSelect
                                            className="form-select-custom"
                                            value={formData.type}
                                            onChange={(value) => setFormData({ ...formData, type: value })}
                                            options={insuranceTypes}
                                            placeholder="Seçiniz"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <CustomInput label="Poliçe No" value={formData.policyNo} onChange={(value) => setFormData({ ...formData, policyNo: value })} format="uppercase" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Başlangıç Tarihi" type="date" required={true} value={formData.startDate} onChange={(value) => setFormData({ ...formData, startDate: value })} />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Bitiş Tarihi" type="date" required={true} value={formData.endDate} onChange={(value) => setFormData({ ...formData, endDate: value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <CustomInput label="Prim (₺)" type="number" value={formData.premium} onChange={(value) => setFormData({ ...formData, premium: value })} placeholder="0.00" />
                                </div>
                            </>
                        )}

                        {modalType === 'assignment' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group" style={{ flex: 2 }}>
                                        <CustomInput label="Malzeme/Demirbaş Adı *" required={true} value={formData.itemName} onChange={(value) => setFormData({ ...formData, itemName: value })} />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <CustomInput label="Adet" type="number" value={formData.quantity} onChange={(value) => setFormData({ ...formData, quantity: value })} />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Sorumlu Kişi (Opsiyonel)" value={formData.assignedTo} onChange={(value) => setFormData({ ...formData, assignedTo: value })} format="title" />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Departman" value={formData.department} onChange={(value) => setFormData({ ...formData, department: value })} format="title" />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <CustomInput label="Başlangıç Tarihi" type="date" required={true} value={formData.startDate} onChange={(value) => setFormData({ ...formData, startDate: value })} />
                                    </div>
                                    <div className="form-group">
                                        <CustomInput label="Bitiş Tarihi" type="date" value={formData.endDate} onChange={(value) => setFormData({ ...formData, endDate: value })} />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Notlar</label>
                            <textarea className="form-textarea" value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
                        </div>

                        {error && <div className="form-error" style={{ marginTop: '20px' }}>{error}</div>}
                    </form>
                )}
            </Modal>
        </div >
    )
}
