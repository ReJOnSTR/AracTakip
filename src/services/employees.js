export const employeeService = {
    getAll: (companyId, isArchived) => window.electronAPI.getEmployees(companyId, isArchived),
    getById: (id) => window.electronAPI.getEmployeeById(id),
    create: (data) => window.electronAPI.createEmployee(data),
    update: (data) => window.electronAPI.updateEmployee(data),
    delete: (id) => window.electronAPI.deleteEmployee(id),
    getPayrollSummary: (companyId, month) => window.electronAPI.getPayrollSummary(companyId, month)
}
