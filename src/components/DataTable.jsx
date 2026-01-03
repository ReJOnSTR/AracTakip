import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, Search, X, Trash2 } from 'lucide-react'
import CustomSelect from './CustomSelect'
import CustomDatePicker from './CustomDatePicker'
import { TableVirtuoso } from 'react-virtuoso'

export default function DataTable({
    columns,
    data,
    actions,
    emptyMessage = 'Kayıt bulunamadı',
    showRowNumbers = false,
    showCheckboxes = true,
    showSearch = true,
    showDateFilter = false,
    dateFilterKey = 'date',
    filters = [],
    onRowClick = null,
    onSelectionChange = null,
    onBulkDelete = null,
    onContextMenu = null
}) {
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [selectedRows, setSelectedRows] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [activeFilters, setActiveFilters] = useState({})
    const [dateRange, setDateRange] = useState({ start: '', end: '' })

    // Filter by custom filters
    const customFilteredData = useMemo(() => {
        if (!data) return []

        return data.filter(row => {
            // Check dropdown filters
            for (const [key, value] of Object.entries(activeFilters)) {
                if (value && row[key] !== value) {
                    return false
                }
            }

            // Check date range
            if (showDateFilter && (dateRange.start || dateRange.end)) {
                const rowDate = row[dateFilterKey]
                if (rowDate) {
                    if (dateRange.start && rowDate < dateRange.start) return false
                    if (dateRange.end && rowDate > dateRange.end) return false
                }
            }

            return true
        })
    }, [data, activeFilters, dateRange, showDateFilter, dateFilterKey])

    // Filter by search
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return customFilteredData

        const query = searchQuery.toLowerCase()
        return customFilteredData.filter(row => {
            return columns.some(col => {
                const value = row[col.key]
                if (value === null || value === undefined) return false
                return String(value).toLowerCase().includes(query)
            })
        })
    }, [customFilteredData, searchQuery, columns])

    // Sort data
    const sortedData = useMemo(() => {
        if (!filteredData || !sortConfig.key) return filteredData || []

        return [...filteredData].sort((a, b) => {
            const aVal = a[sortConfig.key]
            const bVal = b[sortConfig.key]

            if (aVal === null || aVal === undefined) return 1
            if (bVal === null || bVal === undefined) return -1

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
            }

            const aStr = String(aVal).toLowerCase()
            const bStr = String(bVal).toLowerCase()
            return sortConfig.direction === 'asc'
                ? aStr.localeCompare(bStr, 'tr')
                : bStr.localeCompare(aStr, 'tr')
        })
    }, [filteredData, sortConfig])

    // Paginate
    const totalPages = Math.ceil((sortedData?.length || 0) / pageSize)
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize
        return sortedData.slice(start, start + pageSize)
    }, [sortedData, currentPage, pageSize])

    useMemo(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1)
        }
    }, [filteredData, totalPages])

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }))
    }

    const handleSelectRow = (e, id) => {
        e.stopPropagation()
        setSelectedRows(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            onSelectionChange?.(Array.from(newSet))
            return newSet
        })
    }

    const handleSelectAll = () => {
        if (selectedRows.size === paginatedData.length) {
            setSelectedRows(new Set())
            onSelectionChange?.([])
        } else {
            const allIds = new Set(paginatedData.map(row => row.id))
            setSelectedRows(allIds)
            onSelectionChange?.(Array.from(allIds))
        }
    }

    const clearSelection = () => {
        setSelectedRows(new Set())
        onSelectionChange?.([])
    }

    const handleBulkDeleteClick = () => {
        if (onBulkDelete && selectedRows.size > 0) {
            onBulkDelete(Array.from(selectedRows))
            clearSelection()
        }
    }

    const handleFilterChange = (key, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [key]: value || undefined
        }))
        setCurrentPage(1)
    }

    const handleDateChange = (start, end) => {
        setDateRange({ start, end })
        setCurrentPage(1)
    }

    const clearFilters = () => {
        setActiveFilters({})
        setSearchQuery('')
        setDateRange({ start: '', end: '' })
        setCurrentPage(1)
    }

    const hasActiveFilters = Object.values(activeFilters).some(v => v) || searchQuery || dateRange.start || dateRange.end

    const handleRowClick = (row) => {
        if (onRowClick) {
            onRowClick(row)
        }
    }

    const isAllSelected = paginatedData.length > 0 && selectedRows.size === paginatedData.length
    const isSomeSelected = selectedRows.size > 0 && selectedRows.size < paginatedData.length

    const startRecord = sortedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0
    const endRecord = Math.min(currentPage * pageSize, sortedData?.length || 0)

    const pageSizeOptions = [
        { value: 10, label: '10' },
        { value: 25, label: '25' },
        { value: 50, label: '50' }
    ]

    return (
        <div className="table-wrapper">
            {/* Toolbar */}
            <div className="table-toolbar">
                <div className="toolbar-left">
                    {/* Search */}
                    {showSearch && (
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Ara..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                            />
                            {searchQuery && (
                                <button className="search-clear" onClick={() => setSearchQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Filters */}
                    {filters.length > 0 && (
                        <div className="filter-group">
                            {filters.map(filter => (
                                <CustomSelect
                                    key={filter.key}
                                    value={activeFilters[filter.key] || ''}
                                    onChange={(value) => handleFilterChange(filter.key, value)}
                                    options={filter.options}
                                    placeholder={filter.label}
                                    className="filter-select-custom"
                                />
                            ))}
                        </div>
                    )}

                    {/* Date Range */}
                    {showDateFilter && (
                        <CustomDatePicker
                            startDate={dateRange.start}
                            endDate={dateRange.end}
                            onChange={handleDateChange}
                        />
                    )}

                    {hasActiveFilters && (
                        <button className="filter-clear" onClick={clearFilters}>
                            <X size={14} />
                            Temizle
                        </button>
                    )}
                </div>

                <div className="toolbar-right">
                    <span className="record-info">
                        {sortedData.length} kayıt
                    </span>
                </div>
            </div>

            {/* Bulk Selection Overlay */}
            {selectedRows.size > 0 && (
                <div className="bulk-selection-overlay">
                    <span className="bulk-count">{selectedRows.size} öğe seçili</span>
                    <div className="bulk-divider" />
                    <div className="bulk-actions">
                        {onBulkDelete && (
                            <button className="btn-bulk-action danger" onClick={handleBulkDeleteClick}>
                                <Trash2 size={15} />
                                Sil
                            </button>
                        )}
                        <button className="btn-bulk-action secondary" onClick={clearSelection}>
                            <X size={15} />
                            Vazgeç
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            {showCheckboxes && (
                                <th className="th-checkbox">
                                    <div
                                        className={`checkbox ${isAllSelected ? 'checked' : ''} ${isSomeSelected ? 'indeterminate' : ''}`}
                                        onClick={handleSelectAll}
                                    >
                                        {isAllSelected && <Check size={12} />}
                                        {isSomeSelected && <div className="indeterminate-line" />}
                                    </div>
                                </th>
                            )}
                            {showRowNumbers && <th className="th-num">#</th>}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    style={col.width ? { width: col.width } : {}}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                    className={col.sortable !== false ? 'sortable' : ''}
                                >
                                    <div className="th-content">
                                        <span>{col.label}</span>
                                        {col.sortable !== false && sortConfig.key === col.key && (
                                            <span className="sort-icon">
                                                {sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="th-actions">İşlemler</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (actions ? 1 : 0) + (showRowNumbers ? 1 : 0) + (showCheckboxes ? 1 : 0)}
                                    className="empty-cell"
                                >
                                    {hasActiveFilters ? 'Filtre sonucu bulunamadı' : emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, index) => (
                                <tr
                                    key={row.id || index}
                                    className={`${selectedRows.has(row.id) ? 'selected' : ''} ${onRowClick ? 'clickable' : ''}`}
                                    onClick={() => handleRowClick(row)}
                                    onContextMenu={(e) => {
                                        if (onContextMenu) {
                                            e.preventDefault()
                                            onContextMenu(e, row)
                                        }
                                    }}
                                >
                                    {showCheckboxes && (
                                        <td className="td-checkbox">
                                            <div
                                                className={`checkbox ${selectedRows.has(row.id) ? 'checked' : ''}`}
                                                onClick={(e) => handleSelectRow(e, row.id)}
                                            >
                                                {selectedRows.has(row.id) && <Check size={12} />}
                                            </div>
                                        </td>
                                    )}
                                    {showRowNumbers && (
                                        <td className="td-num">
                                            {startRecord + index}
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key}>
                                            {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td className="td-actions" onClick={(e) => e.stopPropagation()}>
                                            <div className="action-btns">
                                                {actions(row)}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            {sortedData.length > 0 && (
                <div className="table-footer">
                    <div className="footer-left">
                        <CustomSelect
                            value={pageSize}
                            onChange={(value) => { setPageSize(Number(value)); setCurrentPage(1) }}
                            options={pageSizeOptions}
                            className="page-select-custom"
                            placeholder=""
                        />
                        <span className="footer-info">{startRecord}-{endRecord} / {sortedData.length}</span>
                    </div>

                    <div className="pagination">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
                            <ChevronsLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                            <ChevronLeft size={16} />
                        </button>

                        <div className="page-nums">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum
                                if (totalPages <= 5) {
                                    pageNum = i + 1
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i
                                } else {
                                    pageNum = currentPage - 2 + i
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        className={currentPage === pageNum ? 'active' : ''}
                                        onClick={() => setCurrentPage(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            })}
                        </div>

                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                            <ChevronRight size={16} />
                        </button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
                            <ChevronsRight size={16} />
                        </button>
                    </div>

                </div>
            )}
        </div>
    )
}
