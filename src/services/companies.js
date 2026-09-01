export const companyService = {
    getAll: (userId) => window.electronAPI.getCompanies(userId),
    create: (data) => window.electronAPI.createCompany(data),
    update: (data) => window.electronAPI.updateCompany(data),
    delete: (id) => window.electronAPI.deleteCompany(id)
}
