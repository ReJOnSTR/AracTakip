
import { z } from 'zod';

export const vehicleSchema = z.object({
    plate: z.string().min(1, 'Plaka zorunludur').regex(/^[0-9]{2}\s?[A-Z]{1,3}\s?[0-9]{2,5}$/, 'Geçersiz plaka formatı (Örn: 34 AB 123)'),
    brand: z.string().min(1, 'Marka zorunludur'),
    model: z.string().min(1, 'Model zorunludur'),
    type: z.enum(['automobile', 'crane', 'truck', 'van', 'pickup', 'forklift', 'excavator', 'other'], {
        errorMap: () => ({ message: 'Araç tipi seçiniz' })
    }),
    year: z.coerce.number().min(1900, 'Geçersiz yıl').max(new Date().getFullYear() + 1, 'Gelecek yıl olamaz'),
    color: z.string().optional(),
    status: z.enum(['active', 'maintenance', 'inactive', 'sold']),
    km: z.coerce.number().min(0, 'KM 0 dan küçük olamaz'),
    notes: z.string().optional(),
    image: z.string().optional()
});
