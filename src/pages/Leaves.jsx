import { useState, useEffect, useMemo } from 'react';
import { 
    Calendar, 
    Plus, 
    Trash2, 
    Edit2, 
    Users,
    Clock,
    AlertCircle,
    User
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTabs } from '../context/TabContext';
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
    const [loading, setLoading] = useState(true);
    const [leaves, setLeaves] = useState([]);
    const [employees, setEmployees] = useState([]);
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState(null);
    const [formData, setFormData] = useState({
        employeeId: '',
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
            type: 'Yıllık Ücretli İzin',
            startDate: today(),
            endDate: today(),
            days: 1,
            status: 'approved',
            notes: ''
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleEditClick = (leave) => {
        setEditingLeave(leave);
        setFormData({
            employeeId: leave.employee_id,
            type: leave.type,
            startDate: formatDateForInput(leave.start_date),
            endDate: formatDateForInput(leave.end_date),
            days: leave.days,
            status: leave.status,
            notes: leave.notes || ''
        });
        setError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        if (!formData.employeeId) {
            setError('Lütfen personel seçin.');
            return;
        }
        
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...formData,
                employeeId: parseInt(formData.employeeId),
                days: parseInt(formData.days) || 1
            };

            const res = editingLeave 
                ? await window.electronAPI.updateLeave({ id: editingLeave.id, ...payload })
                : await window.electronAPI.createLeave(payload);
                
            if (res.success) {
                setIsModalOpen(false);
                loadData();
            } else {
                setError(res.error || 'İzin kaydedilirken bir hata oluştu.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            const res = await window.electronAPI.deleteLeave(confirmDelete.id);
            if (res.success) loadData();
        } catch (err) {
            console.error('Failed to delete leave:', err);
        }
        setConfirmDelete(null);
    };

    const updateField = (key, value) => {
        setFormData(prev => {
            let newData = { ...prev, [key]: value };

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
                showCheckboxes={false}
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
                title={editingLeave ? 'İzni Düzenle' : 'Yeni İzin Ekle'}
                size="medium"
                footer={null}
            >
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <CustomSelect 
                            label="Personel Seçin *" 
                            value={formData.employeeId} 
                            options={employees.map(emp => ({ value: emp.id, label: `${emp.first_name} ${emp.last_name}` }))} 
                            onChange={(val) => updateField('employeeId', val)} 
                            disabled={editingLeave}
                            required
                        />
                        <CustomSelect 
                            label="İzin Türü *" 
                            value={formData.type} 
                            options={leaveTypes} 
                            onChange={(val) => updateField('type', val)} 
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '16px' }}>
                        <CustomInput 
                            label="Başlangıç Tarihi *" 
                            type="date" 
                            value={formData.startDate} 
                            onChange={(val) => updateField('startDate', val)} 
                            required 
                        />
                        <CustomInput 
                            label="Gün Sayısı" 
                            type="number" 
                            value={formData.days} 
                            onChange={(val) => updateField('days', val)} 
                            min={1}
                            required 
                        />
                        <CustomInput 
                            label="Bitiş Tarihi *" 
                            type="date" 
                            value={formData.endDate} 
                            onChange={(val) => updateField('endDate', val)} 
                            required 
                        />
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 14px', marginTop: '16px',
                        background: formData.status === 'approved' ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                        border: `1px solid ${formData.status === 'approved' ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        borderRadius: 'var(--radius-sm)', transition: 'background 0.15s ease, border-color 0.15s ease', cursor: 'pointer'
                    }} onClick={() => updateField('status', formData.status === 'approved' ? 'pending' : 'approved')}>
                        <label className="toggle-switch" style={{ flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={formData.status === 'approved'} onChange={(e) => updateField('status', e.target.checked ? 'approved' : 'pending')} />
                            <span className="toggle-slider"></span>
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>İzin Durumu</span>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: formData.status === 'approved' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                {formData.status === 'approved' ? 'Onaylandı' : 'Bekliyor'}
                            </span>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <CustomInput 
                            label="Notlar" 
                            value={formData.notes} 
                            onChange={(val) => updateField('notes', val)} 
                            type="textarea" 
                            rows={2} 
                        />
                    </div>

                    {error && (
                        <div className="alert alert-danger" style={{ marginTop: '16px' }}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Vazgeç</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
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
