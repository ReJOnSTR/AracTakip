export const insuranceService = {
    getByVehicle: (vehicleId) => window.electronAPI.getInsurancesByVehicle(vehicleId),
    getAll: (companyId, isArchived) => window.electronAPI.getAllInsurances(companyId, isArchived),
    create: (data) => window.electronAPI.createInsurance(data),
    update: (data) => window.electronAPI.updateInsurance(data),
    delete: (id) => window.electronAPI.deleteInsurance(id)
}
