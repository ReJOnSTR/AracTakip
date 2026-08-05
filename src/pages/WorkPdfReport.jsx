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
    showKdvProp = false, 
    kdvRateProp = 20, 
    pazarMultiplierProp = null, 
    mesaiMultiplierProp = null,
    pageBreakModeProp = null,
    rowsPerPageProp = null,
    manualBreakIdsProp = null,
    onToggleManualBreakProp = null,
    showBreakToolsProp = false,
    customScaleProp = null
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
            const el = contentRef.current;
            const prevTransform = el.style.transform;
            const prevWidth = el.style.width;

            el.style.transform = 'none';
            el.style.width = '100%';

            const naturalH = el.offsetHeight || el.scrollHeight;

            el.style.transform = prevTransform;
            el.style.width = prevWidth;

            const targetH = 970; // Printable inner content height limit inside A4 page in px
            if (naturalH > targetH) {
                const computed = targetH / naturalH;
                setAutoScale(parseFloat(Math.max(0.40, Math.min(0.98, computed)).toFixed(3)));
            } else {
                setAutoScale(1.0);
            }
        } else {
            setAutoScale(1.0);
        }
    }, [pageBreakMode, work, showPricesProp, showKdvProp, kdvRateProp, pazarMultiplierProp, mesaiMultiplierProp, customScaleProp]);

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

    // Advanced Dynamic A4 Page Splitting Engine
    const pages = (() => {
        if (!groups || groups.length === 0) return [];

        const totalItems = groups.reduce((acc, g) => acc + (g.items ? g.items.length : 0), 0);

        // Explicit Fit-to-Page Mode
        if (pageBreakMode === 'fit_page') {
            return [{ groups: groups, isFirst: true, isLast: true, pageIndex: 0 }];
        }

        const MAX_P1 = 22;     // Page 1 holds up to 22 items with report header
        const MAX_OTHER = 30;  // Continuation pages hold up to 30 items

        // If total items fits on 1 page naturally, keep everything on Page 1!
        if (totalItems <= MAX_P1 && pageBreakMode !== 'per_vehicle') {
            return [{ groups: groups, isFirst: true, isLast: true, pageIndex: 0 }];
        }

        // Dedicated Vehicle Page Mode
        if (pageBreakMode === 'per_vehicle') {
            const pageList = [];
            groups.forEach((g) => {
                const items = g.items || [];
                for (let i = 0; i < items.length; i += MAX_OTHER) {
                    const chunk = items.slice(i, i + MAX_OTHER);
                    pageList.push({
                        groups: [{ ...g, items: chunk, isContinuation: i > 0, isLastChunk: (i + MAX_OTHER >= items.length) }],
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                }
            });
            if (pageList.length > 0) pageList[pageList.length - 1].isLast = true;
            return pageList.length > 0 ? pageList : [{ groups: groups, isFirst: true, isLast: true, pageIndex: 0 }];
        }

        // Max Rows Page Mode
        if (pageBreakMode === 'max_rows') {
            const pageList = [];
            const limit = Number(rowsPerPage) || 20;
            groups.forEach((g) => {
                const items = g.items || [];
                for (let i = 0; i < items.length; i += limit) {
                    const chunk = items.slice(i, i + limit);
                    pageList.push({
                        groups: [{ ...g, items: chunk, isContinuation: i > 0, isLastChunk: (i + limit >= items.length) }],
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                }
            });
            if (pageList.length > 0) pageList[pageList.length - 1].isLast = true;
            return pageList.length > 0 ? pageList : [{ groups: groups, isFirst: true, isLast: true, pageIndex: 0 }];
        }

        // Auto Multi-page Flow (Chunking rows across discrete A4 page cards)
        const pageList = [];
        let currentGroups = [];
        let currentItemsOnPage = 0;

        groups.forEach((g) => {
            const items = g.items || [];
            let itemIdx = 0;

            while (itemIdx < items.length) {
                const isP1 = pageList.length === 0 && currentGroups.length === 0;
                const maxCap = isP1 ? MAX_P1 : MAX_OTHER;
                const space = maxCap - currentItemsOnPage;

                if (space <= 1 && currentItemsOnPage > 0) {
                    pageList.push({
                        groups: currentGroups,
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                    currentGroups = [];
                    currentItemsOnPage = 0;
                    continue;
                }

                const chunkEnd = Math.min(items.length, itemIdx + space);
                const chunk = items.slice(itemIdx, chunkEnd);
                const isLastChunk = chunkEnd >= items.length;

                currentGroups.push({
                    ...g,
                    items: chunk,
                    isContinuation: itemIdx > 0,
                    isLastChunk: isLastChunk
                });

                currentItemsOnPage += chunk.length;
                itemIdx = chunkEnd;

                if (currentItemsOnPage >= maxCap) {
                    pageList.push({
                        groups: currentGroups,
                        isFirst: pageList.length === 0,
                        isLast: false,
                        pageIndex: pageList.length
                    });
                    currentGroups = [];
                    currentItemsOnPage = 0;
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
                        className={`pdf-report-container ${isPreview ? 'is-preview' : ''} ${showKdvProp ? 'with-kdv' : ''} ${pageBreakMode === 'fit_page' ? 'pdf-fit-page' : ''}`}
                    >
                        {isPreview && (
                            <div className="pdf-page-header-badge">
                                <span>📄 Dikey A4 (210mm × 297mm)</span>
                                <span>Sayfa {pIdx + 1} / {pages.length}</span>
                            </div>
                        )}

                        <div 
                            ref={pIdx === 0 ? contentRef : null}
                            className="pdf-content-wrapper"
                            style={effectiveScale < 1 ? {
                                transform: `scale(${effectiveScale})`,
                                transformOrigin: 'top left',
                                width: `${(100 / effectiveScale).toFixed(2)}%`
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
                                                                    {showPrices ? (
                                                                        item.isPazar && !(desc.includes('[KATSAYI:'))
                                                                            ? (() => {
                                                                                const baseP = item.unit_price || item.unitPriceVal || 0;
                                                                                const dailyP = (baseP > 10000 && item.isAylik) ? baseP / 26 : baseP;
                                                                                return dailyP > 0 ? formatCurrency(dailyP * pazarMultiplier) : '';
                                                                            })()
                                                                            : (item.unit_price || item.unitPriceVal ? formatCurrency(item.unit_price || item.unitPriceVal) : '')
                                                                    ) : ''}
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
                            {page.isLast && showPrices && (
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

                            {/* Page Footer */}
                            <div className="pdf-footer-standard" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                                <span>Puantaj Raporları</span>
                                <span style={{ fontWeight: 600 }}>Sayfa {pIdx + 1} / {pages.length}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
