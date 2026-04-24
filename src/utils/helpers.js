// Date formatting helpers
export function formatDate(dateString) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

export function formatShortDate(dateString) {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    })
}

export function today() {
    return new Date().toISOString().split('T')[0]
}

export function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-'
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount)
}

export function getDaysUntil(dateString) {
    if (!dateString) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(dateString)
    targetDate.setHours(0, 0, 0, 0)
    const diffTime = targetDate - today
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

export function getDaysUntilText(dateString) {
    const days = getDaysUntil(dateString)
    if (days === null) return '-'
    if (days < 0) return `${Math.abs(days)} gün geçti`
    if (days === 0) return 'Bugün'
    if (days === 1) return 'Yarın'
    return `${days} gün kaldı`
}

export function getStatusColor(days) {
    if (days === null) return 'neutral'
    if (days < 0) return 'danger'           // Gecikmiş - koyu kırmızı
    if (days <= 3) return 'danger-light'    // 3 gün veya daha az - açık kırmızı
    if (days <= 15) return 'warning'        // 15 gün veya daha az - turuncu
    return 'success'                        // 15 günden fazla - yeşil
}

export const vehicleTypes = [
    { value: 'automobile', label: 'Otomobil' },
    { value: 'crane', label: 'Vinç' },
    { value: 'truck', label: 'Kamyon' },
    { value: 'van', label: 'Minibüs' },
    { value: 'pickup', label: 'Pikap' },
    { value: 'forklift', label: 'Forklift' },
    { value: 'excavator', label: 'Ekskavatör' },
    { value: 'other', label: 'Diğer' }
]

export const vehicleStatuses = [
    { value: 'active', label: 'Aktif', color: 'success' },
    { value: 'maintenance', label: 'Bakımda', color: 'warning' },
    { value: 'inactive', label: 'Pasif', color: 'neutral' },
    { value: 'sold', label: 'Satıldı', color: 'danger' }
]

export const maintenanceTypes = [
    { value: 'oil', label: 'Yağ Değişimi' },
    { value: 'filter', label: 'Filtre Değişimi' },
    { value: 'brake', label: 'Fren Bakımı' },
    { value: 'tire', label: 'Lastik Değişimi' },
    { value: 'battery', label: 'Akü Değişimi' },
    { value: 'general', label: 'Genel Bakım' },
    { value: 'repair', label: 'Onarım' },
    { value: 'other', label: 'Diğer' }
]

export const insuranceTypes = [
    { value: 'kasko', label: 'Kasko' },
    { value: 'traffic', label: 'Trafik Sigortası' },
    { value: 'full', label: 'Tam Paket' },
    { value: 'other', label: 'Diğer' }
]

export const serviceTypes = [
    { value: 'maintenance', label: 'Periyodik Bakım' },
    { value: 'repair', label: 'Mekanik Tamir' },
    { value: 'tire', label: 'Lastik İşlemleri' },
    { value: 'body', label: 'Kaporta/Boya' },
    { value: 'electrical', label: 'Elektrik/Elektronik' },
    { value: 'glass', label: 'Cam Değişimi' },
    { value: 'ac', label: 'Klima Bakımı' },
    { value: 'other', label: 'Diğer' }
]

export function getVehicleTypeLabel(type) {
    return vehicleTypes.find(t => t.value === type)?.label || type
}

export function getVehicleStatusInfo(status) {
    return vehicleStatuses.find(s => s.value === status) || { label: status, color: 'neutral' }
}

export function getMaintenanceTypeLabel(type) {
    return maintenanceTypes.find(t => t.value === type)?.label || type
}

export function getInsuranceTypeLabel(type) {
    return insuranceTypes.find(t => t.value === type)?.label || type
}

export const workStatuses = [
    { value: 'pending', label: 'Bekliyor', color: 'neutral' },
    { value: 'in_progress', label: 'Devam Ediyor', color: 'warning' },
    { value: 'completed', label: 'Tamamlandı', color: 'info' },
    { value: 'paid', label: 'Ödendi / Tahsil Edildi', color: 'success' },
    { value: 'cancelled', label: 'İptal Edildi', color: 'danger' }
]

export function getWorkStatusLabel(status) {
    return workStatuses.find(s => s.value === status)?.label || status
}

export function getWorkStatusColor(status) {
    return workStatuses.find(s => s.value === status)?.color || 'neutral'
}

/**
 * Calculates the active base salary for a given month by evaluating the employee_salary_history timeline.
 * @param {Object} employee - Employee object containing `salary` and `employee_salary_history`
 * @param {String} targetMonth - The target month string (e.g. "2026-04" or "2026-04-15")
 * @returns {Number} Active base salary
 */
export function getHistoricalBaseSalary(employee, targetMonth) {
    if (!employee) return 0
    // If no history exists, fallback to standard salary field
    if (!employee.employee_salary_history || employee.employee_salary_history.length === 0) {
        return employee.salary || 0
    }

    const tMonth = new Date(targetMonth)
    // Find the record valid in this month.
    // Validity: start_date is before or ON the target month's end, and end_date is after or null.
    // If we only have "YYYY-MM", we compare to the end of the month.
    const year = tMonth.getFullYear()
    const month = tMonth.getMonth()
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59)

    // Sort history by start date descending to find the closest match going backwards
    const sortedHistory = [...employee.employee_salary_history].sort((a, b) => new Date(b.start_date) - new Date(a.start_date))

    for (const record of sortedHistory) {
        const start = new Date(record.start_date)
        const end = record.end_date ? new Date(record.end_date) : null

        // This record was active during this month if:
        // - start date is before or equal to the end of the month
        // - end date is null OR after the START of the month
        const startOfMonth = new Date(year, month, 1, 0, 0, 0)
        
        if (start <= endOfMonth && (!end || end >= startOfMonth)) {
            return record.amount || 0
        }
    }

    // Default fallback: if no match found, take the EARLIEST known salary record
    // This handles cases where target month is before the first recorded history entry
    const earliestRecord = [...employee.employee_salary_history].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0]
    return earliestRecord?.amount || employee.salary || 0
}

/**
 * Safely formats any date-like string or object into YYYY-MM-DD for HTML date inputs.
 * @param {any} dateValue - The date to format
 * @returns {string} - YYYY-MM-DD or empty string
 */
export function formatDateForInput(dateValue) {
    if (!dateValue) return ''
    try {
        const date = new Date(dateValue)
        if (isNaN(date.getTime())) return ''
        return date.toISOString().split('T')[0]
    } catch (e) {
        console.error('Error formatting date for input:', e)
        return ''
    }
}
