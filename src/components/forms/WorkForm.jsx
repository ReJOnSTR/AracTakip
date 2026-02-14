import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { workHeaderSchema } from '../../schemas/workSchema'
import CustomInput from '../CustomInput'
import CustomSelect from '../CustomSelect'

const statusOptions = [
    { value: 'pending', label: 'Bekliyor' },
    { value: 'in_progress', label: 'Devam Ediyor' },
    { value: 'completed', label: 'Tamamlandı' },
    { value: 'cancelled', label: 'İptal Edildi' }
]

export default function WorkForm({ initialData, onSubmit, onCancel, loading }) {
    const {
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(workHeaderSchema),
        defaultValues: {
            title: '',
            customer: '',
            description: '',
            status: 'pending',
            location: ''
        }
    })

    useEffect(() => {
        if (initialData) {
            reset({
                title: initialData.title || '',
                customer: initialData.customer || '',
                description: initialData.description || '',
                status: initialData.status || 'pending',
                location: initialData.location || ''
            })
        } else {
            reset({
                title: '',
                customer: '',
                description: '',
                status: 'pending',
                location: ''
            })
        }
    }, [initialData, reset])

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="İş Başlığı"
                                required={true}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.title?.message}
                                placeholder="Örn: Vinç Kiralama"
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="customer"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Müşteri / Firma"
                                required={true}
                                value={field.value}
                                onChange={field.onChange}
                                error={errors.customer?.message}
                                placeholder="Müşteri adı"
                            />
                        )}
                    />
                </div>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <Controller
                        name="status"
                        control={control}
                        render={({ field }) => (
                            <CustomSelect
                                label="Durum"
                                className="form-select-custom"
                                value={field.value}
                                onChange={field.onChange}
                                options={statusOptions}
                                error={errors.status?.message}
                            />
                        )}
                    />
                </div>
                <div className="form-group">
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <CustomInput
                                label="Konum / Adres"
                                value={field.value}
                                onChange={field.onChange}
                                placeholder="İşin yapılacağı yer"
                                error={errors.location?.message}
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
                            multiline={true}
                            rows={3}
                            placeholder="İş detayları..."
                            error={errors.description?.message}
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
