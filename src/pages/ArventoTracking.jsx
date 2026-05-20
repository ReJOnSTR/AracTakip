import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import { 
    Search, MapPin, Navigation, AlertTriangle, RefreshCw, 
    Calendar, List, ShieldAlert, CheckCircle2, XCircle, Info, Car, Loader2
} from 'lucide-react'

function formatArventoDate(dateStr) {
    if (!dateStr || dateStr.length < 14) return dateStr
    const yyyy = dateStr.substring(0, 4)
    const mm = dateStr.substring(4, 6)
    const dd = dateStr.substring(6, 8)
    const hh = dateStr.substring(8, 10)
    const min = dateStr.substring(10, 12)
    const ss = dateStr.substring(12, 14)
    return `${dd}.${mm}.${yyyy} ${hh}:${min}:${ss}`
}

function formatAlarmDate(gmtDateStr) {
    if (!gmtDateStr) return 'Belirtilmedi'
    const match = gmtDateStr.match(/\/Date\((\d+)([+-]\d+)?\)\//)
    if (match) {
        const timestamp = parseInt(match[1])
        return new Date(timestamp).toLocaleString('tr-TR')
    }
    return gmtDateStr
}

export default function ArventoTracking() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [leafletLoaded, setLeafletLoaded] = useState(false)
    const isDemoMode = false
    const [settings, setSettings] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // all, active, stopped, alarm
    const [vehicles, setVehicles] = useState([])
    const [selectedVehicle, setSelectedVehicle] = useState(null)
    const [dailyReportDate, setDailyReportDate] = useState(new Date().toISOString().split('T')[0])
    const [dailyReports, setDailyReports] = useState([])
    const [activeAlarms, setActiveAlarms] = useState([])
    const [activeTab, setActiveTab] = useState('live') // live, daily, alarms
    const [localVehicles, setLocalVehicles] = useState([])
    const [mappings, setMappings] = useState([])

    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const markersRef = useRef({})
    const hasInitialFit = useRef(false)
    const pollingTimer = useRef(null)

    // Load Leaflet Assets
    useEffect(() => {
        if (window.L) {
            setLeafletLoaded(true)
            return
        }

        // Link tag for CSS
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
        link.crossOrigin = ''
        document.head.appendChild(link)

        // Script tag for JS
        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
        script.crossOrigin = ''
        script.onload = () => setLeafletLoaded(true)
        document.body.appendChild(script)

        return () => {
            // Cleanup scripts/stylesheets if unmounting to prevent pollution
            try {
                document.head.removeChild(link)
                document.body.removeChild(script)
            } catch (e) {}
        }
    }, [])

    // Load Settings & Db Vehicles
    useEffect(() => {
        loadSettingsAndVehicles()
    }, [currentCompany])

    const loadSettingsAndVehicles = async () => {
        try {
            const sett = await window.electronAPI.getSettings()
            setSettings(sett)
            
            // Check if Arvento is enabled
            if (sett?.arvento?.enabled && sett?.arvento?.username) {
                // Fetch initial mappings
                const mappingsRes = await window.electronAPI.arventoGetMappings()
                if (mappingsRes.success && Array.isArray(mappingsRes.data)) {
                    setMappings(mappingsRes.data)
                }
            }

            if (currentCompany) {
                const result = await window.electronAPI.getVehicles(currentCompany.id, 0)
                if (result.success) {
                    setLocalVehicles(result.data)
                }
            }
        } catch (error) {
            console.error('Failed to load settings or vehicles:', error)
        }
    }

    // Initialize Map
    useEffect(() => {
        if (!leafletLoaded || !mapRef.current) return

        let timer1, timer2, timer3
        if (!mapInstance.current) {
            // Istanbul coordinates by default (overridden by fitBounds once data loads)
            mapInstance.current = window.L.map(mapRef.current, {
                zoomControl: false
            }).setView([40.993, 29.02], 13)

            window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(mapInstance.current)

            window.L.control.zoom({
                position: 'topright'
            }).addTo(mapInstance.current)

            // Force invalidateSize after delays to ensure container has full width/height
            timer1 = setTimeout(() => {
                if (mapInstance.current) mapInstance.current.invalidateSize()
            }, 100)

            timer2 = setTimeout(() => {
                if (mapInstance.current) mapInstance.current.invalidateSize()
            }, 500)

            timer3 = setTimeout(() => {
                if (mapInstance.current) mapInstance.current.invalidateSize()
            }, 1200)
        }

        // Handle resize events
        const handleResize = () => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize()
            }
        }
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('resize', handleResize)
            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)
            if (mapInstance.current) {
                mapInstance.current.remove()
                mapInstance.current = null
            }
        }
    }, [leafletLoaded, activeTab])

    // Load Status Data (Real API polling only)
    useEffect(() => {
        if (!leafletLoaded) return
        
        fetchStatusData()

        // Poll real API every 30 seconds
        pollingTimer.current = setInterval(fetchStatusData, 30000)

        return () => {
            if (pollingTimer.current) clearInterval(pollingTimer.current)
        }
    }, [leafletLoaded, localVehicles])

    const fetchStatusData = async () => {
        setLoading(true)
        try {
            // Fetch mappings if they are not already loaded
            let currentMappings = mappings
            if (currentMappings.length === 0) {
                const mappingsRes = await window.electronAPI.arventoGetMappings()
                if (mappingsRes.success && Array.isArray(mappingsRes.data)) {
                    currentMappings = mappingsRes.data
                    setMappings(currentMappings)
                }
            }

            // Fetch alarms first so we can attach them to vehicles
            let alarmsList = []
            try {
                const alarmRes = await window.electronAPI.arventoGetAlarms()
                if (alarmRes.success && Array.isArray(alarmRes.data)) {
                    alarmsList = alarmRes.data
                    setActiveAlarms(alarmRes.data)
                }
            } catch (err) {
                console.error('Failed to load alarms:', err)
            }

            // Fetch live status from Arvento API
            const result = await window.electronAPI.arventoGetStatus()
            if (result.success && Array.isArray(result.data)) {
                // Map Arvento results using local vehicle metadata
                const mappedData = result.data.map(item => {
                    // Try to match Device No / Node to find plate
                    const mapping = currentMappings.find(m => m['Device No'] === item.Node)
                    const plateFull = mapping ? mapping['License Plate'] : item.Node
                    
                    // Clean plate from notes: e.g. "55 AEH 726 - 26M" -> "55 AEH 726"
                    const plateClean = plateFull ? plateFull.split('-')[0].trim() : (item.Node || 'Bilinmiyor')

                    // Try to match with local vehicle
                    const localVeh = localVehicles.find(lv => 
                        lv.plate.replace(/\s+/g, '').toUpperCase() === plateClean.replace(/\s+/g, '').toUpperCase()
                    )

                    const itemSpeed = parseInt(item.Speed || item.speed || 0)
                    const isMoving = itemSpeed > 0
                    
                    // Determine if vehicle has active alarms in alarms list
                    const vehicleAlarms = alarmsList
                        .filter(a => a.DeviceNo === item.Node)
                        .map(a => a.AlarmType)

                    return {
                        plate: plateClean,
                        brand: localVeh?.brand || mapping?.['Vehicle Brand'] || 'Bilinmiyor',
                        model: localVeh?.model || mapping?.['Vehicle Model (Year)'] || '',
                        driver: localVeh?.assignments?.[0]?.employees ? `${localVeh.assignments[0].employees.first_name} ${localVeh.assignments[0].employees.last_name}` : (item.SCDriver || 'Bilinmiyor'),
                        lat: parseFloat(item.LatitudeY || item.Latitude || item.lat || 0),
                        lng: parseFloat(item.LongitudeX || item.Longitude || item.lng || 0),
                        speed: itemSpeed,
                        ignition: item.Ignition !== undefined ? (item.Ignition === true || item.Ignition === '1' || item.Ignition === 1) : isMoving,
                        heading: parseInt(item.Course || item.Heading || item.heading || 0),
                        gpsDate: item.LocalDateTime ? formatArventoDate(item.LocalDateTime) : (item.GPSDate || item.date || 'Belirtilmedi'),
                        alarms: vehicleAlarms
                    }
                })
                setVehicles(mappedData)

                // Auto fit bounds on initial load
                if (mapInstance.current && !hasInitialFit.current) {
                    mapInstance.current.invalidateSize()
                    const validCoords = mappedData
                        .filter(v => v.lat && v.lng)
                        .map(v => [v.lat, v.lng])
                    if (validCoords.length > 0) {
                        mapInstance.current.fitBounds(validCoords, { maxZoom: 14, padding: [30, 30] })
                        hasInitialFit.current = true
                    }
                }
            } else {
                console.warn('Arvento API returned failure status:', result.error)
            }
        } catch (e) {
            console.error('Arvento API fetch error:', e)
        }
        setLoading(false)
    }

    // Refresh Handlers
    const handleRefresh = async () => {
        await fetchStatusData()
    }

    // Update map markers when vehicle positions change
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || vehicles.length === 0) return

        const L = window.L
        const activeMarkers = {}

        vehicles.forEach(v => {
            if (!v.lat || !v.lng) return

            // Determine Pin Color
            let pinColor = '#22c55e' // Green for moving
            if (v.alarms && v.alarms.length > 0) {
                pinColor = '#f97316' // Orange for alarms
            } else if (!v.ignition) {
                pinColor = '#ef4444' // Red for stopped
            }

            // Creating SVG DivIcon for premium custom design
            const svgIcon = `
                <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; width: 12px; height: 12px; border-radius: 50%; background: ${pinColor}; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3); z-index: 2;"></div>
                    <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${pinColor}; opacity: 0.2; transform: scale(${v.ignition && v.speed > 0 ? 1 : 0}); transition: transform 0.5s ease-out; animation: pulse 2s infinite;"></div>
                    <div style="transform: rotate(${v.heading}deg); z-index: 1;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${pinColor}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            `

            const icon = L.divIcon({
                html: svgIcon,
                className: 'custom-vehicle-marker',
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            })

            if (markersRef.current[v.plate]) {
                // Update position and rotation
                markersRef.current[v.plate].setLatLng([v.lat, v.lng])
                markersRef.current[v.plate].setIcon(icon)
                activeMarkers[v.plate] = markersRef.current[v.plate]
            } else {
                // Create new marker
                const marker = L.marker([v.lat, v.lng], { icon }).addTo(mapInstance.current)
                
                // On marker click
                marker.on('click', () => {
                    setSelectedVehicle(v)
                    mapInstance.current.setView([v.lat, v.lng], 15)
                })

                markersRef.current[v.plate] = marker
                activeMarkers[v.plate] = marker
            }
        })

        // Remove old markers for vehicles no longer present
        Object.keys(markersRef.current).forEach(plate => {
            if (!activeMarkers[plate]) {
                markersRef.current[plate].remove()
                delete markersRef.current[plate]
            }
        })
    }, [vehicles, leafletLoaded])

    // Pan to vehicle on selection
    const handleSelectVehicle = (v) => {
        setSelectedVehicle(v)
        if (mapInstance.current && v.lat && v.lng) {
            mapInstance.current.setView([v.lat, v.lng], 16)
        }
    }

    // Filter vehicles based on search and status tabs
    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             (v.brand && v.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                             (v.model && v.model.toLowerCase().includes(searchQuery.toLowerCase()))
        
        if (statusFilter === 'active') return matchesSearch && v.ignition && v.speed > 0
        if (statusFilter === 'stopped') return matchesSearch && !v.ignition
        if (statusFilter === 'alarm') return matchesSearch && v.alarms && v.alarms.length > 0
        
        return matchesSearch
    })

    // Fetch Daily Reports
    const fetchDailyReports = async () => {
        setLoading(true)
        try {
            const result = await window.electronAPI.arventoGetDailyReport(dailyReportDate)
            if (result.success) {
                setDailyReports(result.data || [])
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    useEffect(() => {
        if (activeTab === 'daily') {
            fetchDailyReports()
        }
    }, [activeTab, dailyReportDate])

    if (settings && (!settings.arvento?.enabled || !settings.arvento?.username)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '15px' }}>
                <div className="page-header" style={{ marginBottom: 0 }}>
                    <div>
                        <h1 className="page-title">Araç Takip (Arvento)</h1>
                        <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>Araçlarınızı canlı harita üzerinde takip edin.</p>
                    </div>
                </div>
                <div style={{
                    flex: 1,
                    background: 'var(--bg-primary)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px',
                    textAlign: 'center',
                    gap: '20px'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '50%',
                        background: 'rgba(0, 82, 204, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--primary)'
                    }}>
                        <Car size={40} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0' }}>Arvento Entegrasyonu Devre Dışı</h2>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '450px', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                            Araçlarınızın canlı konumlarını, günlük çalışma sürelerini ve aktif alarmlarını görüntülemek için Arvento entegrasyonunu etkinleştirmeniz gerekmektedir.
                        </p>
                    </div>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => navigate('/settings')}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        Ayarlar Sayfasına Git
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '15px' }}>
            <TopProgressBar loading={loading} />
            
            {/* Header section */}
            <div className="page-header" style={{ marginBottom: 0 }}>
                <div>
                    <h1 className="page-title">Araç Takip (Arvento)</h1>
                    <p style={{ marginTop: '5px', color: 'var(--text-secondary)' }}>
                        Arvento API üzerinden canlı araç konumları alınıyor.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {settings?.arvento?.enabled ? (
                        <div style={{ 
                            background: 'var(--success-bg)',
                            color: 'var(--success)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: 'var(--success)',
                                display: 'inline-block'
                            }}></span>
                            Arvento Bağlı
                        </div>
                    ) : (
                        <div style={{ 
                            background: 'var(--danger-bg)',
                            color: 'var(--danger)',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{ 
                                width: '8px', 
                                height: '8px', 
                                borderRadius: '50%', 
                                background: 'var(--danger)',
                                display: 'inline-block'
                            }}></span>
                            Arvento Devre Dışı
                        </div>
                    )}

                    <button className="btn btn-secondary btn-icon" onClick={handleRefresh} title="Yenile">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            {/* Tab Links */}
            <div className="vehicle-tabs" style={{ marginBottom: 0 }}>
                <button 
                    className={`vehicle-tab ${activeTab === 'live' ? 'active' : ''}`}
                    onClick={() => setActiveTab('live')}
                >
                    <MapPin size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Canlı Takip
                </button>
                <button 
                    className={`vehicle-tab ${activeTab === 'daily' ? 'active' : ''}`}
                    onClick={() => setActiveTab('daily')}
                >
                    <Calendar size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Günlük Mesafe Raporu
                </button>
                <button 
                    className={`vehicle-tab ${activeTab === 'alarms' ? 'active' : ''}`}
                    onClick={() => setActiveTab('alarms')}
                >
                    <ShieldAlert size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Alarmlar ({activeAlarms.length})
                </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
                
                {/* 1. Canlı Takip Haritası Sekmesi */}
                {activeTab === 'live' && (
                    <div style={{ display: 'flex', width: '100%', gap: '15px', flex: 1, minHeight: 0 }}>
                        {/* Sidebar List */}
                        <div style={{ 
                            width: '320px', 
                            background: 'var(--bg-primary)', 
                            borderRadius: '16px', 
                            border: '1px solid var(--border-color)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '16px',
                            gap: '12px'
                        }}>
                            <div className="search-box-container" style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Plaka veya marka ara..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{ paddingLeft: '38px', height: '38px' }}
                                />
                                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-muted)' }} />
                            </div>

                            {/* Internal filter pill status buttons */}
                            <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '5px' }}>
                                <button 
                                    style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '11px', 
                                        border: '1px solid var(--border-color)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: statusFilter === 'all' ? 'var(--primary-bg)' : 'transparent',
                                        color: statusFilter === 'all' ? 'var(--primary)' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setStatusFilter('all')}
                                >
                                    Tümü ({vehicles.length})
                                </button>
                                <button 
                                    style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '11px', 
                                        border: '1px solid var(--border-color)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: statusFilter === 'active' ? 'var(--success-bg)' : 'transparent',
                                        color: statusFilter === 'active' ? 'var(--success)' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setStatusFilter('active')}
                                >
                                    Hareketli ({vehicles.filter(v => v.ignition && v.speed > 0).length})
                                </button>
                                <button 
                                    style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '11px', 
                                        border: '1px solid var(--border-color)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: statusFilter === 'stopped' ? 'var(--danger-bg)' : 'transparent',
                                        color: statusFilter === 'stopped' ? 'var(--danger)' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setStatusFilter('stopped')}
                                >
                                    Duruyor ({vehicles.filter(v => !v.ignition).length})
                                </button>
                                <button 
                                    style={{ 
                                        padding: '4px 10px', 
                                        borderRadius: '20px', 
                                        fontSize: '11px', 
                                        border: '1px solid var(--border-color)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: statusFilter === 'alarm' ? 'var(--warning-bg)' : 'transparent',
                                        color: statusFilter === 'alarm' ? 'var(--warning)' : 'var(--text-secondary)'
                                    }}
                                    onClick={() => setStatusFilter('alarm')}
                                >
                                    Alarmda ({vehicles.filter(v => v.alarms.length > 0).length})
                                </button>
                            </div>

                            {/* Vehicle lists */}
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {loading && vehicles.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px', textAlign: 'center' }}>
                                        <Loader2 className="spin" size={24} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Araçlar yükleniyor...</span>
                                    </div>
                                ) : filteredVehicles.length === 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '20px', textAlign: 'center' }}>
                                        <Car size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Eşleşen araç bulunamadı.</span>
                                    </div>
                                ) : (
                                    filteredVehicles.map((v, idx) => {
                                        const isSelected = selectedVehicle?.plate === v.plate
                                        const hasAlarm = v.alarms && v.alarms.length > 0
                                        
                                        return (
                                            <div 
                                                key={`${v.plate}-${idx}`}
                                                style={{ 
                                                    padding: '12px', 
                                                    borderRadius: '12px', 
                                                    border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                                                    background: isSelected ? 'rgba(0, 82, 204, 0.03)' : 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onClick={() => handleSelectVehicle(v)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{v.plate}</span>
                                                    <span style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        borderRadius: '50%', 
                                                        background: hasAlarm ? '#f97316' : v.ignition ? '#22c55e' : '#ef4444'
                                                    }}></span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{v.brand} {v.model}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.speed} km/h</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <span>Sürücü: {v.driver}</span>
                                                    {v.ignition ? (
                                                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <CheckCircle2 size={10} /> Kontak Açık
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <XCircle size={10} /> Kontak Kapalı
                                                        </span>
                                                    )}
                                                </div>
                                                {hasAlarm && (
                                                    <div style={{ 
                                                        background: 'var(--warning-bg)', 
                                                        color: 'var(--warning)', 
                                                        padding: '4px 8px', 
                                                        borderRadius: '6px', 
                                                        fontSize: '10px', 
                                                        fontWeight: 600,
                                                        display: 'flex', 
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        marginTop: '6px'
                                                    }}>
                                                        <AlertTriangle size={10} />
                                                        {v.alarms[0]}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Map Container and Detail Card overlay */}
                        <div style={{ flex: 1, position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                            <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }}></div>

                            {/* Detail Panel overlay */}
                            {selectedVehicle && (
                                <div style={{ 
                                    position: 'absolute', 
                                    bottom: '20px', 
                                    left: '20px', 
                                    right: '20px',
                                    background: 'var(--bg-primary)', 
                                    borderRadius: '16px', 
                                    border: '1px solid var(--border-color)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                                    zIndex: 2,
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>{selectedVehicle.plate}</h3>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                {selectedVehicle.brand} {selectedVehicle.model} - Sürücü: {selectedVehicle.driver}
                                            </p>
                                        </div>
                                        <button 
                                            style={{ 
                                                background: 'transparent', 
                                                border: 'none', 
                                                color: 'var(--text-secondary)', 
                                                fontSize: '16px', 
                                                cursor: 'pointer',
                                                padding: '4px'
                                            }}
                                            onClick={() => setSelectedVehicle(null)}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hız</span>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedVehicle.speed} km/h</span>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Kontak</span>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: selectedVehicle.ignition ? 'var(--success)' : 'var(--danger)' }}>
                                                {selectedVehicle.ignition ? 'Açık' : 'Kapalı'}
                                            </span>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Yön / Heading</span>
                                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Navigation size={14} style={{ transform: `rotate(${selectedVehicle.heading}deg)` }} />
                                                {selectedVehicle.heading}°
                                            </span>
                                        </div>
                                        <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '10px', display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Son Sinyal (GPS)</span>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                {selectedVehicle.gpsDate || new Date().toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>

                                    {selectedVehicle.alarms && selectedVehicle.alarms.length > 0 && (
                                        <div style={{ 
                                            background: 'var(--warning-bg)', 
                                            color: 'var(--warning)', 
                                            padding: '8px 12px', 
                                            borderRadius: '8px', 
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <AlertTriangle size={16} />
                                            <span><strong>Aktif Alarm:</strong> {selectedVehicle.alarms.join(', ')}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        <span>Konum: {selectedVehicle.lat.toFixed(6)}, {selectedVehicle.lng.toFixed(6)}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Info size={12} /> Harita OpenStreetMap tabanlıdır.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Günlük Mesafe Raporu Sekmesi */}
                {activeTab === 'daily' && (
                    <div style={{ 
                        background: 'var(--bg-primary)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Günlük Çalışma & Mesafe Raporu</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Araçların seçilen gündeki toplam çalışma süresi ve mesafe bilgileri.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Tarih:</span>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={dailyReportDate}
                                    onChange={(e) => setDailyReportDate(e.target.value)}
                                    style={{ width: '180px', height: '36px' }}
                                />
                            </div>
                        </div>

                        <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
                            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>Araç Plakası</th>
                                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>Katettiği Toplam Yol</th>
                                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>Toplam Kontak Süresi</th>
                                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>Ulaştığı Max Hız</th>
                                        <th style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 700 }}>Oluşan Alarm Sayısı</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailyReports.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                Rapor verisi yükleniyor veya bu tarihte veri bulunmuyor.
                                            </td>
                                        </tr>
                                    ) : (
                                        dailyReports.map((report, idx) => {
                                            const rawPlate = report.licensePlate || report.Plate || report.plate || ''
                                            const plateClean = rawPlate.split('-')[0].trim()
                                            const distance = report.DailyTrip !== undefined ? (parseFloat(report.DailyTrip).toFixed(2) + ' km') : (report.TotalDistance || report.totalDistance || '0 km')
                                            const speed = report.Speed !== undefined ? (report.Speed + ' km/h') : (report.MaxSpeed || report.maxSpeed || '0 km/h')
                                            const workingTime = report.WorkingTime || report.workingTime || 'Belirtilmedi'
                                            
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: 700 }}>{plateClean}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{distance}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{workingTime}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>{speed}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                                                        <span style={{ 
                                                            padding: '2px 8px', 
                                                            borderRadius: '12px', 
                                                            fontSize: '11px', 
                                                            fontWeight: 600,
                                                            background: parseInt(report.AlarmCount || 0) > 0 ? 'var(--warning-bg)' : 'var(--success-bg)',
                                                            color: parseInt(report.AlarmCount || 0) > 0 ? 'var(--warning)' : 'var(--success)'
                                                        }}>
                                                            {report.AlarmCount || 0} Alarm
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* 3. Alarmlar Sekmesi */}
                {activeTab === 'alarms' && (
                    <div style={{ 
                        background: 'var(--bg-primary)', 
                        borderRadius: '16px', 
                        border: '1px solid var(--border-color)',
                        width: '100%',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        overflowY: 'auto'
                    }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Aktif Araç Alarmları</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Filodaki araçlarda gerçekleşen en son ve aktif alarm bildirimleri.</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {activeAlarms.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    Aktif alarm bildirim bulunmuyor.
                                </div>
                            ) : (
                                activeAlarms.map((alarm, idx) => {
                                    // Match DeviceNo to find plate
                                    const mapping = mappings.find(m => m['Device No'] === alarm.DeviceNo)
                                    const plateFull = mapping ? mapping['License Plate'] : alarm.DeviceNo
                                    const plateClean = plateFull ? plateFull.split('-')[0].trim() : (alarm.DeviceNo || 'Bilinmiyor')
                                    
                                    return (
                                        <div key={idx} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'space-between', 
                                            padding: '16px', 
                                            borderRadius: '12px', 
                                            background: 'var(--warning-bg)', 
                                            border: '1px solid var(--warning)' 
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>{plateClean} - {alarm.AlarmType || 'Sistem Alarmı'}</h4>
                                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                                        {alarm.Address || 'Detay açıklaması sağlanmadı.'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatAlarmDate(alarm.GmtDateTime)}</span>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
