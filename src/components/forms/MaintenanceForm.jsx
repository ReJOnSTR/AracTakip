import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { maintenanceSchema } from '../../schemas/maintenanceSchema'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { maintenanceTypes } from '../../utils/helpers'

export default function MaintenanceForm({ initialData, onSubmit, onCancel, vehicles, loading }) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(maintenanceSchema),
        defaultValues: {
            vehicleId: '',
            type: 'general',
            description: '',
            date: new Date().toISOString().split('T')[0],
            cost: '',
            nextKm: '',
            nextDate: '',
            notes: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                vehicleId: initialData.vehicle_id || initialData.vehicleId || '',
                type: initialData.type || 'general',
                description: initialData.description || '',
                date: initialData.date || new Date().toISOString().split('T')[0],
                cost: initialData.cost || '',
                nextKm: initialData.next_km || initialData.nextKm || '',
                nextDate: initialData.next_date || initialData.nextDate || '',
                notes: initialData.notes || ''
            })
        } else {
            // Reset to defaults if no initialData (important for "New" after "Edit")
            reset({
                vehicleId: '',
                type: 'general',
                description: '',
                date: new Date().toISOString().split('T')[0],
                cost: '',
                nextKm: '',
                nextDate: '',
                notes: ''
            })
        }

        // If vehicles list has only one item (context-aware add), auto-select it
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
                            disabled={vehicles.length === 1} // Lock if only one vehicle context
                        />
                    )}
                />
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            label="Bakım Türü"
                            className="form-select-custom"
                            value={field.value}
                            onChange={field.onChange}
                            options={maintenanceTypes}
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
                        name="cost"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Maliyet (₺)"
                                type="number"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="0.00"
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
                            label="Açıklama"
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.description?.message}
                        />
                    )}
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="nextKm"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Sonraki KM"
                                type="number"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="0"
                                error={errors.nextKm?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="nextDate"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Sonraki Bakım Tarihi"
                                type="date"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.nextDate?.message}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-group">
                <Controller
                    name="notes"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            label="Notlar"
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
