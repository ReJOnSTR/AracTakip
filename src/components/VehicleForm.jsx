
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { vehicleSchema } from '../schemas/vehicleSchema'
import CustomInput from './CustomInput'
import CustomSelect from './CustomSelect'
import { Car, Building2 } from 'lucide-react'
import { vehicleTypes, vehicleStatuses } from '../utils/helpers'

export default function VehicleForm({ initialData, onSubmit, onCancel, loading }) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(vehicleSchema),
        defaultValues: {
            type: 'automobile',
            plate: '',
            brand: '',
            model: '',
            year: '',
            color: '',
            km: 0,
            status: 'active',
            notes: '',
            image: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                type: initialData.type || 'automobile',
                plate: initialData.plate || '',
                brand: initialData.brand || '',
                model: initialData.model || '',
                year: initialData.year ? initialData.year.toString() : '',
                color: initialData.color || '',
                km: initialData.km || 0,
                status: initialData.status || 'active',
                notes: initialData.notes || '',
                image: initialData.image || ''
            })
        }
    }, [initialData, reset])

    const onFormSubmit = (data) => {
        console.log('Form Submitted (Valid):', data)
        onSubmit(data)
    }

    console.log('Form Errors:', errors)

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                {/* LEFT COLUMN: Basic Info */}
                <div>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Car size={15} /> Temel Bilgiler
                    </div>

                    <div className="form-row">
                        <Controller
                            name="type"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    label="Araç Türü"
                                    className="form-select-custom"
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={vehicleTypes}
                                    placeholder="Seçiniz"
                                    error={errors.type?.message}
                                />
                            )}
                        />
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    label="Durum"
                                    className="form-select-custom"
                                    value={field.value}
                                    onChange={field.onChange}
                                    options={vehicleStatuses}
                                    placeholder="Seçiniz"
                                    error={errors.status?.message}
                                />
                            )}
                        />
                    </div>

                    <div className="form-group">
                        <Controller
                            name="plate"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    label="Plaka"
                                    required={true}
                                    value={field.value}
                                    onChange={field.onChange}
                                    format="plate"
                                    placeholder="34 ABC 123"
                                    floatingLabel={true}
                                    error={errors.plate?.message}
                                />
                            )}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <Controller
                                name="brand"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Marka"
                                        value={field.value}
                                        onChange={field.onChange}
                                        format="title"
                                        placeholder="Örn: Ford"
                                        floatingLabel={true}
                                        error={errors.brand?.message}
                                    />
                                )}
                            />
                        </div>
                        <div className="form-group">
                            <Controller
                                name="model"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Model"
                                        value={field.value}
                                        onChange={field.onChange}
                                        format="title"
                                        placeholder="Örn: Focus"
                                        floatingLabel={true}
                                        error={errors.model?.message}
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Details */}
                <div>
                    <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Building2 size={15} /> Teknik Detaylar
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <Controller
                                name="year"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Yıl"
                                        type="number"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="2024"
                                        floatingLabel={true}
                                        error={errors.year?.message}
                                    />
                                )}
                            />
                        </div>
                        <div className="form-group">
                            <Controller
                                name="km"
                                control={control}
                                render={({ field }) => (
                                    <CustomInput
                                        label="Kilometre"
                                        type="number"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="0"
                                        floatingLabel={true}
                                        error={errors.km?.message}
                                    />
                                )}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <Controller
                            name="color"
                            control={control}
                            render={({ field }) => (
                                <CustomInput
                                    label="Renk"
                                    value={field.value}
                                    onChange={field.onChange}
                                    format="title"
                                    placeholder="Örn: Beyaz"
                                    floatingLabel={true}
                                    error={errors.color?.message}
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
                                    label="Araç Notları"
                                    value={field.value}
                                    onChange={field.onChange}
                                    multiline={true}
                                    rows={3}
                                    floatingLabel={true}
                                    placeholder="Araç hakkında ek bilgiler..."
                                />
                            )}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={onCancel}>
                    İptal
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </form>
    )
}
