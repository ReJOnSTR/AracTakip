// Let's test the UI DataTable filter logic in isolated node script
const columns = [
    { key: 'name', label: 'Müşteri Adı' },
    { key: 'contact', label: 'İletişim' }
]

const visibleColumns = new Set(['name', 'contact'])
const orderedColumns = columns.filter(col => visibleColumns.has(col.key))
console.log(orderedColumns.length)

const tableData = [
    { name: "Ahmet", contact: "123" }
]

// Simulate DataTable
const filteredData = tableData.filter(row => {
    return orderedColumns.some(col => {
        const value = row[col.key]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes('')
    })
})

console.log("Filtered:", filteredData.length)
