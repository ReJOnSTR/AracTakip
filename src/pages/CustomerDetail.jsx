import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Phone, Mail, Building2, MapPin, Briefcase, Info, Calendar, Pencil, Banknote, Eye, CheckCircle2, Search, Filter, Archive, ArchiveRestore, FileText, Plus, Trash2, Folder, AlertCircle, ChevronRight } from 'lucide-react'
import DataTable from '../components/DataTable'
import TopProgressBar from '../components/TopProgressBar'
import { formatDate, formatCurrency } from '../utils/helpers'

import Modal from '../components/Modal'
import CustomerForm from '../components/forms/CustomerForm'
import TransactionForm from '../components/forms/TransactionForm'
import WorkForm from '../components/forms/WorkForm'
import { usePersistentTab } from '../hooks/usePersistentTab'
import { useTabs } from '../context/TabContext'
import { useCompany } from '../context/CompanyContext'
import DocumentForm from '../components/forms/DocumentForm'
import DocumentPreviewModal from '../components/DocumentPreviewModal'
import CustomInput from '../components/CustomInput'
import CustomSelect from '../components/CustomSelect'
import ConfirmModal from '../components/ConfirmModal'

export default function CustomerDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { currentCompany } = useCompany()
    const { updateTabInfo } = useTabs()
    const [customer, setCustomer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = usePersistentTab('CustomerDetail', 'works')
    const [tabsRef] = useState({})
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 })
    
    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isWorkModalOpen, setIsWorkModalOpen] = useState(false)
    const [editingWork, setEditingWork] = useState(null)
    const [saving, setSaving] = useState(false)

    const [paymentModalOpen, setPaymentModalOpen] = useState(false)
    const [paymentWork, setPaymentWork] = useState(null)

    // Filter states
    const [showArchived, setShowArchived] = useState(false)

    // Document States
    const [documents, setDocuments] = useState([])
    const [previewDoc, setPreviewDoc] = useState(null)
    const [uploadModalOpen, setUploadModalOpen] = useState(false)
    const [documentCategories, setDocumentCategories] = useState([])
    const [documentFolders, setDocumentFolders] = useState([])
    const [currentFolder, setCurrentFolder] = useState(null)
    const [editDocModalOpen, setEditDocModalOpen] = useState(false)
    const [editingDoc, setEditingDoc] = useState(null)
    const [uploadFileName, setUploadFileName] = useState('')
    const [uploadStartDate, setUploadStartDate] = useState('')
    const [uploadEndDate, setUploadEndDate] = useState('')
    const [uploadCategory, setUploadCategory] = useState('')
    const [uploadFolder, setUploadFolder] = useState('')

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
    const [confirmModal, setConfirmModal] = useState(null)

    useEffect(() => {
        loadCustomer()
    }, [id])

    // Real-time synchronization listener
    const loadCustomerRef = useRef(null)
    const loadDocumentsRef = useRef(null)
    useEffect(() => {
        loadCustomerRef.current = loadCustomer
        loadDocumentsRef.current = loadDocuments
    })
    useEffect(() => {
        if (!id) return
        const unsub = window.electronAPI?.onDbUpdate?.((change) => {
            if (['customers', 'works', 'documents'].includes(change?.table)) {
                console.log(`[RealTime] CustomerDetail reloading for change in ${change.table}`)
                loadCustomerRef.current(true)
                if (currentCompany) {
                    loadDocumentsRef.current(currentCompany.id)
                }
            }
        })
        return () => { if (unsub) unsub() }
    }, [id, currentCompany])

    useEffect(() => {
        const activeElement = tabsRef[activeTab]
        if (activeElement) {
            setIndicatorStyle({ left: activeElement.offsetLeft, width: activeElement.offsetWidth })
        }
    }, [activeTab, tabsRef, customer])

    const loadDocuments = async (companyId = currentCompany?.id) => {
        if (!companyId || !customer) return
        try {
            const docsRes = await window.electronAPI.getAllDocuments(companyId, showArchived ? 1 : 0)
            if (docsRes.success) {
                const customerWorkIds = customer.works?.map(w => w.id) || []
                const filtered = docsRes.data.filter(d => 
                    (d.related_type === 'customer' && d.related_id === parseInt(id)) ||
                    (d.related_type === 'work' && customerWorkIds.includes(d.related_id))
                )
                setDocuments(filtered)
            }
        } catch (error) {
            console.error('Failed to load customer documents:', error)
        }
    }

    const handleArchiveFolder = async (folderId, isArchived) => {
        try {
            const res = await window.electronAPI.archiveItem('document_folders', folderId, isArchived ? 1 : 0)
            if (res.success) {
                loadFolders()
            }
        } catch (err) {
            console.error('Folder archive failed:', err)
        }
    }

    const handleBulkArchiveDocs = async (ids, isArchived) => {
        try {
            const promises = ids.map(id => {
                if (typeof id === 'string' && id.startsWith('folder_')) {
                    const folderId = parseInt(id.replace('folder_', ''))
                    return window.electronAPI.archiveItem('document_folders', folderId, isArchived ? 1 : 0)
                }
                return window.electronAPI.archiveItem('documents', id, isArchived ? 1 : 0)
            })
            await Promise.all(promises)
            loadDocuments(currentCompany?.id)
            loadFolders()
        } catch (err) {
            console.error('Bulk archive failed:', err)
        }
    }

    const loadCustomer = async (isBackground = false) => {
        if (!isBackground) setLoading(true)
        try {
            const result = await window.electronAPI.getCustomerDetails(id)
            if (result.success) {
                setCustomer(result.data)
                updateTabInfo(`/customers/${id}`, { label: result.data.name })
            }
        } catch (error) {
            console.error('Failed to load customer details:', error)
        }
        if (!isBackground) setLoading(false)
    }

    const loadCategories = async () => {
        if (!currentCompany) return
        try {
            const res = await window.electronAPI.getDocumentCategories(currentCompany.id, 'employee')
            if (res.success) {
                setDocumentCategories(res.data.map(t => ({ value: t.name, label: t.name, id: t.id })))
            }
        } catch (error) {
            console.error('Failed to load categories:', error)
        }
    }

    const loadFolders = async () => {
        if (!currentCompany) return
        try {
            const res = await window.electronAPI.getDocumentFolders(currentCompany.id)
            if (res.success) {
                setDocumentFolders(res.data.map(t => ({ value: t.name, label: t.name, id: t.id, is_archived: t.is_archived })))
            }
        } catch (error) {
            console.error('Failed to load folders:', error)
        }
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
                    name: name
                })
                if (res.success) {
                    loadFolders()
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
                        await window.electronAPI.updateDocument({
                            id: d.id,
                            fileName: d.file_name,
                            startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                            endDate: d.end_date ? new Date(d.end_date).toISOString().split('T')[0] : null,
                            folder: name
                        })
                    }
                    setCurrentFolder(name)
                    loadFolders()
                    loadDocuments(currentCompany.id)
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
        if (!folderObj) return
        
        setConfirmModal({
            title: 'Klasör Silme Onayı',
            message: `"${folderName}" klasörünü silmek istediğinize emin misiniz? Klasör içindeki dosyalar silinmeyecek, Klasörsüz olacaktır.`,
            confirmText: 'Sil',
            styleType: 'danger',
            onConfirm: async () => {
                setSaving(true)
                try {
                    const res = await window.electronAPI.deleteDocumentFolder(folderObj.id)
                    if (res.success) {
                        const docsToUpdate = documents.filter(d => d.folder === folderName)
                        for (const d of docsToUpdate) {
                            await window.electronAPI.updateDocument({
                                id: d.id,
                                fileName: d.file_name,
                                startDate: d.start_date ? new Date(d.start_date).toISOString().split('T')[0] : null,
                                endDate: d.end_date ? new Date(d.end_date).toISOString().split('T')[0] : null,
                                folder: null
                            })
                        }
                        setCurrentFolder(null)
                        loadFolders()
                        loadDocuments(currentCompany.id)
                    } else {
                        alert('Klasör silinirken hata oluştu: ' + res.error)
                    }
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
                const doc = documents.find(d => d.id === id)
                if (doc) {
                    await window.electronAPI.updateDocument({
                        id: doc.id,
                        fileName: doc.file_name,
                        startDate: doc.start_date ? new Date(doc.start_date).toISOString().split('T')[0] : null,
                        endDate: doc.end_date ? new Date(doc.end_date).toISOString().split('T')[0] : null,
                        folder: bulkMoveSelectedFolder || null
                    })
                }
            }
            if (bulkMoveClearSelection) bulkMoveClearSelection()
            setBulkMoveModalOpen(false)
            setBulkMoveSelectedFolder('')
            loadDocuments(currentCompany?.id)
        } catch (err) {
            console.error('Bulk move error:', err)
            alert('Belgeler taşınırken hata oluştu.')
        } finally {
            setSaving(false)
        }
    }

    useEffect(() => {
        if (customer && currentCompany) {
            loadDocuments(currentCompany.id)
            loadCategories()
            loadFolders()
        }
    }, [customer, currentCompany, showArchived])

    const handleDocumentOpen = async (doc) => {
        if (!doc) return
        const ext = doc.file_type?.toLowerCase() || doc.file_path.split('.').pop()?.toLowerCase()
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', 'jpg', 'jpeg', 'png', 'webp', 'gif']
        if (imageExtensions.includes(ext)) {
            try {
                const res = await window.electronAPI.readDocumentData(doc.file_path)
                if (res.success && res.data) {
                    setPreviewDoc({ data: res.data, name: doc.file_name, path: doc.file_path, doc })
                } else {
                    await window.electronAPI.openDocument(doc.file_path)
                }
            } catch (error) {
                console.error('Failed to preview image:', error)
                await window.electronAPI.openDocument(doc.file_path)
            }
        } else {
            const error = await window.electronAPI.openDocument(doc.file_path)
            if (error) alert('Dosya açılamadı: ' + error)
        }
    }

    const handleUploadConfirm = async (docs) => {
        if (!docs || docs.length === 0 || !customer) return

        setSaving(true)
        try {
            for (const doc of docs) {
                await window.electronAPI.addDocument({
                    relatedType: 'customer',
                    relatedId: customer.id,
                    filePath: doc.path,
                    fileName: doc.displayName,
                    category: doc.docType || null,
                    docType: doc.docType || null,
                    folder: doc.folder || null,
                    startDate: doc.startDate,
                    endDate: doc.endDate
                })
            }
            loadDocuments(currentCompany?.id)
        } catch (err) {
            console.error('Document upload error:', err)
            alert('Dosyalar yüklenirken hata oluştu: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleDocumentDelete = async (doc) => {
        if (!window.confirm(`"${doc.file_name}" isimli belgeyi silmek istediğinize emin misiniz?`)) return
        try {
            const result = await window.electronAPI.deleteDocument(doc.id)
            if (result.success) {
                loadDocuments(currentCompany.id)
                setPreviewDoc(null)
            } else {
                alert('Silme hatası: ' + result.error)
            }
        } catch (error) {
            console.error('Delete document failed:', error)
        }
    }

    const handleEditDoc = (doc) => {
        setEditingDoc(doc)
        setUploadFileName(doc.file_name || '')
        setUploadStartDate(doc.start_date ? new Date(doc.start_date).toISOString().split('T')[0] : '')
        setUploadEndDate(doc.end_date ? new Date(doc.end_date).toISOString().split('T')[0] : '')
        setUploadCategory(doc.category || '')
        setUploadFolder(doc.folder || '')
        setEditDocModalOpen(true)
    }

    const handleUpdateDocConfirm = async () => {
        if (!editingDoc) return
        setSaving(true)
        try {
            const res = await window.electronAPI.updateDocument({
                id: editingDoc.id,
                fileName: uploadFileName,
                startDate: uploadStartDate || null,
                endDate: uploadEndDate || null,
                category: uploadCategory || null,
                docType: uploadCategory || null,
                folder: uploadFolder || null
            })
            if (res.success) {
                setEditDocModalOpen(false)
                loadDocuments(currentCompany?.id)
            }
        } catch (err) {
            console.error('Update document failed:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleEditSubmit = async (data) => {
        setSaving(true)
        try {
            const result = await window.electronAPI.updateCustomer({
                id: customer.id,
                ...data
            })
            if (result.success) {
                setCustomer(result.data)
                setIsEditModalOpen(false)
            } else {
                alert(result.error || 'Güncelleme başarısız oldu')
            }
        } catch (error) {
            console.error('Error updating customer:', error)
            alert('Müşteri güncellenirken bir hata oluştu')
        }
        setSaving(false)
    }

    const handleWorkSubmit = async (data) => {
        setSaving(true)
        try {
            let result;
            if (editingWork) {
                result = await window.electronAPI.updateWork({
                    id: editingWork.id,
                    ...data
                })
            } else {
                result = await window.electronAPI.createWork({
                    ...data,
                    companyId: currentCompany.id
                })
            }
            if (result.success) {
                setIsWorkModalOpen(false)
                setEditingWork(null)
                loadCustomer() // Reload to see new work
            } else {
                alert('Hata: ' + result.error)
            }
        } catch (error) {
            console.error('Error creating/updating work:', error)
        }
        setSaving(false)
    }

    const handleBulkArchive = async (ids) => {
        try {
            const result = await window.electronAPI.archiveWorks(ids, !showArchived);
            if (result.success) {
                loadCustomer();
            } else {
                alert(result.error || 'Arşivleme işlemi başarısız oldu');
            }
        } catch (error) {
            console.error('Error archiving works:', error)
        }
    }

    const handleBulkDelete = async (ids) => {
        if (!window.confirm(`${ids.length} adet iş kalıcı olarak silinecektir. Emin misiniz?`)) return;
        try {
            const result = await window.electronAPI.deleteWorks(ids);
            if (result.success) {
                loadCustomer();
            } else {
                alert(result.error || 'Silme işlemi başarısız oldu');
            }
        } catch (error) {
            console.error('Error deleting works:', error)
        }
    }

    const workColumns = [
        {
            key: 'status',
            label: 'Durum',
            width: '120px',
            render: (v) => {
                const colors = {
                    pending: 'neutral',
                    in_progress: 'warning',
                    completed: 'info',
                    paid: 'success',
                    cancelled: 'danger'
                }
                const labels = {
                    pending: 'Bekliyor',
                    in_progress: 'Devam Ediyor',
                    completed: 'Tamamlandı',
                    paid: 'Ödendi / Tahsil Edildi',
                    cancelled: 'İptal'
                }
                return <span className={`badge badge-${colors[v] || 'neutral'}`}>{labels[v] || v}</span>
            }
        },
        {
            key: 'date_range',
            label: 'Tarih Aralığı',
            width: '120px',
            render: (_, row) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: '12px' }}>
                        {/* Vertical Timeline Indicator */}
                        <div style={{ position: 'absolute', left: 0, top: '6px', bottom: row.start_date !== row.end_date ? '6px' : 'auto', height: row.start_date === row.end_date ? '0px' : 'auto', width: '2px', background: 'var(--border-color)', borderRadius: '2px' }}>
                            <div style={{ position: 'absolute', left: '-2px', top: '-2px', width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid var(--accent-primary)', background: 'var(--bg-primary)' }} />
                            {row.start_date !== row.end_date && (
                               <div style={{ position: 'absolute', left: '-2px', bottom: '-2px', width: '6px', height: '6px', borderRadius: '50%', border: '1.5px solid var(--text-muted)', background: 'var(--bg-primary)' }} />
                            )}
                        </div>
                        
                        <span style={{ fontSize: '11.5px', color: 'var(--text-primary)', fontWeight: 600, lineHeight: '1.3' }}>
                            {formatDate(row.start_date)}
                        </span>
                        {row.start_date !== row.end_date && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3', marginTop: '2px' }}>
                                {formatDate(row.end_date)}
                            </span>
                        )}
                    </div>
                    {(row.total_days > 0) && (
                        <div style={{ marginLeft: 'auto', padding: '4px 6px', background: 'var(--accent-subtle)', color: 'var(--accent-primary)', borderRadius: '6px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                            {row.total_days} Gün
                        </div>
                    )}
                </div>
            )
        },
        {
            key: 'title',
            label: 'İş Detayı',
            render: (v, row) => (
                <div>
                    <div style={{ fontWeight: 500 }}>{v}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{row.location || row.description}</div>
                </div>
            )
        },
        {
            key: 'item_count',
            label: 'Kayıt',
            render: (v) => <span className="badge badge-neutral">{v || 0} Adet</span>
        },
        {
            key: 'total_hours',
            label: 'Toplam Süre',
            render: (_, row) => {
                const parts = [];
                if (row.total_days > 0) parts.push(`${row.total_days} Gün`);
                if (row.total_hours > 0) parts.push(`${row.total_hours} Saat`);
                return parts.length > 0 ? parts.join(' ') : '-';
            }
        },
        {
            key: 'total_price',
            label: 'Toplam Tutar',
            render: (v) => <span className="font-semibold text-success">{formatCurrency(v || 0)}</span>
        }
    ]

    const filteredWorks = useMemo(() => {
        if (!customer || !customer.works) return [];
        return customer.works.filter(w => {
            const isArchived = w.is_archived === 1;
            if (showArchived && !isArchived) return false;
            if (!showArchived && isArchived) return false;
            return true;
        });
    }, [customer, showArchived]);

    if (loading) return <div><TopProgressBar loading={loading} /></div>
    if (!customer) return <div className="empty-state"><h2 className="empty-state-title">Müşteri Bulunamadı</h2><Link className="btn btn-primary" to="/customers">Müşterilere Dön</Link></div>

    const tabs = [
        { id: 'works', label: 'İş ve Projeler', icon: Briefcase },
        { id: 'documents', label: 'Dosyalar ve Belgeler', icon: FileText }
    ]

    const completedWorks = customer.works?.filter(w => w.status === 'completed' && w.is_archived !== 1) || []
    const pendingWorks = customer.works?.filter(w => w.status !== 'completed' && w.status !== 'cancelled' && w.status !== 'paid' && w.is_archived !== 1) || []
    const totalEarnings = customer.total_volume || 0

    return (
        <div>
            <TopProgressBar loading={loading} />

            {/* Header / Breadcrumb / Actions */}
            <div style={{ marginBottom: '24px' }}>


                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div className="employee-avatar" style={{ 
                            width: '72px', height: '72px', fontSize: '28px', 
                            borderRadius: '20px', backgroundColor: 'var(--bg-tertiary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--primary)', fontWeight: '600',
                            border: '1px solid var(--border-color)',
                            flexShrink: 0
                        }}>
                            {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
                                {customer.name}
                            </h1>
                            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                                {customer.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Phone size={14}/> {customer.phone}</span>}
                                {customer.email && <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Mail size={14}/> {customer.email}</span>}
                                {(customer.tax_office || customer.tax_number) && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Building2 size={14}/> {customer.tax_office} {customer.tax_number && `- ${customer.tax_number}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setIsEditModalOpen(true)}>
                            <Pencil size={18} /> Düzenle
                        </button>
                    </div>
                </div>
            </div>

            {/* Customer Info Section - Minimal */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                {/* İletişim ve Adres */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={13} /> İletişim ve Adres
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Adres</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>{customer.address || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Telefon</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.phone || '-'}</div>
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>E-posta</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{customer.email || '-'}</div>
                        </div>
                    </div>
                </div>
                
                {/* Kurumsal Bilgiler */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Building2 size={13} /> Kurumsal Bilgiler
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Vergi Dairesi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.tax_office || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Vergi No / TC</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.tax_number || '-'}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Kayıt Tarihi</div>
                            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{customer.created_at ? formatDate(customer.created_at) : '-'}</div>
                        </div>
                    </div>
                </div>

                {/* Finansal Özet */}
                <div className="card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Info size={13} /> Finansal Özet
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>Açık Bakiye</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: customer.total_receivable > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>{formatCurrency(customer.total_receivable || 0)}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>İşlem Hacmi</div>
                            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatCurrency(totalEarnings)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
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
                {activeTab === 'works' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                İşler ve Projeler
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button className="btn btn-primary" onClick={() => setIsWorkModalOpen(true)}>
                                    <Briefcase size={18} /> Yeni İş Ekle
                                </button>
                            </div>
                        </div>

                        <DataTable persistenceKey={`Customer_Works_${activeTab}`}
                            columns={workColumns}
                            data={filteredWorks}
                            showSearch={true}
                            showDateFilter={true}
                            showCheckboxes={true}
                            dateFilterKey="start_date"
                            isArchiveView={showArchived}
                            onToggleArchiveView={setShowArchived}
                            onBulkArchive={handleBulkArchive}
                            onBulkDelete={handleBulkDelete}
                            filters={[
                                {
                                    key: 'status',
                                    label: 'Durum Filtresi',
                                    options: [
                                        { value: 'pending', label: 'Bekliyor' },
                                        { value: 'in_progress', label: 'Devam Ediyor' },
                                        { value: 'completed', label: 'Tamamlandı' },
                                        { value: 'paid', label: 'Ödendi / Tahsil Edildi' },
                                        { value: 'cancelled', label: 'İptal' }
                                    ]
                                }
                            ]}
                            onRowClick={(row) => navigate(`/works/${row.id}`)}
                            actions={(row) => (
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                    <button className="icon-btn" onClick={(e) => { 
                                        e.stopPropagation(); 
                                        setEditingWork(row); 
                                        setIsWorkModalOpen(true); 
                                    }} title="Düzenle">
                                        <Pencil size={16} />
                                    </button>
                                    <button className="icon-btn success" style={{ background: row.status === 'paid' ? 'var(--success-subtle)' : 'var(--bg-secondary)', color: row.status === 'paid' ? 'var(--success)' : 'var(--text-secondary)' }} onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if(row.status !== 'paid') {
                                            setPaymentWork(row); 
                                            setPaymentModalOpen(true);
                                        }
                                    }} title={row.status === 'paid' ? "Tahsilat Alındı" : "Tahsilat Ekle"}>
                                        {row.status === 'paid' ? <CheckCircle2 size={16} /> : <Banknote size={16} />}
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}

                {activeTab === 'documents' && (
                    <div className="tab-pane">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                Dosyalar ve Belgeler
                            </h3>
                            {!showArchived && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <button 
                                        onClick={handleOpenCreateFolder} 
                                        className="btn btn-secondary" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Plus size={16} /> Yeni Klasör
                                    </button>
                                    <button 
                                        onClick={() => setUploadModalOpen(true)} 
                                        className="btn btn-primary" 
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                    >
                                        <Plus size={16} /> Belge Ekle
                                    </button>
                                </div>
                            )}
                        </div>

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

                        <DataTable persistenceKey="CustomerDetail_documents_table"
                            columns={[
                                { 
                                    key: 'file_name', 
                                    label: 'Belge Adı',
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
                                { 
                                    key: 'category', 
                                    label: 'Kategori', 
                                    render: (v, row) => row.isFolder ? '' : (row.category || row.doc_type || <span className="text-muted">Kategorisiz</span>) 
                                },
                                { 
                                    key: 'folder', 
                                    label: 'Klasör', 
                                    render: (v, row) => row.isFolder ? '' : (row.folder || <span className="text-muted">Klasörsüz</span>) 
                                },
                                { 
                                    key: 'related_info', 
                                    label: 'İlgili Kayıt / İş', 
                                    render: (_, row) => {
                                        if (row.isFolder) return '';
                                        if (row.related_type === 'customer') {
                                            return <span className="badge badge-primary">Müşteri Geneli</span>;
                                        } else if (row.related_type === 'work') {
                                            const w = customer?.works?.find(work => work.id === row.related_id);
                                            return w ? <span style={{ fontSize: '12px' }}>İş: {w.title}</span> : <span className="text-muted">İş #{row.related_id}</span>;
                                        }
                                        return <span className="text-muted">{row.related_type}</span>;
                                    }
                                },
                                { key: 'created_at', label: 'Yükleme Tarihi', render: v => v ? formatDate(v) : '' },
                                { key: 'file_type', label: 'Tür', render: (v, row) => row.isFolder ? 'Klasör' : (v || '-') }
                            ]}
                            data={(() => {
                                if (currentFolder === null) {
                                    const filteredFolders = documentFolders.filter(f => 
                                        showArchived ? f.is_archived === 1 : f.is_archived !== 1
                                    );
                                    const folderRows = filteredFolders.map(f => ({
                                        id: `folder_${f.id}`,
                                        file_name: f.value,
                                        isFolder: true,
                                        category: '',
                                        folder: '',
                                        related_info: '',
                                        created_at: null,
                                        file_type: 'Klasör'
                                    }));
                                    const fileRows = documents.filter(d => !d.folder);
                                    return [...folderRows, ...fileRows];
                                }
                                return documents.filter(d => d.folder === currentFolder);
                            })()}
                            emptyMessage={showArchived ? "Arşivlenmiş belge bulunmuyor." : "Kayıtlı belge bulunmamaktadır."}
                            onRowClick={(row) => {
                                if (row.isFolder) {
                                    setCurrentFolder(row.file_name);
                                } else {
                                    handleDocumentOpen(row);
                                }
                            }}
                            onBulkDelete={async (ids) => {
                                if (!window.confirm(`${ids.length} belgeyi silmek istediğinize emin misiniz?`)) return;
                                for (const id of ids) {
                                    await window.electronAPI.deleteDocument(id);
                                }
                                loadDocuments(currentCompany?.id);
                            }}
                            isArchiveView={showArchived}
                            onToggleArchiveView={setShowArchived}
                            onBulkArchive={(ids) => handleBulkArchiveDocs(ids, !showArchived)}
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
                                    return !showArchived ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleOpenRenameFolder(item.file_name) }} title="Klasör Adını Değiştir"><Pencil size={16} /></button>
                                            {folderObj && <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleArchiveFolder(folderObj.id, true) }} title="Klasörü Arşivle"><Archive size={16} /></button>}
                                            <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.file_name) }} title="Klasörü Sil"><Trash2 size={16} /></button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {folderObj && <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleArchiveFolder(folderObj.id, false) }} title="Arşivden Çıkar"><ArchiveRestore size={16} /></button>}
                                            <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDeleteFolder(item.file_name) }} title="Klasörü Sil"><Trash2 size={16} /></button>
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDocumentOpen(item) }} title="Aç"><FileText size={16} /></button>
                                        {!showArchived && <button className="icon-btn" onClick={(e) => { e.stopPropagation(); handleEditDoc(item) }} title="Düzenle"><Pencil size={16} /></button>}
                                        <button className="icon-btn danger" onClick={(e) => { e.stopPropagation(); handleDocumentDelete(item) }} title="Sil"><Trash2 size={16} /></button>
                                    </div>
                                );
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Müşteri Bilgilerini Düzenle"
            >
                <CustomerForm
                    initialData={customer}
                    onSubmit={handleEditSubmit}
                    onCancel={() => setIsEditModalOpen(false)}
                    loading={saving}
                />
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                title={`${paymentWork?.title || 'İş'} İçin Tahsilat Al`}
            >
                <TransactionForm
                    initialData={{
                        type: 'IN',
                        method: 'CASH',
                        amount: paymentWork?.total_price || 0,
                        description: `[TAHSİLAT] İş: ${paymentWork?.title} - Müşteri: ${customer.name}`,
                        date: new Date().toISOString().split('T')[0]
                    }}
                    onSubmit={async (data) => {
                        setSaving(true)
                        try {
                            // 1. İş tablosunda konumu paid olarak güncelle
                            await window.electronAPI.updateWork({
                                id: paymentWork.id,
                                status: 'paid'
                            });
                            // 2. Bir gelir işlemi oluştur (finans)
                            await window.electronAPI.createFinance({
                                ...data,
                                category: `WORK_PAYMENT_${paymentWork.id}`,
                                companyId: customer.company_id
                            });
                            
                            setPaymentModalOpen(false);
                            loadCustomer(); // Yenile
                        } catch (err) {
                            console.error('Payment error', err);
                        } finally {
                            setSaving(false);
                        }
                    }}
                    onCancel={() => setPaymentModalOpen(false)}
                    loading={saving}
                    hideCheck={false}
                />
            </Modal>
            {/* New / Edit Work Modal */}
            <Modal
                isOpen={isWorkModalOpen}
                onClose={() => { setIsWorkModalOpen(false); setEditingWork(null); }}
                title={editingWork ? "İşi Düzenle" : "Yeni İş Ekle"}
                footer={null}
            >
                <WorkForm
                    initialData={editingWork ? { ...editingWork, customer_id: customer.id, customer: customer.name } : { customer_id: customer.id, customer: customer.name }}
                    onSubmit={handleWorkSubmit}
                    onCancel={() => { setIsWorkModalOpen(false); setEditingWork(null); }}
                    loading={saving}
                    customers={[customer]}
                    disableCustomerSelect={true}
                />
            </Modal>
            {/* Document Upload Modal */}
            {uploadModalOpen && (
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
                        targetType="employee"
                    />
                </Modal>
            )}

            {/* Document Edit Modal */}
            <Modal
                isOpen={editDocModalOpen}
                onClose={() => setEditDocModalOpen(false)}
                title="Belge Bilgilerini Düzenle"
                size="md"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <CustomInput 
                        label="Dosya Adı *"
                        value={uploadFileName}
                        onChange={setUploadFileName}
                        required
                    />
                    <CustomSelect 
                        label="Kategori"
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
                            value={uploadEndDate}
                            onChange={setUploadEndDate}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button className="btn btn-secondary" onClick={() => setEditDocModalOpen(false)}>İptal</button>
                        <button 
                            className="btn btn-primary" 
                            disabled={saving || !uploadFileName} 
                            onClick={handleUpdateDocConfirm}
                        >
                            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        </button>
                    </div>
                </div>
            </Modal>

            <DocumentPreviewModal
                doc={previewDoc}
                onClose={() => setPreviewDoc(null)}
                onDelete={() => handleDocumentDelete(previewDoc.doc || previewDoc)}
            />

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
            {confirmModal && (
                <ConfirmModal 
                    isOpen={!!confirmModal} 
                    onClose={() => setConfirmModal(null)} 
                    onConfirm={confirmModal?.onConfirm} 
                    title={confirmModal?.title} 
                    message={confirmModal?.message} 
                    confirmText={confirmModal?.confirmText}
                    type={confirmModal?.styleType}
                />
            )}
        </div>
    )
}
