import { z } from 'zod';

export const inspectionSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    inspectionDate: z.string().min(1, 'Tarih zorunludur'),
    nextInspection: z.string().optional(),
    result: z.enum(['passed', 'failed', 'conditional']).optional().or(z.literal('')),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').max(999999999, 'Tutar çok yüksek').optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    filePath: z.any().optional()
});

