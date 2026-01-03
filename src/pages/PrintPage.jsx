import { useEffect, useState } from 'react'
import {
    formatDate,
    formatCurrency,
    getVehicleTypeLabel,
    getMaintenanceTypeLabel,
    getInsuranceTypeLabel
} from '../utils/helpers'

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

    // data = { reports: [ { vehicle, assignments, maintenances, ... } ], config, dateRange, companyName }
    const { reports, config, dateRange, companyName } = data

    return (
        <div className="print-body" style={{ background: 'white', minHeight: '100vh' }}>
            <style type="text/css" media="print">
                {`
                @page {
                    size: auto;   /* auto is the initial value */
                    margin: 0mm;  /* this affects the margin in the printer settings */
                }
                body {
                    margin: 0px;  /* this affects the margin on the content */
                }
                `}
            </style>
            {reports.map((report, index) => (
                <div
                    key={index}
                    className="a4-page"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        padding: '20mm',
                        margin: '0 auto',
                        background: 'white',
                        position: 'relative',
                        boxSizing: 'border-box',
                        pageBreakAfter: 'always',
                        fontFamily: 'Arial, Helvetica, sans-serif',
                        color: 'black'
                    }}
                >
                    {/* Header */}
                    <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>ARAÇ RAPORU</h1>
                            <div style={{ fontSize: '14px', color: '#666' }}>{companyName}</div>
                            {(dateRange?.start || dateRange?.end) && (
                                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                    Tarih Aralığı: {formatDate(dateRange.start)} - {dateRange.end ? formatDate(dateRange.end) : 'Bugün'}
                                </div>
                            )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#666' }}>Rapor Tarihi</div>
                            <div style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString('tr-TR')}</div>
                        </div>
                    </div>

                    {/* Vehicle Information */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                        <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>PLAKA</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{report.vehicle.plate}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>MARKA/MODEL</div>
                            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{report.vehicle.brand} {report.vehicle.model}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>MODEL YILI</div>
                            <div style={{ fontSize: '14px' }}>{report.vehicle.year}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>KM</div>
                            <div style={{ fontSize: '14px' }}>{report.vehicle.kilometers ? `${report.vehicle.kilometers} km` : '-'}</div>
                        </div>
                    </div>

                    {/* Inventory Section */}
                    {config?.inventory && (
                        <div style={{ marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', marginTop: 0 }}>
                                DEMİRBAŞ / ENVANTER
                            </h3>
                            {report.assignments && report.assignments.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>MALZEME</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>ADET</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>SORUMLU</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>VERİLİŞ T.</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>BİTİŞ T.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.assignments.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.item_name}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.quantity}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.assigned_to || '-'}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.start_date)}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.end_date ? formatDate(item.end_date) : 'Aktif'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#666' }}>Bu tarih aralığında kayıt bulunamadı.</div>
                            )}
                        </div>
                    )}

                    {/* Maintenance Section */}
                    {config?.maintenance && (
                        <div style={{ marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', marginTop: 0 }}>
                                BAKIM GEÇMİŞİ
                            </h3>
                            {report.maintenances && report.maintenances.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>TARİH</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>TÜR</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>AÇIKLAMA</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>SONRAKİ BAKIM</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>MALİYET</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.maintenances.slice(0, 50).map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.date)}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{getMaintenanceTypeLabel(item.type)}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.description}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.next_date ? formatDate(item.next_date) : '-'}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(item.cost)}</td>
                                            </tr>
                                        ))}
                                        {/* Total Row */}
                                        <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                                            <td colSpan={4} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>TOPLAM:</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                {formatCurrency(report.maintenances.reduce((sum, item) => sum + (item.cost || 0), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#666' }}>Bu tarih aralığında kayıt bulunamadı.</div>
                            )}
                        </div>
                    )}

                    {/* Services Section */}
                    {config?.services && (
                        <div style={{ marginBottom: '25px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', marginTop: 0 }}>
                                SERVİS / TAMİR GEÇMİŞİ
                            </h3>
                            {report.services && report.services.length > 0 ? (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                    <thead>
                                        <tr style={{ background: '#eee', textAlign: 'left' }}>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>TARİH</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>FİRMA</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>TÜR</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>AÇIKLAMA</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>KM</th>
                                            <th style={{ padding: '6px', border: '1px solid #ddd' }}>MALİYET</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.services.map((item, i) => (
                                            <tr key={i}>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.date)}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.service_name}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.type}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.description}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.km}</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(item.cost)}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: '#f5f5f5', fontWeight: 'bold' }}>
                                            <td colSpan={5} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>TOPLAM:</td>
                                            <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                {formatCurrency(report.services.reduce((sum, item) => sum + (item.cost || 0), 0))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#666' }}>Bu tarih aralığında kayıt bulunamadı.</div>
                            )}
                        </div>
                    )}

                    {/* Insurance & Inspection Stacked */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                        {config?.insurance && (
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', marginTop: 0 }}>
                                    SİGORTA BİLGİLERİ
                                </h3>
                                {report.insurances && report.insurances.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: '#eee', textAlign: 'left' }}>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>ŞİRKET</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>TÜR</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>BAŞLANGIÇ</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>BİTİŞ</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>TUTAR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.insurances.slice(0, 10).map((item, i) => (
                                                <tr key={i}>
                                                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.company}</td>
                                                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{getInsuranceTypeLabel(item.type)}</td>
                                                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.start_date)}</td>
                                                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.end_date)}</td>
                                                    <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(item.premium)}</td>
                                                </tr>
                                            ))}
                                            <tr style={{ fontWeight: 'bold' }}>
                                                <td colSpan={4} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>TOPLAM:</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                    {formatCurrency(report.insurances.reduce((sum, item) => sum + (item.premium || 0), 0))}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#666' }}>Kayıt yok.</div>
                                )}
                            </div>
                        )}

                        {config?.inspection && (
                            <div>
                                <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px', marginTop: 0 }}>
                                    MUAYENE BİLGİLERİ
                                </h3>
                                {report.inspections && report.inspections.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                        <thead>
                                            <tr style={{ background: '#eee', textAlign: 'left' }}>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>TARİH</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>SONUÇ</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>SONRAKİ MUAYENE</th>
                                                <th style={{ padding: '6px', border: '1px solid #ddd' }}>TUTAR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {report.inspections.slice(0, 10).map((item, i) => {
                                                const resultDisplay = item.result === 'passed' ? 'Geçti' :
                                                    item.result === 'failed' ? 'Kaldı' :
                                                        item.result === 'conditional' ? 'Şartlı Geçti' : item.result;
                                                return (
                                                    <tr key={i}>
                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.inspection_date)}</td>
                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{resultDisplay}</td>
                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.next_inspection ? formatDate(item.next_inspection) : '-'}</td>
                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(item.cost)}</td>
                                                    </tr>
                                                )
                                            })}
                                            <tr style={{ fontWeight: 'bold' }}>
                                                <td colSpan={3} style={{ padding: '6px', border: '1px solid #ddd', textAlign: 'right' }}>TOPLAM:</td>
                                                <td style={{ padding: '6px', border: '1px solid #ddd' }}>
                                                    {formatCurrency(report.inspections.reduce((sum, item) => sum + (item.cost || 0), 0))}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                ) : (
                                    <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#666' }}>Kayıt yok.</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ position: 'absolute', bottom: '20mm', left: '20mm', right: '20mm', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '10px', color: '#999', textAlign: 'center' }}>
                        Raporlar
                    </div>
                </div>
            ))}
        </div>
    )
}
