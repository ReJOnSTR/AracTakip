import { z } from 'zod';

export const insuranceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'Sigorta türü zorunludur'),
    company: z.string().min(1, 'Sigorta şirketi zorunludur'),
    policyNo: z.string().optional(),
    startDate: z.string().min(1, 'Başlangıç tarihi zorunludur'),
    endDate: z.string().min(1, 'Bitiş tarihi zorunludur'),
    premium: z.coerce.number().min(0, 'Geçersiz tutar').optional(),
    notes: z.string().optional()
});
