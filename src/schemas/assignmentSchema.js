import { z } from 'zod';

export const assignmentSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    itemName: z.string().min(1, 'Malzeme/Demirbaş adı zorunludur').max(100, 'Malzeme adı en fazla 100 karakter olabilir'),
    quantity: z.coerce.number().min(1, 'Adet en az 1 olmalıdır').max(9999, 'Adet en fazla 9999 olabilir'),
    assignedTo: z.string().max(100, 'Sorumlu kişi en fazla 100 karakter olabilir').optional(),
    department: z.string().max(50, 'Departman en fazla 50 karakter olabilir').optional(),
    startDate: z.string().min(1, 'Başlangıç tarihi zorunludur'),
    endDate: z.string().optional(),
    notes: z.string().max(500, 'Notlar en fazla 500 karakter olabilir').optional(),
    filePath: z.any().optional()
});

