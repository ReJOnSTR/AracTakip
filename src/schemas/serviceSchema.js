import { z } from 'zod';

export const serviceSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    type: z.string().min(1, 'İşlem türü zorunludur').max(50, 'İşlem türü en fazla 50 karakter olabilir'),
    serviceName: z.string().max(100, 'Servis adı en fazla 100 karakter olabilir').optional(),
    description: z.string().min(1, 'Yapılan işlem özeti zorunludur').max(250, 'Açıklama en fazla 250 karakter olabilir'),
    date: z.string().min(1, 'Tarih zorunludur'),
    km: z.coerce.number().min(0, 'Geçersiz KM').max(2000000, 'KM en fazla 2.000.000 olabilir').optional(),
    cost: z.coerce.number().min(0, 'Geçersiz tutar').max(999999999, 'Tutar çok yüksek').optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    filePath: z.any().optional()
});

