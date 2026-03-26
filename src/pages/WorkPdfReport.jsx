import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate, formatCurrency } from '../utils/helpers';
import './WorkPdfReport.css'; // Özel CSS eklenecek

export default function WorkPdfReport() {
    const { id } = useParams();
    const [work, setWork] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
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
    }, [id]);

    useEffect(() => {
        if (!loading && work) {
            // Biraz bekleyip yazdır
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [loading, work]);

    if (loading) return <div className="print-loading">Veriler yükleniyor...</div>;
    if (error) return <div className="print-error">Hata: {error}</div>;
    if (!work) return null;

    // Gruplama (Araçlara / Makinalara göre)
    const groupedItems = {};
    work.items.forEach(item => {
        const key = item.vehicle_id || 'diger';
        if (!groupedItems[key]) {
            groupedItems[key] = {
                machineName: item.plate ? `${item.plate} ${item.brand || ''} ${item.model || ''}`.trim() : 'Belirtilmemiş',
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

        // Fiyat ve Tür Hesaplamaları (Görseldeki mantık)
        const gunSayisi = Number(item.hours) || 0;
        const mesaiSayisi = Number(item.overtime_hours) || 0;
        const descUpper = (item.description || '').toUpperCase();

        const dateObj = new Date(item.date);
        const isSunday = dateObj.getDay() === 0;

        // Pazar kontrolü
        const isPazar = isSunday || descUpper.includes('PAZAR');
        // Yol kontrolü
        const isYol = descUpper.includes('YOL') || descUpper.includes('[YOL]');
        
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

        if (isPazar) {
            groupedItems[key].totalPazar += gunSayisi;
        } else if (isYol) {
            groupedItems[key].totalYol += gunSayisi;
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
        const sampleGunPrice = group.items.find(i => !(i.description || '').toUpperCase().includes('PAZAR') && !(i.description || '').toUpperCase().includes('YOL') && !(i.description || '').toUpperCase().includes('[SAATLİK]'))?.unit_price || 0;
        const sampleYolPrice = group.items.find(i => (i.description || '').toUpperCase().includes('YOL'))?.unit_price || 0;
        const sampleSaatlikPrice = group.items.find(i => (i.description || '').toUpperCase().includes('[SAATLİK]'))?.unit_price || 0;
        
        // Pazar is 50% more than daily. If manual price wasn't overridden to a custom one, calculate 1.5x
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
             // For monthly, the "1 AY" price is explicitly sampleGunPrice * 26 (Aylar 26 gün)
             calculatedGun = 26 * sampleGunPrice;
        } else {
             calculatedGun = group.totalGun * sampleGunPrice;
        }

        const calculatedPazar = group.totalPazar * samplePazarPrice;
        const calculatedYol = group.totalYol * sampleYolPrice;
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

    return (
        <div className="pdf-report-container">
            {/* Header */}
            <div className="pdf-header">
                <h2>Sak Vinç Puantaj Cetveli</h2>
                <div className="pdf-date-right">
                    {new Date().toLocaleDateString('tr-TR')}
                </div>
            </div>

            <div className="pdf-customer-title">
                <h3>{(work.customer_name || '').toUpperCase()}</h3>
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
                                            <td className="center">{item.hours || 0}</td>
                                            <td className="center">{item.overtime_hours > 0 ? item.overtime_hours : ''}</td>
                                            <td className="center">{group.machineName}</td>
                                            <td>{item.description || ''}</td>
                                            <td className="right">{item.unit_price ? formatCurrency(item.unit_price) : ''}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Summary Block */}
                        <div className="pdf-summary-block">
                            <table className="pdf-summary-table">
                                <tbody>
                                    <tr className="bg-light-green">
                                        <td colSpan="4" className="bold center" style={{ backgroundColor: '#e2f0e0', padding: '6px', fontSize: '12px', borderBottom: '1px solid #333' }}>
                                            {group.machineName.toUpperCase()}
                                        </td>
                                    </tr>
                                    <tr className="bg-light-green">
                                        <td className="bold center" style={{ width: '120px' }}>{group.isAylik ? 'AY' : 'GÜN'}</td>
                                        <td className="center" style={{ width: '100px' }}>{group.isAylik ? '1 AY' : (group.totalGun > 0 ? group.totalGun : '')}</td>
                                        <td className="right" style={{ width: '140px' }}>{group.isAylik ? formatCurrency(26 * sampleGunPrice) : (sampleGunPrice ? formatCurrency(sampleGunPrice) : '')}</td>
                                        <td className="right bold green-text" style={{ width: '140px' }}>{(group.totalGun > 0 || group.isAylik) ? formatCurrency(group.isAylik ? (26 * sampleGunPrice) : (group.totalGun * sampleGunPrice)) : ''}</td>
                                    </tr>
                                    {group.totalSaatlik > 0 && (
                                        <tr className="bg-light-green">
                                            <td className="bold center">SAATLİK</td>
                                            <td className="center">{group.totalSaatlik} SAAT</td>
                                            <td className="right">{sampleSaatlikPrice ? formatCurrency(sampleSaatlikPrice) : ''}</td>
                                            <td className="right bold green-text">{sampleSaatlikPrice ? formatCurrency(group.totalSaatlik * sampleSaatlikPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalYol > 0 && (
                                        <tr className="bg-light-green">
                                            <td className="bold center">YOL</td>
                                            <td className="center">{group.totalYol} ADET</td>
                                            <td className="right">{sampleYolPrice ? formatCurrency(sampleYolPrice) : ''}</td>
                                            <td className="right bold green-text">{sampleYolPrice ? formatCurrency(group.totalYol * sampleYolPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalPazar > 0 && (
                                        <tr className="bg-light-green">
                                            <td className="bold center">PAZAR</td>
                                            <td className="center">{group.totalPazar} GÜN</td>
                                            <td className="right">{samplePazarPrice ? formatCurrency(samplePazarPrice) : ''}</td>
                                            <td className="right bold green-text">{samplePazarPrice ? formatCurrency(group.totalPazar * samplePazarPrice) : ''}</td>
                                        </tr>
                                    )}
                                    {group.totalMesai > 0 && (
                                        <tr className="bg-light-green">
                                            <td className="bold center">MESAİ</td>
                                            <td className="center">{group.totalMesai} SAAT</td>
                                            <td className="right">{sampleMesaiPrice ? formatCurrency(sampleMesaiPrice) : ''}</td>
                                            <td className="right bold green-text">{sampleMesaiPrice ? formatCurrency(group.totalMesai * sampleMesaiPrice) : ''}</td>
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
                <table className="pdf-summary-table" style={{ width: '250px', marginLeft: 'auto', marginTop: '20px' }}>
                    <tbody>
                        <tr>
                            <td className="bold center bg-light-blue" style={{ width: '120px' }}>TOPLAM</td>
                            <td className="right bold green-text" style={{ width: '130px', backgroundColor: '#e2f0e0' }}>{formatCurrency(grandTotalPrice)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="pdf-footer-note">
                <strong>NOT:</strong>
                <div style={{ marginLeft: '20px', display: 'inline-block' }}>Oluşturma Tarihi: {new Date().toLocaleDateString('tr-TR')} {new Date().toLocaleTimeString('tr-TR')} - {(work.customer_name || '').toUpperCase()} PUANTAJ CETVELİ</div>
            </div>

        </div>
    );
}
