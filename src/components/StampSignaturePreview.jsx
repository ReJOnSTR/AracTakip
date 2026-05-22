import { useState, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Move, Layers } from 'lucide-react'

export default function StampSignaturePreview({ company, settings, onChange }) {
    const [stampSrc, setStampSrc] = useState(null)
    const [signatureSrc, setSignatureSrc] = useState(null)

    // Local copies of settings with defaults
    const stampSize = settings.stampSize ?? 110
    const signatureSize = settings.signatureSize ?? 80
    const signatureOffsetX = settings.signatureOffsetX ?? 0
    const signatureOffsetY = settings.signatureOffsetY ?? 0
    const signatureOpacity = settings.signatureOpacity ?? 0.9
    const stampOpacity = settings.stampOpacity ?? 0.85

    useEffect(() => {
        if (company?.stamp_path) {
            window.electronAPI.readDocumentData(company.stamp_path).then(res => {
                if (res.success) setStampSrc(res.data)
            })
        } else {
            setStampSrc(null)
        }
        if (company?.signature_path) {
            window.electronAPI.readDocumentData(company.signature_path).then(res => {
                if (res.success) setSignatureSrc(res.data)
            })
        } else {
            setSignatureSrc(null)
        }
    }, [company])

    const update = (key, val) => onChange({ ...settings, [key]: val })

    const sliderStyle = {
        width: '100%',
        accentColor: 'var(--accent-primary)',
        cursor: 'pointer',
        height: '4px',
    }

    const labelStyle = {
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    }

    const noImages = !stampSrc && !signatureSrc

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '20px', minHeight: '340px' }}>
            {/* Preview Area */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                padding: '20px',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Belge arka plan çizgiler (dekoratif) */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '180px', opacity: 0.25 }}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} style={{
                            height: '1px', background: '#94a3b8',
                            margin: `${12 + i * 14}px 20px 0`
                        }} />
                    ))}
                </div>

                {/* Belge köşe etiketi */}
                <div style={{
                    position: 'absolute', top: '14px', right: '16px',
                    fontSize: '9px', fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '1px'
                }}>
                    YETKİLİ ONAYI
                </div>

                {/* Önizleme kutusu */}
                {noImages ? (
                    <div style={{
                        width: '260px', height: '160px',
                        border: '2px dashed var(--border-color)',
                        borderRadius: '10px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', gap: '8px'
                    }}>
                        <Layers size={28} strokeWidth={1.5} />
                        <span style={{ fontSize: '12px', textAlign: 'center' }}>
                            Şirket yönetiminden kaşe ve<br />imza görseli yükleyin
                        </span>
                    </div>
                ) : (
                    <div style={{
                        width: '260px',
                        height: '160px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        background: 'white',
                    }}>
                        {stampSrc && (
                            <img
                                src={stampSrc}
                                alt="Kaşe"
                                style={{
                                    width: `${stampSize}px`,
                                    height: `${stampSize}px`,
                                    objectFit: 'contain',
                                    opacity: stampOpacity,
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 1,
                                }}
                            />
                        )}
                        {signatureSrc && (
                            <img
                                src={signatureSrc}
                                alt="İmza"
                                style={{
                                    width: `${signatureSize}px`,
                                    height: `${signatureSize}px`,
                                    objectFit: 'contain',
                                    opacity: signatureOpacity,
                                    position: 'absolute',
                                    top: `calc(50% + ${signatureOffsetY}px)`,
                                    left: `calc(50% + ${signatureOffsetX}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 2,
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Çizgi ve isim */}
                <div style={{ width: '260px', textAlign: 'center' }}>
                    <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                            {company?.name || 'Şirket Adı'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', paddingTop: '4px' }}>
                {/* Kaşe Boyutu */}
                <div>
                    <div style={labelStyle}>
                        <span>Kaşe Boyutu</span>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{stampSize}px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ZoomOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input type="range" min={40} max={200} value={stampSize}
                            onChange={e => update('stampSize', Number(e.target.value))}
                            style={sliderStyle} />
                        <ZoomIn size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                </div>

                {/* İmza Boyutu */}
                <div>
                    <div style={labelStyle}>
                        <span>İmza Boyutu</span>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{signatureSize}px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ZoomOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input type="range" min={30} max={160} value={signatureSize}
                            onChange={e => update('signatureSize', Number(e.target.value))}
                            style={sliderStyle} />
                        <ZoomIn size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                </div>

                {/* İmza Yatay Konum */}
                <div>
                    <div style={labelStyle}>
                        <span>İmza Yatay Konum</span>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{signatureOffsetX > 0 ? '+' : ''}{signatureOffsetX}px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Move size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input type="range" min={-80} max={80} value={signatureOffsetX}
                            onChange={e => update('signatureOffsetX', Number(e.target.value))}
                            style={sliderStyle} />
                        <Move size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    </div>
                </div>

                {/* İmza Dikey Konum */}
                <div>
                    <div style={labelStyle}>
                        <span>İmza Dikey Konum</span>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{signatureOffsetY > 0 ? '+' : ''}{signatureOffsetY}px</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Move size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: 'rotate(90deg)' }} />
                        <input type="range" min={-80} max={80} value={signatureOffsetY}
                            onChange={e => update('signatureOffsetY', Number(e.target.value))}
                            style={sliderStyle} />
                        <Move size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, transform: 'rotate(90deg)' }} />
                    </div>
                </div>

                {/* Opaklık */}
                <div>
                    <div style={labelStyle}>
                        <span>İmza Opaklığı</span>
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{Math.round(signatureOpacity * 100)}%</span>
                    </div>
                    <input type="range" min={20} max={100} value={Math.round(signatureOpacity * 100)}
                        onChange={e => update('signatureOpacity', Number(e.target.value) / 100)}
                        style={sliderStyle} />
                </div>

                {/* Sıfırla */}
                <button
                    type="button"
                    onClick={() => onChange({ stampSize: 110, signatureSize: 80, signatureOffsetX: 0, signatureOffsetY: 0, signatureOpacity: 0.9, stampOpacity: 0.85 })}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '12px', color: 'var(--text-muted)',
                        background: 'none', border: '1px solid var(--border-color)',
                        borderRadius: '8px', padding: '7px 12px', cursor: 'pointer',
                        transition: 'all 0.15s', marginTop: 'auto'
                    }}
                >
                    <RotateCcw size={13} />
                    Varsayılana Sıfırla
                </button>
            </div>
        </div>
    )
}
