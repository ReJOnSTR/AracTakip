import { calculateWorkStats } from './workCalculations'
import { formatDate, formatCurrency } from './helpers'

/**
 * Export a Work Puantaj Report to an Excel file (.xls/.xlsx) that is
 * 100% TRULY IDENTICAL to the WorkPdfReport preview layout, including:
 * - Exact header title & border structure
 * - Vehicle section headers
 * - Column names and data formatting
 * - Right-aligned vehicle summary tables
 * - Right-aligned general grand total summary box
 * 
 * @param {Object} work - The work object
 * @param {Array} vehicles - Company vehicles array for vehicle name resolution
 * @param {Object} options - Export options (showPrices, showKdv, kdvRate, pazarMultiplier, mesaiMultiplier)
 */
export function exportWorkToExcel(work, vehicles = [], options = {}) {
    if (!work) return

    const {
        showPrices = true,
        showKdv = false,
        kdvRate = 20,
        pazarMultiplier = 1.5,
        mesaiMultiplier = 1.5
    } = options

    const calcResult = calculateWorkStats(work?.items || [], pazarMultiplier, mesaiMultiplier, vehicles)
    const groups = calcResult.groups || []
    const grandTotal = calcResult.grandTotal || 0

    const companyName = work.company_name || work.company?.name || work.customer_name || work.customer || '-'
    const workTitle = work.title || work.work_no || 'İş Raporu'
    const reportDate = new Date().toLocaleDateString('tr-TR')

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Puantaj Raporu</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000000; background: #ffffff; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 15px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 11px; vertical-align: middle; }
  th { background-color: #f1f5f9; color: #000000; font-weight: bold; text-align: center; }
  .pdf-title-standard { font-size: 20px; font-weight: bold; margin: 0; color: #000000; }
  .pdf-date-label { font-size: 11px; color: #666666; }
  .pdf-date-value { font-weight: bold; font-size: 13px; color: #000000; }
  .row-red { background-color: #fff1f2 !important; color: #be123c !important; font-weight: bold; }
  .row-orange { background-color: #ffedd5 !important; color: #c2410c !important; }
  .row-blue { background-color: #dbeafe !important; color: #1d4ed8 !important; }
  .row-green { background-color: #dcfce7 !important; color: #15803d !important; }
  .row-purple { background-color: #f3e8ff !important; color: #6b21a8 !important; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .bold { font-weight: bold; }
  .total-text { font-weight: bold; color: #000000; }
  .bg-light-gray { background-color: #f8fafc; }
</style>
</head>
<body>

<!-- Header Block (Matched WorkPdfReport.jsx) -->
<table style="border: none; width: 100%; margin-bottom: 5px;">
  <tr>
    <td colspan="6" style="border: none; border-bottom: 2px solid #000000; padding-bottom: 10px;">
      <h1 class="pdf-title-standard">
        ${work.work_no ? `İŞ RAPORU - ${work.work_no}` : 'İŞ RAPORU / PUANTAJ CETVELİ'}
      </h1>
    </td>
    <td colspan="3" style="border: none; border-bottom: 2px solid #000000; text-align: right; padding-bottom: 10px;">
      <div class="pdf-date-label">Rapor Tarihi</div>
      <div class="pdf-date-value">${reportDate}</div>
    </td>
  </tr>
</table>

<!-- Sub-header Details -->
<table style="border: none; width: 100%; margin-bottom: 20px;">
  <tr>
    <td colspan="4" style="border: none; font-size: 12px; padding: 4px 0;"><b>Firma / Müşteri:</b> ${companyName}</td>
    <td colspan="3" style="border: none; font-size: 12px; padding: 4px 0;"><b>İş Tanımı:</b> ${workTitle}</td>
    <td colspan="2" style="border: none; font-size: 12px; text-align: right; padding: 4px 0;"><b>Tarih:</b> ${formatDate(work.date)}</td>
  </tr>
</table>
`

    groups.forEach((group) => {
        const machineTitle = (group.rawMachineName || group.machineName || 'Belirtilmemiş').toUpperCase()
        const colSpanCount = showPrices ? 9 : 8

        html += `
<!-- Vehicle Header Title -->
<table style="border: none; width: 100%; margin-top: 15px; margin-bottom: 5px;">
  <tr>
    <td colspan="${colSpanCount}" style="border: none; border-bottom: 1px solid #ccc; font-size: 13px; font-weight: bold; padding-bottom: 5px; color: #000000;">
      <span>${machineTitle} DETAYLARI</span>
    </td>
  </tr>
</table>

<!-- Vehicle Main Data Table -->
<table style="border-collapse: collapse; width: 100%; margin-bottom: 15px;">
  <thead>
    <tr>
      <th style="width: 10%;">TARİH</th>
      <th style="width: 10%;">FİŞ NO</th>
      <th style="width: 10%;">BAŞLAMA</th>
      <th style="width: 10%;">BİTİŞ</th>
      <th style="width: 11%;">SÜRE / ADET</th>
      <th style="width: 11%;">FAZLA MESAİ</th>
      <th style="width: 13%;">MAKİNA</th>
      <th style="width: ${showPrices ? '15%' : '25%'};">AÇIKLAMA</th>
      ${showPrices ? '<th style="width: 10%;">FİYAT</th>' : ''}
    </tr>
  </thead>
  <tbody>
`

        const groupItems = group.items || []
        groupItems.forEach((item) => {
            const desc = item.description || ''
            const cleanDesc = desc.replace(/\[[^\]]*\]\s*/g, '').trim()
            const unitText = desc.toUpperCase().includes('[SAATLİK]') ? 'Saat' : 'Gün'

            let rowClass = ''
            if (desc.includes('[RENK:red]') || item.isPazar) rowClass = 'row-red'
            else if (desc.includes('[RENK:orange]')) rowClass = 'row-orange'
            else if (desc.includes('[RENK:blue]')) rowClass = 'row-blue'
            else if (desc.includes('[RENK:green]')) rowClass = 'row-green'
            else if (desc.includes('[RENK:purple]')) rowClass = 'row-purple'

            let priceText = ''
            if (showPrices) {
                if (item.isPazar && !desc.includes('[KATSAYI:')) {
                    const baseP = item.unit_price || item.unitPriceVal || 0
                    const dailyP = (baseP > 10000 && item.isAylik) ? baseP / 26 : baseP
                    priceText = dailyP > 0 ? formatCurrency(dailyP * pazarMultiplier) : '-'
                } else {
                    priceText = (item.unit_price || item.unitPriceVal) ? formatCurrency(item.unit_price || item.unitPriceVal) : '-'
                }
            }

            html += `
    <tr class="${rowClass}">
      <td class="text-center">${formatDate(item.date)}</td>
      <td class="text-center">${item.receipt_no || '-'}</td>
      <td class="text-center">${item.start_time || '-'}</td>
      <td class="text-center">${item.end_time || '-'}</td>
      <td class="text-center">${item.hours || 0} ${unitText}</td>
      <td class="text-center">${item.overtime_hours > 0 ? `${item.overtime_hours} Saat` : ''}</td>
      <td class="text-center">${group.rawMachineName || group.machineName}</td>
      <td class="text-left">${cleanDesc}</td>
      ${showPrices ? `<td class="text-right bold">${priceText}</td>` : ''}
    </tr>
`
        })

        html += `
  </tbody>
</table>

<!-- Vehicle Summary Block (RIGHT-ALIGNED EXACTLY MATCHING PREVIEW) -->
<table style="border: none; width: 100%; margin-bottom: 25px;">
  <tr>
    <td colspan="${showPrices ? '5' : '4'}" style="border: none;"></td>
    <td colspan="4" style="border: none; padding: 0;">
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <tr class="bg-light-gray">
          <td colspan="4" class="bold text-center" style="padding: 4px; font-size: 11px; border-bottom: 1px solid #ddd; background-color: #f8fafc; color: #000;">
            ${machineTitle}
          </td>
        </tr>
`

        const summaryLines = group.summaryLines || []
        summaryLines.forEach((line) => {
            html += `
        <tr class="bg-light-gray">
          <td class="bold text-center" style="width: 25%; font-size: 10px;">${line.typeLabel}</td>
          <td class="text-center" style="width: 25%; font-size: 10px;">${line.countText || `${line.count} ${line.unit}`}</td>
          <td class="text-right" style="width: 25%; font-size: 10px;">${line.unitPrice ? formatCurrency(line.unitPrice) : '-'}</td>
          <td class="text-right bold total-text" style="width: 25%; font-size: 10px;">${formatCurrency(line.totalPrice)}</td>
        </tr>
`
        })

        html += `
        <tr style="border-top: 1px solid #ddd;">
          <td colspan="3" class="bold text-right" style="padding: 6px 12px; font-size: 9.5px; background-color: #f9f9f9; color: #333;">TOPLAM</td>
          <td class="text-right bold total-text" style="padding: 6px 12px; font-size: 10.5px; background-color: #f1f5f9; color: #000;">${formatCurrency(group.calculatedGrandTotal)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`
    })

    if (showPrices) {
        let grandTotalWithKdv = grandTotal
        let kdvAmount = 0
        if (showKdv) {
            kdvAmount = (grandTotal * (Number(kdvRate) || 20)) / 100
            grandTotalWithKdv = grandTotal + kdvAmount
        }

        html += `
<!-- General Grand Total Summary (RIGHT-ALIGNED EXACTLY MATCHING PREVIEW) -->
<table style="border: none; width: 100%; margin-top: 20px;">
  <tr>
    <td colspan="6" style="border: none;"></td>
    <td colspan="3" style="border: none; padding: 0;">
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #ddd;">
        <tr style="border-top: 1px solid #ddd;">
          <td class="bold" style="font-size: 10px; padding: 8px 12px; background-color: #f9f9f9; width: 50%;">GENEL TOPLAM</td>
          <td class="text-right bold total-text" style="font-size: 12px; padding: 8px 12px; background-color: #f1f5f9; color: #000; width: 50%;">${formatCurrency(grandTotal)}${showKdv ? '' : ' + KDV'}</td>
        </tr>
        ${showKdv ? `
        <tr>
          <td class="bold" style="font-size: 10px; padding: 8px 12px; background-color: #f9f9f9;">KDV (%${kdvRate})</td>
          <td class="text-right bold total-text" style="font-size: 12px; padding: 8px 12px; background-color: #f1f5f9; color: #000;">${formatCurrency(kdvAmount)}</td>
        </tr>
        <tr style="border-top: 2px solid #333;">
          <td class="bold" style="font-size: 10px; padding: 8px 12px; background-color: #e2e8f0;">TOPLAM (KDV DAHİL)</td>
          <td class="text-right bold total-text" style="font-size: 13px; padding: 8px 12px; background-color: #cbd5e1; color: #000;">${formatCurrency(grandTotalWithKdv)}</td>
        </tr>
        ` : ''}
      </table>
    </td>
  </tr>
</table>
`
    }

    if (work?.description && work.description.trim() !== '') {
        html += `
<table style="border: none; width: 100%; margin-top: 15px;">
  <tr>
    <td colspan="9" style="border: none; font-size: 10px; color: #333;">
      <b>NOT:</b> ${work.description.trim()}
    </td>
  </tr>
</table>
`
    }

    html += `
</body>
</html>
`

    const sanitizeFileName = (str) => (str || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\-\s]/g, '').trim().replace(/\s+/g, '_')
    const compStr = companyName ? `${sanitizeFileName(companyName)}_` : ''
    const titleStr = workTitle ? sanitizeFileName(workTitle) : 'Puantaj_Raporu'
    const fileName = `Puantaj_${compStr}${titleStr}_${new Date().toISOString().split('T')[0]}.xls`

    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
