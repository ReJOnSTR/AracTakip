import { z } from 'zod';

export const maintenanceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'Bakım türü zorunludur').max(50, 'Bakım türü en fazla 50 karakter olabilir'),
    description: z.string().max(250, 'Açıklama en fazla 250 karakter olabilir').optional(),
    date: z.string().min(1, 'Tarih zorunludur'),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').max(999999999, 'Tutar çok yüksek').optional(),
    nextKm: z.coerce.number().min(0, 'Geçersiz KM').max(2000000, 'KM en fazla 2.000.000 olabilir').optional(),
    nextDate: z.string().optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    filePath: z.any().optional()
});

