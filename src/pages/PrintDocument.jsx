import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/helpers';
import './PrintDocument.css';

const DEFAULT_STAMP_SETTINGS = {
    placementMode: 'footer',
    stampSize: 110,
    stampOffsetX: 0,
    stampOffsetY: 0,
    stampOpacity: 0.85,
    signatureSize: 80,
    signatureOffsetX: 0,
    signatureOffsetY: 0,
    signatureOpacity: 0.9,
    empSignatureSize: 80,
    empSignatureOffsetX: 0,
    empSignatureOffsetY: 0,
    empSignatureOpacity: 0.9,
}

function SingleDoc({ docItem }) {
    const [signatureSrc, setSignatureSrc] = useState(null);
    const [stampSrc, setStampSrc] = useState(null);
    const [empSignatureSrc, setEmpSignatureSrc] = useState(null);

    useEffect(() => {
        if (docItem?.companySignaturePath) {
            window.electronAPI.readDocumentData(docItem.companySignaturePath).then(res => {
                if (res.success) setSignatureSrc(res.data);
            });
        } else setSignatureSrc(null);

        if (docItem?.companyStampPath) {
            window.electronAPI.readDocumentData(docItem.companyStampPath).then(res => {
                if (res.success) setStampSrc(res.data);
            });
        } else setStampSrc(null);

        if (docItem?.employeeSignaturePath) {
            if (docItem.employeeSignaturePath.startsWith('data:image/') || docItem.employeeSignaturePath.startsWith('http')) {
                setEmpSignatureSrc(docItem.employeeSignaturePath);
            } else if (window.electronAPI?.readDocumentData) {
                window.electronAPI.readDocumentData(docItem.employeeSignaturePath).then(res => {
                    if (res?.success) setEmpSignatureSrc(res.data);
                    else setEmpSignatureSrc(null);
                });
            } else setEmpSignatureSrc(null);
        } else setEmpSignatureSrc(null);
    }, [docItem]);

    const ss = { ...DEFAULT_STAMP_SETTINGS, ...(docItem.stampSettings || {}) };
    const containerH = ss.placementMode === 'free' ? 40 : 80;

    return (
        <div className="a4-page" style={{ position: 'relative', pageBreakAfter: 'always', breakAfter: 'page' }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 800, textTransform: 'uppercase', color: '#000', margin: 0, letterSpacing: '-0.2px' }}>
                    {docItem.companyName}
                </h2>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: '#475569', margin: 0 }}>
                        Tarih: {formatDate(docItem.placeholders?.startDate || docItem.placeholders?.issueDate || new Date())}
                    </p>
                </div>
            </div>

            {/* Document Title (Centered) */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', color: '#111', letterSpacing: '0.5px', margin: 0 }}>
                    {docItem.title}
                </h1>
            </div>

            {/* Body Content */}
            <div className="doc-body">
                {docItem.templateId === 'assignment' ? (
                    <div className="assignment-tables">
                        <table className="info-table">
                            <thead>
                                <tr><th colSpan="2" className="section-title">İŞVEREN BİLGİLERİ</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">ADI-SOYADI / ÜNVANI</td><td className="value-cell">{docItem.companyName || '-'}</td></tr>
                                <tr><td className="label-cell">İŞYERİ ADRESİ</td><td className="value-cell">{docItem.companyAddress || '-'}</td></tr>
                                <tr><td className="label-cell">İŞYERİ SGK NO</td><td className="value-cell">{docItem.companySgk || '-'}</td></tr>
                                <tr><td className="label-cell">VERGİ DAİRESİ / NO</td><td className="value-cell">{docItem.companyTax || '-'}</td></tr>
                            </tbody>
                        </table>

                        <table className="info-table">
                            <thead>
                                <tr><th colSpan="2" className="section-title">PERSONEL BİLGİLERİ</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">ADI - SOYADI</td><td className="value-cell">{docItem.employeeName || '-'}</td></tr>
                                <tr><td className="label-cell">T.C. KİMLİK NO</td><td className="value-cell">{docItem.tcNo || '-'}</td></tr>
                            </tbody>
                        </table>

                        <table className="info-table">
                            <thead>
                                <tr><th colSpan="2" className="section-title">GÖREVLENDİRME DETAYLARI</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">GİDİLECEK İŞYERİ</td><td className="value-cell">{docItem.placeholders?.workplaceName || '-'}</td></tr>
                                <tr><td className="label-cell">İŞYERİ ADRESİ</td><td className="value-cell">{docItem.placeholders?.workplaceAddress || '-'}</td></tr>
                                <tr><td className="label-cell">YAPILACAK İŞ</td><td className="value-cell">{docItem.placeholders?.workType || '-'}</td></tr>
                                <tr><td className="label-cell">GİDİŞ TARİHİ</td><td className="value-cell">{docItem.placeholders?.startDate ? formatDate(docItem.placeholders.startDate) : '-'}</td></tr>
                                <tr><td className="label-cell">DÖNÜŞ TARİHİ</td><td className="value-cell">{docItem.placeholders?.endDate ? formatDate(docItem.placeholders.endDate) : '-'}</td></tr>
                            </tbody>
                        </table>

                        <div className="assignment-text" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '12px', fontSize: '12px', fontStyle: 'italic' }}>
                            {docItem.content}
                        </div>
                    </div>
                ) : (
                    <div className="plain-content">
                        {docItem.content}
                    </div>
                )}
            </div>

            {/* Footer / Signatures */}
            <div className="doc-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginTop: 'auto' }}>
                <div className="signature-box" style={{ textAlign: 'center', position: 'relative' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                        PERSONEL İMZASI
                    </p>
                    <div style={{
                        height: `${containerH}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        marginBottom: '10px'
                    }}>
                        {ss.placementMode !== 'free' && empSignatureSrc && ss.showEmpSignature !== false && (
                            <img
                                src={empSignatureSrc}
                                alt="Personel İmzası"
                                style={{
                                    width: `${ss.empSignatureSize ?? 80}px`,
                                    height: `${ss.empSignatureSize ?? 80}px`,
                                    objectFit: 'contain',
                                    opacity: ss.empSignatureOpacity ?? 0.9,
                                    position: 'absolute',
                                    top: `calc(50% + ${ss.empSignatureOffsetY ?? 0}px)`,
                                    left: `calc(50% + ${ss.empSignatureOffsetX ?? 0}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 3,
                                }}
                            />
                        )}
                        {ss.placementMode !== 'free' && !empSignatureSrc && <div style={{ height: `${containerH}px` }}></div>}
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>{docItem.employeeName}</p>
                </div>
                <div className="signature-box" style={{ textAlign: 'center', position: 'relative' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                        YETKİLİ ONAYI
                    </p>
                    <div style={{
                        height: `${containerH}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        marginBottom: '10px'
                    }}>
                        {ss.placementMode !== 'free' && stampSrc && ss.showStamp !== false && (
                            <img
                                src={stampSrc}
                                alt="Kaşe"
                                style={{
                                    width: `${ss.stampSize}px`,
                                    height: `${ss.stampSize}px`,
                                    objectFit: 'contain',
                                    opacity: ss.stampOpacity,
                                    position: 'absolute',
                                    top: `calc(50% + ${ss.stampOffsetY ?? 0}px)`,
                                    left: `calc(50% + ${ss.stampOffsetX ?? 0}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 1,
                                }}
                            />
                        )}
                        {ss.placementMode !== 'free' && signatureSrc && ss.showSignature !== false && (
                            <img
                                src={signatureSrc}
                                alt="İmza"
                                style={{
                                    width: `${ss.signatureSize}px`,
                                    height: `${ss.signatureSize}px`,
                                    objectFit: 'contain',
                                    opacity: ss.signatureOpacity,
                                    position: 'absolute',
                                    top: `calc(50% + ${ss.signatureOffsetY}px)`,
                                    left: `calc(50% + ${ss.signatureOffsetX}px)`,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 2,
                                }}
                            />
                        )}
                        {ss.placementMode !== 'free' && !stampSrc && !signatureSrc && <div style={{ height: `${containerH}px` }}></div>}
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: 600 }}>{docItem.companyName}</p>
                </div>
            </div>

            {/* Free Placement Mode */}
            {ss.placementMode === 'free' && stampSrc && ss.showStamp !== false && (
                <img
                    src={stampSrc}
                    alt="Kaşe"
                    style={{
                        width: `${ss.stampSize}px`,
                        height: `${ss.stampSize}px`,
                        objectFit: 'contain',
                        opacity: ss.stampOpacity,
                        position: 'absolute',
                        top: `${ss.stampOffsetY ?? 0}px`,
                        left: `${ss.stampOffsetX ?? 0}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                    }}
                />
            )}
            {ss.placementMode === 'free' && signatureSrc && ss.showSignature !== false && (
                <img
                    src={signatureSrc}
                    alt="İmza"
                    style={{
                        width: `${ss.signatureSize}px`,
                        height: `${ss.signatureSize}px`,
                        objectFit: 'contain',
                        opacity: ss.signatureOpacity,
                        position: 'absolute',
                        top: `${ss.signatureOffsetY ?? 0}px`,
                        left: `${ss.signatureOffsetX ?? 0}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 11,
                    }}
                />
            )}
            {ss.placementMode === 'free' && empSignatureSrc && ss.showEmpSignature !== false && (
                <img
                    src={empSignatureSrc}
                    alt="Personel İmzası"
                    style={{
                        width: `${ss.empSignatureSize ?? 80}px`,
                        height: `${ss.empSignatureSize ?? 80}px`,
                        objectFit: 'contain',
                        opacity: ss.empSignatureOpacity ?? 0.9,
                        position: 'absolute',
                        top: `${ss.empSignatureOffsetY ?? 940}px`,
                        left: `${ss.empSignatureOffsetX ?? 150}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 12,
                    }}
                />
            )}
        </div>
    );
}

export default function PrintDocument() {
    const [data, setData] = useState(null);

    useEffect(() => {
        const load = () => {
            const stored = localStorage.getItem('printDocData');
            if (stored) {
                try {
                    let parsed = JSON.parse(stored);
                    if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed); } catch (e) {}
                    }
                    setData(prev => {
                        if (prev && JSON.stringify(prev) === JSON.stringify(parsed)) {
                            return prev;
                        }
                        return parsed;
                    });
                } catch (err) {
                    console.error("Print doc data parse error", err);
                }
            }
        };

        load();
        window.addEventListener('storage', load);

        const interval = setInterval(() => {
            setData(prev => {
                if (prev) {
                    clearInterval(interval);
                    return prev;
                }
                const stored = localStorage.getItem('printDocData');
                if (stored) {
                    try {
                        let parsed = JSON.parse(stored);
                        if (typeof parsed === 'string') {
                            try { parsed = JSON.parse(parsed); } catch (e) {}
                        }
                        return parsed;
                    } catch (err) {
                        return prev;
                    }
                }
                return prev;
            });
        }, 300);

        window.refreshPrintData = load;

        return () => {
            window.removeEventListener('storage', load);
            clearInterval(interval);
        };
    }, []);

    if (!data) return <div className="print-loading">Veriler yükleniyor...</div>;

    if (data.isBulk && Array.isArray(data.documents)) {
        return (
            <div>
                {data.documents.map((docItem, index) => (
                    <SingleDoc key={index} docItem={docItem} />
                ))}
            </div>
        );
    }

    return <SingleDoc docItem={data} />;
}
