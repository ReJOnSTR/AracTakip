import React, { useState } from 'react'
import DataTable from '../components/DataTable'
import { Plus, TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'

export default function Finance() {
    const [transactions, setTransactions] = useState([
        { id: 1, date: '2024-03-10', type: 'income', amount: 50000, description: 'Proje Ödemesi', category: 'Satış' },
        { id: 2, date: '2024-03-12', type: 'expense', amount: 1500, description: 'Ofis Malzemeleri', category: 'Kırtasiye' },
        { id: 3, date: '2024-03-14', type: 'expense', amount: 3000, description: 'Yemek Giderleri', category: 'Gıda' },
        { id: 4, date: '2024-03-15', type: 'income', amount: 12000, description: 'Danışmanlık Geliri', category: 'Hizmet' }
    ])

    const columns = [
        { key: 'date', label: 'Tarih', render: (v) => formatDate(v) },
        { key: 'description', label: 'Açıklama', render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
        { key: 'category', label: 'Kategori' },
        {
            key: 'type',
            label: 'Tür',
            render: (v) => v === 'income' ?
                <span className="badge badge-success"><TrendingUp size={12} style={{ marginRight: 4 }} /> Gelir</span> :
                <span className="badge badge-danger"><TrendingDown size={12} style={{ marginRight: 4 }} /> Gider</span>
        },
        {
            key: 'amount',
            label: 'Tutar',
            render: (v, r) => <span style={{ fontWeight: 600, color: r.type === 'income' ? 'var(--success)' : 'var(--danger)' }}>
                {r.type === 'income' ? '+' : '-'}{formatCurrency(v)}
            </span>
        }
    ]

    const stats = {
        income: transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0),
        expense: transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
    }

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Kasa Takibi</h1>
                    <p className="page-subtitle">Gelir, gider ve finansal hareketler</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary text-danger" onClick={() => alert('Demo: Gider Ekle')}>
                        <TrendingDown size={18} /> Gider Ekle
                    </button>
                    <button className="btn btn-primary" onClick={() => alert('Demo: Gelir Ekle')}>
                        <TrendingUp size={18} /> Gelir Ekle
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <TrendingUp />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(stats.income)}</div>
                        <div className="stat-label">Toplam Gelir</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon danger">
                        <TrendingDown />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(stats.expense)}</div>
                        <div className="stat-label">Toplam Gider</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Wallet />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value" style={{ color: 'var(--accent-primary)' }}>{formatCurrency(stats.income - stats.expense)}</div>
                        <div className="stat-label">Net Bakiye</div>
                    </div>
                </div>
            </div>

            <DataTable
                persistenceKey="finance_table"
                columns={columns}
                data={transactions}
                emptyMessage="Henüz finansal kayıt bulunamadı"
                actions={() => <button className="btn-icon">Detay</button>}
            />
        </div>
    )
}
