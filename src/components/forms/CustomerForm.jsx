import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import CustomInput from '../CustomInput'
import { User, Phone, Mail, MapPin, CreditCard, Building2, ClipboardList } from 'lucide-react'

export default function CustomerForm({ initialData = null, onSubmit, onCancel, loading = false }) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            tax_number: '',
            tax_office: '',
            notes: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                name: initialData.name || '',
                phone: initialData.phone || '',
                email: initialData.email || '',
                address: initialData.address || '',
                tax_number: initialData.tax_number || '',
                tax_office: initialData.tax_office || '',
                notes: initialData.notes || ''
            })
        } else {
            reset({
                name: '',
                phone: '',
                email: '',
                address: '',
                tax_number: '',
                tax_office: '',
                notes: ''
            })
        }
    }, [initialData, reset])

    const onFormSubmit = (data) => {
        // Form validation is handled by react-hook-form
        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
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
                        <Controller
                            name="name"
                            control={control}
                            rules={{ required: 'Müşteri adı/ünvanı zorunludur' }}
                            render={({ field }) => (
                                <CustomInput
                                    label="Müşteri Adı / Firma Ünvanı"
                                    required={true}
                                    value={field.value}
                                    onChange={(val) => field.onChange((val || '').toLocaleUpperCase('tr-TR'))}
                                    placeholder="ÜNVAN GİRİNİZ"
                                    floatingLabel={true}
                                    error={errors.name?.message}
                                />
                            )}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <Controller
                                name="phone"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Telefon"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="05XX XXX XX XX"
                                        floatingLabel={true}
                                        icon={<Phone size={14} />}
                                    />
                                )}
                            />
                        </div>
                        <div className="form-group">
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="E-Posta"
                                        type="email"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="ornek@firma.com"
                                        floatingLabel={true}
                                        icon={<Mail size={14} />}
                                    />
                                )}
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
                            <Controller
                                name="tax_number"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Vergi Numarası"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="TCKN veya Vergi No"
                                        floatingLabel={true}
                                        icon={<CreditCard size={14} />}
                                    />
                                )}
                            />
                        </div>
                        <div className="form-group">
                            <Controller
                                name="tax_office"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Vergi Dairesi"
                                        value={field.value}
                                        onChange={(val) => field.onChange((val || '').toLocaleUpperCase('tr-TR'))}
                                        placeholder="Vergi Dairesi"
                                        floatingLabel={true}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <Controller
                            name="address"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    label="Açık Adres"
                                    value={field.value}
                                    onChange={field.onChange}
                                    multiline={true}
                                    rows={2}
                                    placeholder="Adres detayları..."
                                    floatingLabel={true}
                                    icon={<MapPin size={14} />}
                                />
                            )}
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    label="Özel Notlar"
                                    value={field.value}
                                    onChange={field.onChange}
                                    multiline={true}
                                    rows={2}
                                    placeholder="Müşteri hakkında ek notlar..."
                                    floatingLabel={true}
                                    icon={<ClipboardList size={14} />}
                                />
                            )}
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
