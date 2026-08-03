import React, { useState, useEffect } from 'react';
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
    previewModeProp = 'normal',
    orientationProp = 'portrait',
    fitModeProp = 'auto',
    customScaleProp = 100,
    marginSizeProp = 'normal'
}) {
    const params = useParams();
    const id = propId || params.id;
    const [work, setWork] = useState(propWork || null);
    const [loading, setLoading] = useState(!propWork);
    const [error, setError] = useState(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const showPrices = showPricesProp;

    // Excel-style Page Setup & Preview States
    const [previewMode, setPreviewMode] = useState(previewModeProp); 
    const [orientation, setOrientation] = useState(orientationProp); 
    const [fitMode, setFitMode] = useState(fitModeProp); 
    const [customScale, setCustomScale] = useState(customScaleProp); 
    const [marginSize, setMarginSize] = useState(marginSizeProp); 

    const containerRef = React.useRef(null);
    const [pageBreaks, setPageBreaks] = useState([]);
    const [calculatedAutoFitScale, setCalculatedAutoFitScale] = useState(100);

    useEffect(() => {
        setPreviewMode(previewModeProp);
        setOrientation(orientationProp);
        setFitMode(fitModeProp);
        setCustomScale(customScaleProp);
        setMarginSize(marginSizeProp);
    }, [previewModeProp, orientationProp, fitModeProp, customScaleProp, marginSizeProp]);

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

    // Page Break & Fit-to-Page Calculation Engine
    useEffect(() => {
        if (!containerRef.current) return;
        const element = containerRef.current;
        const totalHeightPx = element.scrollHeight;

        let basePageHeight = orientation === 'landscape' ? 794 : 1123;
        let marginPx = marginSize === 'narrow' ? 60 : (marginSize === 'wide' ? 166 : 113);
        let printableHeightPx = basePageHeight - marginPx;

        if (totalHeightPx > 0) {
            const fitScale = Math.min(100, Math.round((printableHeightPx / totalHeightPx) * 100));
            setCalculatedAutoFitScale(fitScale > 35 ? fitScale : 35);
        }

        const currentScalePercent = fitMode === 'fit1Page' ? calculatedAutoFitScale : (fitMode === 'custom' ? customScale : 100);
        const scaledPrintablePx = Math.round(printableHeightPx / (currentScalePercent / 100));

        const breaks = [];
        if (totalHeightPx > scaledPrintablePx) {
            let currentTop = scaledPrintablePx;
            let pageNum = 1;
            while (currentTop < totalHeightPx) {
                breaks.push({ topPx: currentTop, pageNum: pageNum });
                pageNum++;
                currentTop += scaledPrintablePx;
            }
        }
        setPageBreaks(breaks);
    }, [work, orientation, fitMode, customScale, marginSize, calculatedAutoFitScale]);

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

    const reportItems = (work?.items && work.items.length > 0) ? work.items : (work?.work_items || []);
    const calcResult = calculateWorkStats(reportItems, pazarMultiplier, mesaiMultiplier);
    const groups = calcResult.groups;
    const grandTotalPrice = calcResult.grandTotal;

    const effectiveScalePercent = fitMode === 'fit1Page' ? calculatedAutoFitScale : (fitMode === 'custom' ? customScale : 100);
    const effectiveScaleNum = effectiveScalePercent / 100;

    const handleSavePdf = async () => {
        if (!window.electronAPI?.saveAsPdf) {
            alert('PDF Kaydetme özelliği sadece masaüstü uygulamasında geçerlidir.');
            return;
        }

        setSavingPdf(true);
        setTimeout(async () => {
            const res = await window.electronAPI.saveAsPdf({
                landscape: orientation === 'landscape',
                scale: effectiveScaleNum
            });
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

    return (
        <div className={`pdf-viewer-layout ${savingPdf ? 'is-generating-pdf' : ''}`}>
            {/* Viewer Action Bar */}
            {!noHeader && (
                <div className={`pdf-actions-bar ${orientation === 'landscape' ? 'is-landscape' : ''}`}>
                    <button className="pdf-btn close" onClick={() => window.close()} disabled={savingPdf}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        Pencereyi Kapat
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
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

            {/* Excel Page Setup & Fitting Toolbar */}
            {!savingPdf && (
                <div className={`pdf-page-setup-toolbar ${orientation === 'landscape' ? 'is-landscape' : ''}`}>
                    {/* Görünüm Modu */}
                    <div className="pdf-toolbar-group">
                        <span className="pdf-toolbar-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                            Görünüm:
                        </span>
                        <button 
                            className={`pdf-toolbar-btn ${previewMode === 'normal' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('normal')}
                        >
                            Normal
                        </button>
                        <button 
                            className={`pdf-toolbar-btn ${previewMode === 'pageBreak' ? 'active' : ''}`}
                            onClick={() => setPreviewMode('pageBreak')}
                            title="Excel Sayfa Sonu Önizleme Çizgilerini Göster"
                        >
                            Sayfa Sonu Önizleme
                        </button>
                    </div>

                    {/* Yönlendirme */}
                    <div className="pdf-toolbar-group">
                        <span className="pdf-toolbar-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="16" height="20" x="4" y="2" rx="2"/></svg>
                            Yön:
                        </span>
                        <button 
                            className={`pdf-toolbar-btn ${orientation === 'portrait' ? 'active' : ''}`}
                            onClick={() => setOrientation('portrait')}
                        >
                            Dikey (A4)
                        </button>
                        <button 
                            className={`pdf-toolbar-btn ${orientation === 'landscape' ? 'active' : ''}`}
                            onClick={() => setOrientation('landscape')}
                        >
                            Yatay (A4)
                        </button>
                    </div>

                    {/* Sığdırma & Ölçekleme */}
                    <div className="pdf-toolbar-group">
                        <span className="pdf-toolbar-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                            Sayfa Sığdırma:
                        </span>
                        <select 
                            className="pdf-toolbar-select"
                            value={fitMode}
                            onChange={(e) => setFitMode(e.target.value)}
                        >
                            <option value="auto">Otomatik (%100)</option>
                            <option value="fit1Page">Tek Sayfaya Sığdır (%{calculatedAutoFitScale})</option>
                            <option value="custom">Özel Ölçek (Slider)</option>
                        </select>

                        {fitMode === 'custom' && (
                            <div className="pdf-toolbar-slider-wrapper">
                                <input 
                                    type="range" 
                                    min="50" 
                                    max="150" 
                                    step="5"
                                    value={customScale}
                                    onChange={(e) => setCustomScale(Number(e.target.value))}
                                    className="pdf-toolbar-slider"
                                />
                                <span className="pdf-toolbar-badge">%{customScale}</span>
                            </div>
                        )}
                    </div>

                    {/* Kenar Boşluğu */}
                    <div className="pdf-toolbar-group">
                        <span className="pdf-toolbar-label">Kenar:</span>
                        <select 
                            className="pdf-toolbar-select"
                            value={marginSize}
                            onChange={(e) => setMarginSize(e.target.value)}
                        >
                            <option value="narrow">Dar (8mm)</option>
                            <option value="normal">Normal (15mm)</option>
                            <option value="wide">Geniş (22mm)</option>
                        </select>
                    </div>
                </div>
            )}

            <div 
                ref={containerRef}
                className={`pdf-report-container ${isPreview ? 'is-preview' : ''} ${showKdvProp ? 'with-kdv' : ''} ${orientation === 'landscape' ? 'is-landscape' : ''} margin-${marginSize} ${previewMode === 'pageBreak' ? 'is-page-break-preview' : ''}`}
                style={{
                    transform: effectiveScalePercent !== 100 ? `scale(${effectiveScaleNum})` : 'none',
                    transformOrigin: 'top center'
                }}
            >
                {/* Excel Page Break Overlay Lines & Watermarks */}
                {previewMode === 'pageBreak' && (
                    <>
                        <div className="pdf-page-watermark" style={{ top: '250px' }}>
                            SAYFA 1
                        </div>
                        {pageBreaks.map((b, bIdx) => (
                            <React.Fragment key={bIdx}>
                                <div 
                                    className="pdf-page-break-line" 
                                    style={{ top: `${b.topPx}px` }}
                                    data-page={`SAYFA ${b.pageNum} SONU`}
                                />
                                <div className="pdf-page-watermark" style={{ top: `${b.topPx + 250}px` }}>
                                    SAYFA {b.pageNum + 1}
                                </div>
                            </React.Fragment>
                        ))}
                    </>
                )}
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
                                        const itemRate = item.unitPriceVal || Number(item.unit_price) || 0;

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
                                                            ? formatCurrency((itemRate > 10000 && item.isAylik ? itemRate / 26 : itemRate) * pazarMultiplier)
                                                            : (itemRate > 0 ? formatCurrency(itemRate) : '')
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
