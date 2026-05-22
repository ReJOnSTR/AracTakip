import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/helpers';
import './PrintDocument.css';

const DEFAULT_STAMP_SETTINGS = {
    stampSize: 110,
    signatureSize: 80,
    signatureOffsetX: 0,
    signatureOffsetY: 0,
    signatureOpacity: 0.9,
    stampOpacity: 0.85,
}

export default function PrintDocument() {
    const [data, setData] = useState(null);
    const [signatureSrc, setSignatureSrc] = useState(null);
    const [stampSrc, setStampSrc] = useState(null);

    useEffect(() => {
        const load = () => {
            const stored = localStorage.getItem('printDocData');
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setData(parsed);
                } catch (err) {
                    console.error("Print doc data parse error", err);
                }
            }
        };

        load();
        window.addEventListener('storage', load);

        // Fallback interval for hidden windows
        const interval = setInterval(() => {
            if (!data) load();
        }, 300);

        // Global refresh function for Electron
        window.refreshPrintData = load;

        return () => {
            window.removeEventListener('storage', load);
            clearInterval(interval);
        };
    }, [data]);

    useEffect(() => {
        if (data?.companySignaturePath) {
            window.electronAPI.readDocumentData(data.companySignaturePath).then(res => {
                if (res.success) setSignatureSrc(res.data);
            });
        } else {
            setSignatureSrc(null);
        }

        if (data?.companyStampPath) {
            window.electronAPI.readDocumentData(data.companyStampPath).then(res => {
                if (res.success) setStampSrc(res.data);
            });
        } else {
            setStampSrc(null);
        }
    }, [data]);

    if (!data) return <div className="print-loading">Veriler yükleniyor...</div>;

    // Merge saved settings with defaults
    const ss = { ...DEFAULT_STAMP_SETTINGS, ...(data.stampSettings || {}) };
    const containerH = Math.max(ss.stampSize, ss.signatureSize) + 20;

    return (
        <div className="a4-page">
            {/* Header / Logo */}
            <div className="doc-header">
                <div className="company-info">
                    <h2 style={{ fontSize: '18px', fontWeight: '800', textTransform: 'uppercase', color: '#000', marginBottom: '0', letterSpacing: '-0.2px' }}>
                        {data.companyName}
                    </h2>
                </div>
                <div className="doc-meta" style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', marginBottom: '8px' }}>
                        Tarih: {formatDate(new Date())}
                    </p>
                    <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#111', letterSpacing: '-1px', margin: 0 }}>
                        {data.title}
                    </h1>
                </div>
            </div>

            {/* Content Section */}
            <div className="doc-content">
                {data.templateId === 'assignment' ? (
                    <div className="structured-doc">
                        <table className="info-table">
                            <thead>
                                <tr><th colSpan="2" className="section-title">İŞVEREN BİLGİLERİ</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">ADI-SOYADI / ÜNVANI</td><td className="value-cell">{data.companyName}</td></tr>
                                <tr><td className="label-cell">İŞYERİ ADRESİ</td><td className="value-cell">{data.companyAddress}</td></tr>
                                <tr><td className="label-cell">İŞYERİ SGK NO</td><td className="value-cell">{data.companySgk}</td></tr>
                                <tr><td className="label-cell">VERGİ DAİRESİ / NO</td><td className="value-cell">{data.companyTax}</td></tr>
                            </tbody>
                        </table>

                        <table className="info-table" style={{ marginTop: '20px' }}>
                            <thead>
                                <tr><th colSpan="2" className="section-title">PERSONEL BİLGİLERİ</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">ADI - SOYADI</td><td className="value-cell">{data.employeeName}</td></tr>
                                <tr><td className="label-cell">T.C. KİMLİK NO</td><td className="value-cell">{data.tcNo || '-'}</td></tr>
                            </tbody>
                        </table>

                        <table className="info-table" style={{ marginTop: '20px' }}>
                            <thead>
                                <tr><th colSpan="2" className="section-title">GÖREVLENDİRME DETAYLARI</th></tr>
                            </thead>
                            <tbody>
                                <tr><td className="label-cell">GİDİLECEK İŞYERİ</td><td className="value-cell">{data.placeholders?.workplaceName || '-'}</td></tr>
                                <tr><td className="label-cell">İŞYERİ ADRESİ</td><td className="value-cell">{data.placeholders?.workplaceAddress || '-'}</td></tr>
                                <tr><td className="label-cell">YAPILACAK İŞ</td><td className="value-cell">{data.placeholders?.workType || '-'}</td></tr>
                                <tr><td className="label-cell">GİDİŞ TARİHİ</td><td className="value-cell">{data.placeholders?.startDate ? formatDate(data.placeholders.startDate) : '-'}</td></tr>
                                <tr><td className="label-cell">DÖNÜŞ TARİHİ</td><td className="value-cell">{data.placeholders?.endDate ? formatDate(data.placeholders.endDate) : '-'}</td></tr>
                            </tbody>
                        </table>

                        <div className="assignment-text" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px', fontSize: '12px', fontStyle: 'italic' }}>
                            {data.content}
                        </div>
                    </div>
                ) : (
                    <div className="plain-content">
                        {data.content}
                    </div>
                )}
            </div>

            {/* Footer / Signatures */}
            <div className="doc-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginTop: 'auto' }}>
                <div className="signature-box" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', fontWeight: '700', borderBottom: '1px solid #ddd', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>
                        PERSONEL İMZASI
                    </p>
                    <div style={{ height: `${containerH}px` }}></div>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>{data.employeeName}</p>
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
                        {stampSrc && (
                            <img
                                src={stampSrc}
                                alt="Kaşe"
                                style={{
                                    width: `${ss.stampSize}px`,
                                    height: `${ss.stampSize}px`,
                                    objectFit: 'contain',
                                    opacity: ss.stampOpacity,
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
                        {!stampSrc && !signatureSrc && <div style={{ height: `${containerH}px` }}></div>}
                    </div>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>{data.companyName}</p>
                </div>
            </div>

        </div>
    );
}
