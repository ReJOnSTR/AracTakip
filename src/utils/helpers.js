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
    if (days < 0) return 'danger'      // Gecikmiş - kırmızı
    if (days <= 7) return 'warning'    // 7 gün veya daha az - turuncu
    if (days <= 30) return 'warning'   // 30 gün veya daha az - turuncu
    return 'success'                   // 30 günden fazla - yeşil
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
