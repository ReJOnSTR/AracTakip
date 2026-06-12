import { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, 
    Plus, 
    Trash2, 
    Edit2, 
    Users,
    Clock,
    AlertCircle,
    User,
    Search,
    X,
    Check,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTabs } from '../context/TabContext';
import { useToast } from '../context/ToastContext';
import TopProgressBar from '../components/TopProgressBar';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import DataTable from '../components/DataTable';
import CustomInput from '../components/CustomInput';
import CustomSelect from '../components/CustomSelect';
import { formatDate, today, formatDateForInput } from '../utils/helpers';

export default function Leaves() {
    const { currentCompany } = useCompany();
    const { addTab } = useTabs();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const [formData, setFormData] = useState({
        employeeId: '',
        employeeIds: [], // For bulk selection
        type: 'Yıllık Ücretli İzin',
        startDate: today(),
        endDate: today(),
        days: 1,
        status: 'approved',
        notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    const [leaveModalStep, setLeaveModalStep] = useState(1);
    const [leaveQueue, setLeaveQueue] = useState([]);
    const [leaveQueueIndex, setLeaveQueueIndex] = useState(0);
    const [searchFilter, setSearchFilter] = useState('');
    const [deptFilter, setDeptFilter] = useState('');

    const [leaveTypes, setLeaveTypes] = useState([]);

    const defaultColors = {
        'Yıllık Ücretli İzin': '#3b82f6',
        'Hastalık / Rapor (İstirahat)': '#ef4444',
        'Ücretsiz İzin': '#f59e0b',
        'Mazeret İzni': '#8b5cf6',
        'Evlilik İzni': '#ec4899',
        'Ölüm İzni': '#6b7280',
        'Doğum / Analık İzni': '#d946ef',
        'Babalık İzni': '#0ea5e9',
        'Süt İzni': '#10b981',
        'İdari İzin': '#6366f1',
        'Mesai İzni (Mahsup)': '#f97316',
        'Diğer': '#94a3b8'
    };

    const loadData = async () => {
        if (!currentCompany) return;
        setLoading(true);
        try {
            const [leavesRes, employeesRes, typesRes] = await Promise.all([
                window.electronAPI.getLeavesByCompany(currentCompany.id),
                window.electronAPI.getEmployees(currentCompany.id, 0),
                window.electronAPI.getLeaveTypes(currentCompany.id)
            ]);
            
            if (leavesRes.success) setLeaves(leavesRes.data || []);
            if (employeesRes.success) setEmployees(employeesRes.data || []);
            if (typesRes.success) {
                const types = (typesRes.data || []).map(t => ({
                    value: t.name,
                    label: t.name,
                    color: defaultColors[t.name] || '#6b7280'
                }));
                setLeaveTypes(types);
            }
        } catch (err) {
            console.error('Failed to load leaves:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [currentCompany]);

    const handleAddClick = () => {
        setEditingLeave(null);
        setFormData({
            employeeId: '',
            employeeIds: [],
            type: 'Yıllık Ücretli İzin',
            startDate: today(),
            endDate: today(),
            days: 14,
            status: 'approved',
            notes: ''
        });
        setLeaveQueue([]);
        setLeaveQueueIndex(0);
        setLeaveModalStep(1);
        setError('');
        setIsModalOpen(true);
    };

    const handleEditClick = (leave) => {
        setEditingLeave(leave);
        const emp = employees.find(e => e.id === leave.employee_id);
        const initialFormData = {
            employeeId: leave.employee_id,
            employeeIds: [leave.employee_id],
            type: leave.type,
            startDate: formatDateForInput(leave.start_date),
            endDate: formatDateForInput(leave.end_date),
            days: leave.days,
            status: leave.status,
            notes: leave.notes || ''
        };
        setFormData(initialFormData);
        setLeaveQueue([{
            id: leave.id,
            employeeId: leave.employee_id,
            employee: emp,
            type: leave.type,
            startDate: formatDateForInput(leave.start_date),
            endDate: formatDateForInput(leave.end_date),
            days: leave.days,
            status: leave.status,
            notes: leave.notes || ''
        }]);
        setLeaveQueueIndex(0);
        setLeaveModalStep(2);
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const targetItems = leaveQueue.filter(item => !item.isSaved);
            for (const item of targetItems) {
                const payload = {
                    employeeId: parseInt(item.employeeId),
                    type: item.type,
                    startDate: item.startDate,
                    endDate: item.endDate,
                    days: parseInt(item.days) || 1,
                    status: item.status,
                    notes: item.notes || null
                };

                if (item.id) {
                    await window.electronAPI.updateLeave({ id: item.id, ...payload });
                } else {
                    await window.electronAPI.createLeave(payload);
                }
            }

            setIsModalOpen(false);
            loadData();
            showToast(editingLeave ? 'İzin güncellendi.' : 'İzin(ler) kaydedildi.', 'success');
        } catch (err) {
            setError(err.message || 'İzin kaydedilirken bir hata oluştu.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            const res = await window.electronAPI.deleteLeave(confirmDelete.id);
            if (res.success) {
                loadData();
                showToast('İzin silindi.', 'success');
            }
        } catch (err) {
            console.error('Failed to delete leave:', err);
        }
        setConfirmDelete(null);
    };

    const handleBulkDelete = async (ids) => {
        if (!ids || ids.length === 0) return;
        if (!confirm('Seçili izinleri silmek istediğinize emin misiniz?')) return;

        setSaving(true);
        try {
            let successCount = 0;
            for (const id of ids) {
                const res = await window.electronAPI.deleteLeave(id);
                if (res.success) successCount++;
            }
            if (successCount > 0) {
                loadData();
                showToast(`${successCount} izin silindi.`, 'success');
            }
        } catch (err) {
            console.error('Bulk delete failed:', err);
        }
        setSaving(false);
    };

    const updateField = (key, value) => {
        setFormData(prev => {
            let newData = { ...prev, [key]: value };

            // Auto-set days based on type (and employee seniority if needed)
            if (key === 'type' || (key === 'employeeId' && prev.type)) {
                const typeToProcess = key === 'type' ? value : prev.type;
                const empIdToProcess = key === 'employeeId' ? value : prev.employeeId;
                
                const lower = typeToProcess.toLowerCase();
                let autoDays = 0;
                if (lower.includes('evlilik')) autoDays = 3;
                else if (lower.includes('ölüm')) autoDays = 3;
                else if (lower.includes('babalık')) autoDays = 5;
                else if (lower.includes('engelli')) autoDays = 10;
                else if (lower.includes('yıllık')) {
                    const emp = employees.find(e => e.id === parseInt(empIdToProcess));
                    if (emp && emp.start_date) {
                        const start = new Date(emp.start_date);
                        const years = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25));
                        autoDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
                    }
                } else {
                    autoDays = 1;
                }

                newData.days = autoDays;
                if (newData.startDate) {
                    const start = new Date(newData.startDate);
                    start.setDate(start.getDate() + autoDays - 1);
                    newData.endDate = formatDateForInput(start);
                }
            }

            if (key === 'startDate' && newData.startDate) {
                const days = parseInt(newData.days) || 1;
                const start = new Date(newData.startDate);
                start.setDate(start.getDate() + days - 1);
                newData.endDate = formatDateForInput(start);
            } else if (key === 'days' && newData.startDate) {
                const days = parseInt(value) || 1;
                const start = new Date(newData.startDate);
                start.setDate(start.getDate() + days - 1);
                newData.endDate = formatDateForInput(start);
            } else if (key === 'endDate' && newData.startDate && newData.endDate) {
                const start = new Date(newData.startDate);
                const end = new Date(newData.endDate);
                if (end >= start) {
                    const diffTime = end - start;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    newData.days = diffDays;
                }
            }
            return newData;
        });
    };

    function getInitials(first, last) {
        if (!first) return '';
        return `${first.charAt(0)}${last ? last.charAt(0) : ''}`.toUpperCase();
    }

    const employeeDepartmentOptions = useMemo(() => {
        const depts = [...new Set(employees.map(item => item.department).filter(Boolean))].sort()
        return depts.map(d => ({ value: d, label: d }))
    }, [employees])

    const filteredEmployeesForSelection = useMemo(() => {
        return employees.filter(emp => {
            const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLocaleLowerCase('tr-TR')
            const search = searchFilter.toLocaleLowerCase('tr-TR')
            const matchesSearch = fullName.includes(search) || (emp.department || '').toLocaleLowerCase('tr-TR').includes(search)
            const matchesDept = !deptFilter || emp.department === deptFilter
            return matchesSearch && matchesDept
        })
    }, [employees, searchFilter, deptFilter])

    const handleSelectEmployee = (empId) => {
        setFormData(prev => {
            const isSelected = prev.employeeIds.includes(empId)
            const newIds = isSelected 
                ? prev.employeeIds.filter(id => id !== empId) 
                : [...prev.employeeIds, empId]
            return { ...prev, employeeIds: newIds }
        })
    }

    const handleToggleAllEmployees = () => {
        setFormData(prev => {
            const allFilteredIds = filteredEmployeesForSelection.map(e => e.id)
            const allSelected = allFilteredIds.every(id => prev.employeeIds.includes(id))
            
            let newIds
            if (allSelected) {
                newIds = prev.employeeIds.filter(id => !allFilteredIds.includes(id))
            } else {
                newIds = [...new Set([...prev.employeeIds, ...allFilteredIds])]
            }
            return { ...prev, employeeIds: newIds }
        })
    }

    const startProcessingQueue = () => {
        if (formData.employeeIds.length === 0) return;
        
        const newQueue = formData.employeeIds.map(id => {
            const emp = employees.find(e => e.id === id);
            let autoDays = 14;
            if (emp && emp.start_date) {
                const start = new Date(emp.start_date);
                const years = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25));
                autoDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
            }
            const sDate = today();
            const s = new Date(sDate);
            s.setDate(s.getDate() + autoDays - 1);
            const eDate = formatDateForInput(s);

            return {
                employeeId: id,
                employee: emp,
                type: 'Yıllık Ücretli İzin',
                startDate: sDate,
                endDate: eDate,
                days: autoDays,
                status: 'approved',
                notes: '',
                isSaved: false
            };
        });
        setLeaveQueue(newQueue);
        setLeaveQueueIndex(0);
        setLeaveModalStep(2);
    };

    const updateLeaveQueueField = (key, value) => {
        setLeaveQueue(prev => prev.map((item, idx) => {
            if (idx !== leaveQueueIndex) return item;
            let newItem = { ...item, [key]: value };

            if (key === 'type') {
                const lower = value.toLowerCase();
                let autoDays = 0;
                if (lower.includes('evlilik')) autoDays = 3;
                else if (lower.includes('ölüm')) autoDays = 3;
                else if (lower.includes('babalık')) autoDays = 5;
                else if (lower.includes('engelli')) autoDays = 10;
                else if (lower.includes('yıllık')) {
                    const emp = employees.find(e => e.id === item.employeeId);
                    if (emp && emp.start_date) {
                        const start = new Date(emp.start_date);
                        const years = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25));
                        autoDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
                    }
                } else {
                    autoDays = 1;
                }

                newItem.days = autoDays;
                if (newItem.startDate) {
                    const start = new Date(newItem.startDate);
                    start.setDate(start.getDate() + autoDays - 1);
                    newItem.endDate = formatDateForInput(start);
                }
            }

            if (key === 'startDate' && newItem.startDate) {
                const days = parseInt(newItem.days) || 1;
                const start = new Date(newItem.startDate);
                start.setDate(start.getDate() + days - 1);
                newItem.endDate = formatDateForInput(start);
            } else if (key === 'days' && newItem.startDate) {
                const days = parseInt(value) || 1;
                const start = new Date(newItem.startDate);
                start.setDate(start.getDate() + days - 1);
                newItem.endDate = formatDateForInput(start);
            } else if (key === 'endDate' && newItem.startDate && newItem.endDate) {
                const start = new Date(newItem.startDate);
                const end = new Date(newItem.endDate);
                if (end >= start) {
                    const diffTime = end - start;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    newItem.days = diffDays;
                }
            }
            return newItem;
        }));
    };

    const applyToAll = () => {
        const current = leaveQueue[leaveQueueIndex];
        setLeaveQueue(prev => prev.map((item, idx) => {
            if (item.isSaved) return item;
            
            let newItem = {
                ...item,
                type: current.type,
                startDate: current.startDate,
                endDate: current.endDate,
                days: current.days,
                status: current.status,
                notes: current.notes
            };

            if (current.type.toLowerCase().includes('yıllık')) {
                const emp = employees.find(e => e.id === item.employeeId);
                if (emp && emp.start_date) {
                    const start = new Date(emp.start_date);
                    const years = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25));
                    const autoDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
                    newItem.days = autoDays;
                    if (newItem.startDate) {
                        const s = new Date(newItem.startDate);
                        s.setDate(s.getDate() + autoDays - 1);
                        newItem.endDate = formatDateForInput(s);
                    }
                }
            }

            return newItem;
        }));
    };

    const stats = useMemo(() => {
        const todayStr = today(); // YYYY-MM-DD
        const thisMonth = todayStr.slice(0, 7);
        
        const approvedLeaves = leaves.filter(l => l.status === 'approved');
        
        const thisMonthLeaves = approvedLeaves.filter(l => {
            const dateStr = formatDateForInput(l.start_date);
            return dateStr.startsWith(thisMonth);
        });

        const activeToday = approvedLeaves.filter(l => {
            const startStr = formatDateForInput(l.start_date);
            const endStr = formatDateForInput(l.end_date);
            return todayStr >= startStr && todayStr <= endStr;
        });

        return {
            totalThisMonth: thisMonthLeaves.reduce((sum, l) => sum + (l.days || 0), 0),
            currentlyOnLeave: activeToday.length,
            pendingApproval: leaves.filter(l => l.status === 'pending').length
        };
    }, [leaves]);

    const columns = [
        {
            key: 'employee',
            label: 'Personel',
            searchValue: (row) => `${row.employees?.first_name} ${row.employees?.last_name}`,
            render: (_, row) => (
                <div style={{ fontWeight: 600 }}>{row.employees?.first_name} {row.employees?.last_name}</div>
            )
        },
        {
            key: 'type',
            label: 'İzin Türü',
            render: (val) => {
                const type = leaveTypes.find(t => t.value === val);
                return (
                    <span style={{ color: type?.color || 'inherit', fontWeight: 600 }}>
                        {type?.label || val}
                    </span>
                );
            }
        },
        {
            key: 'dates',
            label: 'Tarih Aralığı',
            render: (_, row) => (
                <div style={{ fontSize: '13px' }}>
                    {formatDate(row.start_date)} - {formatDate(row.end_date)}
                </div>
            )
        },
        {
            key: 'days',
            label: 'Süre',
            render: (val) => <span style={{ fontWeight: 600 }}>{val} Gün</span>
        },
        {
            key: 'status',
            label: 'Durum',
            render: (val) => (
                <span className={`badge badge-${val === 'approved' ? 'success' : (val === 'pending' ? 'warning' : 'danger')}`}>
                    {val === 'approved' ? 'Onaylandı' : (val === 'pending' ? 'Bekliyor' : 'Reddedildi')}
                </span>
            )
        },
        {
            key: 'notes',
            label: 'Notlar',
            render: (val) => (
                <div style={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {val || '-'}
                </div>
            )
        }
    ];

    if (!currentCompany) {
        return (
            <div className="page-container">
                <div className="empty-state">
                    <div className="empty-state-icon"><User /></div>
                    <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                    <p className="empty-state-desc">İzin kayıtlarını görüntülemek için lütfen bir şirket seçin.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container fade-in">
            <TopProgressBar loading={loading} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Personel İzin Tablosu</h1>
                    <p className="page-subtitle">Tüm personellerin izin kayıtlarını ve takvimini buradan yönetebilirsiniz.</p>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={handleAddClick}>
                        <Plus size={18} />
                        Yeni İzin Ekle
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid-responsive-3" style={{ marginBottom: '25px' }}>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Calendar size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Bu Ay Toplam İzin</span>
                        <div className="stat-value">{stats.totalThisMonth} <span style={{ fontSize: '14px', fontWeight: 400 }}>Gün</span></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <Users size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Şu An İzinde Olanlar</span>
                        <div className="stat-value">{stats.currentlyOnLeave} <span style={{ fontSize: '14px', fontWeight: 400 }}>Kişi</span></div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon warning">
                        <Clock size={24} />
                    </div>
                    <div className="stat-info">
                        <span className="stat-label">Onay Bekleyenler</span>
                        <div className="stat-value">{stats.pendingApproval}</div>
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <DataTable
                columns={columns}
                data={leaves}
                persistenceKey="leaves_table"
                showSearch={true}
                showCheckboxes={true}
                onBulkDelete={handleBulkDelete}
                searchPlaceholder="Personel veya notlarda ara..."
                showDateFilter={true}
                dateFilterKey="start_date"
                filters={[
                    {
                        key: 'type',
                        label: 'İzin Türü',
                        options: leaveTypes.map(t => ({ value: t.value, label: t.label }))
                    },
                    {
                        key: 'status',
                        label: 'Durum',
                        options: [
                            { value: 'approved', label: 'Onaylandı' },
                            { value: 'pending', label: 'Bekliyor' },
                            { value: 'rejected', label: 'Reddedildi' }
                        ]
                    }
                ]}
                actions={(leave) => (
                    <>
                        <button onClick={() => handleEditClick(leave)} title="Düzenle">
                            <Edit2 size={16} />
                        </button>
                        <button className="text-danger" onClick={() => setConfirmDelete(leave)} title="Sil">
                            <Trash2 size={16} />
                        </button>
                    </>
                )}
            />

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingLeave ? 'İzni Düzenle' : (formData.employeeId ? 'İzin Ekle' : 'Toplu İzin Ekle')}
                size="medium"
                footer={null}
            >
                <div style={{ overflow: 'hidden', position: 'relative' }}>
                    {/* Stepper Header */}
                    {!editingLeave && !formData.employeeId && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: leaveModalStep === 1 ? 1 : 0.6, transition: 'opacity 0.2s' }}>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: 700, 
                                        background: leaveModalStep === 1 ? 'var(--accent-primary)' : 'var(--success)', 
                                        color: '#fff', 
                                        width: '20px', 
                                        height: '20px', 
                                        borderRadius: '50%', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center' 
                                    }}>
                                        {leaveModalStep > 1 ? '✓' : '1'}
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: leaveModalStep === 1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>Personel Seçimi</span>
                                </div>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: leaveModalStep === 2 ? 1 : 0.4, transition: 'opacity 0.2s' }}>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: 700, 
                                        background: leaveModalStep === 2 ? 'var(--accent-primary)' : 'var(--bg-tertiary)', 
                                        color: leaveModalStep === 2 ? '#fff' : 'var(--text-secondary)', 
                                        width: '20px', 
                                        height: '20px', 
                                        borderRadius: '50%', 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'center',
                                        border: leaveModalStep === 2 ? 'none' : '1px solid var(--border-color)'
                                    }}>
                                        2
                                    </span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: leaveModalStep === 2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>İzin Girişi</span>
                                </div>
                            </div>
                            <div style={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '8px', 
                                padding: '0 4px',
                                opacity: leaveModalStep === 2 ? 1 : 0,
                                visibility: leaveModalStep === 2 ? 'visible' : 'hidden',
                                transition: 'all 0.3s ease',
                                height: '28px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>İşlem Sırası: {leaveQueueIndex + 1} / {Math.max(leaveQueue.length, 1)}</span>
                                    <span style={{ color: 'var(--accent-primary)' }}>%{Math.round(((leaveQueueIndex + 1) / Math.max(leaveQueue.length, 1)) * 100)}</span>
                                </div>
                                <div style={{ height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', background: 'var(--accent-primary)', width: `${((leaveQueueIndex + 1) / Math.max(leaveQueue.length, 1)) * 100}%`, transition: 'width 0.3s' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ 
                        display: 'flex', 
                        transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: leaveModalStep === 1 ? 'translateX(0)' : 'translateX(-100%)',
                        height: '480px'
                    }}>
                        {/* Step 1: Selection */}
                        <div style={{ minWidth: '100%', padding: '2px', height: '100%' }}>
                            <form onSubmit={(e) => { e.preventDefault(); startProcessingQueue(); }} style={{ height: '100%' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '12px', alignItems: 'center' }}>
                                        <div className="search-box" style={{ height: '36px', minWidth: 'auto', boxSizing: 'border-box' }}>
                                            <Search size={16} />
                                            <input 
                                                type="text"
                                                placeholder="İsim veya departman ara..."
                                                value={searchFilter}
                                                onChange={(e) => setSearchFilter(e.target.value)}
                                                style={{ height: '100%', padding: 0 }}
                                            />
                                            {searchFilter && (
                                                <button type="button" className="search-clear" onClick={() => setSearchFilter('')} style={{ display: 'flex', alignItems: 'center' }}>
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                        <CustomSelect 
                                            value={deptFilter}
                                            options={[
                                                { value: '', label: 'Tüm Departmanlar' },
                                                ...employeeDepartmentOptions
                                            ]}
                                            onChange={setDeptFilter}
                                            floatingLabel={false}
                                            style={{ marginBottom: 0 }}
                                        />
                                    </div>

                                    {/* Scrollable list of employees with checkboxes */}
                                    <div 
                                        className="employee-select-list" 
                                        style={{ 
                                            position: 'relative', 
                                            width: '100%', 
                                            border: '1px solid var(--border-color)', 
                                            borderRadius: 'var(--radius-md)', 
                                            height: '220px', 
                                            overflowY: 'auto', 
                                            background: 'var(--bg-secondary)', 
                                            boxShadow: 'none',
                                            flexShrink: 0
                                        }}
                                    >
                                        <div style={{ 
                                            padding: '10px 14px', 
                                            borderBottom: '1px solid var(--border-color)', 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            fontSize: '13px',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 2
                                        }}>
                                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Personel Listesi ({filteredEmployeesForSelection.length})</span>
                                            <button 
                                                type="button" 
                                                onClick={handleToggleAllEmployees}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    color: 'var(--accent-primary)', 
                                                    fontWeight: 600, 
                                                    fontSize: '12px', 
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                {formData.employeeIds.length === filteredEmployeesForSelection.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                            </button>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            {filteredEmployeesForSelection.map(emp => {
                                                const isChecked = formData.employeeIds.includes(emp.id)
                                                return (
                                                    <div 
                                                        key={emp.id}
                                                        className={`custom-select-option ${isChecked ? 'selected' : ''}`}
                                                        onClick={() => handleSelectEmployee(emp.id)}
                                                        style={{ 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            gap: '12px', 
                                                            padding: '10px 14px', 
                                                            borderBottom: '1px solid var(--border-color)',
                                                            justifyContent: 'flex-start',
                                                            borderRadius: 0
                                                        }}
                                                    >
                                                        <div 
                                                            className={`checkbox ${isChecked ? 'checked' : ''}`}
                                                            style={{ flexShrink: 0 }}
                                                        >
                                                            {isChecked && <Check size={12} style={{ color: '#fff' }} />}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                                                            <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                                                                {emp.first_name} {emp.last_name}
                                                            </span>
                                                            {emp.department && (
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    {emp.department}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                            {filteredEmployeesForSelection.length === 0 && (
                                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                                    Personel bulunamadı
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selection Stats */}
                                    <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '12px',
                                        padding: '12px 16px', 
                                        borderRadius: 'var(--radius-md)', 
                                        background: 'var(--accent-subtle)', 
                                        border: '1px solid rgba(20, 184, 166, 0.2)',
                                    }}>
                                        <Users size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                {formData.employeeIds.length > 0 
                                                    ? `${formData.employeeIds.length} personel seçildi.` 
                                                    : 'Lütfen izin eklemek istediğiniz personelleri seçin.'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="modal-actions" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Vazgeç</button>
                                        <button type="submit" className="btn btn-primary" disabled={formData.employeeIds.length === 0} style={{ padding: '0 25px', gap: '10px' }}>
                                            İşleme Başla <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Step 2: Individual Entry Form */}
                        <div style={{ minWidth: '100%', padding: '2px', height: '100%' }}>
                            {leaveQueue.length > 0 && (
                                <form onSubmit={handleSubmit} style={{ height: '100%' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', height: '100%', overflowY: 'auto' }}>
                                        {/* Navigation and Current Employee Header */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '15px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                    width: '40px', 
                                                    height: '40px', 
                                                    borderRadius: 'var(--radius-sm)', 
                                                    background: 'var(--accent-subtle)', 
                                                    color: 'var(--accent-primary)', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center', 
                                                    fontWeight: 700,
                                                    fontSize: '13px',
                                                    flexShrink: 0,
                                                    border: '1px solid rgba(20, 184, 166, 0.2)'
                                                }}>
                                                    {getInitials(leaveQueue[leaveQueueIndex].employee?.first_name, leaveQueue[leaveQueueIndex].employee?.last_name)}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>İşlenen Personel</span>
                                                        {leaveQueue[leaveQueueIndex].employee?.department && (
                                                            <span style={{ 
                                                                fontSize: '10px', 
                                                                fontWeight: 600, 
                                                                color: 'var(--text-secondary)', 
                                                                background: 'var(--bg-tertiary)', 
                                                                padding: '2px 6px', 
                                                                borderRadius: 'var(--radius-xs)', 
                                                                border: '1px solid var(--border-color)' 
                                                            }}>{leaveQueue[leaveQueueIndex].employee.department}</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {leaveQueue[leaveQueueIndex].employee?.first_name} {leaveQueue[leaveQueueIndex].employee?.last_name}
                                                    </div>
                                                </div>
                                            </div>

                                            {!editingLeave && (
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button 
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        disabled={leaveQueueIndex === 0} 
                                                        onClick={() => setLeaveQueueIndex(prev => prev - 1)}
                                                        style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        className="btn btn-secondary"
                                                        disabled={leaveQueueIndex === leaveQueue.length - 1} 
                                                        onClick={() => setLeaveQueueIndex(prev => prev + 1)}
                                                        style={{ width: '36px', height: '36px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {(() => {
                                            const name = leaveQueue[leaveQueueIndex].type?.toLowerCase() || '';
                                            let hint = '';
                                            if (name.includes('yıllık')) {
                                                const emp = leaveQueue[leaveQueueIndex].employee;
                                                const start = emp?.start_date ? new Date(emp.start_date) : null;
                                                const years = start ? Math.floor((new Date() - start) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
                                                let legalDays = years < 5 ? 14 : (years < 15 ? 20 : 26);
                                                hint = `Kıdem: ${years} Yıl. Yasal Hak: ${legalDays} Gün`;
                                            }
                                            else if (name.includes('evlilik')) hint = 'Yasal Hak: 3 Gün';
                                            else if (name.includes('ölüm')) hint = 'Yasal Hak: 3 Gün';
                                            else if (name.includes('babalık')) hint = 'Yasal Hak: 5 Gün';
                                            else if (name.includes('engelli')) hint = 'Yasal Hak: 10 Gün';
                                            
                                            if (hint) return (
                                                <div style={{ 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: '8px', 
                                                    padding: '8px 12px', 
                                                    background: 'var(--accent-subtle)', 
                                                    border: '1px solid rgba(20, 184, 166, 0.2)', 
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '12px',
                                                    color: 'var(--text-primary)',
                                                    fontWeight: 500
                                                }}>
                                                    <AlertCircle size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                                                    <span>{hint}</span>
                                                </div>
                                            );
                                            return null;
                                        })()}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
                                            <CustomSelect 
                                                label="İzin Türü *" 
                                                value={leaveQueue[leaveQueueIndex].type} 
                                                options={leaveTypes} 
                                                onChange={(val) => updateLeaveQueueField('type', val)} 
                                            />
                                            <CustomInput 
                                                label="Başlangıç Tarihi *" 
                                                type="date" 
                                                value={leaveQueue[leaveQueueIndex].startDate} 
                                                onChange={(val) => updateLeaveQueueField('startDate', val)} 
                                                required 
                                            />
                                            <CustomInput 
                                                label="Gün Sayısı *" 
                                                type="number" 
                                                value={leaveQueue[leaveQueueIndex].days} 
                                                onChange={(val) => updateLeaveQueueField('days', val)} 
                                                min={1}
                                                required 
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '16px' }}>
                                            <CustomInput 
                                                label="Bitiş Tarihi *" 
                                                type="date" 
                                                value={leaveQueue[leaveQueueIndex].endDate} 
                                                onChange={(val) => updateLeaveQueueField('endDate', val)} 
                                                required 
                                            />
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '12px', padding: '0 14px',
                                                background: leaveQueue[leaveQueueIndex].status === 'approved' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                                                border: `1px solid ${leaveQueue[leaveQueueIndex].status === 'approved' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                                borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer',
                                                height: '40px', boxSizing: 'border-box'
                                            }} onClick={() => updateLeaveQueueField('status', leaveQueue[leaveQueueIndex].status === 'approved' ? 'pending' : 'approved')}>
                                                <label className="toggle-switch" style={{ flexShrink: 0, transform: 'scale(0.85)', transformOrigin: 'left center' }} onClick={e => e.stopPropagation()}>
                                                    <input type="checkbox" checked={leaveQueue[leaveQueueIndex].status === 'approved'} onChange={(e) => updateLeaveQueueField('status', e.target.checked ? 'approved' : 'pending')} />
                                                    <span className="toggle-slider"></span>
                                                </label>
                                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>İzin Durumu</span>
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: leaveQueue[leaveQueueIndex].status === 'approved' ? 'var(--text-primary)' : 'var(--text-secondary)', marginTop: '2px', lineHeight: 1 }}>
                                                        {leaveQueue[leaveQueueIndex].status === 'approved' ? 'Onaylandı' : 'Bekliyor'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <CustomInput 
                                                label="Notlar" 
                                                value={leaveQueue[leaveQueueIndex].notes} 
                                                onChange={(val) => updateLeaveQueueField('notes', val)} 
                                                type="textarea" 
                                                rows={1}
                                                placeholder="Opsiyonel not..."
                                            />
                                        </div>

                                        {error && (
                                            <div className="alert alert-danger" style={{ padding: '8px 12px', fontSize: '13px' }}>
                                                <AlertCircle size={16} />
                                                <span>{error}</span>
                                            </div>
                                        )}

                                        <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            paddingTop: '15px',
                                            marginTop: 'auto',
                                            borderTop: '1px solid var(--border-color)' 
                                        }}>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                {!editingLeave && (
                                                    <button type="button" className="btn btn-secondary" onClick={() => setLeaveModalStep(1)}>
                                                        Değiştir
                                                    </button>
                                                )}
                                                {leaveQueue.length > 1 && (
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-ghost" 
                                                        style={{ color: 'var(--accent-primary)', fontWeight: 600, fontSize: '13px' }}
                                                        onClick={applyToAll}
                                                        title="Bu değerleri henüz kaydedilmemiş tüm personellere uygula"
                                                    >
                                                        Tümüne Uygula
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Vazgeç</button>
                                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                                    {saving ? 'Kaydediliyor...' : 'Tümünü Kaydet'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                title="İzin Kaydı Silme"
                message={confirmDelete ? `${confirmDelete.employees?.first_name} ${confirmDelete.employees?.last_name} isimli personelin bu izin kaydını silmek istediğinize emin misiniz?` : ''}
            />
        </div>
    );
}
