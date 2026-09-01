export const requestService = {
    createRequest: (data) => window.electronAPI.createRequest(data),
    getRequests: (filters) => window.electronAPI.getRequests(filters),
    processApproval: (data) => window.electronAPI.processApproval(data)
};
