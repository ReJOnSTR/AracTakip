import { z } from 'zod';

export const maintenanceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'Bakım türü zorunludur'),
    description: z.string().optional(),
    date: z.string().min(1, 'Tarih zorunludur'),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').optional(),
    nextKm: z.coerce.number().min(0, 'Geçersiz KM').optional(),
    nextDate: z.string().optional(),
    notes: z.string().optional()
});
