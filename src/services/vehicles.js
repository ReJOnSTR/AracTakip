export const vehicleService = {
    getAll: (companyId) => window.electronAPI.getVehicles(companyId),
    getById: (id) => window.electronAPI.getVehicleById(id),
    create: (data) => window.electronAPI.createVehicle(data),
    update: (data) => window.electronAPI.updateVehicle(data),
    delete: (id) => window.electronAPI.deleteVehicle(id)
}
