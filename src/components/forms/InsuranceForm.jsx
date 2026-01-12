import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { insuranceSchema } from '../../schemas/insuranceSchema'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'
import { insuranceTypes } from '../../utils/helpers'
import { AlertCircle } from 'lucide-react'

export default function InsuranceForm({ initialData, onSubmit, onCancel, vehicles, loading, error }) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(insuranceSchema),
        defaultValues: {
            vehicleId: '',
            type: 'traffic',
            company: '',
            policyNo: '',
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            premium: '',
            notes: ''
        }
    })

    const startDate = watch('startDate')

    useEffect(() => {
        if (initialData) {
            reset({
                vehicleId: initialData.vehicle_id || initialData.vehicleId || '',
                type: initialData.type || 'traffic',
                company: initialData.company || '',
                policyNo: initialData.policy_no || initialData.policyNo || '',
                startDate: initialData.start_date || initialData.startDate || new Date().toISOString().split('T')[0],
                endDate: initialData.end_date || initialData.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                premium: initialData.premium || '',
                notes: initialData.notes || ''
            })
        } else {
            reset({
                vehicleId: '',
                type: 'traffic',
                company: '',
                policyNo: '',
                startDate: new Date().toISOString().split('T')[0],
                endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                premium: '',
                notes: ''
            })
        }

        if (vehicles && vehicles.length === 1 && !initialData) {
            setValue('vehicleId', vehicles[0].id)
        }
    }, [initialData, reset, vehicles, setValue])

    // Auto-calculate end date (+1 year) when start date changes
    useEffect(() => {
        if (startDate) {
            const date = new Date(startDate)
            date.setFullYear(date.getFullYear() + 1)
            setValue('endDate', date.toISOString().split('T')[0])
        }
    }, [startDate, setValue])

    const onFormSubmit = (data) => {
        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit(onFormSubmit)}>
            {error && (
                <div style={{
                    padding: '12px 16px',
                    background: 'var(--danger-bg)',
                    color: 'var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    marginBottom: '16px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    lineHeight: '1.4'
                }}>
                    <AlertCircle size={20} className="flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}
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
                    name="company"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            label="Sigorta Şirketi"
                            required={true}
                            value={field.value}
                            onChange={field.onChange}
                            format="title"
                            error={errors.company?.message}
                        />
                    )}
                />
            </div>

            <div className="form-row">
                <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                        <CustomSelect
                            label="Sigorta Türü"
                            className="form-select-custom"
                            value={field.value}
                            onChange={field.onChange}
                            options={insuranceTypes}
                            placeholder="Seçiniz"
                            error={errors.type?.message}
                        />
                    )}
                />
                <div className="form-group">
                    <Controller
                        name="policyNo"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Poliçe No"
                                value={field.value}
                                onChange={field.onChange}
                                format="uppercase"
                                error={errors.policyNo?.message}
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
                                required={true}
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
                    name="premium"
                    control={control}
                    render={({ field }) => (
                        <CustomInput
                            label="Prim (₺)"
                            type="number"
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="0.00"
                            error={errors.premium?.message}
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
