/**
 * Format currency values in Turkish Lira
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '₺0';
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format a date string or Date to localized Turkish date
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format a date for relative display (e.g., "3 gün kaldı", "2 gün geçti")
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Bugün';
  if (diffDays === 1) return 'Yarın';
  if (diffDays > 1) return `${diffDays} gün kaldı`;
  if (diffDays === -1) return 'Dün';
  return `${Math.abs(diffDays)} gün geçti`;
}

/**
 * Get a status badge color key
 */
export function getStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case 'active':
    case 'completed':
    case 'paid':
      return 'success';
    case 'passive':
    case 'sold':
    case 'cancelled':
      return 'textSecondary';
    case 'maintenance':
    case 'pending':
      return 'warning';
    case 'overdue':
    case 'expired':
      return 'error';
    default:
      return 'textSecondary';
  }
}

/**
 * Get Turkish label for status
 */
export function getStatusLabel(status: string | null | undefined): string {
  const map: Record<string, string> = {
    active: 'Aktif',
    passive: 'Pasif',
    maintenance: 'Bakımda',
    sold: 'Satıldı',
    pending: 'Bekliyor',
    completed: 'Tamamlandı',
    paid: 'Ödendi',
    cancelled: 'İptal',
    overdue: 'Gecikmiş',
  };
  return map[status?.toLowerCase() || ''] || status || '-';
}
