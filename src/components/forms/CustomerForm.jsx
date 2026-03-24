import { useState, useEffect } from 'react'

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
        setFormData(prev => ({
            ...prev,
            [name]: value
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
        <form onSubmit={handleSubmit} className="form-layout">
            <div className="form-group">
                <label className="form-label">Müşteri Adı / Ünvanı <span className="text-danger">*</span></label>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Müşteri Adı veya Firma Ünvanı"
                    required
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Telefon</label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="05XX XXX XX XX"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">E-Posta</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="ornek@firma.com"
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">Vergi Numarası / T.C. Kimlik</label>
                    <input
                        type="text"
                        name="tax_number"
                        value={formData.tax_number}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Vergi No veya TCKN"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Vergi Dairesi</label>
                    <input
                        type="text"
                        name="tax_office"
                        value={formData.tax_office}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Vergi Dairesi"
                    />
                </div>
            </div>

            <div className="form-group">
                <label className="form-label">Açık Adres</label>
                <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="form-input"
                    rows="2"
                    placeholder="Müşteri açık adresi..."
                />
            </div>

            <div className="form-group">
                <label className="form-label">Notlar</label>
                <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="form-input"
                    rows="3"
                    placeholder="Özel notlar..."
                />
            </div>

            <div className="form-actions">
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
