import { useState, useEffect, useRef } from 'react'
import { useCompany } from '../context/CompanyContext'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { FileText, Printer, Building2, Download, Eye, Calendar, Layers } from 'lucide-react'
import { formatDate, formatCurrency, getVehicleTypeLabel, getMaintenanceTypeLabel, getInsuranceTypeLabel } from '../utils/helpers'
import { useReactToPrint } from 'react-to-print'
import * as XLSX from 'xlsx'

export default function Reports() {
    const { currentCompany } = useCompany()
    const [vehicles, setVehicles] = useState([])
    const [loading, setLoading] = useState(true)

    // Selection
    const [selectedIds, setSelectedIds] = useState([])
    const [selectedVehicles, setSelectedVehicles] = useState([]) // For report generation

    // Data
    const [reportDataList, setReportDataList] = useState([]) // Array of { vehicle, data }
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [loadingReport, setLoadingReport] = useState(false)

    // Report Configuration
    const [config, setConfig] = useState({
        inventory: true,
        maintenance: true,
        services: true,
        insurance: true,
        inspection: true,
        periodicInspection: true
    })

    const [dateRange, setDateRange] = useState({
        start: '',
        end: ''
    })

    // Handle printing via new window
    const handlePrint = () => {
        const processedReportList = getProcessedReportList() // Get fresh filtered data
        const printData = {
            reports: processedReportList,
            config: config,
            dateRange: dateRange,
            companyName: currentCompany.name
        }
        localStorage.setItem('printData', JSON.stringify(printData))
        window.open('#/print', '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,titlebar=no')
    }

    const handleExcelExport = () => {
        const processedReportList = getProcessedReportList()
        const wb = XLSX.utils.book_new()

        // Helper to add sheet
        const addSheet = (name, data, columns) => {
            if (!data || data.length === 0) return
            const wsData = [
                columns.map(c => c.header),
                ...data.map(item => columns.map(c => c.value(item)))
            ]
            const ws = XLSX.utils.aoa_to_sheet(wsData)
            XLSX.utils.book_append_sheet(wb, ws, name)
        }

        // Aggregate data from all vehicles
        if (config.inventory) {
            const allAssignments = processedReportList.flatMap(r => r.assignments.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Envanter', allAssignments, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Malzeme', value: i => i.item_name },
                { header: 'Adet', value: i => i.quantity },
                { header: 'Sorumlu', value: i => i.assigned_to },
                { header: 'Veriliş T.', value: i => formatDate(i.start_date) },
                { header: 'Bitiş T.', value: i => formatDate(i.end_date) }
            ])
        }

        if (config.maintenance) {
            const allMaintenances = processedReportList.flatMap(r => r.maintenances.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Bakımlar', allMaintenances, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Tarih', value: i => formatDate(i.date) },
                { header: 'Tür', value: i => getMaintenanceTypeLabel(i.type) },
                { header: 'Açıklama', value: i => i.description },
                { header: 'Maliyet', value: i => i.cost }
            ])
        }

        if (config.services) {
            const allServices = processedReportList.flatMap(r => r.services.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Servisler', allServices, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Tarih', value: i => formatDate(i.date) },
                { header: 'Firma', value: i => i.service_name },
                { header: 'Tür', value: i => i.type },
                { header: 'Açıklama', value: i => i.description },
                { header: 'KM', value: i => i.km },
                { header: 'Maliyet', value: i => i.cost }
            ])
        }

        if (config.insurance) {
            const allInsurances = processedReportList.flatMap(r => r.insurances.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Sigortalar', allInsurances, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Sigorta Şirketi', value: i => i.company },
                { header: 'Tür', value: i => getInsuranceTypeLabel(i.type) },
                { header: 'Başlangıç', value: i => formatDate(i.start_date) },
                { header: 'Bitiş', value: i => formatDate(i.end_date) },
                { header: 'Tutar', value: i => i.premium }
            ])
        }

        if (config.inspection) {
            const allInspections = processedReportList.flatMap(r => r.inspections.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Muayeneler', allInspections, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Tarih', value: i => formatDate(i.inspection_date) },
                { header: 'Sonuç', value: i => i.result },
                { header: 'Sonraki Tarih', value: i => formatDate(i.next_inspection) },
                { header: 'Tutar', value: i => i.cost }
            ])
        }

        if (config.periodicInspection) {
            const allPeriodic = processedReportList.flatMap(r => r.periodicInspections.map(i => ({ ...i, plate: r.vehicle.plate })))
            addSheet('Periyodik Kontroller', allPeriodic, [
                { header: 'Plaka', value: i => i.plate },
                { header: 'Tarih', value: i => formatDate(i.inspection_date) },
                { header: 'Sonuç', value: i => i.result },
                { header: 'Sonraki Tarih', value: i => formatDate(i.next_inspection) },
                { header: 'Tutar', value: i => i.cost }
            ])
        }

        XLSX.writeFile(wb, `Arac_Raporu_${formatDate(new Date())}.xlsx`)
    }

    useEffect(() => {
        // HMR Fix: Ensure services key exists in config
        if (config.services === undefined) {
            setConfig(prev => ({ ...prev, services: true }))
        }

        if (currentCompany) {
            loadVehicles()
        } else {
            setVehicles([])
            setLoading(false)
        }
    }, [currentCompany])

    const loadVehicles = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.getVehicles(currentCompany.id)
            if (result.success) {
                setVehicles(result.data)
            }
        } catch (error) {
            console.error('Error loading vehicles:', error)
        }
        setLoading(false)
    }

    const openReportModal = async (vehiclesToReport) => {
        // vehiclesToReport is an array of vehicle objects
        setSelectedVehicles(vehiclesToReport)
        setIsModalOpen(true)
        setLoadingReport(true)
        // Reset date range on new open
        setDateRange({ start: '', end: '' })

        try {
            const allReports = []

            // Fetch data for each vehicle in parallel
            await Promise.all(vehiclesToReport.map(async (vehicle) => {
                let services = { data: [] }
                try {
                    if (window.electronAPI.getServicesByVehicle) {
                        services = await window.electronAPI.getServicesByVehicle(vehicle.id)
                    }
                    console.log(`Vehicle ${vehicle.plate} services:`, services.data)
                } catch (e) {
                    console.warn('Services fetch failed:', e)
                }

                const [maintenances, inspections, insurances, assignments] = await Promise.all([
                    window.electronAPI.getMaintenancesByVehicle(vehicle.id),
                    window.electronAPI.getInspectionsByVehicle(vehicle.id),
                    window.electronAPI.getInsurancesByVehicle(vehicle.id),
                    window.electronAPI.getAssignmentsByVehicle(vehicle.id)
                ])

                allReports.push({
                    vehicle: vehicle,
                    data: {
                        maintenances: maintenances.data || [],
                        inspections: (inspections.data || []).filter(i => !i.type || i.type === 'traffic'),
                        periodicInspections: (inspections.data || []).filter(i => i.type === 'periodic'),
                        insurances: insurances.data || [],
                        assignments: assignments.data || [],
                        services: services.data || []
                    }
                })
            }))

            setReportDataList(allReports)
        } catch (error) {
            console.error('Error fetching report data:', error)
        }
        setLoadingReport(false)
    }

    const handleBulkReport = () => {
        const vehiclesToReport = vehicles.filter(v => selectedIds.includes(v.id))
        openReportModal(vehiclesToReport)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setSelectedVehicles([])
        setReportDataList([])
    }

    // --- Helpers for Filtering & Sorting ---

    const filterAndSort = (items, dateKey) => {
        if (!items) return []
        let filtered = [...items]

        // Filter by Date Range
        if (dateRange.start || dateRange.end) {
            const startDate = dateRange.start ? new Date(dateRange.start) : null
            const endDate = dateRange.end ? new Date(dateRange.end) : null

            // Set endDate to end of day
            if (endDate) endDate.setHours(23, 59, 59, 999)

            filtered = filtered.filter(item => {
                if (!item[dateKey]) return true
                const d = new Date(item[dateKey])
                if (startDate && d < startDate) return false
                if (endDate && d > endDate) return false
                return true
            })
        }

        // Sort DESC (Newest First)
        filtered.sort((a, b) => new Date(b[dateKey]) - new Date(a[dateKey]))

        return filtered
    }

    // Process data for rendering (apply filters)
    const getProcessedReportList = () => {
        return reportDataList.map(report => ({
            vehicle: report.vehicle,
            assignments: filterAndSort(report.data.assignments, 'start_date'),
            maintenances: filterAndSort(report.data.maintenances, 'date'),
            services: filterAndSort(report.data.services, 'date'),
            insurances: filterAndSort(report.data.insurances, 'start_date'),
            inspections: filterAndSort(report.data.inspections, 'inspection_date'),
            periodicInspections: filterAndSort(report.data.periodicInspections, 'inspection_date')
        }))
    }

    const processedReportList = getProcessedReportList()

    const columns = [
        { key: 'plate', label: 'Plaka' },
        { key: 'brand', label: 'Marka' },
        { key: 'model', label: 'Model' },
        { key: 'type', label: 'Tür', render: v => getVehicleTypeLabel(v) },
        { key: 'year', label: 'Yıl' }
    ]

    if (!currentCompany) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Building2 /></div>
                <h2 className="empty-state-title">Şirket Seçilmedi</h2>
                <p className="empty-state-desc">Rapor almak için lütfen bir şirket seçin.</p>
            </div>
        )
    }

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Araç Raporları</h1>
                    <p style={{ marginTop: '5px', color: '#666' }}>Detaylı raporlama ve çıktılar.</p>
                </div>
                {selectedIds.length > 0 && (
                    <button className="btn btn-primary" onClick={handleBulkReport}>
                        <Layers size={16} />
                        <span style={{ marginLeft: '6px' }}>Seçilenleri Raporla ({selectedIds.length})</span>
                    </button>
                )}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


                {loading && vehicles.length === 0 ? (
                    <div className="loading-screen" style={{ height: '200px' }}><div className="loading-spinner"></div></div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={vehicles}
                        showSearch={true}
                        selectable={true}
                        onSelectionChange={setSelectedIds}
                        actions={(vehicle) => (
                            <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openReportModal([vehicle])}
                                title="Raporu Görüntüle"
                            >
                                <Eye size={16} />
                                <span style={{ marginLeft: '6px' }}>Görüntüle</span>
                            </button>
                        )}
                    />
                )}
            </div>

            {/* Preview & Print Modal */}
            {isModalOpen && selectedVehicles.length > 0 && (
                <Modal
                    isOpen={true}
                    onClose={closeModal}
                    title={selectedVehicles.length > 1 ? `${selectedVehicles.length} Araç İçin Toplu Rapor` : `Rapor: ${selectedVehicles[0].plate}`}
                    size="xl"
                    footer={
                        <>
                            <button className="btn btn-secondary" onClick={closeModal}>Kapat</button>
                            <button className="btn btn-success" onClick={handleExcelExport} style={{ marginRight: 'auto' }}>
                                <Download size={16} /> Excel'e Aktar
                            </button>
                            <button className="btn btn-primary" onClick={handlePrint}>
                                <Printer size={16} /> Yazdır
                            </button>
                        </>
                    }
                >
                    <div style={{ display: 'flex', gap: '24px', height: '65vh' }}>
                        {/* Left: Configuration */}
                        <div style={{ width: '280px', borderRight: '1px solid var(--border-color)', paddingRight: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                            {/* Content Toggles */}
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>İçerik Seçimi</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.inventory} onChange={e => setConfig({ ...config, inventory: e.target.checked })} />
                                        <span>Demirbaş / Envanter</span>
                                    </label>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.maintenance} onChange={e => setConfig({ ...config, maintenance: e.target.checked })} />
                                        <span>Bakım Geçmişi</span>
                                    </label>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.services} onChange={e => setConfig({ ...config, services: e.target.checked })} />
                                        <span>Servis / Tamir</span>
                                    </label>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.insurance} onChange={e => setConfig({ ...config, insurance: e.target.checked })} />
                                        <span>Sigorta Durumu</span>
                                    </label>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.inspection} onChange={e => setConfig({ ...config, inspection: e.target.checked })} />
                                        <span>Muayene Durumu</span>
                                    </label>
                                    <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={config.periodicInspection} onChange={e => setConfig({ ...config, periodicInspection: e.target.checked })} />
                                        <span>Periyodik Kontroller</span>
                                    </label>
                                </div>
                            </div>

                            {/* Date Filter */}
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Calendar size={14} /> Tarih Aralığı
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Başlangıç</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={dateRange.start}
                                            onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                                            style={{ padding: '6px' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>Bitiş</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={dateRange.end}
                                            onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                                            style={{ padding: '6px' }}
                                        />
                                    </div>
                                    {(dateRange.start || dateRange.end) && (
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => setDateRange({ start: '', end: '' })}
                                            style={{ marginTop: '5px' }}
                                        >
                                            Temizle
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 'auto' }}>
                                * Tarih filtreleri tüm araçlar için geçerlidir.
                            </div>

                        </div>

                        {/* Right: Live Preview */}
                        <div style={{ flex: 1, overflowY: 'auto', background: '#525659', padding: '20px', borderRadius: '4px' }}>
                            {loadingReport ? (
                                <div style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Raporlar hazırlanıyor...</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20mm', alignItems: 'center' }}>
                                    {processedReportList.map((report, index) => (
                                        <div
                                            key={report.vehicle.id}
                                            className="a4-page page-break"
                                            style={{
                                                background: 'white',
                                                width: '210mm',
                                                minHeight: '297mm',
                                                padding: '20mm',
                                                boxShadow: '0 0 10px rgba(0,0,0,0.3)',
                                                color: 'black',
                                                boxSizing: 'border-box',
                                                position: 'relative',
                                                pageBreakAfter: 'always'
                                            }}
                                        >
                                            {/* Header */}
                                            <div style={{ borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0' }}>ARAÇ RAPORU</h1>
                                                    <div style={{ fontSize: '14px', color: '#666' }}>{currentCompany.name}</div>
                                                    {(dateRange.start || dateRange.end) && (
                                                        <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                                                            Tarih Aralığı: {dateRange.start ? formatDate(dateRange.start) : 'Başlangıç'} - {dateRange.end ? formatDate(dateRange.end) : 'Bugün'}
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
                                            {config.inventory && (
                                                <div style={{ marginBottom: '25px' }}>
                                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
                                                        DEMİRBAŞ / ENVANTER
                                                    </h3>
                                                    {report.assignments.length > 0 ? (
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
                                            {config.maintenance && (
                                                <div style={{ marginBottom: '25px' }}>
                                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
                                                        BAKIM GEÇMİŞİ
                                                    </h3>
                                                    {report.maintenances.length > 0 ? (
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
                                                                <tr style={{ fontWeight: 'bold' }}>
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
                                            {config.services && (
                                                <div style={{ marginBottom: '25px' }}>
                                                    <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
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
                                                                {report.services.slice(0, 50).map((item, i) => (
                                                                    <tr key={i}>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatDate(item.date)}</td>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.service_name}</td>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.type}</td>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.description}</td>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{item.km}</td>
                                                                        <td style={{ padding: '6px', border: '1px solid #ddd' }}>{formatCurrency(item.cost)}</td>
                                                                    </tr>
                                                                ))}
                                                                <tr style={{ fontWeight: 'bold' }}>
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
                                                {config.insurance && (
                                                    <div>
                                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
                                                            SİGORTA BİLGİLERİ
                                                        </h3>
                                                        {report.insurances.length > 0 ? (
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

                                                {config.inspection && (
                                                    <div>
                                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
                                                            MUAYENE BİLGİLERİ
                                                        </h3>
                                                        {report.inspections.length > 0 ? (
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

                                                {config.periodicInspection && (
                                                    <div>
                                                        <h3 style={{ fontSize: '14px', fontWeight: 'bold', borderBottom: '1px solid #ccc', paddingBottom: '5px', marginBottom: '10px' }}>
                                                            PERİYODİK KONTROL BİLGİLERİ
                                                        </h3>
                                                        {report.periodicInspections.length > 0 ? (
                                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                                                                <thead>
                                                                    <tr style={{ background: '#eee', textAlign: 'left' }}>
                                                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>TARİH</th>
                                                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>SONUÇ</th>
                                                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>SONRAKİ KONTROL</th>
                                                                        <th style={{ padding: '6px', border: '1px solid #ddd' }}>TUTAR</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {report.periodicInspections.slice(0, 10).map((item, i) => {
                                                                        const resultDisplay = item.result === 'passed' ? 'Uygundur' :
                                                                            item.result === 'failed' ? 'Uygun Değildir' :
                                                                                item.result === 'conditional' ? 'Eksikler Var' : item.result;
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
                                                                            {formatCurrency(report.periodicInspections.reduce((sum, item) => sum + (item.cost || 0), 0))}
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
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    )
}
