import React, { useState, useEffect } from 'react'
import { ExternalLink, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import Modal from './Modal'
import { Document, Page, pdfjs } from 'react-pdf'

// Configure PDF worker
// Use unpkg/cdn for worker to avoid complex vite/electron worker bundling issues for now
// or try dynamic import if local is preferred.
// pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Better approach for Vite:
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

export default function DocumentPreviewModal({ doc, onClose, onDelete }) {
    if (!doc) return null

    const isPdf = doc.name?.toLowerCase().endsWith('.pdf') || doc.data?.startsWith('data:application/pdf')
    const [numPages, setNumPages] = useState(null)
    const [pageNumber, setPageNumber] = useState(1)
    const [pdfLoading, setPdfLoading] = useState(true)

    // Reset state when doc changes
    useEffect(() => {
        setPageNumber(1)
        setPdfLoading(true)
    }, [doc])

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages)
        setPdfLoading(false)
    }

    const changePage = (offset) => {
        setPageNumber(prevPageNumber => prevPageNumber + offset)
    }

    const previousPage = () => changePage(-1)
    const nextPage = () => changePage(1)

    const handleExternalOpen = async () => {
        const error = await window.electronAPI.openDocument(doc.path)
        if (error) alert('Dosya açılamadı: ' + error)
    }

    const footer = (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
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

                {isPdf && numPages && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <button
                            className="btn btn-icon"
                            disabled={pageNumber <= 1}
                            onClick={previousPage}
                            style={{ padding: '4px', height: '28px', width: '28px' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span>
                            Sayfa {pageNumber} / {numPages}
                        </span>
                        <button
                            className="btn btn-icon"
                            disabled={pageNumber >= numPages}
                            onClick={nextPage}
                            style={{ padding: '4px', height: '28px', width: '28px' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
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
            title={doc.name || 'Belge Önizleme'}
            size="xl"
            footer={footer}
        >
            <div style={{
                width: '100%',
                height: '70vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)',
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                borderRadius: '8px',
                overflow: 'auto', // Allow scrolling if pdf page is large
                position: 'relative'
            }}>
                {doc.data ? (
                    isPdf ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            width: '100%',
                            minHeight: '100%'
                        }}>
                            <Document
                                file={doc.data}
                                onLoadSuccess={onDocumentLoadSuccess}
                                loading={
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ccc', gap: '10px' }}>
                                        <Loader2 className="spin" size={32} />
                                        <span>PDF Yükleniyor...</span>
                                    </div>
                                }
                                error={
                                    <div style={{ color: '#ff6b6b', textAlign: 'center', padding: '20px' }}>
                                        <p>PDF yüklenemedi.</p>
                                        <button onClick={handleExternalOpen} className="btn-link" style={{ marginTop: '10px', color: '#4dabf7' }}>
                                            Dışarıda açmayı deneyin
                                        </button>
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={pageNumber}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                    height={window.innerHeight * 0.65} // Dynamic height constraint
                                />
                            </Document>
                        </div>
                    ) : (
                        <img
                            src={doc.data}
                            alt={doc.name}
                            style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
                                objectFit: 'contain',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}
                        />
                    )
                ) : (
                    <div style={{ color: '#fff', opacity: 0.7, padding: '20px', textAlign: 'center' }}>
                        <p>Önizleme görüntülenemiyor</p>
                        <p style={{ fontSize: '12px', marginTop: '8px', opacity: 0.5 }}>Dosyayı açmak için "Dışarıda Aç" butonunu kullanın.</p>
                    </div>
                )}
            </div>
        </Modal>
    )
}
