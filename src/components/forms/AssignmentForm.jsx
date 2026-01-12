import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assignmentSchema } from '../../schemas/assignmentSchema'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'

export default function AssignmentForm({ initialData, onSubmit, onCancel, vehicles, loading }) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(assignmentSchema),
        defaultValues: {
            vehicleId: '',
            itemName: '',
            quantity: '1',
            assignedTo: '',
            department: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            notes: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                vehicleId: initialData.vehicle_id || initialData.vehicleId || '',
                itemName: initialData.item_name || initialData.itemName || '',
                quantity: initialData.quantity || '1',
                assignedTo: initialData.assigned_to || initialData.assignedTo || '',
                department: initialData.department || '',
                startDate: initialData.start_date || initialData.startDate || new Date().toISOString().split('T')[0],
                endDate: initialData.end_date || initialData.endDate || '',
                notes: initialData.notes || ''
            })
        } else {
            reset({
                vehicleId: '',
                itemName: '',
                quantity: '1',
                assignedTo: '',
                department: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
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

            <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                    <Controller
                        name="itemName"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Malzeme/Demirbaş Adı"
                                required={true}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.itemName?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <Controller
                        name="quantity"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Adet"
                                type="number"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.quantity?.message}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="assignedTo"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Sorumlu Kişi (Opsiyonel)"
                                value={field.value}
                                onChange={field.onChange}
                                format="title"
                                error={errors.assignedTo?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="department"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Departman"
                                value={field.value}
                                onChange={field.onChange}
                                format="title"
                                error={errors.department?.message}
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="startDate"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Başlangıç Tarihi"
                                type="date"
                                required={true}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.startDate?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="endDate"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Bitiş Tarihi"
                                type="date"
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.endDate?.message}
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
