import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import { calculateWorkStats } from '../utils/workCalculations';
import './WorkPdfReport.css';

export default function WorkPdfReport({ 
    propId, 
    propWork, 
    noHeader = false, 
    isPreview = false, 
    showPricesProp = true, 
    showGrandTotalProp = true,
    showKdvProp = false, 
    kdvRateProp = 20, 
    pazarMultiplierProp = null, 
    mesaiMultiplierProp = null,
    pageBreakModeProp = null,
    rowsPerPageProp = null,
    manualBreakIdsProp = null,
    onToggleManualBreakProp = null,
    showBreakToolsProp = false,
    customScaleProp = null,
    orientationProp = 'portrait'
}) {
    const params = useParams();
    const id = propId || params.id;
    const [work, setWork] = useState(propWork || null);
    const [loading, setLoading] = useState(!propWork);
    const [error, setError] = useState(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const showPrices = showPricesProp;
    const contentRef = useRef(null);

    // Load break settings from localStorage fallback
    const savedBreakSettings = (() => {
        try {
            const s = localStorage.getItem(`pdfPageBreakSettings_${id}`);
            return s ? JSON.parse(s) : {};
        } catch (e) {
            return {};
        }
    })();

    const pageBreakMode = pageBreakModeProp || savedBreakSettings.pageBreakMode || 'auto';
    const rowsPerPage = rowsPerPageProp || savedBreakSettings.rowsPerPage || 20;
    const [manualBreakIds, setManualBreakIds] = useState(manualBreakIdsProp || savedBreakSettings.manualBreakIds || []);
    const [autoScale, setAutoScale] = useState(1);

    useLayoutEffect(() => {
        if (pageBreakMode === 'fit_page' && contentRef.current) {
            const wrapper = contentRef.current;

            // Measure the exact unscaled bottom position of the last element (immune to CSS scale transforms)
            const grandTotalEl = wrapper.querySelector('.pdf-grand-total');
            const summaryEls = wrapper.querySelectorAll('.pdf-summary-block');
            const lastSummaryEl = summaryEls.length > 0 ? summaryEls[summaryEls.length - 1] : null;
            const tableEls = wrapper.querySelectorAll('.pdf-table');
            const lastTableEl = tableEls.length > 0 ? tableEls[tableEls.length - 1] : null;

            const targetChild = grandTotalEl || lastSummaryEl || lastTableEl || wrapper.lastElementChild;

            if (targetChild) {
                // offsetTop + offsetHeight gives exact unscaled layout position
                const naturalPx = targetChild.offsetTop + targetChild.offsetHeight;

                const isLandscapeMode = orientationProp === 'landscape';
                const targetH = isLandscapeMode ? 530 : 830; // Printable inner height limit right above pinned footer in px

                if (naturalPx > targetH) {
                    const exactScaleNeeded = targetH / naturalPx;
                    // Apply exact scale so last element aligns safely above page bottom line
                    setAutoScale(parseFloat(Math.max(0.70, Math.min(0.99, exactScaleNeeded)).toFixed(2)));
                } else {
                    setAutoScale(1.0);
                }
            } else {
                setAutoScale(1.0);
            }
        } else {
            setAutoScale(1.0);
        }
    }, [pageBreakMode, work, showPricesProp, showKdvProp, kdvRateProp, pazarMultiplierProp, mesaiMultiplierProp, customScaleProp, orientationProp]);

    const effectiveScale = customScaleProp ? Number(customScaleProp) : (pageBreakMode === 'fit_page' ? autoScale : 1.0);

    useEffect(() => {
        if (manualBreakIdsProp) {
            setManualBreakIds(manualBreakIdsProp);
        }
    }, [manualBreakIdsProp]);

    const handleToggleBreak = (itemId) => {
        let next;
        if (manualBreakIds.includes(itemId)) {
            next = manualBreakIds.filter(i => i !== itemId);
        } else {
            next = [...manualBreakIds, itemId];
        }
        setManualBreakIds(next);
        if (onToggleManualBreakProp) {
            onToggleManualBreakProp(itemId);
        }
        try {
            const cur = savedBreakSettings;
            localStorage.setItem(`pdfPageBreakSettings_${id}`, JSON.stringify({ ...cur, manualBreakIds: next }));
        } catch (e) {}
    };

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
                setWork(parsed);
                setLoading(false);
                return;
            } catch (e) {
                console.error("PDF data parse error", e);
            }
        }

        if (id) {
            setLoading(true);
            window.electronAPI.getWorkDetails(id)
                .then(res => {
                    if (res && res.success) {
                        setWork(res.data);
                    } else {
                        setError('İş detayı yüklenemedi');
                    }
                })
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [id, propWork]);

    if (loading) return <div className="pdf-loading">Rapor yükleniyor...</div>;
    if (error) return <div className="pdf-error">{error}</div>;
    if (!work) return <div className="pdf-error">İş bulunamadı</div>;

    const pazarMultiplier = pazarMultiplierProp ? parseFloat(pazarMultiplierProp) : (work.pazar_multiplier || 1.5);
    const mesaiMultiplier = mesaiMultiplierProp ? parseFloat(mesaiMultiplierProp) : (work.mesai_multiplier || 1.5);

    const calcResult = calculateWorkStats(work.items || [], pazarMultiplier, mesaiMultiplier);
    const groups = calcResult.groups || [];
    const grandTotalPrice = calcResult.grandTotal || 0;

    // Exact Physical Pixel Height A4 Page Splitting Engine
    const pages = (() => {
        if (!groups || groups.length === 0) return [];

        const scaleVal = effectiveScale > 0 ? effectiveScale : 1.0;
        const isLandscapeMode = orientationProp === 'landscape';
        const BASE_TARGET_H = isLandscapeMode ? 530 : 830;
        const TARGET_A4_HEIGHT = Math.floor(BASE_TARGET_H / scaleVal); // Printable height limit inside A4 page in px

        // Exact physical heights of components:
        const HEADER_H = 100;
        const FOOTER_H = 30;
        const GRAND_TOTAL_H = showGrandTotalProp ? (showKdvProp ? 120 : 70) : 0;
        const DESC_H = (work?.description && work.description.trim() !== '') ? 40 : 0;
        const ROW_H = 27.0; // Safe physical rendered height of each table row with margins and scaling clearance
        const SUMMARY_H = 90; // Rendered height of Machine Summary Table

        // Split rows and blocks across pages based on exact height capacity:
        const pageList = [];
        let currentGroups = [];
        let currentHeight = 0;

        groups.forEach((g, gIdx) => {
            const items = g.items || [];
            let itemIdx = 0;
            let needSummary = true;
            const isLastGroup = gIdx === groups.length - 1;

            while (itemIdx < items.length || needSummary) {
                const isP1 = pageList.length === 0 && currentGroups.length === 0;
                const maxPageH = TARGET_A4_HEIGHT;
                
                let baseOverhead = FOOTER_H;
                if (isP1) baseOverhead += HEADER_H;

                const currentUsedH = (currentHeight === 0 ? baseOverhead : currentHeight);
                const availableH = maxPageH - currentUsedH;
                const vehicleHeaderOverhead = (itemIdx === 0 ? 30 + 25 : 25);
                const rowH = ROW_H;

                // Orphan Row Guard: when starting a new vehicle table, require room for at least 3 rows (3 * rowH)
                const minRowsRequired = itemIdx === 0 ? 3 : 1;
                let spaceForRows = availableH - vehicleHeaderOverhead;
                if (spaceForRows < (minRowsRequired * rowH) && currentGroups.length > 0) {
                    pageList.push({
                        groups: currentGroups,
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                    currentGroups = [];
                    currentHeight = 0;
                    continue;
                }

                // Greedily take every single row that can physically fit
                const maxRowsCanFit = Math.max(0, Math.floor(Math.max(0, spaceForRows) / rowH));

                if (maxRowsCanFit === 0 && currentGroups.length > 0) {
                    pageList.push({
                        groups: currentGroups,
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                    currentGroups = [];
                    currentHeight = 0;
                    continue;
                }

                const countToTake = Math.max(1, maxRowsCanFit);
                const chunkEnd = Math.min(items.length, itemIdx + countToTake);
                const chunk = items.slice(itemIdx, chunkEnd);
                const isLastChunk = chunkEnd >= items.length;

                // Check if summary table AND Grand Total Box fit in remaining space after rows without cutoff
                const remainingSpaceAfterChunk = spaceForRows - (chunk.length * rowH);
                const requiredEndSpace = SUMMARY_H + (isLastChunk && isLastGroup && showGrandTotalProp ? GRAND_TOTAL_H : 0);
                const summaryFitsOnThisPage = isLastChunk && needSummary && (remainingSpaceAfterChunk >= requiredEndSpace);

                if (chunk.length > 0 || summaryFitsOnThisPage) {
                    currentGroups.push({
                        ...g,
                        items: chunk,
                        isContinuation: itemIdx > 0 || (chunk.length === 0),
                        isLastChunk: summaryFitsOnThisPage
                    });

                    if (summaryFitsOnThisPage) {
                        needSummary = false;
                    }

                    const chunkH = (chunk.length > 0 ? vehicleHeaderOverhead : 0) + (chunk.length * rowH) + (summaryFitsOnThisPage ? SUMMARY_H : 0);
                    currentHeight = currentUsedH + chunkH;
                }

                itemIdx = chunkEnd;

                if (itemIdx >= items.length && !needSummary) {
                    break;
                }

                // If current page is full or summary table overflows to next page, flush current page
                if (currentHeight >= maxPageH - 20 || !summaryFitsOnThisPage) {
                    pageList.push({
                        groups: currentGroups,
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                    currentGroups = [];
                    currentHeight = 0;
                }
            }
        });

        if (currentGroups.length > 0) {
            pageList.push({
                groups: currentGroups,
                isFirst: pageList.length === 0,
                isLast: false,
                pageIndex: pageList.length
            });
        }

        if (pageList.length > 0) {
            pageList[pageList.length - 1].isLast = true;
        }

        return pageList.length > 0 ? pageList : [{ groups: groups, isFirst: true, isLast: true, pageIndex: 0 }];
    })();

    const handleSavePdf = () => {
        if (savingPdf) return;
        setSavingPdf(true);

        const companyStr = work.company_name || work.company?.name || work.customer_name || work.customer || '';
        const titleStr = work.title || work.work_no || 'Is_Raporu';
        const dateStr = formatDate(work.date);
        const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ_\-\s]/g, '').trim().replace(/\s+/g, '_');
        const defaultFileName = `Puantaj_${sanitize(companyStr)}_${sanitize(titleStr)}_${dateStr}.pdf`;

        setTimeout(async () => {
            const res = await window.electronAPI.saveReportPdf('/print', { defaultPath: defaultFileName });
            setSavingPdf(false);
            if (res && res.success) {
                // PDF successfully saved
            } else if (res && !res.canceled) {
                alert('PDF Kaydedilirken Hata: ' + res.error);
            }
        }, 100);
    };

    return (
        <div className={`pdf-viewer-layout ${savingPdf ? 'is-generating-pdf' : ''}`}>
            {/* Viewer Action Bar */}
            {!noHeader && (
                <div className="pdf-actions-bar">
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

            <div className="pdf-pages-container">
                {pages.map((page, pIdx) => (
                    <div 
                        key={pIdx} 
                        className={`pdf-report-container ${isPreview ? 'is-preview' : ''} ${showKdvProp ? 'with-kdv' : ''} ${pageBreakMode === 'fit_page' ? 'pdf-fit-page' : ''} ${orientationProp === 'landscape' ? 'is-landscape' : ''}`}
                    >
                        {isPreview && (
                            <div className="pdf-page-header-badge">
                                <span>{orientationProp === 'landscape' ? '🖥️ Yatay A4' : '📄 Dikey A4'} • Ölçek: %{Math.round(effectiveScale * 100)}</span>
                                <span>Sayfa {pIdx + 1} / {pages.length} {pages.length === 1 ? ' (Tam Sığıyor ✅)' : ` (${pages.length} Sayfaya Dağıldı 📄)`}</span>
                            </div>
                        )}

                        <div 
                            ref={pIdx === 0 ? contentRef : null}
                            className="pdf-content-wrapper"
                            style={effectiveScale < 1 ? {
                                transform: `scale(${effectiveScale})`,
                                transformOrigin: 'top center',
                                width: `${(100 / effectiveScale).toFixed(2)}%`,
                                marginLeft: `calc(-${((100 / effectiveScale) - 100) / 2}%)`
                            } : {}}
                        >
                            {/* Header on Page 1 */}
                            {page.isFirst && (
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
                            )}

                            {/* Vehicle Groups on Page */}
                            {page.groups.map((group, idx) => (
                                <div className="pdf-vehicle-group" key={idx}>
                                    <h3 
                                        style={{ 
                                            fontSize: '13px', 
                                            fontWeight: 'bold', 
                                            borderBottom: '1px solid #ccc', 
                                            paddingBottom: '5px', 
                                            marginBottom: '10px', 
                                            marginTop: '10px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '8px',
                                            pageBreakAfter: 'avoid',
                                            breakAfter: 'avoid'
                                        }}
                                    >
                                        <span>{(group.rawMachineName || group.machineName).toUpperCase()}{group.isContinuation ? ' (DEVAMI)' : ' DETAYLARI'}</span>
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
                                                {(group.items || []).map((item, itemIdx) => {
                                                    const desc = item.description || '';
                                                    let pdfRowClass = '';
                                                    if (desc.includes('[RENK:red]') || item.isPazar) pdfRowClass = 'pdf-row-red';
                                                    else if (desc.includes('[RENK:orange]')) pdfRowClass = 'pdf-row-orange';
                                                    else if (desc.includes('[RENK:blue]')) pdfRowClass = 'pdf-row-blue';
                                                    else if (desc.includes('[RENK:green]')) pdfRowClass = 'pdf-row-green';
                                                    else if (desc.includes('[RENK:purple]')) pdfRowClass = 'pdf-row-purple';

                                                    const cleanDesc = desc.replace(/\[[^\]]*\]\s*/g, '').trim();
                                                    const isManualBreak = manualBreakIds.includes(item.id);

                                                    return (
                                                        <React.Fragment key={item.id || itemIdx}>
                                                            {isManualBreak && (
                                                                <tr className="pdf-page-break-row">
                                                                    <td colSpan="9">
                                                                        ✂ SAYFA SONU (BU NOKTADAN BÖLÜNÜR)
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            <tr className={pdfRowClass}>
                                                                <td className="center">
                                                                    {(showBreakToolsProp || isPreview) && (
                                                                        <button
                                                                            type="button"
                                                                            className={`pdf-manual-break-btn ${isManualBreak ? 'active' : ''}`}
                                                                            title={isManualBreak ? 'Sayfa sonunu kaldır' : 'Buradan sonra yeni sayfaya geç'}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleToggleBreak(item.id);
                                                                            }}
                                                                        >
                                                                            ✂
                                                                        </button>
                                                                    )}
                                                                    {formatDate(item.date)}
                                                                </td>
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
                                                                    {showPrices ? (() => {
                                                                        const kMatch = (desc || '').match(/\[KATSAYI:([^\]]+)\]/);
                                                                        const baseP = item.unit_price || item.unitPriceVal || 0;
                                                                        const dailyP = (baseP > 10000 && item.isAylik) ? baseP / 26 : baseP;
                                                                        
                                                                        let finalPrice = dailyP;
                                                                        if (kMatch) {
                                                                            const multVal = parseFloat(kMatch[1]) || 1;
                                                                            finalPrice = dailyP * multVal;
                                                                        } else if (item.isPazar) {
                                                                            finalPrice = dailyP * pazarMultiplier;
                                                                        }

                                                                        return finalPrice > 0 ? formatCurrency(finalPrice) : '';
                                                                    })() : ''}
                                                                </td>
                                                            </tr>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </tbody>
                                        </table>

                                        {/* Vehicle Summary Block on Last Chunk of Group */}
                                        {(group.isLastChunk !== false) && (
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
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Grand Total on Last Page */}
                            {page.isLast && showGrandTotalProp && (
                                <div className="pdf-grand-total">
                                    <table className="pdf-summary-table" style={{ width: '350px', marginLeft: 'auto', marginTop: '15px' }}>
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
                            )}

                            {page.isLast && work?.description && work.description.trim() !== '' && (
                                <div className="pdf-footer-note" style={{ marginTop: '10px' }}>
                                    <span className="bold" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>NOT:</span>
                                    <div style={{ marginLeft: '10px', display: 'inline-block', whiteSpace: 'pre-wrap' }}>{work.description.trim()}</div>
                                </div>
                            )}

                        </div>

                        {/* Pinned Page Footer - OUTSIDE SCALED WRAPPER (ALWAYS UNTOUCHED AT ABSOLUTE BOTTOM) */}
                        <div className="pdf-footer-pinned">
                            <span>PUANTAJ RAPORLARI</span>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>SAYFA {pIdx + 1} / {pages.length}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
