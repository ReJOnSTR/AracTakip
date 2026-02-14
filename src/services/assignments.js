export const assignmentService = {
    getByVehicle: (vehicleId) => window.electronAPI.getAssignmentsByVehicle(vehicleId),
    getAll: (companyId, isArchived) => window.electronAPI.getAllAssignments(companyId, isArchived),
    create: (data) => window.electronAPI.createAssignment(data),
    update: (data) => window.electronAPI.updateAssignment(data),
    delete: (id) => window.electronAPI.deleteAssignment(id)
}
