import { useState, useMemo, useRef, useEffect } from 'react'
import { ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check, Search, X, Trash2, Download, Archive, ArchiveRestore, LayoutList } from 'lucide-react'
import * as XLSX from 'xlsx'
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
    onBulkArchive = null, // New prop
    isArchiveView = false, // New prop
    onToggleArchiveView = null, // New prop
    onContextMenu = null,
    enableExport = false,
    exportFileName = 'Liste',
    initialSort = null,
    persistenceKey = null
}) {
    // Helper to get initial state from localStorage or default
    const getInitialState = (key, defaultVal) => {
        if (!persistenceKey) return defaultVal
        try {
            const saved = localStorage.getItem(`${persistenceKey}_${key}`)
            return saved ? JSON.parse(saved) : defaultVal
        } catch (e) {
            console.error('Error parsing saved state', e)
            return defaultVal
        }
    }

    const [sortConfig, setSortConfig] = useState(() => getInitialState('sort', initialSort || { key: null, direction: 'asc' }))
    const [userSorted, setUserSorted] = useState(false)
    const [currentPage, setCurrentPage] = useState(() => getInitialState('page', 1))
    const [pageSize, setPageSize] = useState(() => getInitialState('pageSize', 10))
    const [selectedRows, setSelectedRows] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState(() => getInitialState('search', ''))
    const [activeFilters, setActiveFilters] = useState(() => getInitialState('filters', {}))
    const [dateRange, setDateRange] = useState(() => getInitialState('dateRange', { start: '', end: '' }))

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState(() => {
        const defaultVisible = new Set(columns.map(col => col.key))
        return getInitialState('visibleCols', Array.from(defaultVisible))
    })

    // Column Resizing State
    const [columnWidths, setColumnWidths] = useState(() => getInitialState('colWidths', {}))
    const resizingRef = useRef(null) // { key, startX, startWidth }

    // Ensure new columns are visible by default if not in saved state
    // But we need to handle Set vs Array conversion from localStorage
    useEffect(() => {
        // If we have saved state, loaded as array, convert to Set
        if (Array.isArray(visibleColumns)) {
            setVisibleColumns(new Set(visibleColumns))
        }
    }, [])

    const [showColumnMenu, setShowColumnMenu] = useState(false)
    const columnMenuRef = useRef(null)

    // Save column visibility
    useEffect(() => {
        if (!persistenceKey) return
        // Save as array
        localStorage.setItem(`${persistenceKey}_visibleCols`, JSON.stringify(Array.from(visibleColumns)))
    }, [visibleColumns, persistenceKey])

    // Handle outside click for column menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
                setShowColumnMenu(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleColumn = (key) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev)
            if (newSet.has(key)) {
                newSet.delete(key)
            } else {
                newSet.add(key)
            }
            return newSet
        })
    }

    // Initialize column widths (merged with saved)
    useEffect(() => {
        const initialWidths = {}
        columns.forEach(col => {
            // Priority: Saved > Prop > Default
            if (col.width && typeof col.width === 'string' && col.width.endsWith('px')) {
                initialWidths[col.key] = parseInt(col.width)
            } else {
                initialWidths[col.key] = 150
            }
        })
        // Merge: Saved values (columnWidths from state init) take precedence
        setColumnWidths(prev => ({ ...initialWidths, ...prev }))
    }, [columns])

    // Save column widths when they change
    useEffect(() => {
        if (!persistenceKey || Object.keys(columnWidths).length === 0) return
        localStorage.setItem(`${persistenceKey}_colWidths`, JSON.stringify(columnWidths))
    }, [columnWidths, persistenceKey])

    const visibleColumnsList = useMemo(() => {
        // Always show columns in 'visibleColumns' set
        // But map over original 'columns' array to preserve order
        // If visibleColumns is an Array (initial render quirk), handle it
        const visibilitySet = visibleColumns instanceof Set ? visibleColumns : new Set(visibleColumns)
        return columns.filter(col => visibilitySet.has(col.key))
    }, [columns, visibleColumns])

    // Resize Handlers
    const handleResizeStart = (e, key) => {
        e.preventDefault()
        e.stopPropagation()
        const startWidth = columnWidths[key] || 150
        resizingRef.current = { key, startX: e.clientX, startWidth }

        document.addEventListener('mousemove', handleResizeMove)
        document.addEventListener('mouseup', handleResizeEnd)
        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
    }

    const handleResizeMove = (e) => {
        if (!resizingRef.current) return
        const { key, startX, startWidth } = resizingRef.current
        const diff = e.clientX - startX
        const newWidth = Math.max(50, startWidth + diff) // Min width 50px

        setColumnWidths(prev => ({
            ...prev,
            [key]: newWidth
        }))
    }

    const handleResizeEnd = () => {
        resizingRef.current = null
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
    }

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
            return visibleColumnsList.some(col => {
                const value = row[col.key]
                if (value === null || value === undefined) return false
                return String(value).toLowerCase().includes(query)
            })
        })
    }, [customFilteredData, searchQuery, visibleColumnsList])

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

    // Calculate total table width for explicit resizing support
    const totalTableWidth = useMemo(() => {
        let total = 0
        if (showCheckboxes) total += 50 // Checkbox col width approx
        if (showRowNumbers) total += 50 // Number col width approx

        visibleColumnsList.forEach(col => {
            const width = columnWidths[col.key] || (col.width ? parseInt(col.width) : 150)
            total += width
        })

        if (actions) total += 110 // Actions column width approx

        return total
    }, [visibleColumnsList, columnWidths, showCheckboxes, showRowNumbers, actions])


    const handleSort = (key) => {
        // Case 1: New column -> Start with ASC
        if (sortConfig.key !== key) {
            setUserSorted(true)
            setSortConfig({ key, direction: 'asc' })
            return
        }

        // Case 2: Same column, currently Default (Hidden) -> Explicit ASC
        if (!userSorted) {
            setUserSorted(true)
            setSortConfig({ key, direction: 'asc' })
            return
        }

        // Case 3: Same column, currently Explicit ASC -> Explicit DESC
        if (sortConfig.direction === 'asc') {
            setSortConfig({ key, direction: 'desc' })
            return
        }

        // Case 4: Same column, currently Explicit DESC -> Default (Hidden)
        setUserSorted(false)
        setSortConfig(initialSort || { key: null, direction: 'asc' })
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

    const handleExcelExport = () => {
        // Determine which data to export: Selected rows or All filtered rows
        let dataToExport = sortedData
        if (selectedRows.size > 0) {
            dataToExport = sortedData.filter(row => selectedRows.has(row.id))
        }

        if (!dataToExport || dataToExport.length === 0) return

        const exportData = dataToExport.map(row => {
            const rowData = {}
            visibleColumnsList.forEach(col => {
                rowData[col.label] = row[col.key] || ''
            })
            return rowData
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)
        XLSX.utils.book_append_sheet(wb, ws, 'Liste')
        XLSX.writeFile(wb, `${exportFileName}_${new Date().toLocaleDateString('tr-TR').replace(/\./g, '-')}.xlsx`)
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
                    {onToggleArchiveView && (
                        <div className="view-toggle" style={{
                            display: 'flex',
                            background: 'var(--bg-secondary)',
                            padding: '4px',
                            borderRadius: '10px',
                            marginRight: '12px',
                            border: '1px solid var(--border-color)',
                            position: 'relative',
                            width: '180px', // Fixed width for smooth sliding
                            height: '36px',
                            alignItems: 'center'
                        }}>
                            {/* Sliding Pill Background */}
                            <div style={{
                                position: 'absolute',
                                left: '4px',
                                top: '4px',
                                bottom: '4px',
                                width: 'calc(50% - 4px)',
                                background: 'var(--bg-elevated)',
                                borderRadius: '8px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                                transform: isArchiveView ? 'translateX(100%)' : 'translateX(0%)',
                                zIndex: 1
                            }} />

                            <button
                                style={{
                                    flex: 1,
                                    position: 'relative',
                                    zIndex: 2,
                                    border: 'none',
                                    background: 'transparent',
                                    color: !isArchiveView ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'color 0.2s',
                                    height: '100%'
                                }}
                                onClick={() => onToggleArchiveView(false)}
                            >
                                <LayoutList size={15} style={{ opacity: !isArchiveView ? 1 : 0.7 }} />
                                Aktif
                            </button>
                            <button
                                style={{
                                    flex: 1,
                                    position: 'relative',
                                    zIndex: 2,
                                    border: 'none',
                                    background: 'transparent',
                                    color: isArchiveView ? 'var(--text-primary)' : 'var(--text-muted)',
                                    fontSize: '13px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'color 0.2s',
                                    height: '100%'
                                }}
                                onClick={() => onToggleArchiveView(true)}
                            >
                                <Archive size={15} style={{ opacity: isArchiveView ? 1 : 0.7 }} />
                                Arşiv
                            </button>
                        </div>
                    )}
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
                                    label={filter.label}
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

                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                        {/* Column Toggle */}
                        <div className="filter-clear" style={{ position: 'relative', padding: '0', border: 'none', background: 'transparent' }} ref={columnMenuRef}>
                            <button className="filter-clear" onClick={() => setShowColumnMenu(!showColumnMenu)} title="Sütunları Düzenle">
                                <Check size={14} />
                                Sütunlar
                            </button>
                            {showColumnMenu && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '6px',
                                    padding: '8px',
                                    zIndex: 1000,
                                    width: '200px',
                                    marginTop: '4px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                }}>
                                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px solid var(--border-color)' }}>
                                        Görünür Sütunlar
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                        {columns.map(col => (
                                            <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', padding: '2px 0' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={visibleColumns instanceof Set ? visibleColumns.has(col.key) : new Set(visibleColumns).has(col.key)}
                                                    onChange={() => toggleColumn(col.key)}
                                                    style={{ accentColor: 'var(--primary)' }}
                                                />
                                                {col.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {enableExport && (
                            <button className="filter-clear" onClick={handleExcelExport} title="Excel'e Aktar">
                                <Download size={14} />
                                Excel
                            </button>
                        )}
                    </div>
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
                        {onBulkArchive && (
                            <button className="btn-bulk-action secondary" onClick={() => { onBulkArchive(Array.from(selectedRows)); clearSelection() }}>
                                {isArchiveView ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                                {isArchiveView ? 'Geri Al' : 'Arşivle'}
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
                <table
                    className="data-table"
                    style={{
                        width: totalTableWidth ? `${totalTableWidth}px` : '100%',
                        minWidth: '100%'
                    }}
                >
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
                            {visibleColumnsList.map((col) => (
                                <th
                                    key={col.key}
                                    style={{
                                        // Use state width if available, otherwise prop or default
                                        width: columnWidths[col.key] ? `${columnWidths[col.key]}px` : (col.width || '150px'),
                                        textAlign: col.align || 'left'
                                    }}
                                    onClick={() => col.sortable !== false && handleSort(col.key)}
                                    className={col.sortable !== false ? 'sortable' : ''}
                                >
                                    <div className="th-content" style={{ justifyContent: col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                                        <span title={col.label}>{col.label}</span>
                                        {col.sortable !== false && (
                                            <span
                                                className="sort-icon"
                                                style={{
                                                    opacity: (sortConfig.key === col.key && userSorted) ? 1 : 0,
                                                    visibility: (sortConfig.key === col.key && userSorted) ? 'visible' : 'hidden'
                                                }}
                                            >
                                                {sortConfig.key === col.key ? (
                                                    sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={2.5} /> : <ArrowDown size={12} strokeWidth={2.5} />
                                                ) : (
                                                    <ArrowUp size={12} strokeWidth={2.5} />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className="resize-handle"
                                        onMouseDown={(e) => handleResizeStart(e, col.key)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </th>
                            ))}
                            {actions && <th className="th-actions">İşlemler</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={visibleColumnsList.length + (actions ? 1 : 0) + (showRowNumbers ? 1 : 0) + (showCheckboxes ? 1 : 0)}
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
                                    {visibleColumnsList.map((col) => {
                                        const cellContent = col.render ? col.render(row[col.key], row) : row[col.key] || '-'
                                        const titleContent = typeof cellContent === 'string' || typeof cellContent === 'number' ? cellContent : ''

                                        return (
                                            <td key={col.key} style={{ textAlign: col.align || 'left' }} title={String(titleContent)}>
                                                {cellContent}
                                            </td>
                                        )
                                    })}
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
                            floatingLabel={false}
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
