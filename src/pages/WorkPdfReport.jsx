import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import './WorkPdfReport.css'; // Özel CSS eklenecek

export default function WorkPdfReport({ propId, propWork, noHeader = false, isPreview = false }) {
    const params = useParams();
    const id = propId || params.id;
    const [work, setWork] = useState(propWork || null);
    const [loading, setLoading] = useState(!propWork);
    const [error, setError] = useState(null);
    const [savingPdf, setSavingPdf] = useState(false);

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

    // Gruplama (Araçlara / Makinalara göre)
    const groupedItems = {};
    work.items.forEach(item => {
        const key = item.vehicle_id || 'diger';
        if (!groupedItems[key]) {
            groupedItems[key] = {
                machineName: item.plate ? `${item.plate}${item.model ? ` - ${item.model}` : ''}`.trim() : 'Belirtilmemiş',
                items: [],
                totalGun: 0,
                totalYol: 0,
                totalPazar: 0,
                totalMesai: 0,
                totalSaatlik: 0,
                totalPrice: 0
            };
        }

        groupedItems[key].items.push(item);

        // Fiyat ve Tür Hesaplamaları
        const gunSayisi = Number(item.hours) || 0;
        const mesaiSayisi = Number(item.overtime_hours) || 0;
        const travelPrice = Number(item.travel_price) || 0;
        const descUpper = (item.description || '').toUpperCase();

        const dateObj = new Date(item.date);
        const isSunday = dateObj.getDay() === 0;

        // Pazar kontrolü
        const isPazar = isSunday || descUpper.includes('PAZAR');

        // Enhance description for Sundays automatically
        item.isPazar = isPazar;
        if (isSunday && !descUpper.includes('PAZAR')) {
            item.description = item.description ? `[PAZAR] ${item.description}` : '[PAZAR]';
        }
        // Saatlik kontrolü
        const isSaatlik = descUpper.includes('[SAATLİK]');
        // Aylık kontrolü
        const isAylik = descUpper.includes('[AYLIK]');

        if (isAylik) {
            groupedItems[key].isAylik = true;
        }

        // Yol is now from travel_price field, accumulate travel count
        if (travelPrice > 0) {
            groupedItems[key].totalYol += 1;
        }

        if (isPazar) {
            groupedItems[key].totalPazar += gunSayisi;
        } else if (isSaatlik) {
            groupedItems[key].totalSaatlik += gunSayisi;
        } else {
            groupedItems[key].totalGun += gunSayisi;
        }

        groupedItems[key].totalMesai += mesaiSayisi;
        groupedItems[key].totalPrice += (item.total_price || 0);

        // Sort by date ASC
        groupedItems[key].items.sort((a, b) => new Date(a.date) - new Date(b.date));
    });

    let grandTotalPrice = 0;

    const groups = Object.values(groupedItems).map(group => {
        const sampleGunPrice = group.items.find(i => !(i.description || '').toUpperCase().includes('PAZAR') && !(i.description || '').toUpperCase().includes('[SAATLİK]') && (Number(i.hours) > 0))?.unit_price || 0;
        const sampleYolPrice = group.items.find(i => (Number(i.travel_price) || 0) > 0)?.travel_price || 0;
        const sampleSaatlikPrice = group.items.find(i => (i.description || '').toUpperCase().includes('[SAATLİK]'))?.unit_price || 0;

        // Pazar is 50% more than daily
        let samplePazarPrice = group.items.find(i => (i.description || '').toUpperCase().includes('PAZAR'))?.unit_price || 0;
        if (samplePazarPrice <= sampleGunPrice && sampleGunPrice > 0) {
            samplePazarPrice = sampleGunPrice * 1.5;
        }

        // Mesai is 50% more than hourly wage (hourly wage = daily / 8)
        let sampleMesaiPrice = group.items.find(i => i.overtime_hours > 0)?.unit_price || 0;
        if (sampleMesaiPrice <= sampleGunPrice && sampleGunPrice > 0) {
            sampleMesaiPrice = parseFloat(((sampleGunPrice / 8) * 1.5).toFixed(2));
        }

        let calculatedGun = 0;
        if (group.isAylik) {
            calculatedGun = 26 * sampleGunPrice;
        } else {
            calculatedGun = group.totalGun * sampleGunPrice;
        }

        const calculatedPazar = group.totalPazar * samplePazarPrice;
        // Yol total = sum of all travel_price values in the group
        const calculatedYol = group.items.reduce((sum, i) => sum + (Number(i.travel_price) || 0), 0);
        const calculatedSaatlik = group.totalSaatlik * sampleSaatlikPrice;
        const calculatedMesai = group.totalMesai * sampleMesaiPrice;

        const groupGrandTotal = calculatedGun + calculatedPazar + calculatedYol + calculatedSaatlik + calculatedMesai;
        group.calculatedGrandTotal = groupGrandTotal;
        grandTotalPrice += groupGrandTotal;

        return {
            ...group,
            sampleGunPrice,
            sampleYolPrice,
            sampleSaatlikPrice,
            samplePazarPrice,
            sampleMesaiPrice
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

            <div className={`pdf-report-container ${isPreview ? 'is-preview' : ''}`}>
                {/* Header */}
                <div className="pdf-header-standard">
                    <div>
                        <h1 className="pdf-title-standard">PUANTAJ CETVELİ</h1>
                        <div className="pdf-company-standard">{(work.customer_name || 'Müşteri Belirtilmemiş').toUpperCase()}</div>
                    </div>
                    <div className="pdf-date-standard">
                        <div className="pdf-date-label">Rapor Tarihi</div>
                        <div className="pdf-date-value">{new Date().toLocaleDateString('tr-TR')}</div>
                    </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                    {/* Header info removed as requested */}
                </div>

            {/* Tables grouped by vehicle */}
            {groups.map((group, idx) => {
                const { sampleGunPrice, samplePazarPrice, sampleYolPrice, sampleSaatlikPrice, sampleMesaiPrice } = group;

                return (
                    <div className="pdf-vehicle-group" key={idx}>
                        <table className="pdf-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2" style={{ width: '80px' }}>TARİH</th>
                                    <th rowSpan="2" style={{ width: '60px' }}>FİŞ NO</th>
                                    <th colSpan="2">Çalışma Süresi</th>
                                    <th rowSpan="2" style={{ width: '70px' }}>Süre/Adet</th>
                                    <th rowSpan="2" style={{ width: '80px' }}>Fazla Mesai</th>
                                    <th rowSpan="2" style={{ width: '150px' }}>MAKİNA</th>
                                    <th rowSpan="2">AÇIKLAMA</th>
                                    <th rowSpan="2" style={{ width: '100px' }}>FİYAT</th>
                                </tr>
                                <tr>
                                    <th style={{ width: '60px' }}>Başlama Saati</th>
                                    <th style={{ width: '60px' }}>Bitiş Saati</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.items.map((item, itemIdx) => {
                                    return (
                                        <tr key={itemIdx} className={item.isPazar ? "pdf-row-pazar" : ""}>
                                            <td className="center">{formatDate(item.date)}</td>
                                            <td className="center">{item.receipt_no || '-'}</td>
                                            <td className="center">{item.start_time || '-'}</td>
                                            <td className="center">{item.end_time || '-'}</td>
                                            <td className="center">
                                                {item.hours || 0} {((item.description || '').toUpperCase().includes('[SAATLİK]') ? 'Saat' : 'Gün')}
                                            </td>
                                            <td className="center">{item.overtime_hours > 0 ? item.overtime_hours : ''}</td>
                                            <td className="center">{group.machineName}</td>
                                            <td>{(item.description || '').replace(/\[(YOL|SAATLİK|AYLIK|PAZAR)\]\s*/g, '')}</td>
                                            <td className="right">{item.unit_price ? formatCurrency(item.unit_price) : ''}</td>
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
                                            {group.machineName.toUpperCase()}
                                        </td>
                                    </tr>
                                    {(group.totalGun > 0 || group.isAylik) && (
                                        <tr className="bg-light-gray">
                                            <td className="bold center">{group.isAylik ? 'AY' : 'GÜN'}</td>
                                            <td className="center">{group.isAylik ? '1 AY' : (group.totalGun > 0 ? `${group.totalGun} GÜN` : '')}</td>
                                            <td className="right">{group.isAylik ? formatCurrency(26 * sampleGunPrice) : (sampleGunPrice ? formatCurrency(sampleGunPrice) : '')}</td>
                                            <td className="right bold total-text">{(group.totalGun > 0 || group.isAylik) ? formatCurrency(group.isAylik ? (26 * sampleGunPrice) : (group.totalGun * sampleGunPrice)) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalSaatlik > 0 && (
                                        <tr className="bg-light-gray">
                                            <td className="bold center">SAAT</td>
                                            <td className="center">{group.totalSaatlik} SAAT</td>
                                            <td className="right">{sampleSaatlikPrice ? formatCurrency(sampleSaatlikPrice) : ''}</td>
                                            <td className="right bold total-text">{sampleSaatlikPrice ? formatCurrency(group.totalSaatlik * sampleSaatlikPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalYol > 0 && (
                                        <tr className="bg-light-gray">
                                            <td className="bold center">YOL</td>
                                            <td className="center">{group.totalYol} ADET</td>
                                            <td className="right">{sampleYolPrice ? formatCurrency(sampleYolPrice) : ''}</td>
                                            <td className="right bold total-text">{sampleYolPrice ? formatCurrency(group.totalYol * sampleYolPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalPazar > 0 && (
                                        <tr className="bg-light-gray">
                                            <td className="bold center">PAZAR</td>
                                            <td className="center">{group.totalPazar} GÜN</td>
                                            <td className="right">{samplePazarPrice ? formatCurrency(samplePazarPrice) : ''}</td>
                                            <td className="right bold total-text">{samplePazarPrice ? formatCurrency(group.totalPazar * samplePazarPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalMesai > 0 && (
                                        <tr className="bg-light-gray">
                                            <td className="bold center">MESAİ</td>
                                            <td className="center">{group.totalMesai} SAAT</td>
                                            <td className="right">{sampleMesaiPrice ? formatCurrency(sampleMesaiPrice) : ''}</td>
                                            <td className="right bold total-text">{sampleMesaiPrice ? formatCurrency(group.totalMesai * sampleMesaiPrice) : ''}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
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
                        <tr>
                            <td className="bold center">TOPLAM</td>
                            <td className="right bold total-text">{formatCurrency(grandTotalPrice)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="pdf-footer-note">
                <strong>NOT:</strong>
                <div style={{ marginLeft: '10px', display: 'inline-block' }}>Oluşturma Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')} - {work.title}</div>
            </div>

            <div className="pdf-footer-standard">Puantaj Raporları</div>
        </div>
        </div>
    );
}
