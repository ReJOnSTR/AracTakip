import { useState, useEffect, useRef } from 'react'
import { formatDate } from '../utils/helpers'
import { RotateCcw } from 'lucide-react'

const SCALE = 0.65
const A4W = 794   // 210mm @ 96dpi
const A4H = 1122  // 297mm @ 96dpi
const PAD = 68    // 18mm padding

export const STAMP_DEFAULTS = {
    placementMode: 'footer',
    stampSize: 110,
    stampOffsetX: 0,
    stampOffsetY: 0,
    stampOpacity: 0.85,
    signatureSize: 80,
    signatureOffsetX: 0,
    signatureOffsetY: 0,
    signatureOpacity: 0.9,
}

function InfoTable({ title, rows }) {
    const thStyle = {
        background: '#f1f5f9', color: '#334155', fontSize: '11px', fontWeight: 800,
        textAlign: 'left', padding: '8px 12px', border: '1px solid #e2e8f0',
        textTransform: 'uppercase', letterSpacing: '0.05em',
    }
    const tdLabel = {
        width: '200px', fontSize: '11px', fontWeight: 700, color: '#475569',
        padding: '10px 12px', border: '1px solid #e2e8f0', background: '#f8fafc',
    }
    const tdVal = {
        fontSize: '12px', fontWeight: 500, color: '#000',
        padding: '10px 12px', border: '1px solid #e2e8f0',
    }
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', tableLayout: 'fixed' }}>
            <thead>
                <tr><th colSpan="2" style={thStyle}>{title}</th></tr>
            </thead>
            <tbody>
                {rows.map(([label, value], i) => (
                    <tr key={i}>
                        <td style={tdLabel}>{label}</td>
                        <td style={tdVal}>{value || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}

export default function StampSignaturePreview({ docData, company, settings, onChange }) {
    const [stampSrc, setStampSrc] = useState(null)
    const [signatureSrc, setSignatureSrc] = useState(null)
    const scrollRef = useRef(null)

    const ss = { ...STAMP_DEFAULTS, ...settings }

    useEffect(() => {
        if (company?.stamp_path) {
            window.electronAPI.readDocumentData(company.stamp_path).then(r => {
                if (r.success) setStampSrc(r.data); else setStampSrc(null)
            })
        } else setStampSrc(null)

        if (company?.signature_path) {
            window.electronAPI.readDocumentData(company.signature_path).then(r => {
                if (r.success) setSignatureSrc(r.data); else setSignatureSrc(null)
            })
        } else setSignatureSrc(null)
    }, [company])

    // Auto-scroll to footer when component mounts
    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight
            }, 150)
        }
    }, [])

    // --- Drag handler ---
    const startDrag = (e, which) => {
        e.preventDefault()
        e.stopPropagation()
        const sx = e.clientX, sy = e.clientY
        const ox = ss[which + 'OffsetX'], oy = ss[which + 'OffsetY']
        const onMove = (ev) => {
            const nextX = ox + (ev.clientX - sx) / SCALE
            const nextY = oy + (ev.clientY - sy) / SCALE
            
            if (ss.placementMode === 'free') {
                onChange({
                    ...settings,
                    [which + 'OffsetX']: Math.max(0, Math.min(A4W, Math.round(nextX))),
                    [which + 'OffsetY']: Math.max(0, Math.min(A4H, Math.round(nextY))),
                })
            } else {
                onChange({
                    ...settings,
                    [which + 'OffsetX']: nextX,
                    [which + 'OffsetY']: nextY,
                })
            }
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

    // --- Resize handler ---
    const startResize = (e, which) => {
        e.preventDefault()
        e.stopPropagation()
        const sx = e.clientX, sy = e.clientY
        const startSize = ss[which + 'Size']
        const onMove = (ev) => {
            const delta = ((ev.clientX - sx) + (ev.clientY - sy)) / 2 / SCALE
            onChange({
                ...settings,
                [which + 'Size']: Math.max(20, Math.min(260, Math.round(startSize + delta))),
            })
        }
        const onUp = () => {
            document.removeEventListener('mousemove', onMove)
            document.removeEventListener('mouseup', onUp)
        }
        document.addEventListener('mousemove', onMove)
        document.addEventListener('mouseup', onUp)
    }

    // Compute footer box height to accommodate all offsets + sizes
    const stampExt = Math.abs(ss.stampOffsetY) + ss.stampSize / 2
    const sigExt   = Math.abs(ss.signatureOffsetY) + ss.signatureSize / 2
    const containerH = ss.placementMode === 'free' ? 40 : (Math.max(stampExt, sigExt) * 2 + 30)

    const renderInteractive = (which, src, zIndex) => {
        const size    = Math.round(ss[which + 'Size'])
        const ox      = ss[which + 'OffsetX']
        const oy      = ss[which + 'OffsetY']
        const opacity = ss[which === 'stamp' ? 'stampOpacity' : 'signatureOpacity']
        const color   = which === 'stamp' ? '#3b82f6' : '#10b981'

        const centerStyle = {
            position: 'absolute',
            top:  ss.placementMode === 'free' ? `${oy}px` : `calc(50% + ${oy}px)`,
            left: ss.placementMode === 'free' ? `${ox}px` : `calc(50% + ${ox}px)`,
            transform: 'translate(-50%, -50%)',
        }

        return (
            <>
                {/* Image */}
                <img
                    key={which + '-img'}
                    src={src}
                    alt={which}
                    draggable={false}
                    onMouseDown={(e) => startDrag(e, which)}
                    style={{
                        ...centerStyle,
                        width: `${size}px`,
                        height: `${size}px`,
                        objectFit: 'contain',
                        opacity,
                        cursor: 'move',
                        zIndex,
                        userSelect: 'none',
                        pointerEvents: 'auto',
                    }}
                />
                {/* Selection border */}
                <div
                    key={which + '-border'}
                    style={{
                        ...centerStyle,
                        width:  `${size}px`,
                        height: `${size}px`,
                        border: `2px dashed ${color}`,
                        borderRadius: '4px',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                        zIndex: zIndex + 2,
                    }}
                />
                {/* Resize handle at bottom-right corner */}
                <div
                    key={which + '-resize'}
                    onMouseDown={(e) => startResize(e, which)}
                    title="Boyutlandır"
                    style={{
                        position: 'absolute',
                        top:  ss.placementMode === 'free' ? `${Math.round(oy + size / 2)}px` : `calc(50% + ${oy}px + ${size / 2}px)`,
                        left: ss.placementMode === 'free' ? `${Math.round(ox + size / 2)}px` : `calc(50% + ${ox}px + ${size / 2}px)`,
                        transform: 'translate(-50%, -50%)',
                        width: '14px',
                        height: '14px',
                        background: color,
                        border: '2px solid white',
                        borderRadius: '3px',
                        cursor: 'nwse-resize',
                        zIndex: zIndex + 4,
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                />
            </>
        )
    }

    // The actual scaled document
    const scaledDocStyle = {
        width: `${A4W}px`,
        minHeight: `${A4H}px`,
        transform: `scale(${SCALE})`,
        transformOrigin: 'top left',
        background: 'white',
        padding: `${PAD}px`,
        boxSizing: 'border-box',
        boxShadow: '0 6px 40px rgba(0,0,0,0.5)',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        color: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative', // ensures absolute positioned children map to top-left of this container
    }

    return (
        <div>
            {/* Yerleşim Modu Seçici */}
            <div style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '16px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Kaşe & İmza Yerleşimi</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Belge boyutu uzamasın diye metin üzerine veya serbest bir yere yerleştirebilirsiniz.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <button
                        type="button"
                        onClick={() => {
                            onChange({
                                ...settings,
                                placementMode: 'footer',
                                stampOffsetX: 0,
                                stampOffsetY: 0,
                                signatureOffsetX: 0,
                                signatureOffsetY: 0
                            })
                        }}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: ss.placementMode === 'footer' ? 'var(--accent-primary)' : 'transparent',
                            color: ss.placementMode === 'footer' ? '#fff' : 'var(--text-muted)'
                        }}
                    >
                        Alt Bölüm (Sabit)
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onChange({
                                ...settings,
                                placementMode: 'free',
                                stampOffsetX: 530,
                                stampOffsetY: 900,
                                signatureOffsetX: 640,
                                signatureOffsetY: 940
                            })
                        }}
                        style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: ss.placementMode === 'free' ? 'var(--accent-primary)' : 'transparent',
                            color: ss.placementMode === 'free' ? '#fff' : 'var(--text-muted)'
                        }}
                    >
                        Serbest Yerleşim (Metin Üzeri)
                    </button>
                </div>
            </div>

            {/* Scrollable A4 preview */}
            <div
                ref={scrollRef}
                style={{
                    overflow: 'auto',
                    maxHeight: '62vh',
                    background: '#3d3d3d',
                    borderRadius: '10px',
                    padding: '20px',
                    border: '1px solid var(--border-color)',
                }}
            >
                {/* Wrapper that matches the SCALED document size so the container doesn't collapse */}
                <div style={{ width: `${A4W * SCALE}px`, height: `${A4H * SCALE}px`, margin: '0 auto', position: 'relative' }}>
                    <div style={scaledDocStyle}>

                        {/* ── HEADER ── */}
                        <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', color: '#000', margin: 0, letterSpacing: '-0.2px' }}>
                                {docData?.companyName}
                            </h2>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: '12px', fontWeight: 600, color: '#888', margin: '0 0 8px' }}>
                                    Tarih: {formatDate(new Date())}
                                </p>
                                <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#111', letterSpacing: '-1px', margin: 0 }}>
                                    {docData?.title}
                                </h1>
                            </div>
                        </div>

                        {/* ── CONTENT ── */}
                        <div style={{ fontSize: '13.5px', lineHeight: 1.7, color: '#333', flexGrow: 1, marginBottom: '40px' }}>
                            {docData?.templateId === 'assignment' ? (
                                <div>
                                    <InfoTable title="İŞVEREN BİLGİLERİ" rows={[
                                        ['ADI-SOYADI / ÜNVANI', docData?.companyName],
                                        ['İŞYERİ ADRESİ', docData?.companyAddress],
                                        ['İŞYERİ SGK NO', docData?.companySgk],
                                        ['VERGİ DAİRESİ / NO', docData?.companyTax],
                                    ]} />
                                    <InfoTable title="PERSONEL BİLGİLERİ" rows={[
                                        ['ADI - SOYADI', docData?.employeeName],
                                        ['T.C. KİMLİK NO', docData?.tcNo || '-'],
                                    ]} />
                                    <InfoTable title="GÖREVLENDİRME DETAYLARI" rows={[
                                        ['GİDİLECEK İŞYERİ', docData?.placeholders?.workplaceName],
                                        ['İŞYERİ ADRESİ', docData?.placeholders?.workplaceAddress],
                                        ['YAPILACAK İŞ', docData?.placeholders?.workType],
                                        ['GİDİŞ TARİHİ', docData?.placeholders?.startDate ? formatDate(docData.placeholders.startDate) : null],
                                        ['DÖNÜŞ TARİHİ', docData?.placeholders?.endDate ? formatDate(docData.placeholders.endDate) : null],
                                    ]} />
                                    <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '12px', fontStyle: 'italic', whiteSpace: 'pre-wrap', textAlign: 'justify' }}>
                                        {docData?.content}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ whiteSpace: 'pre-wrap', textAlign: 'justify' }}>{docData?.content}</div>
                            )}
                        </div>

                        {/* ── FOOTER / SIGNATURES ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginTop: 'auto' }}>
                            {/* Personel İmzası (static) */}
                            <div style={{ textAlign: 'center' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                                    PERSONEL İMZASI
                                </p>
                                <div style={{ height: `${containerH}px` }} />
                                <p style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>{docData?.employeeName}</p>
                            </div>

                            {/* Yetkili Onayi — INTERACTIVE */}
                            <div style={{ textAlign: 'center', position: 'relative' }}>
                                <p style={{ fontSize: '11px', fontWeight: 700, borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                                    YETKİLİ ONAYI
                                </p>
                                <div style={{ height: `${containerH}px`, position: 'relative', overflow: 'visible' }}>
                                    {ss.placementMode !== 'free' && stampSrc    && renderInteractive('stamp',     stampSrc,     1)}
                                    {ss.placementMode !== 'free' && signatureSrc && renderInteractive('signature', signatureSrc, 2)}
                                    {ss.placementMode !== 'free' && !stampSrc && !signatureSrc && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '11px' }}>
                                            Kaşe / imza yüklenmemiş
                                        </div>
                                    )}
                                    {ss.placementMode === 'free' && (
                                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '11px' }}>
                                            Serbest Yerleşim Aktif
                                        </div>
                                    )}
                                </div>
                                <p style={{ fontSize: '12px', fontWeight: 600, margin: 0 }}>{docData?.companyName}</p>
                            </div>
                        </div>

                        {/* Eğer Serbest Yerleşim modu ise, kaşe ve imzayı A4 sayfasının relative scope'unda render et */}
                        {ss.placementMode === 'free' && stampSrc && renderInteractive('stamp', stampSrc, 10)}
                        {ss.placementMode === 'free' && signatureSrc && renderInteractive('signature', signatureSrc, 11)}

                    </div>
                </div>
            </div>

            {/* Legend + Reset */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '11px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '14px', height: '14px', border: '2px dashed #3b82f6', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
                        Kaşe — sürükle · köşeden boyutlandır
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ width: '14px', height: '14px', border: '2px dashed #10b981', borderRadius: '2px', display: 'inline-block', flexShrink: 0 }} />
                        İmza — sürükle · köşeden boyutlandır
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => onChange({ ...STAMP_DEFAULTS })}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', color: 'var(--text-muted)',
                        background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                        whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                >
                    <RotateCcw size={13} />
                    Varsayılana sıfırla
                </button>
            </div>
        </div>
    )
}
