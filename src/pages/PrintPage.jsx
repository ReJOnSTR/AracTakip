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
                    setData(parsed)
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
            if (!data) load()
        }, 300)

        // Custom global function that Electron main.js can call
        window.refreshPrintData = load

        return () => {
            window.removeEventListener('storage', load)
            clearInterval(interval)
        }
    }, [data])

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
                    body {
                        margin: 0px;
                    }
                    `}
                </style>
                <WorkPdfReport propWork={data.work} noHeader={true} isPreview={false} showPricesProp={data.showPrices} showKdvProp={data.showKdv} kdvRateProp={data.kdvRate} />
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
                body {
                    margin: 0px;
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
