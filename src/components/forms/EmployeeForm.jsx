import { useState, useEffect } from 'react'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'

const departmentOptions = [
    { value: 'Yönetim', label: 'Yönetim' },
    { value: 'Operasyon', label: 'Operasyon' },
    { value: 'Muhasebe', label: 'Muhasebe' },
    { value: 'İnsan Kaynakları', label: 'İnsan Kaynakları' },
    { value: 'Lojistik', label: 'Lojistik' },
    { value: 'Teknik', label: 'Teknik' },
    { value: 'Satış', label: 'Satış' },
    { value: 'Diğer', label: 'Diğer' }
]

const statusOptions = [
    { value: 'active', label: 'Aktif' },
    { value: 'inactive', label: 'Pasif' }
]

export default function EmployeeForm({ initialData, onSubmit, onCancel, loading }) {
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
        pastUsedLeaves: '',
        status: 'active',
        notes: ''
    })

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
                startDate: initialData.start_date || '',
                birthDate: initialData.birth_date || '',
                salary: initialData.salary || '',
                pastUsedLeaves: initialData.past_used_leaves || '',
                status: initialData.status || 'active',
                notes: initialData.notes || ''
            })
        }
    }, [initialData])

    const handleChange = (key, value) => {
        setForm(prev => ({ ...prev, [key]: value }))
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
                />
                <CustomInput
                    label="Soyad *"
                    value={form.lastName}
                    onChange={(val) => handleChange('lastName', val)}
                    required
                />
                <CustomInput
                    label="TC Kimlik No"
                    value={form.tcNo}
                    onChange={(val) => handleChange('tcNo', val)}
                    maxLength={11}
                />
                <CustomInput
                    label="Telefon"
                    value={form.phone}
                    onChange={(val) => handleChange('phone', val)}
                />
                <CustomInput
                    label="E-posta"
                    type="email"
                    value={form.email}
                    onChange={(val) => handleChange('email', val)}
                />
                <CustomInput
                    label="Pozisyon / Unvan"
                    value={form.position}
                    onChange={(val) => handleChange('position', val)}
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
                <CustomInput
                    label="Maaş (₺)"
                    format="currency"
                    value={form.salary}
                    onChange={(val) => handleChange('salary', val)}
                />
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
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                    İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Kaydediliyor...' : (initialData ? 'Güncelle' : 'Kaydet')}
                </button>
            </div>
        </form>
    )
}

