import { useEffect, useState } from 'react'
import ReportRenderer from '../components/ReportRenderer'
import EmployeeReportRenderer from '../components/EmployeeReportRenderer'
import WorkPdfReport from './WorkPdfReport'

export default function PrintPage() {
    const [data, setData] = useState(null)

    useEffect(() => {
        const load = () => {
            const storedData = localStorage.getItem('printData')
            if (storedData) {
                try {
                    const parsed = JSON.parse(storedData)
                    setData(prev => {
                        if (prev && JSON.stringify(prev) === JSON.stringify(parsed)) {
                            return prev;
                        }
                        return parsed;
                    });
                    document.title = parsed.isEmployeeReport ? 'Personel Raporları' : (parsed.isWorkReport ? 'Puantaj Raporu' : 'Araç Raporları')

                    // Trigger print after render if not saving PDF
                    if (!parsed.isPdfSave) {
                        setTimeout(() => {
                            window.print()
                        }, 500)
                    }
                } catch (e) {
                    console.error('Failed to parse print data', e)
                }
            }
        }

        load()
        
        // Listen for storage changes (even from same window if we dispatch it)
        window.addEventListener('storage', load)
        
        // Also a small interval for 5 seconds to ensure we catch it in hidden windows
        const interval = setInterval(() => {
            setData(prev => {
                if (prev) {
                    clearInterval(interval)
                    return prev
                }
                const storedData = localStorage.getItem('printData')
                if (storedData) {
                    try {
                        const parsed = JSON.parse(storedData)
                        document.title = parsed.isEmployeeReport ? 'Personel Raporları' : (parsed.isWorkReport ? 'Puantaj Raporu' : 'Araç Raporları')
                        
                        // Trigger print after render if not saving PDF
                        if (!parsed.isPdfSave) {
                            setTimeout(() => {
                                window.print()
                            }, 500)
                        }
                        return parsed
                    } catch (e) {
                        return prev
                    }
                }
                return prev
            })
        }, 300)

        // Custom global function that Electron main.js can call
        window.refreshPrintData = load

        return () => {
            window.removeEventListener('storage', load)
            clearInterval(interval)
        }
    }, [])

    if (!data) return <div style={{ padding: '20px' }}>Yükleniyor veya veri bulunamadı...</div>

    if (data.isWorkReport) {
        return (
            <div className="print-body" style={{ background: 'white', minHeight: '100vh' }}>
                <style type="text/css" media="print">
                    {`
                    @page {
                        size: A4;
                        margin: 0mm;
                    }
                    body, html {
                        margin: 0px !important;
                        padding: 0px !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    `}
                </style>
                <WorkPdfReport 
                    propWork={data.work} 
                    noHeader={true} 
                    isPreview={false} 
                    showPricesProp={data.showPrices} 
                    showKdvProp={data.showKdv} 
                    kdvRateProp={data.kdvRate} 
                    pazarMultiplierProp={data.pazarMultiplier}
                    mesaiMultiplierProp={data.mesaiMultiplier}
                />
            </div>
        )
    }

    const { reports, config, listConfig, dateRange, companyName, reportType } = data

    return (
        <div className="print-body" style={{ background: 'white', minHeight: '100vh' }}>
            <style type="text/css" media="print">
                {`
                @page {
                    size: A4;
                    margin: 0mm;
                }
                body, html {
                    margin: 0px !important;
                    padding: 0px !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .report-print-container {
                    width: 210mm !important;
                    min-height: 297mm !important;
                    margin: 0 auto !important;
                    padding: 10mm !important;
                    box-shadow: none !important;
                    border: none !important;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    zoom: 0.88 !important;
                    page-break-after: always !important;
                    box-sizing: border-box !important;
                }
                .report-print-container table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                }
                .report-print-container th {
                    background-color: #eee !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                .report-print-container tr {
                    page-break-inside: avoid !important;
                }
                `}
            </style>

            {data.isEmployeeReport ? (
                <EmployeeReportRenderer
                    reports={reports}
                    config={config}
                    listConfig={listConfig}
                    dateRange={dateRange}
                    companyName={companyName}
                    reportType={reportType}
                    isPreview={false}
                />
            ) : (
                <ReportRenderer
                    reports={reports}
                    config={config}
                    listConfig={listConfig}
                    dateRange={dateRange}
                    companyName={companyName}
                    reportType={reportType}
                    isPreview={false}
                />
            )}
        </div>
    )
}
