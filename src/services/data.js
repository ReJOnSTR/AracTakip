export const dataService = {
    export: (data) => window.electronAPI.exportCompanyData(data),
    import: (userId) => window.electronAPI.importCompanyData(userId)
}
