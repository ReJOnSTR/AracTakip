export const roleService = {
    getRoles: (companyId) => window.electronAPI.getRoles(companyId),
    saveRole: (data) => window.electronAPI.saveRole(data),
    deleteRole: (roleId) => window.electronAPI.deleteRole(roleId),
    assignUserRole: (data) => window.electronAPI.assignUserRole(data)
};
