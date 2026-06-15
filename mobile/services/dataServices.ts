import api from './api';

const m = '/mobile';

export const dashboardService = {
  getStats: (companyId: number) => api.get(`${m}/dashboard/stats`, { params: { companyId } }).then(r => r.data),
  getUpcoming: (companyId: number) => api.get(`${m}/dashboard/upcoming`, { params: { companyId } }).then(r => r.data),
  getRecentActivity: (companyId: number) => api.get(`${m}/dashboard/recent-activity`, { params: { companyId } }).then(r => r.data),
};

export const vehicleService = {
  getAll: (companyId: number, isArchived = 0) => api.get(`${m}/vehicles`, { params: { companyId, isArchived } }).then(r => r.data),
  getById: (id: number) => api.get(`${m}/vehicles/${id}`).then(r => r.data),
  create: (data: any) => api.post(`${m}/vehicles`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/vehicles/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/vehicles/${id}`).then(r => r.data),
  getMaintenances: (vehicleId: number) => api.get(`${m}/vehicles/${vehicleId}/maintenances`).then(r => r.data),
  createMaintenance: (data: any) => api.post(`${m}/maintenances`, data).then(r => r.data),
  getInspections: (vehicleId: number) => api.get(`${m}/vehicles/${vehicleId}/inspections`).then(r => r.data),
  createInspection: (data: any) => api.post(`${m}/inspections`, data).then(r => r.data),
  getInsurances: (vehicleId: number) => api.get(`${m}/vehicles/${vehicleId}/insurances`).then(r => r.data),
  createInsurance: (data: any) => api.post(`${m}/insurances`, data).then(r => r.data),
  getServices: (vehicleId: number) => api.get(`${m}/vehicles/${vehicleId}/services`).then(r => r.data),
  createService: (data: any) => api.post(`${m}/services`, data).then(r => r.data),
  getAssignments: (vehicleId: number) => api.get(`${m}/vehicles/${vehicleId}/assignments`).then(r => r.data),
};

export const employeeService = {
  getAll: (companyId: number, isArchived = 0) => api.get(`${m}/employees`, { params: { companyId, isArchived } }).then(r => r.data),
  getById: (id: number) => api.get(`${m}/employees/${id}`).then(r => r.data),
  create: (data: any) => api.post(`${m}/employees`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/employees/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/employees/${id}`).then(r => r.data),
  getSalaries: (empId: number) => api.get(`${m}/employees/${empId}/salaries`).then(r => r.data),
  createSalary: (data: any) => api.post(`${m}/salaries`, data).then(r => r.data),
  getLeaves: (empId: number) => api.get(`${m}/employees/${empId}/leaves`).then(r => r.data),
  createLeave: (data: any) => api.post(`${m}/leaves`, data).then(r => r.data),
  getOvertimes: (empId: number) => api.get(`${m}/employees/${empId}/overtimes`).then(r => r.data),
  createOvertime: (data: any) => api.post(`${m}/overtimes`, data).then(r => r.data),
  getAssignments: (empId: number) => api.get(`${m}/employees/${empId}/assignments`).then(r => r.data),
  getDocuments: (empId: number) => api.get(`${m}/employees/${empId}/documents`).then(r => r.data),
  getPayrollSummary: (companyId: number, month: string) => api.get(`${m}/employees/payroll-summary`, { params: { companyId, month } }).then(r => r.data),
};

export const financeService = {
  getAll: (companyId: number, isArchived = 0) => api.get(`${m}/finance`, { params: { companyId, isArchived } }).then(r => r.data),
  getStats: (companyId: number) => api.get(`${m}/finance/stats`, { params: { companyId } }).then(r => r.data),
  getChecks: (companyId: number) => api.get(`${m}/finance/checks`, { params: { companyId } }).then(r => r.data),
  create: (data: any) => api.post(`${m}/finance`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/finance/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/finance/${id}`).then(r => r.data),
};

export const companyService = {
  getAll: () => api.get('/my-companies').then(r => r.data),
};

export const searchService = {
  search: (companyId: number, q: string) => api.get(`${m}/search`, { params: { companyId, q } }).then(r => r.data),
};

export const workService = {
  getAll: (companyId: number) => api.get(`${m}/works`, { params: { companyId } }).then(r => r.data),
  getById: (id: number) => api.get(`${m}/works/${id}`).then(r => r.data),
  create: (data: any) => api.post(`${m}/works`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/works/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/works/${id}`).then(r => r.data),
};

export const customerService = {
  getAll: (companyId: number) => api.get(`${m}/customers`, { params: { companyId } }).then(r => r.data),
  getById: (id: number) => api.get(`${m}/customers/${id}`).then(r => r.data),
  create: (data: any) => api.post(`${m}/customers`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/customers/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/customers/${id}`).then(r => r.data),
};

export const mealTicketService = {
  getAll: (companyId: number) => api.get(`${m}/meal-tickets`, { params: { companyId } }).then(r => r.data),
  getStats: (companyId: number) => api.get(`${m}/meal-tickets/stats`, { params: { companyId } }).then(r => r.data),
  create: (data: any) => api.post(`${m}/meal-tickets`, data).then(r => r.data),
  update: (id: number, data: any) => api.put(`${m}/meal-tickets/${id}`, data).then(r => r.data),
  delete: (id: number) => api.delete(`${m}/meal-tickets/${id}`).then(r => r.data),
};
