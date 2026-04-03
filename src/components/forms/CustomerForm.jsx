import { useState, useEffect } from 'react'
import CustomInput from '../CustomInput'
import { User, Phone, Mail, MapPin, CreditCard, Building2, ClipboardList } from 'lucide-react'

export default function CustomerForm({ initialData = null, onSubmit, onCancel, loading = false }) {
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        tax_number: '',
        tax_office: '',
        notes: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                address: initialData.address || '',
                tax_number: initialData.tax_number || '',
                tax_office: initialData.tax_office || '',
                notes: initialData.notes || ''
            })
        }
    }, [initialData])

    const handleChange = (e) => {
        const { name, value } = e.target
        let finalValue = value;
        
        if (name === 'name' || name === 'tax_office') {
            finalValue = value.toLocaleUpperCase('tr-TR');
        }

        setFormData(prev => ({
            ...prev,
            [name]: finalValue
        }))
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        // Form validation
        if (!formData.name.trim()) {
            alert('Müşteri adı/ünvanı zorunludur.')
            return
        }
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit}>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {/* Section 1: Kimlik ve İletişim */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <User size={15} /> Kimlik ve İletişim
                    </div>

                    <div className="form-group">
                        <CustomInput
                            label="Müşteri Adı / Firma Ünvanı"
                            required={true}
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="ÜNVAN GİRİNİZ"
                            floatingLabel={true}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <CustomInput
                                label="Telefon"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="05XX XXX XX XX"
                                floatingLabel={true}
                                icon={<Phone size={14} />}
                            />
                        </div>
                        <div className="form-group">
                            <CustomInput
                                label="E-Posta"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="ornek@firma.com"
                                floatingLabel={true}
                                icon={<Mail size={14} />}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Ticari ve Adres Bilgileri */}
                <div style={{ marginBottom: '24px' }}>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Building2 size={15} /> Ticari ve Adres Bilgileri
                    </div>

                    <div className="form-row" style={{ gap: '16px' }}>
                        <div className="form-group">
                            <CustomInput
                                label="Vergi Numarası"
                                name="tax_number"
                                value={formData.tax_number}
                                onChange={handleChange}
                                placeholder="TCKN veya Vergi No"
                                floatingLabel={true}
                                icon={<CreditCard size={14} />}
                            />
                        </div>
                        <div className="form-group">
                            <CustomInput
                                label="Vergi Dairesi"
                                name="tax_office"
                                value={formData.tax_office}
                                onChange={handleChange}
                                placeholder="Vergi Dairesi"
                                floatingLabel={true}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <CustomInput
                            label="Açık Adres"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            multiline={true}
                            rows={2}
                            placeholder="Adres detayları..."
                            floatingLabel={true}
                            icon={<MapPin size={14} />}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <CustomInput
                            label="Özel Notlar"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            multiline={true}
                            rows={2}
                            placeholder="Müşteri hakkında ek notlar..."
                            floatingLabel={true}
                            icon={<ClipboardList size={14} />}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>
                    İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </form>
    )
}
