export const maintenanceService = {
    getByVehicle: (vehicleId) => window.electronAPI.getMaintenancesByVehicle(vehicleId),
    getAll: (companyId, isArchived) => window.electronAPI.getAllMaintenances(companyId, isArchived),
    create: (data) => window.electronAPI.createMaintenance(data),
    update: (data) => window.electronAPI.updateMaintenance(data),
    delete: (id) => window.electronAPI.deleteMaintenance(id)
}
