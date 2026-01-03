import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import Modal from '../components/Modal'
import DataTable from '../components/DataTable'
import CustomSelect from '../components/CustomSelect'
import CustomInput from '../components/CustomInput'
import {
    vehicleTypes,
    vehicleStatuses,
    getVehicleTypeLabel,
    getVehicleStatusInfo
} from '../utils/helpers'
import { Plus, Pencil, Trash2, Car, Building2 } from 'lucide-react'
import VehicleForm from '../components/VehicleForm'

export default function Vehicles() {
    const navigate = useNavigate()
    const { currentCompany } = useCompany()
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (currentCompany) {
            loadVehicles()
        } else {
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadVehicles = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getVehicles(currentCompany.id)
            if (result.success) {
                setVehicles(result.data)
            }
        } catch (error) {
            console.error('Failed to load vehicles:', error)
        }
        setLoading(false)
    }

    const resetForm = () => {
        setEditingVehicle(null)
        setError('')
    }

    const openCreateModal = () => {
        resetForm()
        setIsModalOpen(true)
    }

    const openEditModal = (vehicle) => {
        setEditingVehicle(vehicle)
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        resetForm()
    }

    const handleSubmit = async (formData) => {
        setSaving(true)
        setError('')

        // No need to validate here as VehicleForm handles it
        // and only calls onSubmit if valid.

        setSaving(true)

        let result
        if (editingVehicle) {
            result = await window.electronAPI.updateVehicle({
                id: editingVehicle.id,
                ...formData,
                year: formData.year ? parseInt(formData.year) : null
            })
        } else {
            result = await window.electronAPI.createVehicle({
                companyId: currentCompany.id,
                ...formData,
                year: formData.year ? parseInt(formData.year) : null
            })
        }

        setSaving(false)

        if (result.success) {
            closeModal()
            loadVehicles()
        } else {
            setError(result.error)
        }
    }

    const handleDelete = async (vehicle) => {
        if (confirm(`"${vehicle.plate}" plakalı aracı silmek istediğinize emin misiniz?`)) {
            const result = await window.electronAPI.deleteVehicle(vehicle.id)
            if (result.success) {
                loadVehicles()
            }
        }
    }

    const handleBulkDelete = async (ids) => {
        if (confirm(`${ids.length} aracı silmek istediğinize emin misiniz?`)) {
            for (const id of ids) {
                await window.electronAPI.deleteVehicle(id)
            }
            loadVehicles()
        }
    }

    // PC Context Menu Listener
    useEffect(() => {
        const handleContextAction = (action) => {
            // action format: "edit:123" or "delete:123"
            if (!action) return
            const [type, id] = action.split(':')
            const vehicle = vehicles.find(v => v.id == id)
            if (!vehicle) return

            if (type === 'edit') {
                openEditModal(vehicle)
            } else if (type === 'delete') {
                handleDelete(vehicle)
            }
        }

        if (window.electronAPI && window.electronAPI.onContextAction) {
            window.electronAPI.onContextAction(handleContextAction)
        }

        return () => {
            if (window.electronAPI && window.electronAPI.removePCListeners) {
                window.electronAPI.removePCListeners() // Warning: this removes ALL pc listeners including dashboard ones if shared. 
                // Better implementation would be granular, but for now it's okay if pages are unmounted.
                // Actually invoke removePCListeners only removes listeners from ipcRenderer, which is fine as component unmounts.
            }
        }
    }, [vehicles])

    const handleContextMenu = (e, vehicle) => {
        // Define menu items
        const menuItems = [
            { label: `${vehicle.plate} - ${vehicle.brand} ${vehicle.model}`, enabled: false },
            { type: 'separator' },
            { id: `edit:${vehicle.id}`, label: 'Düzenle' },
            { id: `delete:${vehicle.id}`, label: 'Sil' },
            { type: 'separator' },
            { id: `detail:${vehicle.id}`, label: 'Detayları Gör', click: () => navigate(`/vehicles/${vehicle.id}`) }
        ]

        // This 'click' property won't work over IPC for `detail`.
        // We need to handle `detail` in handleContextAction on main or renderer.
        // Actually IPC menu click sends back 'context-action' event with ID.
        // So we should handle 'detail:...' in handleContextAction above.

        if (window.electronAPI && window.electronAPI.showContextMenu) {
            window.electronAPI.showContextMenu(menuItems)
        }
    }

    const columns = [
        { key: 'plate', label: 'Plaka' },
        {
            key: 'type',
            label: 'Tür',
            render: (value) => getVehicleTypeLabel(value)
        },
        { key: 'brand', label: 'Marka' },
        { key: 'model', label: 'Model' },
        { key: 'year', label: 'Yıl' },
        {
            key: 'status',
            label: 'Durum',
            render: (value) => {
                const status = getVehicleStatusInfo(value)
                return <span className={`badge badge-${status.color}`}>{status.label}</span>
            }
        }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">
                    <Building2 />
                </div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">
                    Araçları görüntülemek için lütfen bir şirket seçin.
                </p>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="loading-screen" style={{ height: 'auto', padding: '60px' }}>
                <div className="loading-spinner"></div>
                <p>Yükleniyor...</p>
            </div>
        )
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Araçlar</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Araç filosu yönetimi ve detayları.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Yeni Araç
                    </button>
                </div>
            </div>

            {vehicles.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <Car />
                    </div>
                    <h2 className="empty-state-title">Henüz Araç Yok</h2>
                    <p className="empty-state-desc">
                        Bu şirkete ait araç bulunmuyor. İlk aracınızı ekleyin.
                    </p>
                    <button className="btn btn-primary" onClick={openCreateModal}>
                        <Plus size={18} />
                        Araç Ekle
                    </button>
                </div>
            ) : (
                <DataTable
                    columns={columns}
                    data={vehicles}
                    showSearch={true}
                    showCheckboxes={true}
                    filters={[
                        {
                            key: 'type',
                            label: 'Tür',
                            options: vehicleTypes
                        },
                        {
                            key: 'status',
                            label: 'Durum',
                            options: vehicleStatuses
                        }
                    ]}
                    onRowClick={(vehicle) => navigate(`/vehicles/${vehicle.id}`)}
                    onBulkDelete={handleBulkDelete}
                    onContextMenu={handleContextMenu}
                    actions={(vehicle) => (
                        <>
                            <button title="Düzenle" onClick={() => openEditModal(vehicle)}>
                                <Pencil size={16} />
                            </button>
                            <button title="Sil" className="danger" onClick={() => handleDelete(vehicle)}>
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                />
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingVehicle ? 'Araç Düzenle' : 'Yeni Araç'}
                size="lg"
                footer={null}
            >
                {error && (
                    <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '12px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', borderRadius: '6px', fontSize: '14px' }}>
                        {error}
                    </div>
                )}
                <VehicleForm
                    initialData={editingVehicle}
                    onSubmit={handleSubmit}
                    onCancel={closeModal}
                    loading={saving}
                />


            </Modal>
        </div>
    )
}
