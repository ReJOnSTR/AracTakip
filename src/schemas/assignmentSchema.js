import { z } from 'zod';

export const assignmentSchema = z.object({
    vehicleId: z.coerce.number().min(1, 'Araç seçimi zorunludur'),
    itemName: z.string().min(1, 'Malzeme/Demirbaş adı zorunludur'),
    quantity: z.coerce.number().min(1, 'Adet en az 1 olmalıdır'),
    assignedTo: z.string().optional(),
    department: z.string().optional(),
    startDate: z.string().min(1, 'Başlangıç tarihi zorunludur'),
    endDate: z.string().optional(),
    notes: z.string().optional()
});
