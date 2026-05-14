import { useState, useEffect } from 'react'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { formatDateForInput, formatCurrency } from '../../utils/helpers'
import { useTabs } from '../../context/TabContext'

const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' }
]

export default function EmployeeForm({ initialData, onSubmit, onCancel, saving, departmentOptions = [], onEditSalary }) {
    const { openNewTab } = useTabs()
    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        tcNo: '',
        phone: '',
        email: '',
        position: '',
        department: '',
        startDate: '',
        birthDate: '',
        salary: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        pastUsedLeaves: '',
        status: 'active',
        iban: '',
        notes: ''
    })

    const [salaryChanged, setSalaryChanged] = useState(false)

    useEffect(() => {
        if (initialData) {
            setForm({
                firstName: initialData.first_name || '',
                lastName: initialData.last_name || '',
                tcNo: initialData.tc_no || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                position: initialData.position || '',
                department: initialData.department || '',
                startDate: formatDateForInput(initialData.start_date),
                birthDate: formatDateForInput(initialData.birth_date),
                salary: initialData.salary || '',
                effectiveDate: formatDateForInput(new Date()),
                pastUsedLeaves: initialData.past_used_leaves || '',
                status: initialData.status || 'active',
                iban: initialData.iban || '',
                notes: initialData.notes || ''
            })
            setSalaryChanged(false)
        }
    }, [initialData])

    const handleChange = (key, value) => {
        setForm(prev => {
            const next = { ...prev, [key]: value }
            if (key === 'salary' && initialData) {
                setSalaryChanged(parseFloat(value || 0) !== parseFloat(initialData.salary || 0))
            }
            return next
        })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(form)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <CustomInput
                    label="Ad *"
                    value={form.firstName}
                    onChange={(val) => handleChange('firstName', val)}
                    required
                    maxLength={50}
                />
                <CustomInput
                    label="Soyad *"
                    value={form.lastName}
                    onChange={(val) => handleChange('lastName', val)}
                    required
                    maxLength={50}
                />
                <CustomInput
                    label="TC Kimlik No"
                    format="tc_no"
                    value={form.tcNo}
                    onChange={(val) => handleChange('tcNo', val)}
                />
                <CustomInput
                    label="Telefon"
                    format="phone"
                    value={form.phone}
                    onChange={(val) => handleChange('phone', val)}
                />
                <CustomInput
                    label="E-posta"
                    type="email"
                    value={form.email}
                    onChange={(val) => handleChange('email', val)}
                    maxLength={100}
                />
                <CustomInput
                    label="IBAN"
                    format="iban"
                    value={form.iban}
                    onChange={(val) => handleChange('iban', val)}
                    placeholder="TR__ ____ ____ ____ ____ ____ __"
                />
                <CustomInput
                    label="Pozisyon / Unvan"
                    value={form.position}
                    onChange={(val) => handleChange('position', val)}
                    maxLength={100}
                />
                <CustomSelect
                    label="Departman"
                    value={form.department}
                    onChange={(val) => handleChange('department', val)}
                    options={departmentOptions}
                    placeholder="Seçiniz..."
                />
                <CustomInput
                    label="İşe Başlama Tarihi"
                    type="date"
                    value={form.startDate}
                    onChange={(val) => handleChange('startDate', val)}
                />
                <CustomInput
                    label="Doğum Tarihi"
                    type="date"
                    value={form.birthDate}
                    onChange={(val) => handleChange('birthDate', val)}
                />
                {initialData ? (
                    <div className="form-group floating-label-group has-value" style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="form-input" style={{ 
                                flex: 1, 
                                display: 'flex', 
                                alignItems: 'center', 
                                background: 'var(--bg-tertiary)', 
                                opacity: 0.7,
                                cursor: 'not-allowed',
                                position: 'relative',
                                height: '40px'
                            }}>
                                {form.salary ? formatCurrency(form.salary) : '-'}
                                <span style={{ position: 'absolute', right: '12px', color: 'var(--text-muted)' }}>₺</span>
                            </div>
                            <button 
                                type="button" 
                                className="btn btn-secondary"
                                style={{ height: '40px' }}
                                onClick={() => {
                                    if (onEditSalary) {
                                        onEditSalary()
                                    } else {
                                        openNewTab('/payroll', false, 'Maaş Tablosu')
                                    }
                                }}
                            >
                                Maaş Düzenle
                            </button>
                        </div>
                        <label className="form-label">Maaş (₺)</label>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                            Maaş güncellemeleri için Maaş Tablosu sayfasını kullanın.
                        </span>
                    </div>
                ) : (
                    <CustomInput
                        label="Maaş (₺)"
                        format="currency"
                        value={form.salary}
                        onChange={(val) => handleChange('salary', val)}
                    />
                )}
                {salaryChanged && (
                    <CustomInput
                        label="Maaş Zammı Geçerlilik Tarihi (Hangi Günden İtibaren)"
                        type="date"
                        value={form.effectiveDate}
                        onChange={(val) => handleChange('effectiveDate', val)}
                        required
                    />
                )}
                <CustomInput
                    label="Geçmiş Kullanılan Yıllık İzin (Gün)"
                    type="number"
                    value={form.pastUsedLeaves}
                    onChange={(val) => handleChange('pastUsedLeaves', val)}
                    min={0}
                />
                <CustomSelect
                    label="Durum"
                    value={form.status}
                    onChange={(val) => handleChange('status', val)}
                    options={statusOptions}
                />
            </div>

            <div style={{ marginTop: '16px' }}>
                <CustomInput
                    label="Notlar"
                    value={form.notes}
                    onChange={(val) => handleChange('notes', val)}
                    type="textarea"
                    rows={3}
                    maxLength={500}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>Vazgeç</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Kaydet')}
                </button>
            </div>
        </form>
    )
}
