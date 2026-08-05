import * as XLSX from 'xlsx';
import { calculateWorkStats } from './workCalculations';
import { formatDate } from './helpers';

/**
 * Export a Work Puantaj Report to an Excel file matching the PDF report structure.
 * 
 * @param {Object} work - The work object
 * @param {Array} vehicles - Company vehicles array for vehicle name resolution
 * @param {Object} options - Export options (showPrices, showKdv, kdvRate, pazarMultiplier, mesaiMultiplier)
 */
export function exportWorkToExcel(work, vehicles = [], options = {}) {
    if (!work) return;

    const {
        showPrices = true,
        showKdv = false,
        kdvRate = 20,
        pazarMultiplier = 1.5,
        mesaiMultiplier = 1.5
    } = options;

    const calcResult = calculateWorkStats(work?.items || [], pazarMultiplier, mesaiMultiplier, vehicles);
    const groups = calcResult.groups || [];
    const grandTotal = calcResult.grandTotal || 0;

    const rows = [];

    // 1. Header Info Section
    const companyName = work.company_name || work.company?.name || work.customer_name || work.customer || '';
    const workTitle = work.title || work.work_no || 'İş Raporu';
    const workDate = formatDate(work.date);

    rows.push(['FİRMA / MÜŞTERİ:', companyName]);
    rows.push(['İŞ / PROJE TANIMI:', workTitle]);
    rows.push(['TARİH:', workDate]);
    rows.push(['RAPOR TÜRÜ:', 'PUANTAJ İŞ RAPORU']);
    rows.push([]); // Blank line

    // 2. Per-Vehicle Sections
    groups.forEach((group) => {
        const machineTitle = (group.rawMachineName || group.machineName || 'Belirtilmemiş').toUpperCase();
        
        // Vehicle Section Title
        rows.push([`MAKİNE DETAYLARI: ${machineTitle}`]);

        // Table Headers
        const tableHeaders = [
            'Tarih',
            'Fiş No',
            'Başlama Saat',
            'Bitiş Saat',
            'Süre / Adet',
            'Fazla Mesai',
            'Makina',
            'Açıklama'
        ];
        if (showPrices) {
            tableHeaders.push('Fiyat (TL)');
        }
        rows.push(tableHeaders);

        // Table Data Rows
        const groupItems = group.items || [];
        groupItems.forEach((item) => {
            const desc = item.description || '';
            const cleanDesc = desc.replace(/\[[^\]]*\]\s*/g, '').trim();
            const unitText = desc.toUpperCase().includes('[SAATLİK]') ? 'Saat' : 'Gün';

            let priceVal = '';
            if (showPrices) {
                if (item.isPazar && !desc.includes('[KATSAYI:')) {
                    const baseP = item.unit_price || item.unitPriceVal || 0;
                    const dailyP = (baseP > 10000 && item.isAylik) ? baseP / 26 : baseP;
                    priceVal = dailyP > 0 ? dailyP * pazarMultiplier : 0;
                } else {
                    priceVal = item.unit_price || item.unitPriceVal || 0;
                }
            }

            const rowData = [
                formatDate(item.date),
                item.receipt_no || '-',
                item.start_time || '-',
                item.end_time || '-',
                `${item.hours || 0} ${unitText}`,
                item.overtime_hours > 0 ? `${item.overtime_hours} Saat` : '-',
                group.rawMachineName || group.machineName,
                cleanDesc
            ];
            if (showPrices) {
                rowData.push(priceVal);
            }
            rows.push(rowData);
        });

        // Group Summary Sub-table
        rows.push([]);
        rows.push([`${machineTitle} ÖZETİ`]);
        const summaryHeaders = ['İşlem Türü', 'Miktar / Süre', 'Birim Fiyat (TL)'];
        if (showPrices) summaryHeaders.push('Toplam Tutar (TL)');
        rows.push(summaryHeaders);

        const summaryLines = group.summaryLines || [];
        summaryLines.forEach((line) => {
            const summaryRow = [
                line.typeLabel,
                line.countText || `${line.count} ${line.unit}`,
                line.unitPrice || 0
            ];
            if (showPrices) summaryRow.push(line.totalPrice || 0);
            rows.push(summaryRow);
        });

        if (showPrices) {
            rows.push([
                `${machineTitle} TOPLAM:`,
                '',
                '',
                group.calculatedGrandTotal || 0
            ]);
        }
        rows.push([]); // Blank separator row
    });

    // 3. Grand Totals Summary Block
    if (showPrices) {
        rows.push(['=== GENEL TOPLAM ÖZETİ ===']);
        rows.push(['ARA TOPLAM (TL):', '', '', grandTotal]);
        if (showKdv) {
            const kdvAmount = (grandTotal * (Number(kdvRate) || 20)) / 100;
            const totalWithKdv = grandTotal + kdvAmount;
            rows.push([`KDV (%${kdvRate}) TUTARI (TL):`, '', '', kdvAmount]);
            rows.push(['GENEL TOPLAM (KDV DAHİL TL):', '', '', totalWithKdv]);
        } else {
            rows.push(['GENEL TOPLAM (TL):', '', '', grandTotal]);
        }
    }

    // Build worksheet
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set Column Widths
    ws['!cols'] = [
        { wch: 14 }, // Tarih
        { wch: 12 }, // Fiş No
        { wch: 14 }, // Başlama
        { wch: 14 }, // Bitiş
        { wch: 16 }, // Süre / Adet
        { wch: 16 }, // Fazla Mesai
        { wch: 26 }, // Makina
        { wch: 38 }, // Açıklama
        { wch: 20 }  // Fiyat
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Puantaj Raporu');

    const sanitizeFileName = (str) => (str || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\-\s]/g, '').trim().replace(/\s+/g, '_');
    const compStr = companyName ? `${sanitizeFileName(companyName)}_` : '';
    const titleStr = workTitle ? sanitizeFileName(workTitle) : 'Puantaj_Raporu';
    const fileName = `Puantaj_${compStr}${titleStr}_${new Date().toISOString().split('T')[0]}.xlsx`;

    XLSX.writeFile(wb, fileName);
}
