export const documentService = {
    add: (data) => window.electronAPI.addDocument(data),
    getAll: (companyId) => window.electronAPI.getAllDocuments(companyId),
    getByVehicle: (vehicleId) => window.electronAPI.getDocumentsByVehicle(vehicleId),
    delete: (id) => window.electronAPI.deleteDocument(id),
    open: (fileName) => window.electronAPI.openDocument(fileName),
    readData: (fileName) => window.electronAPI.readDocumentData(fileName)
}
