import React, { useState, useEffect, useRef } from 'react'
import { 
    ExternalLink, Trash2, ChevronLeft, ChevronRight, Loader2, 
    RotateCw, FileText, Download, File, Maximize2 
} from 'lucide-react'
import Modal from './Modal'
import { Document, Page, pdfjs } from 'react-pdf'

import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

export default function DocumentPreviewModal({ doc, onClose, onDelete }) {
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pdfLoading, setPdfLoading] = useState(true)
    
    // Zoom, Pan & Rotation states
    const [zoomLevel, setZoomLevel] = useState(1)
    const [rotation, setRotation] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [textContent, setTextContent] = useState(null)

    const containerRef = useRef(null)

    // Reset state when doc changes
    useEffect(() => {
        if (doc) {
            setPageNumber(1)
            setPdfLoading(true)
            setZoomLevel(1)
            setRotation(0)
            setPosition({ x: 0, y: 0 })
        }
    }, [doc])

    const fileName = doc?.name || doc?.file_name || doc?.fileName || 'Belge'
    const ext = (fileName.substring(fileName.lastIndexOf('.')).toLowerCase()) || doc?.ext || ''

    const isPdf = ext === '.pdf' || doc?.data?.startsWith('data:application/pdf') || doc?.file_type?.toLowerCase() === '.pdf'
    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.avif'].includes(ext) || doc?.data?.startsWith('data:image/')
    const isText = ['.txt', '.log', '.csv', '.json', '.xml', '.html', '.md'].includes(ext)
    const isUnsupported = !isPdf && !isImage && !isText

    // Text decoding
    useEffect(() => {
        if (doc?.data && isText) {
            try {
                const base64Str = doc.data.includes(',') ? doc.data.split(',')[1] : doc.data
                const decoded = atob(base64Str)
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0))
                const text = new TextDecoder('utf-8').decode(bytes)
                setTextContent(text)
            } catch (e) {
                setTextContent('Metin içeriği çözümlenemedi.')
            }
        } else {
            setTextContent(null)
        }
    }, [doc, isText])

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!doc) return
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === '+' || e.key === '=') {
                handleZoomIn()
            } else if (e.key === '-' || e.key === '_') {
                handleZoomOut()
            } else if (e.key === '0') {
                handleResetZoom()
            } else if (isPdf && e.key === 'ArrowLeft') {
                previousPage()
            } else if (isPdf && e.key === 'ArrowRight') {
                nextPage()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [doc, isPdf, numPages, pageNumber])

    if (!doc) return null

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages)
        setPdfLoading(false)
    }

    const changePage = (offset) => {
        setPageNumber(prev => Math.min(Math.max(1, prev + offset), numPages || 1))
    }

    const previousPage = () => changePage(-1)
    const nextPage = () => changePage(1)

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 4))
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.4))
    const handleResetZoom = () => {
        setZoomLevel(1)
        setPosition({ x: 0, y: 0 })
        setRotation(0)
    }
    const handleRotate = () => setRotation(prev => (prev + 90) % 360)

    const handleWheel = (e) => {
        if (e.ctrlKey || e.metaKey || isImage) {
            e.preventDefault()
            const delta = e.deltaY < 0 ? 0.15 : -0.15
            setZoomLevel(prev => Math.min(Math.max(0.4, prev + delta), 4))
        }
    }

    // Drag / Pan Handlers for Zoomed Image
    const handleMouseDown = (e) => {
        if (zoomLevel > 1 || isImage) {
            setIsDragging(true)
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
        }
    }

    const handleMouseMove = (e) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            })
        }
    }

    const handleMouseUp = () => setIsDragging(false)

    const handleExternalOpen = async () => {
        const filePath = doc.path || doc.file_path
        if (filePath) {
            const error = await window.electronAPI.openDocument(filePath)
            if (error) alert('Dosya harici olarak açılamadı: ' + error)
        } else {
            alert('Dosya yolu bulunamadı.')
        }
    }

    const headerContent = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <span style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 9px',
                borderRadius: '6px',
                backgroundColor: 'var(--accent-primary)',
                color: '#fff',
                letterSpacing: '0.5px'
            }}>
                {ext.replace('.', '') || 'DOSYA'}
            </span>
            <span style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '550px'
            }}>
                {fileName}
            </span>
        </div>
    )

    const footer = (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            onDelete()
                        }}
                        className="btn btn-danger"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Trash2 size={16} /> Sil
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button className="btn btn-secondary" onClick={onClose}>
                    Kapat
                </button>
                <button className="btn btn-primary" onClick={handleExternalOpen}>
                    <ExternalLink size={16} />
                    Dışarıda Aç
                </button>
            </div>
        </div>
    )

    return (
        <Modal
            isOpen={!!doc}
            onClose={onClose}
            title={headerContent}
            size="xl"
            footer={footer}
            bodyStyle={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', flex: 1 }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '75vh', overflow: 'hidden' }}>
                {/* Ultra-Sleek Centered Toolbar matching Adobe Acrobat / macOS PDF Bar */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#161822',
                    padding: '8px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    gap: '12px',
                    userSelect: 'none',
                    zIndex: 2
                }}>
                    {/* - Zoom Out */}
                    <button
                        onClick={handleZoomOut}
                        title="Uzaklaştır (-)"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 400,
                            lineHeight: 1,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        −
                    </button>

                    {/* + Zoom In */}
                    <button
                        onClick={handleZoomIn}
                        title="Yakınlaştır (+)"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 400,
                            lineHeight: 1,
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        +
                    </button>

                    {/* Fit to View Button */}
                    <button
                        onClick={handleResetZoom}
                        title="Genişliğe Sığdır (%100)"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <Maximize2 size={15} />
                    </button>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                    {/* Page Counter Box / Percentage */}
                    {isPdf ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                disabled={pageNumber <= 1}
                                onClick={previousPage}
                                title="Önceki Sayfa"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: pageNumber <= 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.85)',
                                    cursor: pageNumber <= 1 ? 'default' : 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <ChevronLeft size={16} />
                            </button>

                            <input
                                type="number"
                                min={1}
                                max={numPages || 1}
                                value={pageNumber}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value)
                                    if (!isNaN(val)) {
                                        setPageNumber(Math.min(Math.max(1, val), numPages || 1))
                                    }
                                }}
                                style={{
                                    width: '42px',
                                    height: '28px',
                                    textAlign: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '4px',
                                    color: '#ffffff',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    outline: 'none'
                                }}
                            />

                            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 500 }}>
                                / {numPages || 1}
                            </span>

                            <button
                                disabled={pageNumber >= (numPages || 1)}
                                onClick={nextPage}
                                title="Sonraki Sayfa"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: pageNumber >= (numPages || 1) ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.85)',
                                    cursor: pageNumber >= (numPages || 1) ? 'default' : 'pointer',
                                    padding: '4px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    ) : (
                        <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.85)',
                            backgroundColor: 'rgba(255, 255, 255, 0.08)',
                            padding: '4px 10px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}>
                            {Math.round(zoomLevel * 100)}%
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.15)', margin: '0 4px' }} />

                    {/* Rotate Button */}
                    <button
                        onClick={handleRotate}
                        title="90° Döndür"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255, 255, 255, 0.85)',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <RotateCw size={15} />
                    </button>
                </div>

                {/* Reader Canvas - SINGLE Smooth Scrollbar */}
                <div
                    ref={containerRef}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    style={{
                        flex: 1,
                        backgroundColor: '#0c0d12', // Solid modern dark canvas
                        overflow: 'auto',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                        userSelect: 'none'
                    }}
                >
                    {doc.data || isUnsupported ? (
                        isPdf ? (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                padding: '24px',
                                minWidth: '100%',
                                minHeight: '100%'
                            }}>
                                <Document
                                    file={doc.data}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#8892b0', gap: '12px' }}>
                                            <Loader2 className="spin" size={36} style={{ color: 'var(--accent-primary)' }} />
                                            <span style={{ fontSize: '13px', fontWeight: 500 }}>PDF Yükleniyor...</span>
                                        </div>
                                    }
                                    error={
                                        <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '24px', backgroundColor: '#161922', borderRadius: '12px', border: '1px solid #282d3c' }}>
                                            <p style={{ fontWeight: 600, margin: '0 0 8px 0' }}>PDF Önizlemesi Yüklenemedi</p>
                                            <p style={{ fontSize: '12px', color: '#8892b0', margin: 0 }}>Dosyayı masaüstü uygulamasında harici görüntüleyici ile açabilirsiniz.</p>
                                            <button onClick={handleExternalOpen} className="btn btn-primary btn-sm" style={{ marginTop: '16px', gap: '6px' }}>
                                                <ExternalLink size={14} /> Dışarıda Aç
                                            </button>
                                        </div>
                                    }
                                >
                                    <Page
                                        pageNumber={pageNumber}
                                        scale={zoomLevel}
                                        rotate={rotation}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                    />
                                </Document>
                            </div>
                        ) : isImage ? (
                            <div style={{
                                transform: `translate(${position.x}px, ${position.y}px) scale(${zoomLevel}) rotate(${rotation}deg)`,
                                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '24px',
                                maxWidth: '100%',
                                maxHeight: '100%'
                            }}>
                                <img
                                    src={doc.data}
                                    alt={fileName}
                                    draggable={false}
                                    style={{
                                        maxWidth: '85vw',
                                        maxHeight: '68vh',
                                        objectFit: 'contain',
                                        borderRadius: '8px',
                                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)'
                                    }}
                                />
                            </div>
                        ) : isText ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                padding: '24px',
                                boxSizing: 'border-box',
                                overflow: 'auto'
                            }}>
                                <pre style={{
                                    fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                                    fontSize: `${13 * zoomLevel}px`,
                                    color: '#e6edf3',
                                    backgroundColor: '#161b22',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: '1px solid #30363d',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-all',
                                    margin: 0,
                                    lineHeight: 1.5
                                }}>
                                    {textContent || 'Yükleniyor...'}
                                </pre>
                            </div>
                        ) : (
                            /* Unsupported File Card */
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px',
                                backgroundColor: '#161b22',
                                borderRadius: '16px',
                                border: '1px solid #30363d',
                                textAlign: 'center',
                                maxWidth: '420px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    borderRadius: '16px',
                                    backgroundColor: 'var(--accent-subtle)',
                                    color: 'var(--accent-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '16px'
                                }}>
                                    <File size={32} />
                                </div>
                                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#f0f6fc', margin: '0 0 8px 0' }}>
                                    {fileName}
                                </h3>
                                <p style={{ fontSize: '12px', color: '#8b949e', margin: '0 0 20px 0', lineHeight: 1.5 }}>
                                    Bu dosya türü (`{ext}`) doğrudan içi önizlenemez. Dosyayı varsayılan bilgisayar uygulamanız ile doğrudan açabilirsiniz.
                                </p>
                                <button className="btn btn-primary" onClick={handleExternalOpen} style={{ gap: '8px' }}>
                                    <ExternalLink size={16} /> Dışarıda Uygulamayla Aç
                                </button>
                            </div>
                        )
                    ) : (
                        <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>Önizleme Yüklenemedi</p>
                            <button className="btn btn-primary btn-sm" onClick={handleExternalOpen} style={{ gap: '6px' }}>
                                <ExternalLink size={14} /> Dışarıda Aç
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    )
}
