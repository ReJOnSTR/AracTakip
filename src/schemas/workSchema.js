import { z } from 'zod'; // Re-saved for sync

export const workHeaderSchema = z.object({
    title: z.string().min(1, 'İş başlığı zorunludur'),
    customerId: z.union([z.string(), z.number()]).optional().nullable().transform((val) => (val === '' ? null : Number(val))),
    customer: z.string().optional(),
    description: z.string().optional(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    location: z.string().optional(),
    work_start_time: z.string().optional().default('08:00'),
    work_end_time: z.string().optional().default('17:00'),
    status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
    pazar_multiplier: z.union([z.string(), z.number()]).optional().default(1.5).transform((val) => Number(val) || 1.5),
    mesai_multiplier: z.union([z.string(), z.number()]).optional().default(1.5).transform((val) => Number(val) || 1.5)
});

export const workItemSchema = z.object({
    date: z.string().min(1, 'Tarih zorunludur'),
    receiptNo: z.union([z.string(), z.number()]).optional().transform(val => val ? String(val) : ''),
    vehicleId: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
    }),
    employeeId: z.union([z.string(), z.number()]).optional().nullable().transform((val) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
    }),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    hours: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    overtimeHours: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    unitPrice: z.union([z.string(), z.number()]).optional().transform((val) => Number(val) || 0),
    description: z.string().optional()
});
