import { z } from 'zod';

export const insuranceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'Sigorta türü zorunludur').max(50, 'Sigorta türü en fazla 50 karakter olabilir'),
    company: z.string().min(1, 'Sigorta şirketi zorunludur').max(100, 'Sigorta şirketi en fazla 100 karakter olabilir'),
    policyNo: z.string().max(50, 'Poliçe No en fazla 50 karakter olabilir').optional(),
    startDate: z.string().min(1, 'Başlangıç tarihi zorunludur'),
    endDate: z.string().min(1, 'Bitiş tarihi zorunludur'),
    premium: z.coerce.number().min(0, 'Geçersiz tutar').max(999999999, 'Tutar çok yüksek').optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    filePath: z.any().optional()
});

