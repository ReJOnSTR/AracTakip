import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import { calculateWorkStats } from '../utils/workCalculations';
import './WorkPdfReport.css'; // Özel CSS eklenecek

export default function WorkPdfReport({ 
    propId, 
    propWork, 
    noHeader = false, 
    isPreview = false, 
    showPricesProp = true, 
    showKdvProp = false, 
    kdvRateProp = 20, 
    pazarMultiplierProp = null, 
    mesaiMultiplierProp = null,
    scaleProp = 100,
    showPageBreaksProp = true
}) {
    const params = useParams();
    const id = propId || params.id;
    const [work, setWork] = useState(propWork || null);
    const [loading, setLoading] = useState(!propWork);
    const [error, setError] = useState(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const [scale, setScale] = useState(scaleProp || 100);
    const [showPageBreaks, setShowPageBreaks] = useState(showPageBreaksProp !== undefined ? showPageBreaksProp : true);
    const containerRef = useRef(null);
    const [pageBreaks, setPageBreaks] = useState([]);
    const showPrices = showPricesProp;

    useEffect(() => {
        if (scaleProp !== undefined) setScale(scaleProp);
    }, [scaleProp]);

    useEffect(() => {
        if (showPageBreaksProp !== undefined) setShowPageBreaks(showPageBreaksProp);
    }, [showPageBreaksProp]);

    useEffect(() => {
        if (propWork) {
            setWork(propWork);
            setLoading(false);
            return;
        }

        const stored = localStorage.getItem('workPdfData');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.id === Number(id)) {
                    setWork(parsed);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error("PDF data parse error", err);
            }
        }

        const loadData = async () => {
            if (!window.electronAPI) {
                setError('Electron API bulunamadı ve yerel veri okunamadı.');
                setLoading(false);
                return;
            }
            try {
                const res = await window.electronAPI.getWorkDetails(id);
                if (res.success) {
                    setWork(res.data);
                } else {
                    setError(res.error);
                }
            } catch (err) {
                setError(err.message);
            }
            setLoading(false);
        };
        loadData();
    }, [id, propWork]);

    // Calculate A4 Page Break lines (Excel Style - Exact 1-to-1 A4 1122.5px Sync)
    useEffect(() => {
        if (!showPageBreaks || !containerRef.current) {
            setPageBreaks([]);
            return;
        }

        const calcBreaks = () => {
            if (!containerRef.current) return;
            const totalHeight = containerRef.current.offsetHeight;
            // Exact A4 sheet height at 96DPI (297mm = 1122.5px)
            const baseA4Height = 1122.5; 
            const currentScale = (scale || 100) / 100;
            const pageHeightInContainer = baseA4Height / (currentScale > 0 ? currentScale : 1);
            
            const count = Math.floor(totalHeight / pageHeightInContainer);
            const breaks = [];
            for (let i = 1; i <= count; i++) {
                breaks.push(i * pageHeightInContainer);
            }
            setPageBreaks(breaks);
        };

        calcBreaks();
        const timer = setTimeout(calcBreaks, 150);
        return () => clearTimeout(timer);
    }, [work, scale, showPageBreaks]);

    const handleAutoFitOnePage = () => {
        if (!containerRef.current) return;
        const currentScale = (scale || 100) / 100;
        const unzoomedHeight = containerRef.current.offsetHeight * currentScale;
        const targetPrintHeight = 1100; // Target A4 height in px

        if (unzoomedHeight <= targetPrintHeight) {
            setScale(100);
        } else {
            const calculatedScale = Math.floor((targetPrintHeight / unzoomedHeight) * 100);
            const finalScale = Math.min(100, Math.max(45, calculatedScale));
            setScale(finalScale);
        }
    };

    if (loading) return <div className="print-loading">Veriler yükleniyor...</div>;
    if (error) return <div className="print-error">Hata: {error}</div>;
    if (!work) return null;

    const parsedPazarProp = pazarMultiplierProp !== null && pazarMultiplierProp !== undefined && pazarMultiplierProp !== "" ? parseFloat(pazarMultiplierProp) : NaN;
    const pazarMultiplier = !isNaN(parsedPazarProp)
        ? parsedPazarProp 
        : (work?.pazar_multiplier !== undefined && work?.pazar_multiplier !== null ? work.pazar_multiplier : 1.5);

    const parsedMesaiProp = mesaiMultiplierProp !== null && mesaiMultiplierProp !== undefined && mesaiMultiplierProp !== "" ? parseFloat(mesaiMultiplierProp) : NaN;
    const mesaiMultiplier = !isNaN(parsedMesaiProp)
        ? parsedMesaiProp 
        : (work?.mesai_multiplier !== undefined && work?.mesai_multiplier !== null ? work.mesai_multiplier : 1.5);

    const calcResult = calculateWorkStats(work?.items || [], pazarMultiplier, mesaiMultiplier);
    const groups = calcResult.groups;
    const grandTotalPrice = calcResult.grandTotal;

    const handleSavePdf = async () => {
        if (!window.electronAPI?.saveAsPdf) {
            alert('PDF Kaydetme özelliği sadece masaüstü uygulamasında geçerlidir.');
            return;
        }

        setSavingPdf(true);
        setTimeout(async () => {
            const res = await window.electronAPI.saveAsPdf();
            setSavingPdf(false);
            if (res && !res.success && !res.canceled) {
                alert('PDF Kaydedilirken Hata: ' + res.error);
            }
        }, 100);
    };

    const getWorkMonthLabel = (workObj) => {
        if (workObj?.date) {
            const d = new Date(workObj.date);
            if (!isNaN(d.getTime())) {
                const m = d.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
                return m.charAt(0).toUpperCase() + m.slice(1);
            }
        }
        const now = new Date();
        const m = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        return m.charAt(0).toUpperCase() + m.slice(1);
    };

    const isSinglePage = pageBreaks.length === 0;

    return (
        <div className={`pdf-viewer-layout ${savingPdf ? 'is-generating-pdf' : ''}`}>
            {/* Viewer Action Bar */}
            {!noHeader && (
                <div className="pdf-actions-bar">
                    <button className="pdf-btn close" onClick={() => window.close()} disabled={savingPdf}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        Pencereyi Kapat
                    </button>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                        <button 
                            type="button" 
                            onClick={handleAutoFitOnePage}
                            style={{ background: '#27ae60', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            ⚡ Tek Sayfaya Otomatik Sığdır
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '13px' }}>
                            <span>Ölçek: %{scale}</span>
                            <input 
                                type="range" 
                                min="50" 
                                max="130" 
                                step="1" 
                                value={scale} 
                                onChange={e => setScale(Number(e.target.value))} 
                                style={{ width: '90px', cursor: 'pointer', accentColor: '#3b82f6' }}
                            />
                            <button type="button" onClick={() => setScale(100)} style={{ background: '#34495e', border: '1px solid #7f8c8d', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>%100</button>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'white', fontSize: '13px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={showPageBreaks} 
                                onChange={e => setShowPageBreaks(e.target.checked)} 
                            />
                            Sayfa Sonu Çizgileri
                        </label>
                        <button className="pdf-btn print" onClick={() => window.print()} disabled={savingPdf}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                            Yazıcıdan Çıktı Al
                        </button>
                        <button className="pdf-btn save" onClick={handleSavePdf} disabled={savingPdf}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/><path d="M18 21v-8a2 2 0 0 0-2-2h-1.5"/></svg>
                            Bilgisayara PDF Kaydet
                        </button>
                    </div>
                </div>
            )}

            <div 
                ref={containerRef}
                className={`pdf-report-container ${isPreview ? 'is-preview' : ''} ${showKdvProp ? 'with-kdv' : ''}`}
                style={{
                    zoom: (scale || 100) / 100,
                    transformOrigin: 'top center'
                }}
            >
                {/* Excel-style Page Break Line Indicators */}
                {showPageBreaks && pageBreaks.map((topPos, pIdx) => (
                    <div key={pIdx} className="pdf-page-break-indicator" style={{ top: `${topPos}px` }}>
                        <div className="pdf-page-break-badge">
                            ✂ SAYFA {pIdx + 1} SONU (SAYFA {pIdx + 2} BAŞLANGICI)
                        </div>
                    </div>
                ))}
                {/* Header */}
                <div className="pdf-header-standard" style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '15px' }}>
                    <div>
                        <h1 className="pdf-title-standard" style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                            {work.work_no ? `İŞ RAPORU - ${work.work_no}` : 'İŞ RAPORU / PUANTAJ CETVELİ'}
                        </h1>
                    </div>
                    <div className="pdf-date-standard" style={{ textAlign: 'right' }}>
                        <div className="pdf-date-label" style={{ fontSize: '11px', color: '#666' }}>Rapor Tarihi</div>
                        <div className="pdf-date-value" style={{ fontWeight: 'bold', fontSize: '13px' }}>{new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                </div>
            <style dangerouslySetInnerHTML={{ __html: `
              .report-section-header {
                cursor: pointer;
                user-select: none;
                transition: opacity 0.2s;
              }
              .report-section-header:hover {
                opacity: 0.8;
              }
              .report-collapse-icon {
                font-size: 10px;
                margin-right: 8px;
              }
              @media print {
                .report-collapsible-body {
                  display: block !important;
                }
                .report-collapse-icon {
                  display: none !important;
                }
                .pdf-group-title {
                  cursor: default !important;
                }
              }
            `}} />

            {/* Tables grouped by vehicle */}
            {groups.map((group, idx) => {
                const { sampleGunPrice, samplePazarPrice, sampleYolPrice, sampleSaatlikPrice, sampleMesaiPrice } = group;

                return (
                    <div className="pdf-vehicle-group" key={idx}>
                        <h3 
                            style={{ 
                                fontSize: '13px', 
                                fontWeight: 'bold', 
                                borderBottom: '1px solid #ccc', 
                                paddingBottom: '5px', 
                                marginBottom: '10px', 
                                marginTop: '15px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                pageBreakAfter: 'avoid',
                                breakAfter: 'avoid'
                            }}
                        >
                            <span>{group.machineName.toUpperCase()} DETAYLARI</span>
                        </h3>
                        <div>
                            <table className="pdf-table" style={{ tableLayout: 'fixed' }}>
                                <thead>
                                    <tr>
                                        <th rowSpan="2" style={{ width: '11%' }}>TARİH</th>
                                        <th rowSpan="2" style={{ width: '11%' }}>FİŞ NO</th>
                                        <th colSpan="2" style={{ width: '22%' }}>Çalışma Süresi</th>
                                        <th rowSpan="2" style={{ width: '11%' }}>Süre/Adet</th>
                                        <th rowSpan="2" style={{ width: '11%' }}>Fazla Mesai</th>
                                        <th rowSpan="2" style={{ width: '11%' }}>MAKİNA</th>
                                        <th rowSpan="2" style={{ width: '12%' }}>AÇIKLAMA</th>
                                        <th rowSpan="2" style={{ width: '11%' }}>FİYAT</th>
                                    </tr>
                                    <tr>
                                        <th style={{ width: '11%' }}>Başlama</th>
                                        <th style={{ width: '11%' }}>Bitiş</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.items.map((item, itemIdx) => {
                                        const desc = item.description || '';
                                        let pdfRowClass = '';
                                        if (desc.includes('[RENK:red]') || item.isPazar) pdfRowClass = 'pdf-row-red';
                                        else if (desc.includes('[RENK:orange]')) pdfRowClass = 'pdf-row-orange';
                                        else if (desc.includes('[RENK:blue]')) pdfRowClass = 'pdf-row-blue';
                                        else if (desc.includes('[RENK:green]')) pdfRowClass = 'pdf-row-green';
                                        else if (desc.includes('[RENK:purple]')) pdfRowClass = 'pdf-row-purple';

                                        const cleanDesc = desc.replace(/\[[^\]]*\]\s*/g, '').trim();

                                        return (
                                            <tr key={itemIdx} className={pdfRowClass}>
                                                <td className="center">{formatDate(item.date)}</td>
                                                <td className="center">{item.receipt_no || '-'}</td>
                                                <td className="center">{item.start_time || '-'}</td>
                                                <td className="center">{item.end_time || '-'}</td>
                                                <td className="center">
                                                    {item.hours || 0} {(desc.toUpperCase().includes('[SAATLİK]') ? 'Saat' : 'Gün')}
                                                </td>
                                                <td className="center">{item.overtime_hours > 0 ? `${item.overtime_hours} Saat` : ''}</td>
                                                <td className="center">{group.rawMachineName || group.machineName}</td>
                                                <td>{cleanDesc}</td>
                                                <td className="right">
                                                    {showPrices ? (
                                                        item.isPazar && !(desc.includes('[KATSAYI:'))
                                                            ? formatCurrency(((item.unitPriceVal || item.unit_price || 0) > 10000 && item.isAylik ? (item.unitPriceVal || item.unit_price || 0) / 26 : (item.unitPriceVal || item.unit_price || 0)) * pazarMultiplier)
                                                            : (item.unit_price || item.unitPriceVal ? formatCurrency(item.unit_price || item.unitPriceVal) : '')
                                                    ) : ''}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {/* Summary Block */}
                            <div className="pdf-summary-block">
                                <table className="pdf-summary-table" style={{ width: '550px' }}>
                                    <colgroup>
                                        <col style={{ width: '125px' }} />
                                        <col style={{ width: '125px' }} />
                                        <col style={{ width: '150px' }} />
                                        <col style={{ width: '150px' }} />
                                    </colgroup>
                                    <tbody>
                                        <tr className="bg-light-gray">
                                            <td colSpan="4" className="bold center" style={{ padding: '4px', fontSize: '11px', borderBottom: '1px solid #ddd' }}>
                                                {(group.rawMachineName || group.machineName).toUpperCase()}
                                            </td>
                                        </tr>
                                        {group.summaryLines && group.summaryLines.map((line, lIdx) => (
                                            <tr key={lIdx} className="bg-light-gray">
                                                <td className="bold center">{line.typeLabel}</td>
                                                <td className="center">{line.countText || `${line.count} ${line.unit}`}</td>
                                                <td className="right">{line.unitPrice ? formatCurrency(line.unitPrice) : '-'}</td>
                                                <td className="right bold total-text">{formatCurrency(line.totalPrice)}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ borderTop: '1px solid #ddd' }}>
                                            <td colSpan="3" className="bold right" style={{ padding: '6px 12px', fontSize: '9.5px', backgroundColor: '#f9f9f9', color: '#333' }}>TOPLAM</td>
                                            <td className="right bold total-text" style={{ padding: '6px 12px', fontSize: '10.5px', backgroundColor: '#f1f5f9', color: '#000' }}>{formatCurrency(group.calculatedGrandTotal)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* General Grand Total Summary */}
            <div className="pdf-grand-total">
                <table className="pdf-summary-table" style={{ width: '350px', marginLeft: 'auto', marginTop: (groups.length > 0 ? '20px' : '0') }}>
                    <colgroup>
                        <col style={{ width: '170px' }} />
                        <col style={{ width: '180px' }} />
                    </colgroup>
                    <tbody>
                            <tr style={{ borderTop: '1px solid #ddd' }}>
                                <td className="bold" style={{ fontSize: '10px', padding: '8px 12px', backgroundColor: '#f9f9f9' }}>GENEL TOPLAM</td>
                                <td className="right bold total-text" style={{ fontSize: '12px', padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#000' }}>{formatCurrency(grandTotalPrice)}{showKdvProp ? '' : ' + KDV'}</td>
                            </tr>
                            {showKdvProp && (
                                <>
                                    <tr>
                                        <td className="bold" style={{ fontSize: '10px', padding: '8px 12px', backgroundColor: '#f9f9f9' }}>KDV (%{kdvRateProp})</td>
                                        <td className="right bold total-text" style={{ fontSize: '12px', padding: '8px 12px', backgroundColor: '#f1f5f9', color: '#000' }}>{formatCurrency(grandTotalPrice * (kdvRateProp / 100))}</td>
                                    </tr>
                                    <tr style={{ borderTop: '2px solid #333' }}>
                                        <td className="bold" style={{ fontSize: '10px', padding: '8px 12px', backgroundColor: '#e2e8f0' }}>TOPLAM (KDV DAHİL)</td>
                                        <td className="right bold total-text" style={{ fontSize: '13px', padding: '8px 12px', backgroundColor: '#cbd5e1', color: '#000' }}>{formatCurrency(grandTotalPrice * (1 + kdvRateProp / 100))}</td>
                                    </tr>
                                </>
                            )}
                    </tbody>
                </table>
            </div>

            {work?.description && work.description.trim() !== '' && (
                <div className="pdf-footer-note">
                    <span className="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOT:</span>
                    <div style={{ marginLeft: '10px', display: 'inline-block', whiteSpace: 'pre-wrap' }}>{work.description.trim()}</div>
                </div>
            )}

            <div className="pdf-footer-standard">Puantaj Raporları</div>
        </div>
        </div>
    );
}
