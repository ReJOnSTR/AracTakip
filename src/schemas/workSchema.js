import { z } from 'zod';

export const workHeaderSchema = z.object({
    title: z.string().min(1, 'İş başlığı zorunludur'),
    customer: z.string().min(1, 'Müşteri adı zorunludur'),
    description: z.string().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    location: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending')
});

export const workItemSchema = z.object({
    date: z.string().min(1, 'Tarih zorunludur'),
    vehicleId: z.union([z.string(), z.number()]).optional().nullable().transform((val) => (val === '' ? null : Number(val))),
    employeeId: z.union([z.string(), z.number()]).optional().nullable().transform((val) => (val === '' ? null : Number(val))),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    overtimeHours: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    unitPrice: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    description: z.string().optional()
});
