import { z } from 'zod';

export const vehicleSchema = z.object({
    plate: z.string().min(2, 'Plaka en az 2 karakter olmalıdır').max(15, 'Plaka en fazla 15 karakter olabilir'),
    brand: z.string().min(1, 'Marka zorunludur').max(50, 'Marka en fazla 50 karakter olabilir'),
    model: z.string().min(1, 'Model zorunludur').max(50, 'Model en fazla 50 karakter olabilir'),
    type: z.string().min(1, 'Araç tipi seçiniz').max(50, 'Araç tipi en fazla 50 karakter olabilir'),
    year: z.coerce.number().min(1900, 'Geçersiz yıl').max(new Date().getFullYear() + 1, 'Gelecek yıl olamaz'),
    color: z.string().max(30, 'Renk en fazla 30 karakter olabilir').optional(),
    status: z.enum(['active', 'maintenance', 'inactive', 'sold']),
    km: z.coerce.number().min(0, 'KM 0 dan küçük olamaz').max(2000000, 'KM en fazla 2.000.000 olabilir'),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    image: z.string().optional()
});
