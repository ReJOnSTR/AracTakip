import { useState, useEffect, useCallback } from 'react'
import { useCompany } from '../context/CompanyContext'
import TopProgressBar from '../components/TopProgressBar'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import { Save, CircleDollarSign, Pencil } from 'lucide-react'

export default function MealTicketSettings() {
    const { currentCompany } = useCompany()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [pricePerPerson, setPricePerPerson] = useState(0)
    const [showModal, setShowModal] = useState(false)
    const [editValue, setEditValue] = useState('')

    const loadSettings = useCallback(async () => {
        if (!currentCompany) return
        setLoading(true)
        try {
            const result = await window.electronAPI.getMealPrice(currentCompany.id)
            if (result.success) {
                setPricePerPerson(result.data.price_per_person || 0)
            }
        } catch (err) {
            console.error('Failed to load meal settings:', err)
        }
        setLoading(false)
    }, [currentCompany])

    useEffect(() => {
        if (currentCompany) loadSettings()
    }, [currentCompany, loadSettings])

    const openEdit = () => {
        setEditValue(String(pricePerPerson || ''))
        setShowModal(true)
    }

    const handleSave = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            const price = parseFloat(editValue) || 0
            const result = await window.electronAPI.setMealPrice({
                companyId: currentCompany.id,
                pricePerPerson: price
            })
            if (result.success) {
                setPricePerPerson(price)
                setShowModal(false)
            }
        } catch (err) {
            console.error('Failed to save meal price:', err)
        }
        setSaving(false)
    }

    const formatCurrency = (val) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val || 0)

    const settingsData = [
        {
            id: 'price_per_person',
            label: 'Kişi Başı Yemek Ücreti',
            description: 'Yemek fişlerinde maliyet hesaplaması için kullanılır',
            value: pricePerPerson,
        }
    ]

    const columns = [
        {
            key: 'label',
            label: 'Ayar',
            sortable: false,
            render: (val, item) => (
                <div>
                    <div style={{ fontWeight: '500' }}>{val}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.description}</div>
                </div>
            )
        },
        {
            key: 'value',
            label: 'Değer',
            sortable: false,
            render: (val) => (
                <span style={{ fontWeight: '600', color: val > 0 ? 'var(--primary)' : 'var(--text-muted)', fontSize: '15px' }}>
                    {val > 0 ? formatCurrency(val) : '—'}
                </span>
            )
        }
    ]

    return (
        <div className="page-container fade-in">
            <TopProgressBar loading={loading} />

            <div className="page-header">
                <div>
                    <h1 className="page-title">Ücret Ayarları</h1>
                    <p className="page-subtitle">Kişi başı yemek ücreti ve maliyet hesaplama</p>
                </div>
            </div>

            {/* Stat Card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '25px', maxWidth: '300px' }}>
                <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <div className="stat-label">GÜNCEL ÜCRET</div>
                        <div className="stat-icon primary" style={{ width: '32px', height: '32px' }}><CircleDollarSign size={16} /></div>
                    </div>
                    <div>
                        <div className="stat-value" style={{ fontSize: '22px' }}>{pricePerPerson > 0 ? formatCurrency(pricePerPerson) : '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Kişi başı yemek ücreti</div>
                    </div>
                </div>
            </div>

            <DataTable persistenceKey="MealTicketSettings_table_0"
                storageKey="meal_ticket_settings_table_cols"
                columns={columns}
                data={settingsData}
                loading={loading}
                emptyMessage="Ayar bulunamadı."
                searchable={false}
                paginated={false}
                actions={(item) => (
                    <button title="Düzenle" onClick={openEdit}><Pencil size={16} /></button>
                )}
            />

            {/* Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Kişi Başı Ücret Düzenle"
            >
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label className="form-label">Kişi Başı Ücret (₺)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            min="0"
                            step="0.01"
                            placeholder="Örn: 250.00"
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>İptal</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            <Save size={15} />
                            {saving ? 'Kaydediliyor...' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
