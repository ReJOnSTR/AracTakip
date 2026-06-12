import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import DataTable from '../components/DataTable'
import streetMapImg from '../assets/street_map.png'
import satelliteMapImg from '../assets/satellite_map.png'

import { 
    Search, MapPin, Navigation, RefreshCw, 
    Calendar, List, CheckCircle2, XCircle, Info, Car, Loader2, Clock,
    Globe, Map, Maximize2, Plus, Minus, Gauge, Power, Compass, Minimize2, User,
    Activity, FileText, Layers, ExternalLink, Play, Pause
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

function parseArventoDate(dateStr) {
    if (!dateStr || dateStr.length < 14) return null
    const yyyy = parseInt(dateStr.substring(0, 4))
    const mm = parseInt(dateStr.substring(4, 6)) - 1
    const dd = parseInt(dateStr.substring(6, 8))
    const hh = parseInt(dateStr.substring(8, 10))
    const min = parseInt(dateStr.substring(10, 12))
    const ss = parseInt(dateStr.substring(12, 14))
    return new Date(yyyy, mm, dd, hh, min, ss)
}



function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // Earth radius in meters
    const phi1 = lat1 * Math.PI / 180
    const phi2 = lat2 * Math.PI / 180
    const deltaPhi = (lat2 - lat1) * Math.PI / 180
    const deltaLambda = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // in meters
}

function findIntersections(historyPointsMap, maxDistance = 100) {
    const plates = Object.keys(historyPointsMap)
    if (plates.length < 2) return []

    const intersections = []
    
    // Compare each plate's points with every other plate's points
    for (let i = 0; i < plates.length; i++) {
        const plateA = plates[i]
        const pointsA = historyPointsMap[plateA] || []
        
        for (let j = i + 1; j < plates.length; j++) {
            const plateB = plates[j]
            const pointsB = historyPointsMap[plateB] || []
            
            pointsA.forEach(pA => {
                pointsB.forEach(pB => {
                    const dist = getDistanceMeters(pA.lat, pA.lng, pB.lat, pB.lng)
                    if (dist <= maxDistance) {
                        // Check time difference
                        const timeDiffMinutes = Math.abs(new Date(pA.gps_date) - new Date(pB.gps_date)) / (1000 * 60)
                        
                        intersections.push({
                            lat: (pA.lat + pB.lat) / 2,
                            lng: (pA.lng + pB.lng) / 2,
                            plateA,
                            plateB,
                            timeA: pA.gps_date,
                            timeB: pB.gps_date,
                            timeDiffMinutes,
                            distance: dist
                        })
                    }
                })
            })
        }
    }
    
    // De-duplicate intersections close to each other
    const uniqueIntersections = []
    intersections.forEach(inter => {
        const isDuplicate = uniqueIntersections.some(existing => {
            const geoDist = getDistanceMeters(existing.lat, existing.lng, inter.lat, inter.lng)
            return geoDist < 30 && 
                   ((existing.plateA === inter.plateA && existing.plateB === inter.plateB) ||
                    (existing.plateA === inter.plateB && existing.plateB === inter.plateA))
        })
        if (!isDuplicate) {
            uniqueIntersections.push(inter)
        }
    })
    
    return uniqueIntersections
}

function analyzeAreaVisits(points, center, radius) {
    if (!points || points.length === 0 || !center) return []
    
    // Sort points chronologically
    const sorted = [...points].sort((a, b) => new Date(a.gps_date).getTime() - new Date(b.gps_date).getTime())
    
    const visits = []
    let currentVisit = null
    const gapThresholdMs = 30 * 60 * 1000 // 30 minutes gap
    
    sorted.forEach((pt) => {
        const dist = getDistanceMeters(pt.lat, pt.lng, center.lat, center.lng)
        const isInside = dist <= radius
        const timeMs = new Date(pt.gps_date).getTime()
        
        if (isInside) {
            if (!currentVisit) {
                currentVisit = {
                    points: [pt],
                    maxSpeed: pt.speed || 0,
                    totalSpeed: pt.speed || 0,
                    entryTime: pt.gps_date,
                    exitTime: pt.gps_date
                }
            } else {
                const lastPt = currentVisit.points[currentVisit.points.length - 1]
                const lastTimeMs = new Date(lastPt.gps_date).getTime()
                
                if (timeMs - lastTimeMs > gapThresholdMs) {
                    currentVisit.exitTime = lastPt.gps_date
                    currentVisit.durationMs = lastTimeMs - new Date(currentVisit.entryTime).getTime()
                    currentVisit.avgSpeed = currentVisit.totalSpeed / currentVisit.points.length
                    visits.push(currentVisit)
                    
                    currentVisit = {
                        points: [pt],
                        maxSpeed: pt.speed || 0,
                        totalSpeed: pt.speed || 0,
                        entryTime: pt.gps_date,
                        exitTime: pt.gps_date
                    }
                } else {
                    currentVisit.points.push(pt)
                    if (pt.speed > currentVisit.maxSpeed) {
                        currentVisit.maxSpeed = pt.speed
                    }
                    currentVisit.totalSpeed += pt.speed || 0
                }
            }
        } else {
            if (currentVisit) {
                const lastPt = currentVisit.points[currentVisit.points.length - 1]
                const lastTimeMs = new Date(lastPt.gps_date).getTime()
                currentVisit.exitTime = pt.gps_date
                currentVisit.durationMs = new Date(pt.gps_date).getTime() - new Date(currentVisit.entryTime).getTime()
                currentVisit.avgSpeed = currentVisit.totalSpeed / currentVisit.points.length
                visits.push(currentVisit)
                currentVisit = null
            }
        }
    })
    
    if (currentVisit) {
        const lastPt = currentVisit.points[currentVisit.points.length - 1]
        const lastTimeMs = new Date(lastPt.gps_date).getTime()
        currentVisit.exitTime = lastPt.gps_date
        currentVisit.durationMs = lastTimeMs - new Date(currentVisit.entryTime).getTime()
        currentVisit.avgSpeed = currentVisit.totalSpeed / currentVisit.points.length
        visits.push(currentVisit)
    }
    
    return visits.map(v => {
        const durationMin = Math.max(1, Math.round(v.durationMs / 60000))
        return {
            ...v,
            duration: durationMin
        }
    })
}

function getHistoryColor(index) {
    const colors = [
        '#00d2ff', // Cyan
        '#d946ef', // Magenta / Pink
        '#f59e0b', // Amber / Orange
        '#10b981', // Emerald Green
        '#8b5cf6', // Violet / Purple
        '#ef4444', // Red
        '#3b82f6'  // Blue
    ]
    return colors[index % colors.length]
}

function getInterpolatedPosition(points, targetTime) {
    if (!points || points.length === 0) return null
    
    const tTarget = new Date(targetTime).getTime()
    
    const pTimes = points.map(p => ({
        ...p,
        timeMs: new Date(p.gps_date).getTime()
    })).sort((a, b) => a.timeMs - b.timeMs)
    
    // Check if target is before first point
    if (tTarget < pTimes[0].timeMs) {
        const diff = pTimes[0].timeMs - tTarget
        if (diff <= 30 * 60 * 1000) {
            return { ...pTimes[0], active: true }
        }
        return null
    }
    
    // Check if target is after last point
    if (tTarget > pTimes[pTimes.length - 1].timeMs) {
        const diff = tTarget - pTimes[pTimes.length - 1].timeMs
        if (diff <= 30 * 60 * 1000) {
            return { ...pTimes[pTimes.length - 1], active: true }
        }
        return null
    }
    
    // Search for segment
    for (let i = 0; i < pTimes.length - 1; i++) {
        const p1 = pTimes[i]
        const p2 = pTimes[i + 1]
        
        if (tTarget >= p1.timeMs && tTarget <= p2.timeMs) {
            if (p2.timeMs - p1.timeMs > 60 * 60 * 1000) {
                if (tTarget - p1.timeMs <= 30 * 60 * 1000) {
                    return { ...p1, active: true }
                }
                if (p2.timeMs - tTarget <= 30 * 60 * 1000) {
                    return { ...p2, active: true }
                }
                return null
            }
            
            const ratio = (tTarget - p1.timeMs) / (p2.timeMs - p1.timeMs)
            const lat = p1.lat + ratio * (p2.lat - p1.lat)
            const lng = p1.lng + ratio * (p2.lng - p1.lng)
            const speed = p1.speed + ratio * (p2.speed - p1.speed)
            
            let h1 = p1.heading || 0
            let h2 = p2.heading || 0
            let diffH = h2 - h1
            if (diffH > 180) {
                diffH -= 360
            } else if (diffH < -180) {
                diffH += 360
            }
            const heading = (h1 + ratio * diffH + 360) % 360
            
            return {
                lat,
                lng,
                speed,
                heading,
                ignition: ratio < 0.5 ? p1.ignition : p2.ignition,
                active: true,
                gps_date: new Date(tTarget).toISOString()
            }
        }
    }
    
    return null
}

export default function ArventoTracking() {
    const { currentCompany } = useCompany()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [leafletLoaded, setLeafletLoaded] = useState(false)
    const isDemoMode = false
    const [settings, setSettings] = useState(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all') // all, active, stopped
    const [vehicles, setVehicles] = useState([])
    const [selectedVehicle, setSelectedVehicle] = useState(null)
    const [dailyReportDate, setDailyReportDate] = useState(new Date().toLocaleDateString('sv-SE'))
    const [dailyReports, setDailyReports] = useState([])
    const [activeTab, setActiveTab] = useState('live') // live, daily, history
    const [localVehicles, setLocalVehicles] = useState([])
    const [mappings, setMappings] = useState([])

    // Historical tracking states
    const [selectedHistoryVehicles, setSelectedHistoryVehicles] = useState([])
    const [historyStartDate, setHistoryStartDate] = useState(new Date().toLocaleDateString('sv-SE'))
    const [historyEndDate, setHistoryEndDate] = useState(new Date().toLocaleDateString('sv-SE'))
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('')
    const [historyDataMap, setHistoryDataMap] = useState({}) // { [plate]: [...] }
    const [historyLoading, setHistoryLoading] = useState(false)
    const [intersections, setIntersections] = useState([])
    const [selectedIntersection, setSelectedIntersection] = useState(null)
    const historyLayersRef = useRef([])

    // Playback timeline states
    const [currentTime, setCurrentTime] = useState(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [playbackSpeed, setPlaybackSpeed] = useState(60) // speed multiplier
    const [showTrackLines, setShowTrackLines] = useState(true)
    const [skipIdleTime, setSkipIdleTime] = useState(true)
    const [historyTimelineRange, setHistoryTimelineRange] = useState({ min: 0, max: 0 })
    const animationTimerRef = useRef(null)

    // Area Query / Geofencing states
    const [areaCenter, setAreaCenter] = useState(null)
    const [areaRadius, setAreaRadius] = useState(200) // in meters
    const [areaQueryResults, setAreaQueryResults] = useState([])
    const [areaQueryLoading, setAreaQueryLoading] = useState(false)
    const [areaProgress, setAreaProgress] = useState({ current: 0, total: 0, plate: '' })
    const [selectedAreaVisit, setSelectedAreaVisit] = useState(null)
    const [areaSearchQuery, setAreaSearchQuery] = useState('')

    const mapRef = useRef(null)
    const mapInstance = useRef(null)
    const markersRef = useRef({})
    const hasInitialFit = useRef(false)
    const pollingTimer = useRef(null)

    const [isMapFullscreen, setIsMapFullscreen] = useState(false)
    const [mapReady, setMapReady] = useState(false)
    const isMapTab = activeTab === 'live' || activeTab === 'history' || activeTab === 'area'

    // Calculate route distance in km for history playback
    const historyDistances = useMemo(() => {
        const distances = {}
        Object.keys(historyDataMap).forEach(plate => {
            const points = historyDataMap[plate] || []
            if (points.length < 2) {
                distances[plate] = 0
                return
            }
            let totalMeters = 0
            for (let i = 0; i < points.length - 1; i++) {
                totalMeters += getDistanceMeters(points[i].lat, points[i].lng, points[i+1].lat, points[i+1].lng)
            }
            distances[plate] = totalMeters / 1000
        })
        return distances
    }, [historyDataMap])

    // Extract sorted timestamps of all points where speed > 0 across selected vehicles
    const movingTimestamps = useMemo(() => {
        const timestamps = []
        Object.keys(historyDataMap).forEach(plate => {
            const points = historyDataMap[plate] || []
            points.forEach(p => {
                if (p.speed > 0) {
                    timestamps.push(new Date(p.gps_date).getTime())
                }
            })
        })
        return timestamps.sort((a, b) => a - b)
    }, [historyDataMap])

    const formatTimelineTime = (timestamp) => {
        if (!timestamp) return '--:--:--'
        const date = new Date(timestamp)
        const isSingleDay = historyStartDate === historyEndDate
        if (isSingleDay) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        } else {
            return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
        }
    }

    const formatTimelineEdge = (timestamp) => {
        if (!timestamp) return ''
        const date = new Date(timestamp)
        const isSingleDay = historyStartDate === historyEndDate
        if (isSingleDay) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        } else {
            return `${date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        }
    }

    // Trigger leaflet resize on fullscreen toggle
    useEffect(() => {
        if (mapInstance.current && mapReady) {
            const timer = setTimeout(() => {
                if (mapInstance.current) {
                    mapInstance.current.invalidateSize()
                }
            }, 150)
            return () => clearTimeout(timer)
        }
    }, [isMapFullscreen, mapReady])

    // Invalidate map size when tab changes to ensure proper layout sizing
    useEffect(() => {
        if (mapInstance.current && mapReady) {
            const timer = setTimeout(() => {
                if (mapInstance.current) {
                    mapInstance.current.invalidateSize()
                }
            }, 100)
            return () => clearTimeout(timer)
        }
    }, [activeTab, mapReady])

    const [mapMode, setMapMode] = useState(() => localStorage.getItem('arvento_map_mode') || 'street') // street, satellite
    const [showMapPicker, setShowMapPicker] = useState(false)
    const [trafficEnabled, setTrafficEnabled] = useState(() => localStorage.getItem('arvento_traffic_enabled') === 'true')
    const [labelsEnabled, setLabelsEnabled] = useState(() => {
        const stored = localStorage.getItem('arvento_labels_enabled');
        return stored === null ? true : stored === 'true';
    })
    const baseLayerRef = useRef(null)

    useEffect(() => {
        localStorage.setItem('arvento_map_mode', mapMode);
    }, [mapMode])

    useEffect(() => {
        localStorage.setItem('arvento_traffic_enabled', String(trafficEnabled));
    }, [trafficEnabled])

    useEffect(() => {
        localStorage.setItem('arvento_labels_enabled', String(labelsEnabled));
    }, [labelsEnabled])

    // Load Leaflet Assets
    useEffect(() => {
        const existingLink = document.querySelector('link[href*="leaflet.css"]')
        if (!existingLink) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='
            link.crossOrigin = ''
            document.head.appendChild(link)
        }

        if (window.L) {
            setLeafletLoaded(true)
            return
        }

        const existingScript = document.querySelector('script[src*="leaflet.js"]')
        if (!existingScript) {
            const script = document.createElement('script')
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='
            script.crossOrigin = ''
            script.onload = () => setLeafletLoaded(true)
            document.body.appendChild(script)
        } else {
            const handleLoad = () => setLeafletLoaded(true)
            existingScript.addEventListener('load', handleLoad)
            return () => {
                existingScript.removeEventListener('load', handleLoad)
            }
        }
    }, [])

    // Inject custom styling for Leaflet markers
    useEffect(() => {
        const style = document.createElement('style')
        style.type = 'text/css'
        style.innerHTML = `
            @keyframes markerPulse {
                0% { transform: scale(0.6); opacity: 1; }
                100% { transform: scale(1.6); opacity: 0; }
            }
            .custom-vehicle-marker {
                background: transparent !important;
                border: none !important;
            }
            .plate-badge-container {
                background: rgba(15, 23, 42, 0.95);
                color: #f8fafc;
                padding: 3px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-weight: 700;
                border: 1px solid rgba(255,255,255,0.15);
                white-space: nowrap;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3);
                margin-bottom: 6px;
                text-align: center;
                letter-spacing: 0.5px;
            }
            .marker-pin-wrapper {
                position: relative;
                width: 40px;
                height: 40px;
                background: #ffffff;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 15px rgba(0,0,0,0.25);
                transition: all 0.3s ease;
            }
            .marker-direction-arrow {
                width: 26px;
                height: 26px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.4s ease;
            }
            .marker-pulse-ring {
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                border-radius: 50%;
                opacity: 0;
                pointer-events: none;
            }
            .marker-pulse-active {
                animation: markerPulse 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
            }

            /* Premium Left-Side Collapsible Drawer Panel */
            .vehicle-detail-drawer {
                position: absolute;
                top: 0;
                left: 0;
                bottom: 0;
                width: 360px;
                height: 100%;
                background: rgba(15, 15, 18, 0.92);
                backdrop-filter: blur(24px) saturate(1.4);
                -webkit-backdrop-filter: blur(24px) saturate(1.4);
                border-right: 1px solid rgba(255,255,255,0.06);
                box-shadow: 8px 0 40px rgba(0, 0, 0, 0.45), 0 0 80px rgba(0,0,0,0.15);
                z-index: 1000;
                display: flex;
                flex-direction: column;
                transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1);
                animation: drawerSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1);
            }

            @keyframes drawerSlideIn {
                from { transform: translateX(-100%); opacity: 0.5; }
                to { transform: translateX(0); opacity: 1; }
            }

            [data-theme="light"] .vehicle-detail-drawer {
                background: rgba(255, 255, 255, 0.95);
                box-shadow: 8px 0 40px rgba(0, 0, 0, 0.08);
                border-right: 1px solid rgba(0,0,0,0.08);
            }

            /* Drawer Close Tab (outside drawer) */
            .drawer-close-tab {
                position: absolute;
                top: 50%;
                right: -28px;
                transform: translateY(-50%);
                width: 28px;
                height: 64px;
                background: rgba(15, 15, 18, 0.92);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(255,255,255,0.06);
                border-left: none;
                border-radius: 0 10px 10px 0;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: var(--text-secondary);
                transition: all 0.2s ease;
                z-index: 1001;
            }
            .drawer-close-tab:hover {
                background: rgba(30, 30, 35, 0.95);
                color: var(--text-primary);
                width: 32px;
            }
            [data-theme="light"] .drawer-close-tab {
                background: rgba(255, 255, 255, 0.95);
                border-color: rgba(0,0,0,0.08);
            }
            [data-theme="light"] .drawer-close-tab:hover {
                background: rgba(245, 245, 250, 0.98);
            }

            .drawer-header {
                padding: 20px 20px 16px;
                border-bottom: 1px solid rgba(255,255,255,0.04);
                display: flex;
                flex-direction: column;
                gap: 14px;
                position: relative;
            }
            [data-theme="light"] .drawer-header {
                border-bottom-color: rgba(0,0,0,0.06);
            }

            /* Status indicator bar at top */
            .drawer-status-bar {
                height: 3px;
                border-radius: 0 0 4px 4px;
                position: absolute;
                top: 0;
                left: 20px;
                right: 20px;
                opacity: 0.8;
            }
            .drawer-status-bar.status-active {
                background: linear-gradient(90deg, #22c55e, #4ade80);
                box-shadow: 0 2px 12px rgba(34, 197, 94, 0.35);
            }
            .drawer-status-bar.status-stopped {
                background: linear-gradient(90deg, #ef4444, #f87171);
                box-shadow: 0 2px 12px rgba(239, 68, 68, 0.3);
            }
            .drawer-status-bar.status-offline {
                background: linear-gradient(90deg, #6b7280, #9ca3af);
                box-shadow: 0 2px 12px rgba(107, 114, 128, 0.2);
            }

            .vehicle-detail-header {
                display: flex;
                align-items: center;
                gap: 12px;
                position: relative;
            }

            .vehicle-detail-avatar {
                width: 44px;
                height: 44px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.3s ease;
            }

            .vehicle-detail-avatar.state-active {
                background: rgba(34, 197, 94, 0.12);
                color: #22c55e;
                box-shadow: 0 0 20px rgba(34, 197, 94, 0.2);
                border: 1px solid rgba(34, 197, 94, 0.15);
            }

            .vehicle-detail-avatar.state-stopped {
                background: rgba(239, 68, 68, 0.12);
                color: #ef4444;
                box-shadow: 0 0 20px rgba(239, 68, 68, 0.15);
                border: 1px solid rgba(239, 68, 68, 0.12);
            }

            .vehicle-detail-avatar.state-offline {
                background: rgba(107, 114, 128, 0.12);
                color: #6b7280;
                box-shadow: 0 0 20px rgba(107, 114, 128, 0.1);
                border: 1px solid rgba(107, 114, 128, 0.08);
            }

            .vehicle-detail-meta {
                display: flex;
                flex-direction: column;
                min-width: 0;
                flex: 1;
            }

            /* Vehicle Detail Plate Style */
            .vehicle-detail-plate {
                font-family: 'Inter', -apple-system, sans-serif;
                font-weight: 800;
                font-size: 15px;
                color: var(--text-primary);
                letter-spacing: 0.5px;
                margin-bottom: 3px;
                text-transform: uppercase;
            }

            .vehicle-detail-brand {
                margin: 0;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .vehicle-detail-driver {
                margin: 0;
                font-size: 11px;
                color: var(--text-secondary);
                margin-top: 1px;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            /* Drawer Content & Scrolling */
            .drawer-content-scroll {
                overflow-y: auto;
                flex: 1;
                padding: 16px 20px;
                display: flex;
                flex-direction: column;
                gap: 18px;
            }
            .drawer-content-scroll::-webkit-scrollbar {
                width: 4px;
            }
            .drawer-content-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
            .drawer-content-scroll::-webkit-scrollbar-thumb {
                background: rgba(255,255,255,0.08);
                border-radius: 2px;
            }
            [data-theme="light"] .drawer-content-scroll::-webkit-scrollbar-thumb {
                background: rgba(0,0,0,0.1);
            }

            .drawer-section-title {
                font-size: 10px;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1.2px;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .vehicle-detail-metrics-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 8px;
            }

            .metric-card-modern {
                background: rgba(255,255,255,0.03);
                padding: 10px 12px;
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.05);
                display: flex;
                align-items: center;
                gap: 10px;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                min-width: 0;
            }
            [data-theme="light"] .metric-card-modern {
                background: rgba(0,0,0,0.02);
                border-color: rgba(0,0,0,0.06);
            }

            .metric-card-modern:hover {
                background: rgba(255,255,255,0.06);
                border-color: rgba(255,255,255,0.1);
                transform: translateY(-1px);
            }
            [data-theme="light"] .metric-card-modern:hover {
                background: rgba(0,0,0,0.04);
                border-color: rgba(0,0,0,0.1);
            }

            .metric-icon-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                border-radius: 8px;
                flex-shrink: 0;
            }

            .metric-icon-wrapper.speed {
                background: rgba(20, 184, 166, 0.1);
                color: #14b8a6;
            }

            .metric-icon-wrapper.direction {
                background: rgba(99, 102, 241, 0.1);
                color: #6366f1;
            }

            .metric-icon-wrapper.time {
                background: rgba(245, 158, 11, 0.1);
                color: #f59e0b;
            }

            .metric-icon-wrapper.ignition {
                border-radius: 8px;
            }

            .metric-icon-wrapper.location {
                background: rgba(59, 130, 246, 0.1);
                color: #3b82f6;
            }

            .metric-content {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }

            .metric-label {
                font-size: 9px;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .metric-value {
                font-size: 13px;
                font-weight: 800;
                color: var(--text-primary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* Detailed Database Rows */
            .detail-row {
                display: flex;
                flex-direction: column;
                gap: 0;
                background: rgba(255,255,255,0.02);
                border-radius: 10px;
                border: 1px solid rgba(255,255,255,0.05);
                overflow: hidden;
            }
            [data-theme="light"] .detail-row {
                background: rgba(0,0,0,0.015);
                border-color: rgba(0,0,0,0.06);
            }

            .detail-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 9px 14px;
                font-size: 12px;
            }

            .detail-item:not(:last-child) {
                border-bottom: 1px solid rgba(255,255,255,0.04);
            }
            [data-theme="light"] .detail-item:not(:last-child) {
                border-bottom-color: rgba(0,0,0,0.05);
            }

            .detail-label {
                color: var(--text-secondary);
                font-weight: 500;
                font-size: 12px;
            }

            .detail-value {
                color: var(--text-primary);
                font-weight: 700;
                font-size: 12px;
            }

            /* Notes Callout */
            .notes-callout {
                background: rgba(245, 158, 11, 0.06);
                border-left: 3px solid rgba(245, 158, 11, 0.5);
                padding: 10px 12px;
                border-radius: 2px 8px 8px 2px;
                font-size: 11px;
                line-height: 1.5;
                color: var(--text-secondary);
            }
            [data-theme="light"] .notes-callout {
                background: rgba(245, 158, 11, 0.04);
            }

            /* Action Buttons Footer */
            .drawer-footer {
                padding: 14px 20px;
                border-top: 1px solid rgba(255,255,255,0.04);
                background: rgba(10, 10, 12, 0.6);
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            [data-theme="light"] .drawer-footer {
                background: rgba(250, 250, 255, 0.8);
                border-top-color: rgba(0,0,0,0.06);
            }

            /* Map control shift when drawer is open - no shift needed for left drawer */
            .map-controls-container {
                transition: right 0.3s cubic-bezier(0.22, 1, 0.36, 1);
            }

            /* Coordinate badge */
            .coord-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: rgba(255,255,255,0.04);
                padding: 4px 8px;
                border-radius: 6px;
                font-family: 'JetBrains Mono', 'SF Mono', monospace;
                font-size: 11px;
                color: var(--text-secondary);
                border: 1px solid rgba(255,255,255,0.04);
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .coord-badge:hover {
                background: rgba(255,255,255,0.08);
                color: var(--text-primary);
            }
            [data-theme="light"] .coord-badge {
                background: rgba(0,0,0,0.03);
                border-color: rgba(0,0,0,0.05);
            }

            .coord-badge-gmaps {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                background: rgba(66, 133, 244, 0.15);
                padding: 4px 8px;
                border-radius: 6px;
                font-family: 'JetBrains Mono', 'SF Mono', monospace;
                font-size: 11px;
                color: #8ab4f8;
                border: 1px solid rgba(66, 133, 244, 0.25);
                cursor: pointer;
                transition: all 0.15s ease;
            }
            .coord-badge-gmaps:hover {
                background: rgba(66, 133, 244, 0.25);
                color: #ffffff;
            }
            [data-theme="light"] .coord-badge-gmaps {
                background: rgba(26, 115, 232, 0.1);
                border-color: rgba(26, 115, 232, 0.2);
                color: #1a73e8;
            }
            [data-theme="light"] .coord-badge-gmaps:hover {
                background: rgba(26, 115, 232, 0.15);
                color: #1557b0;
            }

            .btn-google-maps {
                background: rgba(66, 133, 244, 0.1);
                color: #8ab4f8;
                border: 1px solid rgba(66, 133, 244, 0.2);
            }
            .btn-google-maps:hover:not(:disabled) {
                background: rgba(66, 133, 244, 0.18);
                border-color: rgba(66, 133, 244, 0.35);
                color: #9eccff;
            }
            [data-theme="light"] .btn-google-maps {
                background: rgba(26, 115, 232, 0.08);
                color: #1a73e8;
                border-color: rgba(26, 115, 232, 0.18);
            }
            [data-theme="light"] .btn-google-maps:hover:not(:disabled) {
                background: rgba(26, 115, 232, 0.15);
                border-color: rgba(26, 115, 232, 0.3);
                color: #1557b0;
            }

            @media (max-width: 500px) {
                .vehicle-detail-drawer {
                    width: 100% !important;
                }
                .drawer-header {
                    padding: 16px 16px 12px;
                }
                .drawer-content-scroll {
                    padding: 14px 16px;
                    gap: 14px;
                }
                .drawer-footer {
                    padding: 12px 16px;
                }
            }

            /* Map Picker Popup */
            .map-picker-popup {
                position: absolute;
                top: 0;
                right: calc(100% + 10px);
                width: 220px;
                background: rgba(15, 15, 18, 0.95);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.08);
                border-radius: 14px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.5);
                z-index: 1100;
                padding: 12px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                animation: pickerFadeIn 0.2s ease;
            }
            [data-theme="light"] .map-picker-popup {
                background: rgba(255, 255, 255, 0.97);
                border-color: rgba(0,0,0,0.1);
                box-shadow: 0 12px 40px rgba(0,0,0,0.15);
            }
            @keyframes pickerFadeIn {
                from { opacity: 0; transform: translateY(6px) scale(0.97); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .map-picker-title {
                font-size: 10px;
                font-weight: 700;
                color: var(--text-muted);
                text-transform: uppercase;
                letter-spacing: 1px;
                padding: 0 2px;
            }
            .map-picker-options {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }
            .map-picker-option {
                position: relative;
                display: flex;
                flex-direction: column;
                border-radius: 12px;
                background: rgba(255,255,255,0.03);
                cursor: pointer;
                transition: all 0.15s ease;
                overflow: hidden;
                width: 100%;
                padding: 0 0 8px 0;
            }
            .map-picker-option::after {
                content: '';
                position: absolute;
                inset: 0;
                border-radius: 12px;
                border: 2px solid transparent;
                pointer-events: none;
                transition: all 0.15s ease;
            }
            [data-theme="light"] .map-picker-option {
                background: rgba(0,0,0,0.02);
            }
            .map-picker-option:hover {
                background: rgba(255,255,255,0.06);
            }
            .map-picker-option:hover::after {
                border-color: rgba(255,255,255,0.12);
            }
            [data-theme="light"] .map-picker-option:hover {
                background: rgba(0,0,0,0.04);
            }
            [data-theme="light"] .map-picker-option:hover::after {
                border-color: rgba(0,0,0,0.06);
            }
            .map-picker-option.selected {
                background: rgba(99, 102, 241, 0.08);
            }
            .map-picker-option.selected::after {
                border-color: var(--primary);
            }
            [data-theme="light"] .map-picker-option.selected {
                background: rgba(99, 102, 241, 0.04);
            }
            .map-picker-option-icon {
                width: 100%;
                height: 56px;
                overflow: hidden;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                display: flex;
                align-items: center;
                justify-content: center;
            }
            [data-theme="light"] .map-picker-option-icon {
                border-bottom-color: rgba(0,0,0,0.08);
            }
            .map-picker-option-icon img {
                width: 100% !important;
                height: 100% !important;
                display: block;
                object-fit: cover !important;
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .map-picker-option:hover .map-picker-option-icon img {
                transform: scale(1.08);
            }
            .map-picker-option-label {
                font-size: 11px;
                font-weight: 600;
                color: var(--text-primary);
                margin-top: 6px;
                text-align: center;
            }
            /* Traffic toggle row */
            .map-picker-toggle-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 6px;
                border-radius: 8px;
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.05);
            }
            [data-theme="light"] .map-picker-toggle-row {
                background: rgba(0,0,0,0.02);
                border-color: rgba(0,0,0,0.06);
            }
            .map-picker-toggle-label {
                display: flex;
                align-items: center;
                gap: 6px;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-primary);
            }
            .traffic-toggle {
                position: relative;
                width: 36px;
                height: 20px;
                background: rgba(255,255,255,0.1);
                border-radius: 10px;
                cursor: pointer;
                transition: background 0.2s ease;
                border: none;
                padding: 0;
            }
            [data-theme="light"] .traffic-toggle {
                background: rgba(0,0,0,0.1);
            }
            .traffic-toggle.active {
                background: var(--primary);
            }
            .traffic-toggle-knob {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                background: #ffffff;
                transition: transform 0.2s ease;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            }
            .traffic-toggle.active .traffic-toggle-knob {
                transform: translateX(16px);
            }

        `
        document.head.appendChild(style)
        return () => {
            try {
                document.head.removeChild(style)
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
        if (!leafletLoaded || !isMapTab || !mapRef.current) {
            setMapReady(false)
            return
        }

        let timer1, timer2, timer3
        if (!mapInstance.current) {
            // Istanbul coordinates by default (overridden by fitBounds once data loads)
            mapInstance.current = window.L.map(mapRef.current, {
                zoomControl: false,
                attributionControl: false
            }).setView([40.993, 29.02], 13)

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

        setMapReady(true)

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
            baseLayerRef.current = null
            markersRef.current = {}
            setMapReady(false)
        }
    }, [leafletLoaded, isMapTab])

    const handleAreaQuery = async () => {
        if (!areaCenter) return
        setAreaQueryLoading(true)
        setAreaQueryResults([])
        setSelectedAreaVisit(null)
        setAreaProgress({ current: 0, total: 0, plate: '' })
        
        try {
            // Find all vehicles mapped to Arvento
            const arventoPlates = vehicles.map(v => v.plate)
            if (arventoPlates.length === 0) {
                setAreaQueryLoading(false)
                return
            }
            
            const startDate = new Date(`${historyStartDate}T00:00:00`).toISOString()
            const endDate = new Date(`${historyEndDate}T23:59:59`).toISOString()
            
            const results = []
            
            for (let i = 0; i < arventoPlates.length; i++) {
                const plate = arventoPlates[i]
                setAreaProgress({ current: i + 1, total: arventoPlates.length, plate })
                
                const res = await window.electronAPI.arventoGetHistory({
                    plates: [plate],
                    startDate,
                    endDate
                })
                
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    const visits = analyzeAreaVisits(res.data, areaCenter, areaRadius)
                    if (visits.length > 0) {
                        const localVeh = localVehicles.find(lv => 
                            lv.plate.replace(/[\s-]+/g, '').toUpperCase() === plate.replace(/[\s-]+/g, '').toUpperCase()
                        )
                        results.push({
                            plate,
                            brand: localVeh ? localVeh.brand : '',
                            model: localVeh ? localVeh.model : '',
                            visits
                        })
                    }
                }
            }
            
            setAreaQueryResults(results)
        } catch (error) {
            console.error('Error querying area:', error)
        } finally {
            setAreaQueryLoading(false)
        }
    }

    // Map Click Listener for Area Selection
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady) return

        const handleMapClick = (e) => {
            if (activeTab === 'area') {
                const { lat, lng } = e.latlng
                setAreaCenter({ lat, lng })
                mapInstance.current.panTo([lat, lng])
            }
        }

        mapInstance.current.on('click', handleMapClick)

        return () => {
            if (mapInstance.current) {
                mapInstance.current.off('click', handleMapClick)
            }
        }
    }, [mapReady, activeTab, leafletLoaded])

    // Draw Area Query Circle, Marker and Highlights on Map
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady) return

        const areaLayers = []

        if (activeTab === 'area') {
            const L = window.L

            // 1. Draw queried zone circle
            if (areaCenter && areaCenter.lat && areaCenter.lng) {
                const circle = L.circle([areaCenter.lat, areaCenter.lng], {
                    radius: areaRadius,
                    color: 'var(--primary)',
                    fillColor: 'var(--primary)',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '6, 6'
                }).addTo(mapInstance.current)
                areaLayers.push(circle)

                // Draw central pulsar dot marker
                const pulsar = L.marker([areaCenter.lat, areaCenter.lng], {
                    icon: L.divIcon({
                        className: 'area-center-pulsar',
                        html: '<div class="pulsar-dot"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).addTo(mapInstance.current)
                areaLayers.push(pulsar)
            }

            // 2. Draw highlighted path of selected visit
            if (selectedAreaVisit && selectedAreaVisit.points && selectedAreaVisit.points.length > 0) {
                const latlngs = selectedAreaVisit.points.map(pt => [pt.lat, pt.lng])

                // Draw main path line
                const polyline = L.polyline(latlngs, {
                    color: 'var(--accent-primary)',
                    weight: 4.5,
                    opacity: 0.95,
                    lineJoin: 'round'
                }).addTo(mapInstance.current)
                areaLayers.push(polyline)

                // Add entry marker
                const entryPt = selectedAreaVisit.points[0]
                const entryMarker = L.marker([entryPt.lat, entryPt.lng], {
                    icon: L.divIcon({
                        className: 'area-endpoint-marker entry',
                        html: `<div class="endpoint-dot entry"></div><div class="endpoint-label">Giriş: ${new Date(entryPt.gps_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(mapInstance.current)
                areaLayers.push(entryMarker)

                // Add exit marker
                const exitPt = selectedAreaVisit.points[selectedAreaVisit.points.length - 1]
                const exitMarker = L.marker([exitPt.lat, exitPt.lng], {
                    icon: L.divIcon({
                        className: 'area-endpoint-marker exit',
                        html: `<div class="endpoint-dot exit"></div><div class="endpoint-label">Çıkış: ${new Date(exitPt.gps_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6]
                    })
                }).addTo(mapInstance.current)
                areaLayers.push(exitMarker)
            }
        }

        return () => {
            areaLayers.forEach(layer => layer.remove())
        }
    }, [activeTab, areaCenter, areaRadius, selectedAreaVisit, leafletLoaded, mapReady])

    // Center map on selectedAreaVisit path
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady || activeTab !== 'area') return
        if (selectedAreaVisit && selectedAreaVisit.points && selectedAreaVisit.points.length > 0) {
            const latlngs = selectedAreaVisit.points.map(pt => [pt.lat, pt.lng])
            mapInstance.current.fitBounds(latlngs, { padding: [50, 50], maxZoom: 16 })
        }
    }, [selectedAreaVisit, leafletLoaded, mapReady, activeTab])

    // Manage Map Base Layers (Google Maps with dynamic overlays)
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady) return

        // 1. Remove existing layer if it exists
        if (baseLayerRef.current) {
            if (mapInstance.current.hasLayer(baseLayerRef.current)) {
                mapInstance.current.removeLayer(baseLayerRef.current)
            }
            baseLayerRef.current = null
        }

        // 2. Determine new layer URL and options
        let url = ''
        let options = {
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '&copy; Google Maps'
        }

        if (mapMode === 'satellite') {
            if (labelsEnabled) {
                if (trafficEnabled) {
                    url = 'https://{s}.google.com/vt/lyrs=y,traffic&hl=tr&x={x}&y={y}&z={z}'
                } else {
                    url = 'https://{s}.google.com/vt/lyrs=y&hl=tr&x={x}&y={y}&z={z}'
                }
            } else {
                if (trafficEnabled) {
                    url = 'https://{s}.google.com/vt/lyrs=y,traffic&hl=tr&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off'
                } else {
                    url = 'https://{s}.google.com/vt/lyrs=y&hl=tr&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off'
                }
            }
        } else {
            // street mode
            if (labelsEnabled) {
                if (trafficEnabled) {
                    url = 'https://{s}.google.com/vt/lyrs=m,traffic&hl=tr&x={x}&y={y}&z={z}'
                } else {
                    url = 'https://{s}.google.com/vt/lyrs=m&hl=tr&x={x}&y={y}&z={z}'
                }
            } else {
                if (trafficEnabled) {
                    url = 'https://{s}.google.com/vt/lyrs=m,traffic&hl=tr&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off'
                } else {
                    url = 'https://{s}.google.com/vt/lyrs=m&hl=tr&x={x}&y={y}&z={z}&apistyle=s.t:2|s.e:l|p.v:off'
                }
            }
        }

        // 3. Create and add new layer
        baseLayerRef.current = window.L.tileLayer(url, options)
        baseLayerRef.current.addTo(mapInstance.current)
    }, [leafletLoaded, mapMode, trafficEnabled, labelsEnabled, mapReady])

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

    const handleFitBounds = () => {
        if (!mapInstance.current) return

        if (activeTab === 'history') {
            const allLatLngs = []
            Object.values(historyDataMap).forEach(pts => {
                if (Array.isArray(pts)) {
                    pts.forEach(pt => {
                        if (pt.lat && pt.lng) {
                            allLatLngs.push([pt.lat, pt.lng])
                        }
                    })
                }
            })
            if (allLatLngs.length > 0) {
                mapInstance.current.fitBounds(allLatLngs, { padding: [50, 50] })
            }
        } else {
            const activeVehicles = vehicles.filter(v => v.lat && v.lng)
            if (activeVehicles.length > 0) {
                const coords = activeVehicles.map(v => [v.lat, v.lng])
                mapInstance.current.fitBounds(coords, { maxZoom: 14, padding: [50, 50] })
            }
        }
    }

    // Fetch History Data
    const fetchHistoryData = async () => {
        if (selectedHistoryVehicles.length === 0) {
            setHistoryDataMap({})
            setIntersections([])
            return
        }
        
        setHistoryLoading(true)
        try {
            // Get start and end of selected date range
            const startDate = new Date(`${historyStartDate}T00:00:00`).toISOString()
            const endDate = new Date(`${historyEndDate}T23:59:59`).toISOString()
            
            const result = await window.electronAPI.arventoGetHistory({
                plates: selectedHistoryVehicles,
                startDate,
                endDate
            })
            
            if (result.success && Array.isArray(result.data)) {
                // Group points by plate (case and space insensitive)
                const grouped = {}
                selectedHistoryVehicles.forEach(p => {
                    grouped[p] = []
                })
                
                let minT = Infinity
                let maxT = -Infinity
                
                result.data.forEach(pt => {
                    // Find matching selected vehicle in a case, hyphen & whitespace insensitive way
                    const matchedPlate = selectedHistoryVehicles.find(p => 
                        p.replace(/[\s-]+/g, '').toUpperCase() === (pt.plate || '').replace(/[\s-]+/g, '').toUpperCase()
                    )
                    
                    if (matchedPlate) {
                        grouped[matchedPlate].push({
                            lat: pt.lat,
                            lng: pt.lng,
                            speed: pt.speed,
                            ignition: pt.ignition,
                            heading: pt.heading,
                            gps_date: pt.gps_date
                        })
                        
                        const t = new Date(pt.gps_date).getTime()
                        if (t < minT) minT = t
                        if (t > maxT) maxT = t
                    }
                })
                
                setHistoryDataMap(grouped)
                
                if (minT !== Infinity && maxT !== -Infinity) {
                    setHistoryTimelineRange({ min: minT, max: maxT })
                    
                    // Find first moving point (speed > 0) to start playback from movement
                    let firstMovingTime = minT
                    for (const plate of Object.keys(grouped)) {
                        const points = grouped[plate] || []
                        const movingPoint = points.find(p => p.speed > 0)
                        if (movingPoint) {
                            const movingTime = new Date(movingPoint.gps_date).getTime()
                            if (firstMovingTime === minT || movingTime < firstMovingTime) {
                                firstMovingTime = movingTime
                            }
                        }
                    }

                    setCurrentTime(firstMovingTime)
                } else {
                    const dayStart = new Date(`${historyStartDate}T00:00:00`).getTime()
                    const dayEnd = new Date(`${historyEndDate}T23:59:59`).getTime()
                    setHistoryTimelineRange({ min: dayStart, max: dayEnd })
                    setCurrentTime(dayStart)
                }
                
                // Calculate intersections (kept for reference in case needed)
                const detected = findIntersections(grouped, 100)
                setIntersections(detected)
            } else {
                setHistoryDataMap({})
                setIntersections([])
            }
        } catch (error) {
            console.error('Error loading history:', error)
        } finally {
            setHistoryLoading(false)
        }
    }

    // Trigger history fetching reactively
    useEffect(() => {
        if (activeTab === 'history') {
            fetchHistoryData()
        }
    }, [selectedHistoryVehicles, historyStartDate, historyEndDate, activeTab])

    // Playback Timer Effect
    useEffect(() => {
        if (!isPlaying || activeTab !== 'history') {
            if (animationTimerRef.current) {
                clearInterval(animationTimerRef.current)
                animationTimerRef.current = null
            }
            return
        }

        const intervalMs = 100
        animationTimerRef.current = setInterval(() => {
            setCurrentTime(prev => {
                if (prev === null) return historyTimelineRange.min
                let nextVal = prev + playbackSpeed * intervalMs
                
                if (skipIdleTime && movingTimestamps.length > 0) {
                    const lastMovingTime = movingTimestamps[movingTimestamps.length - 1]
                    if (nextVal < lastMovingTime) {
                        const nextMoving = movingTimestamps.find(t => t >= nextVal)
                        if (nextMoving) {
                            const gap = nextMoving - nextVal
                            if (gap > 15000) {
                                nextVal = Math.max(nextVal, nextMoving - 5000)
                            }
                        }
                    }
                }

                if (nextVal >= historyTimelineRange.max) {
                    setIsPlaying(false)
                    return historyTimelineRange.max
                }
                return nextVal
            })
        }, intervalMs)

        return () => {
            if (animationTimerRef.current) {
                clearInterval(animationTimerRef.current)
                animationTimerRef.current = null
            }
        }
    }, [isPlaying, playbackSpeed, historyTimelineRange, activeTab, skipIdleTime, movingTimestamps])

    // Draw History on Map
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady) {
            historyLayersRef.current = []
            return
        }

        if (activeTab !== 'history') {
            // Remove all history layers if we switched away from history tab
            if (historyLayersRef.current) {
                historyLayersRef.current.forEach(layer => layer.remove())
                historyLayersRef.current = []
            }
            return
        }

        // Clear existing layers
        if (historyLayersRef.current) {
            historyLayersRef.current.forEach(layer => layer.remove())
            historyLayersRef.current = []
        }

        const L = window.L

        // 1. Draw daily route polylines if enabled
        if (showTrackLines) {
            selectedHistoryVehicles.forEach((plate, idx) => {
                const points = historyDataMap[plate] || []
                if (points.length === 0) return

                const latlngs = points.map(p => [p.lat, p.lng])
                const pathColor = getHistoryColor(idx)

                // Draw outline/shadow line for contrast and depth
                const shadowLine = L.polyline(latlngs, {
                    color: '#000000',
                    weight: 7,
                    opacity: 0.25,
                    lineJoin: 'round'
                }).addTo(mapInstance.current)
                historyLayersRef.current.push(shadowLine)

                // Draw actual solid track line on top
                const polyline = L.polyline(latlngs, {
                    color: pathColor,
                    weight: 4,
                    opacity: 0.9,
                    lineJoin: 'round'
                }).addTo(mapInstance.current)
                
                polyline.bindPopup(`<b>${plate} Günlük Rotası</b><br/>Toplam Konum Kaydı: ${points.length}`)
                historyLayersRef.current.push(polyline)
            })
        }

        // 2. Draw animated vehicle markers at currentTime
        if (currentTime !== null) {
            selectedHistoryVehicles.forEach((plate, idx) => {
                const points = historyDataMap[plate] || []
                if (points.length === 0) return

                const pos = getInterpolatedPosition(points, currentTime)
                if (!pos) return

                const pathColor = getHistoryColor(idx)
                const pinColor = pathColor

                // Custom svg icon using path color
                const svgIcon = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 80px;">
                        <!-- Plate Badge -->
                        <div class="plate-badge-container" style="background: ${pinColor}; color: white; border: 1.5px solid white;">
                            ${plate}
                        </div>
                        <!-- Marker Circle -->
                        <div class="marker-pin-wrapper" style="border: 3.5px solid ${pinColor}; background: var(--bg-primary);">
                            <!-- Direction Arrow inside -->
                            <div class="marker-direction-arrow" style="transform: rotate(${pos.heading || 0}deg);">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${pinColor}" />
                                </svg>
                            </div>
                            <!-- Pulse Rings if ignition is active -->
                            ${(pos.ignition && pos.speed > 0) ? `
                            <div class="marker-pulse-ring marker-pulse-active" style="border: 3px solid ${pinColor};"></div>
                            ` : ''}
                        </div>
                    </div>
                `

                const icon = L.divIcon({
                    html: svgIcon,
                    className: 'custom-vehicle-marker-history',
                    iconSize: [100, 80],
                    iconAnchor: [50, 60]
                })

                const marker = L.marker([pos.lat, pos.lng], { icon }).addTo(mapInstance.current)
                
                const popupContent = `
                    <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; padding: 4px;">
                        <b style="color: ${pinColor}; font-size: 14px;">${plate} (Geçmiş)</b><br/>
                        <b>Hız:</b> ${Math.round(pos.speed)} km/h<br/>
                        <b>Kontak:</b> ${pos.ignition ? 'Açık' : 'Kapalı'}<br/>
                        <b>GPS Zamanı:</b> ${new Date(pos.gps_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}<br/>
                        <b>Konum:</b> ${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}
                    </div>
                `
                marker.bindPopup(popupContent)
                historyLayersRef.current.push(marker)
            })
        }

        return () => {
            if (historyLayersRef.current) {
                historyLayersRef.current.forEach(layer => layer.remove())
                historyLayersRef.current = []
            }
        }
    }, [historyDataMap, currentTime, showTrackLines, activeTab, leafletLoaded, mapReady])

    // Zoom to fit bounds when history data changes
    useEffect(() => {
        if (activeTab !== 'history' || !mapInstance.current || !mapReady) return
        
        const allLatLngs = []
        Object.values(historyDataMap).forEach(points => {
            points.forEach(p => allLatLngs.push([p.lat, p.lng]))
        })
        
        if (allLatLngs.length > 0) {
            mapInstance.current.fitBounds(allLatLngs, { padding: [50, 50] })
        }
    }, [historyDataMap, activeTab, mapReady])

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

            // Fetch live status from Arvento API
            const result = await window.electronAPI.arventoGetStatus()
            if (result.success && Array.isArray(result.data)) {
                // Map Arvento results using local vehicle metadata
                const mappedData = result.data.map(item => {
                    // Try to match Device No / Node to find plate
                    const mapping = currentMappings.find(m => m['Device No'] === item.Node)
                    const plateFull = mapping ? mapping['License Plate'] : item.Node
                    
                    // Clean plate from notes: e.g. "55 AEH 726 - 26M" -> "55 AEH 726"
                    const plateClean = plateFull ? plateFull.split(/\s+-/)[0].trim() : (item.Node || 'Bilinmiyor')

                    // Try to match with local vehicle (case, hyphen and space insensitive)
                    const localVeh = localVehicles.find(lv => 
                        lv.plate.replace(/[\s-]+/g, '').toUpperCase() === plateClean.replace(/[\s-]+/g, '').toUpperCase()
                    )

                    const itemSpeed = parseInt(item.Speed || item.speed || 0)
                    const isMoving = itemSpeed > 0

                    const gpsDateObj = item.LocalDateTime ? parseArventoDate(item.LocalDateTime) : null
                    const isOffline = gpsDateObj ? ((new Date() - gpsDateObj) > 30 * 60 * 1000) : false // 30 minutes threshold
                    const speedVal = isOffline ? 0 : itemSpeed
                    const ignitionVal = isOffline ? false : (item.Ignition !== undefined ? (item.Ignition === true || item.Ignition === '1' || item.Ignition === 1) : isMoving)

                    return {
                        plate: plateClean,
                        brand: localVeh?.brand || mapping?.['Vehicle Brand'] || 'Bilinmiyor',
                        model: localVeh?.model || mapping?.['Vehicle Model (Year)'] || '',
                        driver: localVeh?.assignments?.[0]?.employees ? `${localVeh.assignments[0].employees.first_name} ${localVeh.assignments[0].employees.last_name}` : (item.SCDriver || 'Bilinmiyor'),
                        lat: parseFloat(item.LatitudeY || item.Latitude || item.lat || 0),
                        lng: parseFloat(item.LongitudeX || item.Longitude || item.lng || 0),
                        speed: speedVal,
                        ignition: ignitionVal,
                        heading: parseInt(item.Course || item.Heading || item.heading || 0),
                        gpsDate: item.LocalDateTime ? formatArventoDate(item.LocalDateTime) : (item.GPSDate || item.date || 'Belirtilmedi'),
                        isOffline: isOffline
                    }
                })
                setVehicles(mappedData)

                // Keep selected vehicle updated with new telemetry if open
                setSelectedVehicle(currentSelected => {
                    if (!currentSelected) return null
                    const updated = mappedData.find(v => v.plate === currentSelected.plate)
                    return updated || currentSelected
                })

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
        if (activeTab === 'live') {
            await fetchStatusData()
        } else if (activeTab === 'daily') {
            await fetchDailyReports()
        } else if (activeTab === 'history') {
            await fetchHistoryData()
        } else if (activeTab === 'area') {
            await handleAreaQuery()
        }
    }

    // Update map markers when vehicle positions change
    useEffect(() => {
        if (!leafletLoaded || !mapInstance.current || !mapReady) return

        if (activeTab !== 'live') {
            // Remove all live markers when not in live tab
            Object.keys(markersRef.current).forEach(plate => {
                markersRef.current[plate].remove()
                delete markersRef.current[plate]
            })
            return
        }

        if (vehicles.length === 0) return

        const L = window.L
        const activeMarkers = {}

        vehicles.forEach(v => {
            if (!v.lat || !v.lng) return

            // Determine Pin Color
            let pinColor = '#10b981' // Green for moving
            if (v.isOffline) {
                pinColor = '#6b7280' // Gray for offline/disconnected
            } else if (!v.ignition) {
                pinColor = '#ef4444' // Red for stopped
            }

            // Creating SVG DivIcon for premium custom design
            const svgIcon = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100px; height: 80px;">
                    <!-- Plate Badge -->
                    <div class="plate-badge-container">
                        ${v.plate}
                    </div>
                    <!-- Marker Circle -->
                    <div class="marker-pin-wrapper" style="border: 3.5px solid ${pinColor};">
                        <!-- Direction Arrow inside -->
                        <div class="marker-direction-arrow" style="transform: rotate(${v.heading}deg);">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="${pinColor}" />
                            </svg>
                        </div>
                        <!-- Pulse Rings if ignition is active -->
                        ${(v.ignition && v.speed > 0) ? `
                        <div class="marker-pulse-ring marker-pulse-active" style="border: 3px solid ${pinColor};"></div>
                        ` : ''}
                    </div>
                </div>
            `

            const icon = L.divIcon({
                html: svgIcon,
                className: 'custom-vehicle-marker',
                iconSize: [100, 80],
                iconAnchor: [50, 60] // Centered horizontally (100/2=50), and vertically aligned at the center of the pin
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
    }, [vehicles, leafletLoaded, activeTab, mapReady])

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

    // Columns definition for the premium DataTable
    const dailyReportColumns = useMemo(() => [
        { 
            key: 'plate', 
            label: 'Araç Plakası', 
            sortable: true,
            render: (value) => <span style={{ fontWeight: 700 }}>{value}</span>
        },
        { key: 'deviceNo', label: 'Cihaz No', sortable: true },
        { key: 'brand', label: 'Marka', sortable: true },
        { key: 'model', label: 'Model/Yıl', sortable: true },
        { 
            key: 'distance', 
            label: 'Katettiği Toplam Yol', 
            sortable: true,
            render: (value) => `${parseFloat(value || 0).toFixed(2)} km`
        },
        { 
            key: 'speed', 
            label: 'Ulaştığı Max Hız', 
            sortable: true,
            render: (value) => `${parseInt(value || 0)} km/h`
        },
        { 
            key: 'location', 
            label: 'Son Koordinat', 
            sortable: true,
            render: (value, row) => {
                if (!value || value === 'Veri Yok') return <span style={{ color: 'var(--text-muted)' }}>Veri Yok</span>
                return (
                    <span 
                        style={{ color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        onClick={(e) => {
                            e.stopPropagation()
                            const cleanPlate = row.plate
                            const vehicleData = {
                                plate: row.plate,
                                brand: row.brand,
                                model: row.model,
                                driver: 'Bilinmiyor',
                                lat: row.rawLocation ? row.rawLocation[0] : 0,
                                lng: row.rawLocation ? row.rawLocation[1] : 0,
                                speed: row.speed,
                                ignition: false,
                                heading: 0,
                                gpsDate: 'Son Raporlanan Konum'
                            }
                            
                            setSelectedVehicle(vehicleData)
                            setActiveTab('live')
                            
                            setTimeout(() => {
                                if (mapInstance.current && vehicleData.lat && vehicleData.lng) {
                                    mapInstance.current.setView([vehicleData.lat, vehicleData.lng], 16)
                                }
                            }, 300)
                        }}
                    >
                        {value}
                    </span>
                )
            }
        }
    ], [mappings])

    // Merge report data to display ALL vehicles from mappings
    const combinedDailyReports = useMemo(() => {
        const reportMap = {}
        dailyReports.forEach(r => {
            const rawPlate = r.licensePlate || r.Plate || r.plate || ''
            if (rawPlate) {
                const clean = rawPlate.split(/\s+-/)[0].trim().replace(/[\s-]+/g, '').toUpperCase()
                reportMap[clean] = r
            }
        })

        return mappings.map((mapping, idx) => {
            const plateFull = mapping['License Plate'] || ''
            const plateClean = plateFull.split(/\s+-/)[0].trim()
            const cleanKey = plateClean.replace(/[\s-]+/g, '').toUpperCase()
            const deviceNo = mapping['Device No'] || ''

            const report = reportMap[cleanKey]
            
            let distanceVal = 0.0
            if (report && report.DailyTrip !== undefined) {
                distanceVal = parseFloat(report.DailyTrip)
            } else if (report && (report.TotalDistance || report.totalDistance)) {
                distanceVal = parseFloat(report.TotalDistance || report.totalDistance || 0)
            }
            
            let maxSpeedVal = 0
            if (report && report.Speed !== undefined) {
                maxSpeedVal = parseInt(report.Speed)
            } else if (report && (report.MaxSpeed || report.maxSpeed)) {
                maxSpeedVal = parseInt(report.MaxSpeed || report.maxSpeed || 0)
            }

            const latVal = report ? parseFloat(report.LatitudeY || report.Latitude || 0) : 0
            const lngVal = report ? parseFloat(report.LongitudeX || report.Longitude || 0) : 0

            return {
                id: deviceNo || `v-${idx}-${plateClean}`,
                plate: plateClean,
                deviceNo,
                brand: mapping['Vehicle Brand'] || 'Bilinmiyor',
                model: mapping['Vehicle Model (Year)'] || 'Belirtilmedi',
                distance: distanceVal,
                speed: maxSpeedVal,
                location: latVal && lngVal ? `${latVal.toFixed(6)}, ${lngVal.toFixed(6)}` : 'Veri Yok',
                rawLocation: latVal && lngVal ? [latVal, lngVal] : null
            }
        })
    }, [mappings, dailyReports])

    const dailyStats = useMemo(() => {
        let totalDist = 0
        let maxDist = 0
        let maxDistancePlate = 'Yok'
        let maxSpd = 0
        let maxSpeedPlate = 'Yok'
        let activeCount = 0
        
        combinedDailyReports.forEach(v => {
            totalDist += v.distance
            if (v.distance > maxDist) {
                maxDist = v.distance
                maxDistancePlate = v.plate
            }
            if (v.speed > maxSpd) {
                maxSpd = v.speed
                maxSpeedPlate = v.plate
            }
            if (v.distance > 0.1) {
                activeCount++
            }
        })
        
        return {
            totalDistance: totalDist,
            maxDistance: maxDist,
            maxDistancePlate,
            maxSpeed: maxSpd,
            maxSpeedPlate,
            activeCount,
            totalCount: combinedDailyReports.length
        }
    }, [combinedDailyReports])

    if (settings && (!settings.arvento?.enabled || !settings.arvento?.username)) {
        return (
            <div className="tracking-page-wrapper">
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
        <div className="tracking-page-wrapper">
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

                    <button 
                        className="btn btn-secondary btn-icon" 
                        onClick={handleRefresh} 
                        title="Yenile"
                        disabled={activeTab === 'history' ? historyLoading : activeTab === 'area' ? areaQueryLoading : loading}
                    >
                        <RefreshCw size={16} className={(activeTab === 'history' ? historyLoading : activeTab === 'area' ? areaQueryLoading : loading) ? 'spin' : ''} />
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
                    className={`vehicle-tab ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('history')
                        setSelectedVehicle(null)
                    }}
                >
                    <Clock size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Geçmiş Rota & Kesişim
                </button>
                <button 
                    className={`vehicle-tab ${activeTab === 'area' ? 'active' : ''}`}
                    onClick={() => {
                        setActiveTab('area')
                        setSelectedVehicle(null)
                    }}
                >
                    <Compass size={15} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                    Bölge Analizi
                </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
                
                {/* 1. Canlı Takip & Geçmiş Rota Haritalı Bölüm */}
                {(activeTab === 'live' || activeTab === 'history' || activeTab === 'area') && (
                    <div className="tracking-main-layout">
                        
                        {/* Canlı Takip Sidebar'ı */}
                        {activeTab === 'live' && (
                            <div className="tracking-sidebar">
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
                                        
                                        return (
                                            <div 
                                                key={`${v.plate}-${idx}`}
                                                className={`tracking-list-item ${isSelected ? 'selected' : ''}`}
                                                onClick={() => handleSelectVehicle(v)}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{v.plate}</span>
                                                    <span style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        borderRadius: '50%', 
                                                        background: v.isOffline ? '#6b7280' : v.ignition ? '#22c55e' : '#ef4444'
                                                    }}></span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{v.brand} {v.model}</span>
                                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.speed} km/h</span>
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                                    <span>Sürücü: {v.driver}</span>
                                                    {v.isOffline ? (
                                                        <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <Clock size={10} /> Bağlantı Yok
                                                        </span>
                                                    ) : v.ignition ? (
                                                        <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <CheckCircle2 size={10} /> Kontak Açık
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                            <XCircle size={10} /> Kontak Kapalı
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}

                        {/* 2. Geçmiş Rota Sidebar'ı */}
                        {activeTab === 'history' && (
                            <div className="tracking-sidebar tracking-history-sidebar">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Geçmiş Rota Takibi</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Seçilen tarih aralığına ait araç konumlarını ve hareket geçmişini zaman çizgisi üzerinden izleyin.
                                    </p>
                                </div>

                                {/* Tarih Aralığı Seçici */}
                                <div className="history-date-picker-group">
                                    <div className="date-input-wrapper">
                                        <label className="date-input-label">Başlangıç Tarihi</label>
                                        <div className="date-input-container">
                                            <Calendar size={13} className="date-icon" />
                                            <input 
                                                type="date" 
                                                className="form-input history-date-input" 
                                                value={historyStartDate}
                                                onChange={(e) => {
                                                    setHistoryStartDate(e.target.value)
                                                    if (new Date(e.target.value) > new Date(historyEndDate)) {
                                                        setHistoryEndDate(e.target.value)
                                                    }
                                                }}
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="date-input-wrapper">
                                        <label className="date-input-label">Bitiş Tarihi</label>
                                        <div className="date-input-container">
                                            <Calendar size={13} className="date-icon" />
                                            <input 
                                                type="date" 
                                                className="form-input history-date-input" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                min={historyStartDate}
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Araç Arama Çubuğu */}
                                <div className="history-search-container">
                                    <Search size={14} className="search-icon" />
                                    <input 
                                        type="text" 
                                        className="form-input history-search-input" 
                                        placeholder="Araç plaka veya markası ara..." 
                                        value={vehicleSearchQuery}
                                        onChange={(e) => setVehicleSearchQuery(e.target.value)}
                                    />
                                    {vehicleSearchQuery && (
                                        <button className="search-clear-btn" onClick={() => setVehicleSearchQuery('')}>✕</button>
                                    )}
                                </div>

                                {/* Araç Seçim Listesi */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            Araçlar ({selectedHistoryVehicles.length} Seçili)
                                        </span>
                                        {selectedHistoryVehicles.length > 0 && (
                                            <button 
                                                onClick={() => setSelectedHistoryVehicles([])}
                                                style={{ 
                                                    background: 'none', 
                                                    border: 'none', 
                                                    color: 'var(--danger)', 
                                                    fontSize: '11px', 
                                                    cursor: 'pointer',
                                                    padding: 0,
                                                    fontWeight: 600
                                                }}
                                            >
                                                Seçimleri Kaldır
                                            </button>
                                        )}
                                    </div>
                                    <div className="history-vehicles-list-wrapper">
                                        {(() => {
                                            const query = vehicleSearchQuery.toLowerCase().trim()
                                            const filtered = vehicles.filter(v => {
                                                if (!query) return true
                                                return v.plate.toLowerCase().includes(query) ||
                                                       (v.brand && v.brand.toLowerCase().includes(query)) ||
                                                       (v.model && v.model.toLowerCase().includes(query))
                                            })

                                            if (filtered.length === 0) {
                                                return (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                                                        Aramanızla eşleşen araç bulunamadı.
                                                    </div>
                                                )
                                            }

                                            return filtered.map((v, idx) => {
                                                const isSelected = selectedHistoryVehicles.includes(v.plate)
                                                const points = historyDataMap[v.plate] || []
                                                const pointsCount = points.length
                                                const distanceKm = historyDistances[v.plate] || 0
                                                const colorIndex = selectedHistoryVehicles.indexOf(v.plate)
                                                const pathColor = colorIndex !== -1 ? getHistoryColor(colorIndex) : null

                                                return (
                                                    <div 
                                                        key={`${v.plate}-${idx}`}
                                                        className={`history-vehicle-card ${isSelected ? 'selected' : ''}`}
                                                        style={{ 
                                                            borderLeft: isSelected && pathColor ? `4px solid ${pathColor}` : '1px solid var(--border-color)'
                                                        }}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setSelectedHistoryVehicles(prev => prev.filter(p => p !== v.plate))
                                                            } else {
                                                                setSelectedHistoryVehicles(prev => [...prev, v.plate])
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <div className={`custom-checkbox-wrapper ${isSelected ? 'checked' : ''}`} style={{ borderColor: isSelected && pathColor ? pathColor : 'var(--border-color)', backgroundColor: isSelected && pathColor ? `${pathColor}1a` : 'transparent' }}>
                                                                {isSelected && <span style={{ backgroundColor: pathColor }}></span>}
                                                            </div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span className="history-vehicle-plate">{v.plate}</span>
                                                                <span className="history-vehicle-info">{v.brand} {v.model}</span>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                            {pointsCount > 0 ? (
                                                                <>
                                                                    <span className="history-vehicle-status success">
                                                                        {pointsCount} konum
                                                                    </span>
                                                                    {distanceKm > 0 && (
                                                                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                                                            {distanceKm.toFixed(1)} km
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="history-vehicle-status empty">
                                                                    Kayıt yok
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                </div>

                                {/* Oynatıcı Canlı Detay Paneli */}
                                <div className="history-playback-details-panel">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Activity size={14} style={{ color: 'var(--primary)' }} />
                                            Canlı Oynatıcı Durumu
                                        </span>
                                        {isPlaying ? (
                                            <span className="playback-pulse-badge">
                                                <span className="pulse-dot-inner success"></span>
                                                Oynatılıyor
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Durduruldu</span>
                                        )}
                                    </div>

                                    {selectedHistoryVehicles.length === 0 ? (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '15px 0' }}>
                                            Harita üzerinde geçmiş rotayı oynatmak ve canlı değerleri izlemek için yukarıdan araç seçin.
                                        </div>
                                    ) : historyLoading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '15px 0', gap: '8px' }}>
                                            <Loader2 className="spinner" size={20} style={{ color: 'var(--primary)' }} />
                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Veriler yükleniyor...</span>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', paddingRight: '2px' }}>
                                            {selectedHistoryVehicles.map((plate, idx) => {
                                                const points = historyDataMap[plate] || []
                                                const pos = currentTime ? getInterpolatedPosition(points, currentTime) : null
                                                const pathColor = getHistoryColor(idx)
                                                const totalKm = historyDistances[plate] || 0

                                                return (
                                                    <div 
                                                        key={`${plate}-${idx}`}
                                                        className="history-active-vehicle-card"
                                                        style={{ borderLeftColor: pathColor }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <span className="vehicle-color-indicator" style={{ backgroundColor: pathColor }}></span>
                                                                <span style={{ fontWeight: 800, fontSize: '12px' }}>{plate}</span>
                                                            </div>
                                                            {pos ? (
                                                                <span className={`ignition-status-badge ${pos.ignition ? 'on' : 'off'}`}>
                                                                    <span className={`pulsate-dot ${pos.ignition ? 'success' : 'danger'}`}></span>
                                                                    {pos.ignition ? 'Kontak Açık' : 'Kontak Kapalı'}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Kayıt Yok</span>
                                                            )}
                                                        </div>
                                                        {pos && (
                                                            <div className="active-vehicle-stats-row">
                                                                <div className="active-stat-item">
                                                                    <Gauge size={11} />
                                                                    <span>
                                                                        Hız: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(pos.speed)} km/s</strong>
                                                                    </span>
                                                                </div>
                                                                <div className="active-stat-item" style={{ justifyContent: 'flex-end' }}>
                                                                    <Clock size={11} />
                                                                    <span>
                                                                        Saat: <strong style={{ color: 'var(--text-primary)' }}>
                                                                            {new Date(pos.gps_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                                                        </strong>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {points.length > 0 && (
                                                            <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>Toplam Konum: {points.length}</span>
                                                                <span>Kapsam: {totalKm.toFixed(1)} km</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. Bölge Analizi Sidebar'ı */}
                        {activeTab === 'area' && (
                            <div className="tracking-sidebar tracking-history-sidebar">
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Bölge Analizi (Geofencing)</h3>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                        Haritada bir noktaya tıklayıp, tarih aralığı ve yarıçap belirleyerek o bölgeye giren araçları sorgulayın.
                                    </p>
                                </div>

                                {/* Bilgilendirme Kutusu veya Seçilen Nokta */}
                                {!areaCenter ? (
                                    <div className="area-query-info-box" style={{ borderStyle: 'solid', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary-glass)' }}>
                                        📍 <strong>Nokta Seçin:</strong> Sorgulamak istediğiniz bölgenin merkezini belirlemek için harita üzerinde herhangi bir noktaya tıklayın.
                                    </div>
                                ) : (
                                    <div className="area-query-info-box" style={{ borderStyle: 'solid', borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}>
                                        ✅ <strong>Seçilen Nokta:</strong>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
                                            <span>Enlem: {areaCenter.lat.toFixed(5)}</span>
                                            <span>Boylam: {areaCenter.lng.toFixed(5)}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Yarıçap Seçimi (Radius) */}
                                <div className="area-radius-selector">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label className="date-input-label" style={{ margin: 0 }}>Bölge Çapı (Yarıçap)</label>
                                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--primary)' }}>{areaRadius} metre</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input 
                                            type="range"
                                            min="50"
                                            max="1000"
                                            step="50"
                                            value={areaRadius}
                                            onChange={(e) => setAreaRadius(Number(e.target.value))}
                                            className="timeline-range-slider"
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                </div>

                                {/* Tarih Aralığı Seçici */}
                                <div className="history-date-picker-group">
                                    <div className="date-input-wrapper">
                                        <label className="date-input-label">Başlangıç Tarihi</label>
                                        <div className="date-input-container">
                                            <Calendar size={13} className="date-icon" />
                                            <input 
                                                type="date" 
                                                className="form-input history-date-input" 
                                                value={historyStartDate}
                                                onChange={(e) => {
                                                    setHistoryStartDate(e.target.value)
                                                    if (new Date(e.target.value) > new Date(historyEndDate)) {
                                                        setHistoryEndDate(e.target.value)
                                                    }
                                                }}
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                    <div className="date-input-wrapper">
                                        <label className="date-input-label">Bitiş Tarihi</label>
                                        <div className="date-input-container">
                                            <Calendar size={13} className="date-icon" />
                                            <input 
                                                type="date" 
                                                className="form-input history-date-input" 
                                                value={historyEndDate}
                                                onChange={(e) => setHistoryEndDate(e.target.value)}
                                                min={historyStartDate}
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Arama/Query Butonu */}
                                <button
                                    className="btn btn-primary"
                                    onClick={handleAreaQuery}
                                    disabled={!areaCenter || areaQueryLoading}
                                    style={{
                                        height: '38px',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        background: 'var(--accent-gradient)',
                                        color: '#0f0f11',
                                        border: 'none',
                                        cursor: areaCenter ? 'pointer' : 'not-allowed',
                                        opacity: areaCenter ? 1 : 0.6
                                    }}
                                >
                                    {areaQueryLoading ? (
                                        <>
                                            <Loader2 className="spinner" size={16} />
                                            <span>Sorgulanıyor ({areaProgress.current}/{areaProgress.total})</span>
                                        </>
                                    ) : (
                                        <>
                                            <Compass size={16} />
                                            <span>{areaCenter ? 'Bölgeyi Sorgula' : 'Haritadan Nokta Seçin'}</span>
                                        </>
                                    )}
                                </button>

                                {/* Arama İlerleme Çubuğu */}
                                {areaQueryLoading && areaProgress.total > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '-4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                                            <span>Sorgulama ilerlemesi...</span>
                                            <span>%{Math.round((areaProgress.current / areaProgress.total) * 100)}</span>
                                        </div>
                                        <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${(areaProgress.current / areaProgress.total) * 100}%`, background: 'var(--primary)', transition: 'width 0.2s ease' }}></div>
                                        </div>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                            Plaka: {areaProgress.plate}
                                        </span>
                                    </div>
                                )}

                                <span style={{ borderBottom: '1px solid var(--border-color)', margin: '4px 0' }}></span>

                                {/* Sorgu Sonuçları Alanı */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            Bölgeye Giriş Yapan Araçlar ({areaQueryResults.length})
                                        </span>
                                    </div>

                                    {/* Arama Kutusu */}
                                    {areaQueryResults.length > 0 && (
                                        <div className="history-search-container" style={{ marginBottom: '4px' }}>
                                            <Search size={14} className="search-icon" />
                                            <input 
                                                type="text" 
                                                className="form-input history-search-input" 
                                                placeholder="Sonuçlarda plaka ara..." 
                                                value={areaSearchQuery}
                                                onChange={(e) => setAreaSearchQuery(e.target.value)}
                                            />
                                            {areaSearchQuery && (
                                                <button className="search-clear-btn" onClick={() => setAreaSearchQuery('')}>✕</button>
                                            )}
                                        </div>
                                    )}

                                    <div className="history-vehicles-list-wrapper">
                                        {areaQueryLoading && areaQueryResults.length === 0 ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                                                <Loader2 className="spinner" size={28} style={{ color: 'var(--primary)' }} />
                                                <div style={{ textAlign: 'center' }}>
                                                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Bölge Geçmişi Sorgulanıyor</span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Araçların geçmiş rotaları Arvento servisinden alınıyor, lütfen bekleyin...</span>
                                                </div>
                                            </div>
                                        ) : areaQueryResults.length === 0 ? (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0', lineHeight: 1.5 }}>
                                                {areaCenter ? 'Tarih aralığını belirleyin ve sorgulamayı başlatın.' : 'Sorgulanacak bölgeyi seçmek için harita üzerinde herhangi bir noktaya tıklayın.'}
                                            </div>
                                        ) : (() => {
                                            const query = areaSearchQuery.toLowerCase().trim()
                                            const filtered = areaQueryResults.filter(r => {
                                                if (!query) return true
                                                return r.plate.toLowerCase().includes(query) ||
                                                       (r.brand && r.brand.toLowerCase().includes(query)) ||
                                                       (r.model && r.model.toLowerCase().includes(query))
                                            })

                                            if (filtered.length === 0) {
                                                return (
                                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                                                        Arama kelimesiyle eşleşen araç girişi bulunamadı.
                                                    </div>
                                                )
                                            }

                                            return filtered.map((res, idx) => {
                                                return (
                                                    <div 
                                                        key={`${res.plate}-${idx}`}
                                                        className="area-result-card"
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text-primary)' }}>{res.plate}</span>
                                                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{res.brand} {res.model}</span>
                                                            </div>
                                                            <span className="history-vehicle-status success" style={{ fontSize: '10px', padding: '2px 8px' }}>
                                                                {res.visits.length} Giriş
                                                            </span>
                                                        </div>

                                                        {/* Ziyaret Listesi */}
                                                        <div className="area-visits-list">
                                                            {res.visits.map((visit, vIdx) => {
                                                                const isActive = selectedAreaVisit === visit
                                                                const isParked = (visit.maxSpeed || 0) < 5
                                                                
                                                                return (
                                                                    <div 
                                                                        key={`${res.plate}-visit-${vIdx}`}
                                                                        className={`area-visit-row ${isActive ? 'active' : ''}`}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setSelectedAreaVisit(isActive ? null : visit)
                                                                        }}
                                                                        style={{ cursor: 'pointer' }}
                                                                    >
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                                            <span style={{ color: 'var(--text-primary)' }}>
                                                                                🕒 {new Date(visit.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(visit.exitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                                            </span>
                                                                            <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', marginLeft: '14px' }}>
                                                                                Tarih: {new Date(visit.entryTime).toLocaleDateString([], {day: '2-digit', month: '2-digit'})}
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                                                                {visit.duration} dk
                                                                            </span>
                                                                            <span style={{ fontSize: '9px', color: isParked ? 'var(--warning)' : 'var(--text-secondary)' }}>
                                                                                {isParked ? '⏱️ Duraklama' : `⚡ Max: ${visit.maxSpeed} km/s`}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Map Container and Detail Card overlay */}
                        <div className={`tracking-map-wrapper ${isMapFullscreen ? 'fullscreen' : ''} ${
                            activeTab === 'live' && selectedVehicle ? 'drawer-open' : ''
                        }`}>
                            <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 1 }} onClick={() => showMapPicker && setShowMapPicker(false)}></div>

                            {/* Floating Map Controls (Satellite Mode & Focus Buttons) */}
                            <div className="map-controls-container">
                                {/* Map Layer Picker Button */}
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        onClick={() => setShowMapPicker(prev => !prev)}
                                        title="Harita Görünümü"
                                        className={`map-control-btn ${showMapPicker ? 'active' : ''}`}
                                    >
                                        <Layers size={16} />
                                    </button>

                                    {/* Map Picker Popup */}
                                    {showMapPicker && (
                                        <div className="map-picker-popup" onClick={e => e.stopPropagation()}>
                                            <div className="map-picker-title">Harita Türü</div>
                                            <div className="map-picker-options">
                                                <div 
                                                    className={`map-picker-option ${mapMode === 'street' ? 'selected' : ''}`}
                                                    onClick={() => { setMapMode('street'); }}
                                                >
                                                    <div className="map-picker-option-icon">
                                                        <img src={streetMapImg} alt="Harita" />
                                                    </div>
                                                    <span className="map-picker-option-label">Harita</span>
                                                </div>
                                                <div 
                                                    className={`map-picker-option ${mapMode === 'satellite' ? 'selected' : ''}`}
                                                    onClick={() => { setMapMode('satellite'); }}
                                                >
                                                    <div className="map-picker-option-icon">
                                                        <img src={satelliteMapImg} alt="Uydu" />
                                                    </div>
                                                    <span className="map-picker-option-label">Uydu</span>
                                                </div>
                                            </div>

                                            <div className="map-picker-toggle-row">
                                                <div className="map-picker-toggle-label">
                                                    <span style={{ fontSize: '14px' }}>🏷️</span>
                                                    Etiketler
                                                </div>
                                                <button 
                                                    className={`traffic-toggle ${labelsEnabled ? 'active' : ''}`}
                                                    onClick={() => setLabelsEnabled(prev => !prev)}
                                                >
                                                    <div className="traffic-toggle-knob"></div>
                                                </button>
                                            </div>

                                            <div className="map-picker-toggle-row">
                                                <div className="map-picker-toggle-label">
                                                    <span style={{ fontSize: '14px' }}>🚦</span>
                                                    Trafik
                                                </div>
                                                <button 
                                                    className={`traffic-toggle ${trafficEnabled ? 'active' : ''}`}
                                                    onClick={() => setTrafficEnabled(prev => !prev)}
                                                >
                                                    <div className="traffic-toggle-knob"></div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Fullscreen Toggle Button */}
                                <button 
                                    onClick={() => setIsMapFullscreen(prev => !prev)}
                                    title={isMapFullscreen ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap'}
                                    className={`map-control-btn ${isMapFullscreen ? 'active' : ''}`}
                                >
                                    {isMapFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                                </button>
                                {/* Fit Bounds Button */}
                                <button 
                                    onClick={handleFitBounds}
                                    title="Tüm Araçları Göster"
                                    className="map-control-btn"
                                >
                                    <Compass size={16} />
                                </button>

                                {/* Zoom In Button */}
                                <button 
                                    onClick={() => mapInstance.current && mapInstance.current.zoomIn()}
                                    title="Yakınlaş"
                                    className="map-control-btn"
                                >
                                    <Plus size={16} />
                                </button>

                                {/* Zoom Out Button */}
                                <button 
                                    onClick={() => mapInstance.current && mapInstance.current.zoomOut()}
                                    title="Uzaklaş"
                                    className="map-control-btn"
                                >
                                    <Minus size={16} />
                                </button>
                            </div>

                            {/* 3. Zaman Çizelgesi Oynatıcı Kontrol Paneli (Timeline Playback Overlay) */}
                            {activeTab === 'history' && selectedHistoryVehicles.length > 0 && historyTimelineRange.min < historyTimelineRange.max && (
                                <div className="timeline-playback-panel">
                                    {/* Üst Satır: Zaman Sürgüsü (Timeline Slider) */}
                                    <div className="timeline-slider-wrapper" style={{ marginBottom: '8px' }}>
                                        <span className="timeline-edge-label left">
                                            {formatTimelineEdge(historyTimelineRange.min)}
                                        </span>

                                        <input 
                                            type="range"
                                            min={historyTimelineRange.min}
                                            max={historyTimelineRange.max}
                                            value={currentTime || historyTimelineRange.min}
                                            onChange={(e) => {
                                                setCurrentTime(Number(e.target.value))
                                                setIsPlaying(false)
                                            }}
                                            className="timeline-range-slider"
                                        />

                                        <span className="timeline-edge-label right">
                                            {formatTimelineEdge(historyTimelineRange.max)}
                                        </span>
                                    </div>

                                    {/* Alt Satır: Oynatma Butonları, İstatistikler ve Zaman */}
                                    <div className="timeline-playback-row">
                                        <div className="timeline-playback-controls">
                                            <button 
                                                className={`playback-play-btn ${isPlaying ? 'playing' : ''}`}
                                                onClick={() => setIsPlaying(!isPlaying)}
                                                title={isPlaying ? 'Durdur' : 'Oynat'}
                                            >
                                                {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                                                <span className="play-btn-text">{isPlaying ? 'Durdur' : 'Oynat'}</span>
                                            </button>

                                            <div className="playback-speed-wrapper">
                                                <span className="playback-label">Hız:</span>
                                                <div className="speed-pills-container">
                                                    {[10, 60, 300, 600, 1200].map(speed => (
                                                        <button 
                                                            key={speed}
                                                            className={`speed-pill-btn ${playbackSpeed === speed ? 'active' : ''}`}
                                                            onClick={() => setPlaybackSpeed(speed)}
                                                        >
                                                            {speed}x
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="playback-option-wrapper">
                                                <label className="playback-checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={showTrackLines} 
                                                        onChange={(e) => setShowTrackLines(e.target.checked)}
                                                        className="playback-checkbox-input"
                                                    />
                                                    <span className="custom-checkbox"></span>
                                                    Rotayı <span className="checkbox-text-extra">Çizgilerle</span> Göster
                                                </label>
                                            </div>

                                            <div className="playback-option-wrapper">
                                                <label className="playback-checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={skipIdleTime} 
                                                        onChange={(e) => setSkipIdleTime(e.target.checked)}
                                                        className="playback-checkbox-input"
                                                    />
                                                    <span className="custom-checkbox"></span>
                                                    Boş Zamanları <span className="checkbox-text-extra">Atla</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="timeline-playback-stats-wrapper">
                                            {/* Rota İstatistik Rozeti */}
                                            <div className="timeline-stats-badge">
                                                <span className="timeline-stats-badge-val">
                                                    <Navigation size={13} style={{ transform: 'rotate(45deg)', fill: 'var(--accent-primary)' }} />
                                                    {Object.values(historyDistances).reduce((sum, km) => sum + km, 0).toFixed(1)}<span className="stats-unit"> km</span>
                                                </span>
                                                <span className="timeline-stats-badge-sep"></span>
                                                <span className="timeline-stats-badge-lbl">
                                                    <MapPin size={13} />
                                                    {Object.values(historyDataMap).reduce((sum, pts) => sum + pts.length, 0)}<span className="stats-unit"> Nokta</span>
                                                </span>
                                            </div>

                                            {/* Anlık Zaman Göstergesi */}
                                            <div className="timeline-playback-time">
                                                <Clock size={15} style={{ color: 'var(--primary)' }} />
                                                <span className="playback-time-text">
                                                    {formatTimelineTime(currentTime)}
                                                </span>
                                            </div>

                                            {/* Kapatma Butonu */}
                                            <button 
                                                className="panel-close-btn"
                                                onClick={() => setSelectedHistoryVehicles([])}
                                                title="Kapat"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Detail Drawer overlay - Left Side */}
                            {activeTab === 'live' && selectedVehicle && (() => {
                                const currentLocalVeh = localVehicles.find(lv => 
                                    lv.plate.replace(/[\s-]+/g, '').toUpperCase() === selectedVehicle.plate.replace(/[\s-]+/g, '').toUpperCase()
                                );
                                
                                const statusClass = selectedVehicle.isOffline ? 'status-offline' : selectedVehicle.ignition ? 'status-active' : 'status-stopped';
                                
                                return (
                                    <div className="vehicle-detail-drawer">
                                        {/* Close Tab on right edge of drawer */}
                                        <div 
                                            className="drawer-close-tab"
                                            onClick={() => setSelectedVehicle(null)}
                                            title="Paneli Kapat"
                                        >
                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                <path d="M8 2L4 6L8 10"/>
                                            </svg>
                                        </div>

                                        {/* Header with Status Bar */}
                                        <div className="drawer-header">
                                            <div className={`drawer-status-bar ${statusClass}`}></div>
                                            
                                            <div className="vehicle-detail-header">
                                                <div className={`vehicle-detail-avatar ${
                                                    selectedVehicle.isOffline ? 'state-offline' : selectedVehicle.ignition ? 'state-active' : 'state-stopped'
                                                }`}>
                                                    <Car size={22} />
                                                </div>
                                                <div className="vehicle-detail-meta">
                                                    <div className="vehicle-detail-plate">
                                                        {selectedVehicle.plate}
                                                    </div>
                                                    <h3 className="vehicle-detail-brand">
                                                        {selectedVehicle.brand} {selectedVehicle.model}
                                                    </h3>
                                                    <p className="vehicle-detail-driver">
                                                        <User size={11} /> {selectedVehicle.driver || 'Bilinmiyor'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            {/* Status Badge */}
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <span className={`badge ${
                                                    selectedVehicle.isOffline ? 'badge-secondary' : selectedVehicle.ignition ? 'badge-success' : 'badge-danger'
                                                }`} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                    {selectedVehicle.isOffline ? 'Çevrimdışı' : selectedVehicle.ignition ? 'Kontak Açık' : 'Kontak Kapalı'}
                                                </span>
                                                {selectedVehicle.speed > 0 && (
                                                    <span className="badge badge-info" style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>
                                                        {selectedVehicle.speed} km/h
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Scrollable Content */}
                                        <div className="drawer-content-scroll">
                                            {/* Live Telemetry Section */}
                                            <div>
                                                <div className="drawer-section-title">
                                                    <Activity size={11} /> CANLI TELEMETRİ
                                                </div>
                                                <div className="vehicle-detail-metrics-grid">
                                                    {/* Hız */}
                                                    <div className="metric-card-modern">
                                                        <div className="metric-icon-wrapper speed">
                                                            <Gauge size={15} />
                                                        </div>
                                                        <div className="metric-content">
                                                            <span className="metric-label">Hız</span>
                                                            <span className="metric-value">{selectedVehicle.speed} km/h</span>
                                                        </div>
                                                    </div>

                                                    {/* Kontak */}
                                                    <div className="metric-card-modern">
                                                        <div className="metric-icon-wrapper ignition" style={{ 
                                                            color: selectedVehicle.isOffline ? 'var(--text-muted)' : selectedVehicle.ignition ? '#22c55e' : '#ef4444',
                                                            background: selectedVehicle.isOffline ? 'rgba(107, 114, 128, 0.08)' : selectedVehicle.ignition ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                                                        }}>
                                                            <Power size={15} />
                                                        </div>
                                                        <div className="metric-content">
                                                            <span className="metric-label">Kontak</span>
                                                            <span className="metric-value" style={{ 
                                                                color: selectedVehicle.isOffline ? 'var(--text-muted)' : selectedVehicle.ignition ? '#22c55e' : '#ef4444'
                                                            }}>
                                                                {selectedVehicle.isOffline ? 'Çevrimdışı' : selectedVehicle.ignition ? 'Açık' : 'Kapalı'}
                                                            </span>
                                                        </div>
                                                    </div>


                                                    {/* Son Sinyal - full width */}
                                                    <div className="metric-card-modern" style={{ gridColumn: '1 / -1' }}>
                                                        <div className="metric-icon-wrapper time">
                                                            <Clock size={15} />
                                                        </div>
                                                        <div className="metric-content">
                                                            <span className="metric-label">Son Sinyal</span>
                                                            <span className="metric-value">
                                                                {selectedVehicle.gpsDate || '--'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* GPS Coordinates Section */}
                                            {selectedVehicle.lat && selectedVehicle.lng ? (
                                                <div>
                                                    <div className="drawer-section-title">
                                                        <MapPin size={11} /> GPS KOORDİNATLARI
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span className="coord-badge"
                                                            onClick={() => {
                                                                navigator.clipboard?.writeText(`${selectedVehicle.lat.toFixed(6)}, ${selectedVehicle.lng.toFixed(6)}`)
                                                            }}
                                                            title="Koordinatları kopyala"
                                                        >
                                                            <MapPin size={10} />
                                                            {selectedVehicle.lat.toFixed(6)}, {selectedVehicle.lng.toFixed(6)}
                                                        </span>
                                                        <span className="coord-badge"
                                                            onClick={() => {
                                                                if (selectedVehicle.gpsDate) {
                                                                    navigator.clipboard?.writeText(selectedVehicle.gpsDate)
                                                                }
                                                            }}
                                                            title="Zamanı kopyala"
                                                        >
                                                            <Clock size={10} />
                                                            {selectedVehicle.gpsDate || '--'}
                                                        </span>
                                                        <span className="coord-badge-gmaps"
                                                            onClick={() => {
                                                                window.electronAPI.openExternal(`https://www.google.com/maps/search/?api=1&query=${selectedVehicle.lat},${selectedVehicle.lng}`)
                                                            }}
                                                            title="Google Haritalar'da Aç"
                                                        >
                                                            <ExternalLink size={10} /> Google Haritalar
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Database Details Section */}
                                            <div>
                                                <div className="drawer-section-title">
                                                    <Car size={11} /> ARAÇ BİLGİLERİ
                                                </div>
                                                <div className="detail-row">
                                                    <div className="detail-item">
                                                        <span className="detail-label">Kilometre</span>
                                                        <span className="detail-value">
                                                            {currentLocalVeh?.km !== undefined && currentLocalVeh?.km !== null 
                                                                ? `${currentLocalVeh.km.toLocaleString('tr-TR')} km` 
                                                                : '0 km'}
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Model Yılı</span>
                                                        <span className="detail-value">{currentLocalVeh?.year || '—'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Renk</span>
                                                        <span className="detail-value">{currentLocalVeh?.color || '—'}</span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Araç Tipi</span>
                                                        <span className="detail-value">
                                                            {currentLocalVeh?.type === 'truck' ? 'Kamyon' : 
                                                             currentLocalVeh?.type === 'car' ? 'Binek Araç' : 
                                                             currentLocalVeh?.type === 'van' ? 'Minibüs/Panelvan' : 
                                                             currentLocalVeh?.type || '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Record Statistics Section */}
                                            <div>
                                                <div className="drawer-section-title">
                                                    <Activity size={11} /> KAYIT İSTATİSTİKLERİ
                                                </div>
                                                <div className="detail-row">
                                                    <div className="detail-item">
                                                        <span className="detail-label">Muayeneler</span>
                                                        <span className="detail-value" style={{ color: currentLocalVeh?.inspections_count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                            {currentLocalVeh?.inspections_count || 0}
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Bakımlar</span>
                                                        <span className="detail-value" style={{ color: currentLocalVeh?.maintenances_count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                            {currentLocalVeh?.maintenances_count || 0}
                                                        </span>
                                                    </div>
                                                    <div className="detail-item">
                                                        <span className="detail-label">Servis Kayıtları</span>
                                                        <span className="detail-value" style={{ color: currentLocalVeh?.services_count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                                                            {currentLocalVeh?.services_count || 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes Section */}
                                            {currentLocalVeh?.notes && (
                                                <div>
                                                    <div className="drawer-section-title">
                                                        <FileText size={11} /> NOT
                                                    </div>
                                                    <div className="notes-callout">
                                                        {currentLocalVeh.notes}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Footer */}
                                        <div className="drawer-footer">
                                            <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                                <button 
                                                    className="btn btn-primary"
                                                    style={{
                                                        flex: 1,
                                                        height: '38px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                    onClick={() => mapInstance.current.setView([selectedVehicle.lat, selectedVehicle.lng], 16)}
                                                >
                                                    <MapPin size={13} /> Odaklan
                                                </button>
                                                <button 
                                                    className="btn btn-secondary"
                                                    style={{
                                                        flex: 1,
                                                        height: '38px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                    onClick={() => {
                                                        setSelectedHistoryVehicles([selectedVehicle.plate])
                                                        setActiveTab('history')
                                                        setSelectedVehicle(null)
                                                    }}
                                                >
                                                    <Clock size={13} /> Geçmiş
                                                </button>
                                            </div>
                                            <button 
                                                className="btn btn-google-maps"
                                                style={{
                                                    width: '100%',
                                                    height: '38px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                                onClick={() => {
                                                    window.electronAPI.openExternal(`https://www.google.com/maps/search/?api=1&query=${selectedVehicle.lat},${selectedVehicle.lng}`)
                                                }}
                                                title="Google Haritalar'da Aç"
                                            >
                                                <ExternalLink size={13} /> Google Haritalar'da Aç
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
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
                        overflowY: 'auto',
                        flex: 1,
                        minHeight: 0
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Günlük Mesafe Raporu</h2>
                                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Araçların seçilen gündeki toplam katettikleri mesafe ve ulaştıkları maksimum hız bilgileri.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Tarih:</span>
                                <input 
                                    type="date" 
                                    className="form-input" 
                                    value={dailyReportDate}
                                    onChange={(e) => setDailyReportDate(e.target.value)}
                                    style={{ width: '180px', height: '36px' }}
                                    max={new Date().toISOString().split('T')[0]} // prevent future dates
                                />
                            </div>
                        </div>

                        {/* Premium Stats Grid */}
                        <div className="daily-stats-grid">
                            <div className="daily-stat-card">
                                <div className="daily-stat-icon-wrapper blue">
                                    <Navigation size={20} />
                                </div>
                                <div className="daily-stat-info">
                                    <span className="daily-stat-label">Toplam Mesafe</span>
                                    <span className="daily-stat-value">{dailyStats.totalDistance.toFixed(2)} km</span>
                                </div>
                            </div>
                            
                            <div className="daily-stat-card">
                                <div className="daily-stat-icon-wrapper green">
                                    <Car size={20} />
                                </div>
                                <div className="daily-stat-info">
                                    <span className="daily-stat-label">En Çok Yol Yapan</span>
                                    <span className="daily-stat-value">{dailyStats.maxDistance > 0 ? `${dailyStats.maxDistance.toFixed(2)} km` : '0.00 km'}</span>
                                    {dailyStats.maxDistance > 0 && <span className="daily-stat-subtext">{dailyStats.maxDistancePlate}</span>}
                                </div>
                            </div>
                            
                            <div className="daily-stat-card">
                                <div className="daily-stat-icon-wrapper orange">
                                    <Gauge size={20} />
                                </div>
                                <div className="daily-stat-info">
                                    <span className="daily-stat-label">En Yüksek Hız</span>
                                    <span className="daily-stat-value">{dailyStats.maxSpeed} km/h</span>
                                    {dailyStats.maxSpeed > 0 && <span className="daily-stat-subtext">{dailyStats.maxSpeedPlate}</span>}
                                </div>
                            </div>
                            
                            <div className="daily-stat-card">
                                <div className="daily-stat-icon-wrapper purple">
                                    <Activity size={20} />
                                </div>
                                <div className="daily-stat-info">
                                    <span className="daily-stat-label">Aktif Araç Sayısı</span>
                                    <span className="daily-stat-value">{dailyStats.activeCount} / {dailyStats.totalCount}</span>
                                    <span className="daily-stat-subtext">Çalışan / Kayıtlı</span>
                                </div>
                            </div>
                        </div>

                        <DataTable 
                            persistenceKey="ArventoDailyReportTable"
                            columns={dailyReportColumns}
                            data={combinedDailyReports}
                            showSearch={true}
                            showCheckboxes={false}
                            emptyMessage="Yükleniyor veya seçilen tarihte herhangi bir çalışma verisi bulunmuyor."
                            searchPlaceholder="Plaka, cihaz no veya marka ara..."
                            searchKeys={['plate', 'deviceNo', 'brand', 'model']}
                        />
                    </div>
                )}

            </div>
        </div>
    )
}
