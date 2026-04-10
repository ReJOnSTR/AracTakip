import { useEffect, useState } from 'react'
import ReportRenderer from '../components/ReportRenderer'

export default function PrintPage() {
    const [data, setData] = useState(null)

    useEffect(() => {
        const storedData = localStorage.getItem('printData')
        if (storedData) {
            try {
                const parsed = JSON.parse(storedData)
                setData(parsed)
                document.title = 'Araç Raporları'

                // Trigger print after render
                setTimeout(() => {
                    window.print()
                }, 500)
            } catch (e) {
                console.error('Failed to parse print data', e)
            }
        }
    }, [])

    if (!data) return <div style={{ padding: '20px' }}>Yükleniyor veya veri bulunamadı...</div>

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

            <ReportRenderer
                reports={reports}
                config={config}
                listConfig={listConfig}
                dateRange={dateRange}
                companyName={companyName}
                reportType={reportType}
                isPreview={false}
            />
        </div>
    )
}
