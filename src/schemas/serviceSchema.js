import { z } from 'zod';

export const serviceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'İşlem türü zorunludur'),
    serviceName: z.string().optional(),
    description: z.string().min(1, 'Yapılan işlem özeti zorunludur'),
    date: z.string().min(1, 'Tarih zorunludur'),
    km: z.coerce.number().min(0, 'Geçersiz KM').optional(),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').optional(),
    notes: z.string().optional()
});
