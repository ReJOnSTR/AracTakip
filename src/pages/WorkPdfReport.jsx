import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import './WorkPdfReport.css'; // Özel CSS eklenecek

export default function WorkPdfReport({ propId, propWork, noHeader = false, isPreview = false, showPricesProp = true, showKdvProp = false, kdvRateProp = 20, pazarMultiplierProp = null, mesaiMultiplierProp = null }) {
    const params = useParams();
    const id = propId || params.id;
    const [work, setWork] = useState(propWork || null);
    const [loading, setLoading] = useState(!propWork);
    const [error, setError] = useState(null);
    const [savingPdf, setSavingPdf] = useState(false);
    const showPrices = showPricesProp;

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
                // Also verify it matches the ID just in case
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

    if (loading) return <div className="print-loading">Veriler yükleniyor...</div>;
    if (error) return <div className="print-error">Hata: {error}</div>;
    if (!work) return null;

    // Araç ve Tarife bazında kalıtım (Fiyatsız devam/mesai satırlarının kendi fiyat grubuna bağlanması)
    const vehicleRateInfo = {};
    work.items.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger');
        const unitPriceVal = Number(item.unit_price) || 0;
        const cleanDesc = (item.description || '').replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/gi, '').replace(/\[EK:[^:]+:[^\]]+\]\s*/gi, '').trim();

        if (!vehicleRateInfo[vehicleBaseKey]) {
            vehicleRateInfo[vehicleBaseKey] = {
                firstPositivePrice: 0,
                descByPrice: {}
            };
        }

        if (unitPriceVal > 0) {
            if (!vehicleRateInfo[vehicleBaseKey].firstPositivePrice) {
                vehicleRateInfo[vehicleBaseKey].firstPositivePrice = unitPriceVal;
            }
            if (cleanDesc && !vehicleRateInfo[vehicleBaseKey].descByPrice[unitPriceVal]) {
                vehicleRateInfo[vehicleBaseKey].descByPrice[unitPriceVal] = cleanDesc;
            }
        }
    });

    const resolveItemEffectiveInfo = (item) => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger');
        let unitPriceVal = Number(item.unit_price) || 0;
        let cleanDesc = (item.description || '').replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/gi, '').replace(/\[EK:[^:]+:[^\]]+\]\s*/gi, '').trim();

        const info = vehicleRateInfo[vehicleBaseKey];
        if (info) {
            if (unitPriceVal === 0 && info.firstPositivePrice > 0) {
                unitPriceVal = info.firstPositivePrice;
            }
            if (!cleanDesc && unitPriceVal > 0 && info.descByPrice[unitPriceVal]) {
                cleanDesc = info.descByPrice[unitPriceVal];
            }
        }
        return { unitPriceVal, cleanDesc };
    };

    const vehicleSubGroupKeys = {};
    work.items.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger');
        const { unitPriceVal, cleanDesc } = resolveItemEffectiveInfo(item);
        const descUpper = (item.description || '').toUpperCase();
        const isSaatlik = descUpper.includes('[SAATLİK]');
        const isAylik = descUpper.includes('[AYLIK]');
        const rateTypeKey = isAylik ? 'aylik' : (isSaatlik ? 'saatlik' : 'gun');
        
        const subKey = `${rateTypeKey}_price_${unitPriceVal}_desc_${cleanDesc.toLowerCase()}`;
        if (!vehicleSubGroupKeys[vehicleBaseKey]) vehicleSubGroupKeys[vehicleBaseKey] = new Set();
        vehicleSubGroupKeys[vehicleBaseKey].add(subKey);
    });

    const groupedItems = {};
    work.items.forEach(item => {
        const vehicleBaseKey = item.vehicle_id ? String(item.vehicle_id) : (item.custom_vehicle ? `custom_${item.custom_vehicle}` : 'diger');
        const { unitPriceVal, cleanDesc } = resolveItemEffectiveInfo(item);
        const descUpper = (item.description || '').toUpperCase();
        const isSaatlik = descUpper.includes('[SAATLİK]');
        const isAylik = descUpper.includes('[AYLIK]');

        const key = vehicleBaseKey;

        if (!groupedItems[key]) {
            const rawMachineName = item.plate ? `${item.plate}${item.model ? ` - ${item.model}` : ''}`.trim() : 'Belirtilmemiş';
            let displayTitle = rawMachineName;

            groupedItems[key] = {
                machineName: displayTitle,
                rawMachineName: rawMachineName,
                items: []
            };
        }

        const dateObj = new Date(item.date);
        const isSunday = dateObj.getDay() === 0;
        const isPazar = isSunday || descUpper.includes('PAZAR');

        item.isPazar = isPazar;
        if (isSunday && !descUpper.includes('PAZAR')) {
            item.description = item.description ? `[PAZAR] ${item.description}` : '[PAZAR]';
        }

        groupedItems[key].items.push({
            ...item,
            unitPriceVal,
            cleanDesc,
            isSaatlik,
            isAylik,
            isPazar
        });
    });

    let grandTotalPrice = 0;

    const parsedPazarProp = pazarMultiplierProp !== null && pazarMultiplierProp !== undefined && pazarMultiplierProp !== "" ? parseFloat(pazarMultiplierProp) : NaN;
    const pazarMultiplier = !isNaN(parsedPazarProp)
        ? parsedPazarProp 
        : (work?.pazar_multiplier !== undefined && work?.pazar_multiplier !== null ? work.pazar_multiplier : 1.5);

    const parsedMesaiProp = mesaiMultiplierProp !== null && mesaiMultiplierProp !== undefined && mesaiMultiplierProp !== "" ? parseFloat(mesaiMultiplierProp) : NaN;
    const mesaiMultiplier = !isNaN(parsedMesaiProp)
        ? parsedMesaiProp 
        : (work?.mesai_multiplier !== undefined && work?.mesai_multiplier !== null ? work.mesai_multiplier : 1.5);

    const getBaseMonthlyWorkingDays = (dateInput) => {
        if (!dateInput) return 26;
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return 26;
        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        if (daysInMonth === 31) return 27;
        if (daysInMonth === 28) return 24;
        if (daysInMonth === 29) return 25;
        return 26;
    };

    const groups = Object.values(groupedItems).map(group => {
        // Sort items by date ASC
        group.items.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Check if any item in group is Aylik
        const isAylikGroup = group.items.some(i => i.isAylik);
        const firstItemDate = group.items.find(i => i.date)?.date || work?.start_date;
        const baseMonthlyWorkDays = getBaseMonthlyWorkingDays(firstItemDate);

        // Find primary positive price
        const positivePriceItem = group.items.find(i => i.unitPriceVal > 0);
        const rawPrimaryPrice = positivePriceItem ? positivePriceItem.unitPriceVal : 0;

        let dailyRate = rawPrimaryPrice;
        let monthlyAmount = rawPrimaryPrice;

        if (isAylikGroup && rawPrimaryPrice > 0) {
            if (rawPrimaryPrice > 10000) {
                dailyRate = rawPrimaryPrice / baseMonthlyWorkDays;
                monthlyAmount = rawPrimaryPrice;
            } else {
                dailyRate = rawPrimaryPrice;
                monthlyAmount = rawPrimaryPrice * baseMonthlyWorkDays;
            }
        }

        // Calculate counts
        let totalPazarCount = 0;
        let totalSaatlikCount = 0;
        let totalGunCount = 0;
        let totalMesaiCount = 0;
        const additionsMap = {};

        group.items.forEach(item => {
            const hrs = Number(item.hours) || 0;
            const mesaiHrs = Number(item.overtime_hours) || 0;
            const travelPrice = Number(item.travel_price) || 0;

            if (item.isPazar) {
                totalPazarCount += hrs;
            } else if (item.isSaatlik) {
                totalSaatlikCount += hrs;
            } else if (!isAylikGroup) {
                totalGunCount += hrs;
            }

            if (mesaiHrs > 0) {
                totalMesaiCount += mesaiHrs;
            }

            // Custom additions
            const additionMatches = (item.description || '').matchAll(/\[EK:([^:]+):([^\]]+)\]/g);
            let hasAddition = false;
            for (const match of additionMatches) {
                hasAddition = true;
                const type = match[1];
                const price = parseFloat(match[2]) || 0;
                if (!additionsMap[type]) additionsMap[type] = { count: 0, price };
                additionsMap[type].count += 1;
            }
            if (!hasAddition && travelPrice > 0) {
                if (!additionsMap['Yol']) additionsMap['Yol'] = { count: 0, price: travelPrice };
                additionsMap['Yol'].count += 1;
            }
        });

        // Construct Summary Lines Array for PDF Table
        const summaryLines = [];

        // Identify custom rate non-pazar daily items
        const customRateItems = group.items.filter(i => 
            !i.isPazar && 
            !i.isSaatlik && 
            ((i.description || '').includes('[KATSAYI:') || (i.unitPriceVal > 0 && Math.abs(i.unitPriceVal - rawPrimaryPrice) > 1 && Math.abs(i.unitPriceVal - dailyRate) > 1))
        );
        const customRateDaysCount = customRateItems.reduce((s, i) => s + (Number(i.hours) || 0), 0);

        if (isAylikGroup) {
            const baseMonthlyDays = Math.max(0, baseMonthlyWorkDays - customRateDaysCount);
            const baseMonthlyTotal = baseMonthlyDays * dailyRate;

            summaryLines.push({
                typeLabel: 'AYLIK',
                countText: customRateDaysCount > 0 ? `1 AY (${baseMonthlyDays} Gün)` : `1 AY (${baseMonthlyWorkDays} Gün)`,
                unitPrice: dailyRate,
                totalPrice: baseMonthlyTotal
            });

            if (customRateDaysCount > 0) {
                const customPricesMap = {};
                customRateItems.forEach(i => {
                    const price = i.unitPriceVal;
                    const hrs = Number(i.hours) || 0;
                    if (!customPricesMap[price]) customPricesMap[price] = 0;
                    customPricesMap[price] += hrs;
                });

                Object.entries(customPricesMap).forEach(([priceStr, cnt]) => {
                    const price = parseFloat(priceStr);
                    summaryLines.push({
                        typeLabel: `GÜN (${formatCurrency(price)})`,
                        countText: `${cnt} GÜN`,
                        unitPrice: price,
                        totalPrice: cnt * price
                    });
                });
            }
        } else {
            // Regular Daily Job
            const allDailyItems = group.items.filter(i => !i.isPazar && !i.isSaatlik);
            if (allDailyItems.length > 0) {
                const pricesMap = {};
                allDailyItems.forEach(i => {
                    const price = i.unitPriceVal > 0 ? i.unitPriceVal : dailyRate;
                    const hrs = Number(i.hours) || 0;
                    if (!pricesMap[price]) pricesMap[price] = 0;
                    pricesMap[price] += hrs;
                });

                const priceEntries = Object.entries(pricesMap);
                const hasMultiplePrices = priceEntries.length > 1;

                priceEntries.forEach(([priceStr, cnt]) => {
                    const price = parseFloat(priceStr);
                    summaryLines.push({
                        typeLabel: (hasMultiplePrices && Math.abs(price - dailyRate) > 1) ? `GÜN (${formatCurrency(price)})` : 'GÜN',
                        countText: `${cnt} GÜN`,
                        unitPrice: price,
                        totalPrice: cnt * price
                    });
                });
            }
        }

        // 2. PAZAR Line
        if (totalPazarCount > 0) {
            const pazarPrice = dailyRate > 0 ? dailyRate * pazarMultiplier : 0;
            summaryLines.push({
                typeLabel: 'PAZAR',
                countText: `${totalPazarCount} GÜN`,
                unitPrice: pazarPrice,
                totalPrice: totalPazarCount * pazarPrice
            });
        }

        // 3. SAAT Line
        if (totalSaatlikCount > 0) {
            const saatlikPrice = group.items.find(i => i.isSaatlik && i.unitPriceVal > 0)?.unitPriceVal || 0;
            summaryLines.push({
                typeLabel: 'SAAT',
                countText: `${totalSaatlikCount} SAAT`,
                unitPrice: saatlikPrice,
                totalPrice: totalSaatlikCount * saatlikPrice
            });
        }

        // 4. MESAİ Line
        if (totalMesaiCount > 0) {
            const hourlyRate = dailyRate > 0 ? dailyRate / 9 : 0;
            const mesaiPrice = parseFloat((hourlyRate * mesaiMultiplier).toFixed(2));
            summaryLines.push({
                typeLabel: 'MESAİ',
                countText: `${totalMesaiCount} SAAT`,
                unitPrice: mesaiPrice,
                totalPrice: totalMesaiCount * mesaiPrice
            });
        }

        // 5. EK ÖDEMELER Lines
        Object.entries(additionsMap).forEach(([type, data]) => {
            summaryLines.push({
                typeLabel: type.toUpperCase(),
                countText: `${data.count} ADET`,
                unitPrice: data.price,
                totalPrice: data.count * data.price
            });
        });

        const groupGrandTotal = summaryLines.reduce((sum, l) => sum + (l.totalPrice || 0), 0);
        grandTotalPrice += groupGrandTotal;

        return {
            ...group,
            summaryLines,
            calculatedGrandTotal: groupGrandTotal
        };
    });

    const handleSavePdf = async () => {
        if (!window.electronAPI?.saveAsPdf) {
            alert('PDF Kaydetme özelliği sadece masaüstü uygulamasında geçerlidir.');
            return;
        }

        setSavingPdf(true);
        // Wait for state to apply hide-for-pdf classes
        setTimeout(async () => {
            const res = await window.electronAPI.saveAsPdf();
            setSavingPdf(false);
            if (res && res.success) {
                // We can add a notification here or let OS handle it
            } else if (res && !res.canceled) {
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

            <div className={`pdf-report-container ${isPreview ? 'is-preview' : ''} ${showKdvProp ? 'with-kdv' : ''}`}>
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

                                        const cleanDesc = desc
                                            .replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/gi, '')
                                            .replace(/\[EK:[^:]+:[^\]]+\]\s*/gi, '')
                                            .replace(/\[KATSAYI:[^\]]+\]\s*/gi, '')
                                            .replace(/\[RENK:[^\]]+\]\s*/gi, '')
                                            .trim();

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
                                                            ? formatCurrency(((item.unit_price || primaryGunPrice) > 10000 && item.isAylik ? (item.unit_price || primaryGunPrice) / 26 : (item.unit_price || primaryGunPrice)) * pazarMultiplier)
                                                            : (item.unit_price ? formatCurrency(item.unit_price) : '')
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
                                                <td className="right">{showPrices && line.unitPrice ? formatCurrency(line.unitPrice) : '-'}</td>
                                                <td className="right bold total-text">{showPrices ? formatCurrency(line.totalPrice) : ''}</td>
                                            </tr>
                                        ))}
                                        <tr style={{ borderTop: '1px solid #ddd' }}>
                                            <td colSpan="3" className="bold right" style={{ padding: '6px 12px', fontSize: '9.5px', backgroundColor: '#f9f9f9', color: '#333' }}>TOPLAM</td>
                                            <td className="right bold total-text" style={{ padding: '6px 12px', fontSize: '10.5px', backgroundColor: '#f1f5f9', color: '#000' }}>{showPrices ? formatCurrency(group.calculatedGrandTotal) : ''}</td>
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
