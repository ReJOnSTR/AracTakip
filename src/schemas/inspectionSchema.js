import { z } from 'zod';

export const inspectionSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    inspectionDate: z.string().min(1, 'Tarih zorunludur'),
    nextInspection: z.string().optional(),
    result: z.enum(['passed', 'failed', 'conditional']).optional().or(z.literal('')),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').optional(),
    notes: z.string().optional()
});
