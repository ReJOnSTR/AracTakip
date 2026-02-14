export const serviceService = {
    getByVehicle: (vehicleId) => window.electronAPI.getServicesByVehicle(vehicleId),
    getAll: (companyId, isArchived) => window.electronAPI.getAllServices(companyId, isArchived),
    create: (data) => window.electronAPI.createService(data),
    update: (data) => window.electronAPI.updateService(data),
    delete: (id) => window.electronAPI.deleteService(id)
}
