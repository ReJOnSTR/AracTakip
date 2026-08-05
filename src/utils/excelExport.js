import { calculateWorkStats } from './workCalculations'
import { formatDate, formatCurrency } from './helpers'

/**
 * Export a Work Puantaj Report to a visually flawless Excel (.xls/.xlsx) file
 * matching the exact styling, colors, borders, and layout of the PDF report preview.
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

    const companyName = work.company_name || work.company?.name || work.customer_name || work.customer || ''
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
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #0f172a; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 10px; font-size: 11px; vertical-align: middle; }
  th { background-color: #f1f5f9; color: #0f172a; font-weight: bold; text-align: center; }
  .vehicle-header-row { background-color: #1e293b !important; color: #ffffff !important; font-weight: bold; font-size: 12px; text-align: left; padding: 8px 12px; }
  .row-red { background-color: #fff1f2 !important; color: #be123c !important; font-weight: bold; }
  .row-orange { background-color: #ffedd5 !important; color: #c2410c !important; }
  .row-blue { background-color: #dbeafe !important; color: #1d4ed8 !important; }
  .row-green { background-color: #dcfce7 !important; color: #15803d !important; }
  .row-purple { background-color: #f3e8ff !important; color: #6b21a8 !important; }
  .summary-title { background-color: #cbd5e1 !important; color: #0f172a !important; font-weight: bold; text-align: center; }
  .total-row { background-color: #0f172a !important; color: #ffffff !important; font-weight: bold; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .bold { font-weight: bold; }
</style>
</head>
<body>

<!-- Meta Header Table -->
<table style="border: none; margin-bottom: 15px; width: 100%;">
  <tr>
    <td colspan="6" style="border: none; font-size: 18px; font-weight: bold; color: #1e293b;">
      ${work.work_no ? `İŞ RAPORU - ${work.work_no}` : 'İŞ RAPORU / PUANTAJ CETVELİ'}
    </td>
    <td colspan="3" style="border: none; text-align: right; font-size: 11px; color: #475569;">
      <b>Rapor Tarihi:</b> ${reportDate}
    </td>
  </tr>
  <tr>
    <td colspan="3" style="border: none; font-size: 12px;"><b>Firma / Müşteri:</b> ${companyName}</td>
    <td colspan="3" style="border: none; font-size: 12px;"><b>İş Tanımı:</b> ${workTitle}</td>
    <td colspan="3" style="border: none; font-size: 12px; text-align: right;"><b>Tarih:</b> ${formatDate(work.date)}</td>
  </tr>
</table>
`

    groups.forEach((group) => {
        const machineTitle = (group.rawMachineName || group.machineName || 'Belirtilmemiş').toUpperCase()
        const colSpanCount = showPrices ? 9 : 8

        html += `
<table>
  <thead>
    <tr>
      <th colspan="${colSpanCount}" class="vehicle-header-row">
        🔧 ${machineTitle} DETAYLARI
      </th>
    </tr>
    <tr>
      <th style="width: 10%;">TARİH</th>
      <th style="width: 10%;">FİŞ NO</th>
      <th style="width: 10%;">BAŞLAMA</th>
      <th style="width: 10%;">BİTİŞ</th>
      <th style="width: 12%;">SÜRE / ADET</th>
      <th style="width: 12%;">FAZLA MESAİ</th>
      <th style="width: 16%;">MAKİNA</th>
      <th style="width: ${showPrices ? '12%' : '20%'};">AÇIKLAMA</th>
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
      <td class="text-center">${item.overtime_hours > 0 ? `${item.overtime_hours} Saat` : '-'}</td>
      <td class="text-center">${group.rawMachineName || group.machineName}</td>
      <td class="text-left">${cleanDesc}</td>
      ${showPrices ? `<td class="text-right bold">${priceText}</td>` : ''}
    </tr>
`
        })

        html += `
  </tbody>
</table>

<!-- Vehicle Summary Table -->
<table style="width: 550px; margin-bottom: 25px;">
  <thead>
    <tr>
      <th colspan="${showPrices ? 4 : 2}" class="summary-title">${machineTitle} ÖZETİ</th>
    </tr>
    <tr>
      <th class="text-left">İşlem Türü</th>
      <th class="text-center">Miktar / Süre</th>
      ${showPrices ? '<th class="text-right">Birim Fiyat</th><th class="text-right">Toplam Tutar</th>' : ''}
    </tr>
  </thead>
  <tbody>
`

        const summaryLines = group.summaryLines || []
        summaryLines.forEach((line) => {
            html += `
    <tr>
      <td class="text-left bold">${line.typeLabel}</td>
      <td class="text-center">${line.countText || `${line.count} ${line.unit}`}</td>
      ${showPrices ? `<td class="text-right">${line.unitPrice ? formatCurrency(line.unitPrice) : '-'}</td><td class="text-right bold">${formatCurrency(line.totalPrice)}</td>` : ''}
    </tr>
`
        })

        if (showPrices) {
            html += `
    <tr style="background-color: #f1f5f9; font-weight: bold;">
      <td colspan="3" class="text-right">TOPLAM:</td>
      <td class="text-right bold" style="color: #0f172a;">${formatCurrency(group.calculatedGrandTotal)}</td>
    </tr>
`
        }

        html += `
  </tbody>
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
<table style="width: 450px; margin-top: 15px; border: 2px solid #0f172a;">
  <tr style="background-color: #f8fafc;">
    <td class="text-right bold" style="font-size: 12px;">ARA TOPLAM:</td>
    <td class="text-right bold" style="font-size: 13px;">${formatCurrency(grandTotal)}</td>
  </tr>
  ${showKdv ? `
  <tr style="background-color: #f8fafc;">
    <td class="text-right bold" style="font-size: 12px;">KDV (%${kdvRate}):</td>
    <td class="text-right bold" style="font-size: 13px;">${formatCurrency(kdvAmount)}</td>
  </tr>
  <tr class="total-row">
    <td class="text-right bold" style="font-size: 13px;">GENEL TOPLAM (KDV DAHİL):</td>
    <td class="text-right bold" style="font-size: 14px;">${formatCurrency(grandTotalWithKdv)}</td>
  </tr>
  ` : `
  <tr class="total-row">
    <td class="text-right bold" style="font-size: 13px;">GENEL TOPLAM:</td>
    <td class="text-right bold" style="font-size: 14px;">${formatCurrency(grandTotal)}</td>
  </tr>
  `}
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
