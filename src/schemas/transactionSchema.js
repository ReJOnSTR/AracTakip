import { z } from 'zod'

export const transactionSchema = z.object({
    type: z.enum(['IN', 'OUT'], { required_error: 'İşlem tipi seçilmelidir' }),
    method: z.enum(['CASH', 'BANK', 'CHECK'], { required_error: 'İşlem yöntemi seçilmelidir' }),
    amount: z.coerce.number({ invalid_type_error: 'Geçerli bir tutar giriniz' })
        .positive('Tutar 0\'dan büyük olmalıdır'),
    date: z.string().min(1, 'Tarih seçilmelidir'),
    description: z.string().optional(),
    checkNumber: z.string().optional(),
    checkDueDate: z.string().optional(),
    status: z.string().default('COMPLETED')
}).refine(data => {
    // If method is CHECK, checkNumber is required depending on user preference, but we at least need checkDueDate
    if (data.method === 'CHECK' && !data.checkDueDate) {
        return false
    }
    return true
}, {
    message: 'Çek işlemlerinde vade tarihi zorunludur',
    path: ['checkDueDate']
})
