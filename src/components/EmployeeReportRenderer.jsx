import {
    formatDate,
    formatCurrency
} from '../utils/helpers'

// Shared A4 page styles
const pageStyle = {
    width: '210mm',
    minHeight: '297mm',
    padding: '20mm',
    margin: '0 auto',
    background: 'white',
    position: 'relative',
    boxSizing: 'border-box',
    fontFamily: 'Arial, Helvetica, sans-serif',
    color: 'black'
}

const headerStyle = {
    borderBottom: '2px solid #000',
    paddingBottom: '20px',
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
}

const sectionTitleStyle = {
    fontSize: '14px',
    fontWeight: 'bold',
    borderBottom: '1px solid #ccc',
    paddingBottom: '5px',
    marginBottom: '10px',
    marginTop: 0
}

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '11px' }
const thStyle = { padding: '6px', border: '1px solid #ddd' }
const tdStyle = { padding: '6px', border: '1px solid #ddd' }
const thRowStyle = { background: '#eee', textAlign: 'left' }
const totalRowStyle = { background: '#f5f5f5', fontWeight: 'bold' }
const emptyStyle = { fontSize: '12px', fontStyle: 'italic', color: '#666' }
const footerStyle = {
    position: 'absolute',
    bottom: '20mm',
    left: '20mm',
    right: '20mm',
    borderTop: '1px solid #ddd',
    paddingTop: '10px',
    fontSize: '10px',
    color: '#999',
    textAlign: 'center'
}

export default function EmployeeReportRenderer({ reports, config, listConfig, dateRange, companyName, reportType, isPreview = false }) {
    const previewPageStyle = isPreview
        ? { ...pageStyle, boxShadow: '0 8px 30px rgba(0,0,0,0.12)', border: '1px solid #e0e0e0', pageBreakAfter: 'always' }
        : { ...pageStyle, pageBreakAfter: 'always' }

    if (reportType === 'list') {
        return (
            <div style={previewPageStyle}>
                {/* Header */}
                <div style={headerStyle}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>PERSONEL LİSTESİ</h1>
                        <div style={{ fontSize: '14px', color: '#666' }}>{companyName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#666' }}>Rapor Tarihi</div>
                        <div style={{ fontWeight: 'bold' }}>{new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>

                <table style={tableStyle}>
                    <thead>
                        <tr style={thRowStyle}>
                            {listConfig?.name && <th style={thStyle}>AD SOYAD</th>}
                            {listConfig?.role && <th style={thStyle}>GÖREV / ÜNVAN</th>}
                            {listConfig?.phone && <th style={thStyle}>TELEFON</th>}
                            {listConfig?.startDate && <th style={thStyle}>BAŞLANGIÇ T.</th>}
                            {listConfig?.status && <th style={thStyle}>DURUM</th>}
                            {listConfig?.salary && <th style={thStyle}>MAAŞ</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((report, i) => (
                            <tr key={i}>
                                {listConfig?.name && <td style={{ ...tdStyle, fontWeight: 'bold' }}>{report.employee.first_name} {report.employee.last_name}</td>}
                                {listConfig?.role && <td style={tdStyle}>{report.employee.role || '-'}</td>}
                                {listConfig?.phone && <td style={tdStyle}>{report.employee.phone || '-'}</td>}
                                {listConfig?.startDate && <td style={tdStyle}>{formatDate(report.employee.start_date)}</td>}
                                {listConfig?.status && <td style={tdStyle}>{report.employee.is_archived ? 'Ayrıldı' : 'Aktif'}</td>}
                                {listConfig?.salary && (
                                    <td style={tdStyle}>
                                        {report.employee.salary 
                                            ? formatCurrency(report.employee.salary) 
                                            : report.salaries && report.salaries.length > 0 
                                                ? formatCurrency(report.salaries[0].net_salary || report.salaries[0].amount) 
                                                : '-'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div style={{ marginTop: '20px', fontSize: '12px', color: '#666', textAlign: 'right' }}>
                    Toplam Personel Sayısı: <strong>{reports.length}</strong>
                </div>

                <div style={footerStyle}>Personel Raporları</div>
            </div>
        )
    }

    // Detail report - one page per employee
    return reports.map((report, index) => (
        <div key={index} style={previewPageStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>PERSONEL RAPORU</h1>
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

            {/* Employee Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>AD SOYAD</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{report.employee.first_name} {report.employee.last_name}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>GÖREV</div>
                    <div style={{ fontSize: '14px' }}>{report.employee.role || '-'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>BAŞLANGIÇ</div>
                    <div style={{ fontSize: '14px' }}>{formatDate(report.employee.start_date)}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>T.C. KİMLİK</div>
                    <div style={{ fontSize: '14px' }}>{report.employee.tc_no || '-'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>TELEFON</div>
                    <div style={{ fontSize: '14px' }}>{report.employee.phone || '-'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>E-POSTA</div>
                    <div style={{ fontSize: '14px' }}>{report.employee.email || '-'}</div>
                </div>
                <div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>GÜNCEL MAAŞ</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{report.employee.salary ? formatCurrency(report.employee.salary) : '-'}</div>
                </div>
            </div>

            {/* Leave History */}
            {config?.leaves && (
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={sectionTitleStyle}>İZİN GEÇMİŞİ</h3>
                    {report.leaves && report.leaves.length > 0 ? (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={thRowStyle}>
                                    <th style={thStyle}>TÜRH</th>
                                    <th style={thStyle}>BAŞLANGIÇ</th>
                                    <th style={thStyle}>BİTİŞ</th>
                                    <th style={thStyle}>SÜRE</th>
                                    <th style={thStyle}>DURUM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.leaves.map((item, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{item.type === 'annual' ? 'Yıllık İzin' : item.type === 'sick' ? 'Rapor' : 'Diğer'}</td>
                                        <td style={tdStyle}>{formatDate(item.start_date)}</td>
                                        <td style={tdStyle}>{formatDate(item.end_date)}</td>
                                        <td style={tdStyle}>{item.days} Gün</td>
                                        <td style={tdStyle}>{item.status === 'approved' ? 'Onaylandı' : 'Bekliyor'}</td>
                                    </tr>
                                ))}
                                <tr style={totalRowStyle}>
                                    <td colSpan={3} style={{ ...tdStyle, textAlign: 'right' }}>TOPLAM:</td>
                                    <td colSpan={2} style={tdStyle}>
                                        {report.leaves.reduce((sum, item) => sum + (item.days || 0), 0)} Gün
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={emptyStyle}>Kayıt bulunamadı.</div>
                    )}
                </div>
            )}

            {/* Salary / Earnings */}
            {config?.salaries && (
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={sectionTitleStyle}>MAAŞ / HAKEDİŞ GEÇMİŞİ</h3>
                    {report.salaries && report.salaries.length > 0 ? (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={thRowStyle}>
                                    <th style={thStyle}>TARİH</th>
                                    <th style={thStyle}>AÇIKLAMA</th>
                                    <th style={thStyle}>TUTAR</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.salaries.map((item, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{formatDate(item.payment_date || item.date)}</td>
                                        <td style={tdStyle}>{item.period === 'salary' ? 'Maaş' : item.period === 'bonus' ? 'Prim' : item.period === 'advance' ? 'Avans' : item.period === 'loan' ? 'Borç' : item.period === 'loan_payment' ? 'Borç Ödeme' : item.period || '-'} {item.notes ? `(${item.notes})` : ''}</td>
                                        <td style={tdStyle}>{formatCurrency(item.net_salary || item.amount)}</td>
                                    </tr>
                                ))}
                                <tr style={totalRowStyle}>
                                    <td colSpan={2} style={{ ...tdStyle, textAlign: 'right' }}>TOPLAM:</td>
                                    <td style={tdStyle}>
                                        {formatCurrency(report.salaries.reduce((sum, item) => sum + (item.net_salary || item.amount || 0), 0))}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <div style={emptyStyle}>Kayıt bulunamadı.</div>
                    )}
                </div>
            )}

            {/* Assignments */}
            {config?.assignments && (
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={sectionTitleStyle}>ZİMMETLİ EKİPMANLAR</h3>
                    {report.assignments && report.assignments.length > 0 ? (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={thRowStyle}>
                                    <th style={thStyle}>EKİPMAN</th>
                                    <th style={thStyle}>TARİH</th>
                                    <th style={thStyle}>DURUM</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.assignments.map((item, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{item.item_name}</td>
                                        <td style={tdStyle}>{formatDate(item.assign_date)}</td>
                                        <td style={tdStyle}>{item.return_date ? 'İade Edildi' : 'Zimmetli'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={emptyStyle}>Kayıt bulunamadı.</div>
                    )}
                </div>
            )}

            {/* Documents */}
            {config?.documents && (
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={sectionTitleStyle}>BELGELER VE GEÇERLİLİK</h3>
                    {report.documents && report.documents.length > 0 ? (
                        <table style={tableStyle}>
                            <thead>
                                <tr style={thRowStyle}>
                                    <th style={thStyle}>BELGE ADI</th>
                                    <th style={thStyle}>BELGE NO</th>
                                    <th style={thStyle}>GEÇERLİLİK TARİHİ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.documents.map((item, i) => (
                                    <tr key={i}>
                                        <td style={tdStyle}>{item.category || item.name}</td>
                                        <td style={tdStyle}>{item.document_no || '-'}</td>
                                        <td style={tdStyle}>{item.expiry_date ? formatDate(item.expiry_date) : 'Süresiz'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div style={emptyStyle}>Kayıt bulunamadı.</div>
                    )}
                </div>
            )}

            <div style={footerStyle}>Personel Raporu</div>
        </div>
    ))
}
