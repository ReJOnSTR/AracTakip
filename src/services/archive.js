export const archiveService = {
    archiveItem: (tableName, id, status) => window.electronAPI.archiveItem(tableName, id, status)
}
