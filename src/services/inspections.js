export const inspectionService = {
    getByVehicle: (vehicleId) => window.electronAPI.getInspectionsByVehicle(vehicleId),
    getAll: (companyId, type, isArchived) => window.electronAPI.getAllInspections(companyId, type, isArchived),
    create: (data) => window.electronAPI.createInspection(data),
    update: (data) => window.electronAPI.updateInspection(data),
    delete: (id) => window.electronAPI.deleteInspection(id)
}
