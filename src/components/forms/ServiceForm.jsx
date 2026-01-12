import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { serviceSchema } from '../../schemas/serviceSchema'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { serviceTypes } from '../../utils/helpers'

export default function ServiceForm({ initialData, onSubmit, onCancel, vehicles, loading }) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(serviceSchema),
        defaultValues: {
            vehicleId: '',
            type: 'Genel Bakım',
            serviceName: '',
            description: '',
            date: new Date().toISOString().split('T')[0],
            km: '',
            cost: '',
            notes: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                vehicleId: initialData.vehicle_id || initialData.vehicleId || '',
                type: initialData.type || 'Genel Bakım',
                serviceName: initialData.service_name || initialData.serviceName || '',
                description: initialData.description || '',
                date: initialData.date || new Date().toISOString().split('T')[0],
                km: initialData.km || '',
                cost: initialData.cost || '',
                notes: initialData.notes || ''
            })
        } else {
            reset({
                vehicleId: '',
                type: 'Genel Bakım',
                serviceName: '',
                description: '',
                date: new Date().toISOString().split('T')[0],
                km: '',
                cost: '',
                notes: ''
            })
        }

        if (vehicles && vehicles.length === 1 && !initialData) {
            setValue('vehicleId', vehicles[0].id)
        }
    }, [initialData, reset, vehicles, setValue])

    const onFormSubmit = (data) => {
        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            <div className="form-row">
                <Controller
                    name="vehicleId"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            label="Araç"
                            required={true}
                            className="form-select-custom"
                            value={field.value}
                            onChange={field.onChange}
                            options={vehicles.map(v => ({ value: v.id, label: `${v.plate} - ${v.brand} ${v.model}` }))}
                            placeholder="Araç seçin"
                            error={errors.vehicleId?.message}
                            disabled={vehicles.length === 1}
                        />
                    )}
                />
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            label="İşlem Türü"
                            className="form-select-custom"
                            value={field.value}
                            onChange={field.onChange}
                            options={serviceTypes}
                            placeholder="Seçiniz"
                            error={errors.type?.message}
                        />
                    )}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Tarih"
                                type="date"
                                required={true}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.date?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="serviceName"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Servis Yeri / Firma"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="Örn: Oto Koç, Sanayi..."
                                error={errors.serviceName?.message}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="km"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="KM"
                                type="number"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.km?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="cost"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Maliyet (₺)"
                                type="number"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.cost?.message}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-group">
                <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            label="Yapılan İşlem Özeti"
                            required={true}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.description?.message}
                        />
                    )}
                />
            </div>

            <div className="form-group">
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            label="Detaylı Notlar"
                            value={field.value}
                            onChange={field.onChange}
                            multiline={true}
                            rows={3}
                            error={errors.notes?.message}
                        />
                    )}
                />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
