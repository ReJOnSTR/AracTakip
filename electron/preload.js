const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
    changePassword: (data) => ipcRenderer.invoke('auth:changePassword', data),

    // Companies
    getCompanies: (userId) => ipcRenderer.invoke('companies:getAll', userId),
    createCompany: (data) => ipcRenderer.invoke('companies:create', data),
    updateCompany: (data) => ipcRenderer.invoke('companies:update', data),
    deleteCompany: (id) => ipcRenderer.invoke('companies:delete', id),

    // Vehicles
    getVehicles: (companyId) => ipcRenderer.invoke('vehicles:getAll', companyId),
    getVehicleById: (id) => ipcRenderer.invoke('vehicles:getById', id),
    createVehicle: (data) => ipcRenderer.invoke('vehicles:create', data),
    updateVehicle: (data) => ipcRenderer.invoke('vehicles:update', data),
    deleteVehicle: (id) => ipcRenderer.invoke('vehicles:delete', id),

    // Maintenances
    getMaintenancesByVehicle: (vehicleId) => ipcRenderer.invoke('maintenances:getByVehicle', vehicleId),
    getAllMaintenances: (companyId, isArchived) => ipcRenderer.invoke('maintenances:getAll', companyId, isArchived),
    createMaintenance: (data) => ipcRenderer.invoke('maintenances:create', data),
    updateMaintenance: (data) => ipcRenderer.invoke('maintenances:update', data),
    deleteMaintenance: (id) => ipcRenderer.invoke('maintenances:delete', id),

    // Inspections
    getInspectionsByVehicle: (vehicleId) => ipcRenderer.invoke('inspections:getByVehicle', vehicleId),
    getAllInspections: (companyId, type, isArchived) => ipcRenderer.invoke('inspections:getAll', companyId, type, isArchived),
    createInspection: (data) => ipcRenderer.invoke('inspections:create', data),
    updateInspection: (data) => ipcRenderer.invoke('inspections:update', data),
    deleteInspection: (id) => ipcRenderer.invoke('inspections:delete', id),

    // Insurances
    getInsurancesByVehicle: (vehicleId) => ipcRenderer.invoke('insurances:getByVehicle', vehicleId),
    getAllInsurances: (companyId, isArchived) => ipcRenderer.invoke('insurances:getAll', companyId, isArchived),
    createInsurance: (data) => ipcRenderer.invoke('insurances:create', data),
    updateInsurance: (data) => ipcRenderer.invoke('insurances:update', data),
    deleteInsurance: (id) => ipcRenderer.invoke('insurances:delete', id),

    // Assignments
    getAssignmentsByVehicle: (vehicleId) => ipcRenderer.invoke('assignments:getByVehicle', vehicleId),
    getAllAssignments: (companyId, isArchived) => ipcRenderer.invoke('assignments:getAll', companyId, isArchived),
    createAssignment: (data) => ipcRenderer.invoke('assignments:create', data),
    updateAssignment: (data) => ipcRenderer.invoke('assignments:update', data),
    deleteAssignment: (id) => ipcRenderer.invoke('assignments:delete', id),

    // Services
    getServicesByVehicle: (vehicleId) => ipcRenderer.invoke('services:getByVehicle', vehicleId),
    getAllServices: (companyId, isArchived) => ipcRenderer.invoke('services:getAll', companyId, isArchived),
    createService: (data) => ipcRenderer.invoke('services:create', data),
    updateService: (data) => ipcRenderer.invoke('services:update', data),
    deleteService: (id) => ipcRenderer.invoke('services:delete', id),

    // Employees
    getEmployees: (companyId) => ipcRenderer.invoke('employees:getAll', companyId),
    getEmployeeById: (id) => ipcRenderer.invoke('employees:getById', id),
    createEmployee: (data) => ipcRenderer.invoke('employees:create', data),
    updateEmployee: (data) => ipcRenderer.invoke('employees:update', data),
    deleteEmployee: (id) => ipcRenderer.invoke('employees:delete', id),

    // Salaries
    getSalaries: (employeeId) => ipcRenderer.invoke('salaries:getAll', employeeId),
    createSalary: (data) => ipcRenderer.invoke('salaries:create', data),
    updateSalary: (data) => ipcRenderer.invoke('salaries:update', data),
    deleteSalary: (id) => ipcRenderer.invoke('salaries:delete', id),

    // Leaves
    getLeaves: (employeeId) => ipcRenderer.invoke('leaves:getAll', employeeId),
    createLeave: (data) => ipcRenderer.invoke('leaves:create', data),
    updateLeave: (data) => ipcRenderer.invoke('leaves:update', data),
    deleteLeave: (id) => ipcRenderer.invoke('leaves:delete', id),

    // Overtimes
    getOvertimes: (employeeId) => ipcRenderer.invoke('overtimes:getAll', employeeId),
    createOvertime: (data) => ipcRenderer.invoke('overtimes:create', data),
    updateOvertime: (data) => ipcRenderer.invoke('overtimes:update', data),
    deleteOvertime: (id) => ipcRenderer.invoke('overtimes:delete', id),

    // Employee Assignments
    getEmployeeAssignments: (employeeId) => ipcRenderer.invoke('employeeAssignments:getAll', employeeId),
    createEmployeeAssignment: (data) => ipcRenderer.invoke('employeeAssignments:create', data),
    updateEmployeeAssignment: (data) => ipcRenderer.invoke('employeeAssignments:update', data),
    deleteEmployeeAssignment: (id) => ipcRenderer.invoke('employeeAssignments:delete', id),

    // Employee Documents
    getEmployeeDocuments: (employeeId) => ipcRenderer.invoke('employeeDocuments:getAll', employeeId),
    createEmployeeDocument: (data) => ipcRenderer.invoke('employeeDocuments:create', data),
    deleteEmployeeDocument: (id) => ipcRenderer.invoke('employeeDocuments:delete', id),

    // Archive
    archiveItem: (table, id, isArchived) => ipcRenderer.invoke('archive:item', table, id, isArchived),

    // Dashboard
    getDashboardStats: (companyId) => ipcRenderer.invoke('dashboard:getStats', companyId),
    getUpcomingEvents: (companyId) => ipcRenderer.invoke('dashboard:getUpcoming', companyId),
    getRecentActivity: (companyId) => ipcRenderer.invoke('dashboard:getRecentActivity', companyId),

    // Data Management
    exportCompanyData: (data) => ipcRenderer.invoke('data:export', data),
    importCompanyData: (userId) => ipcRenderer.invoke('data:import', userId),

    // Settings & Auto Backup
    getSettings: () => ipcRenderer.invoke('settings:get'),
    saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
    selectFolder: () => ipcRenderer.invoke('settings:selectFolder'),

    // Auto Updater
    checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
    downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
    quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, value) => callback(value)),
    onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, value) => callback(value)),
    removeUpdateListeners: () => {
        ipcRenderer.removeAllListeners('update-status')
        ipcRenderer.removeAllListeners('update-progress')
    },

    // PC Features
    onTriggerAction: (callback) => ipcRenderer.on('trigger-action', (event, action) => callback(action)),
    onNavigate: (callback) => ipcRenderer.on('navigate', (event, route) => callback(route)),
    showContextMenu: (items) => ipcRenderer.send('show-context-menu', items),
    onContextAction: (callback) => ipcRenderer.on('context-action', (event, action) => callback(action)),
    removePCListeners: () => {
        ipcRenderer.removeAllListeners('trigger-action')
        ipcRenderer.removeAllListeners('navigate')
        ipcRenderer.removeAllListeners('context-action')
    },

    // Notifications
    showNotification: (title, body) => ipcRenderer.invoke('notification:show', { title, body }),

    // File Handlers
    selectFile: () => ipcRenderer.invoke('files:select'),
    saveFile: (sourcePath) => ipcRenderer.invoke('files:save', sourcePath),
    openFile: (fileName) => ipcRenderer.invoke('files:open', fileName),

    // Document Management
    addDocument: (data) => ipcRenderer.invoke('documents:add', data),
    getAllDocuments: (companyId) => ipcRenderer.invoke('documents:getByCompany', companyId),
    getDocumentsByVehicle: (vehicleId) => ipcRenderer.invoke('documents:getByVehicle', vehicleId),
    deleteDocument: (id) => ipcRenderer.invoke('documents:delete', id),
    openDocument: (fileName) => ipcRenderer.invoke('documents:open', fileName),
    readDocumentData: (fileName) => ipcRenderer.invoke('documents:readData', fileName),

    // Utils
    openExternal: (url) => ipcRenderer.send('app:openExternal', url),

    // Finance API
    getAllFinance: (companyId) => ipcRenderer.invoke('finance:getAll', companyId),
    getFinanceById: (id) => ipcRenderer.invoke('finance:getById', id),
    createFinance: (data) => ipcRenderer.invoke('finance:create', data),
    updateFinance: (data) => ipcRenderer.invoke('finance:update', data),
    deleteFinance: (id) => ipcRenderer.invoke('finance:delete', id),
    getFinanceStats: (companyId) => ipcRenderer.invoke('finance:getStats', companyId),
    getChecks: (companyId) => ipcRenderer.invoke('finance:getChecks', companyId),
    updateCheckStatus: (data) => ipcRenderer.invoke('finance:updateCheckStatus', data),

    // Meal Tickets API
    getMealTickets: (companyId) => ipcRenderer.invoke('mealTickets:getAll', companyId),
    createMealTicket: (data) => ipcRenderer.invoke('mealTickets:create', data),
    updateMealTicket: (data) => ipcRenderer.invoke('mealTickets:update', data),
    deleteMealTicket: (id) => ipcRenderer.invoke('mealTickets:delete', id),
    getMealTicketStats: (companyId) => ipcRenderer.invoke('mealTickets:getStats', companyId),
    getMealPrice: (companyId) => ipcRenderer.invoke('mealTickets:getPrice', companyId),
    setMealPrice: (data) => ipcRenderer.invoke('mealTickets:setPrice', data),
    getMealTicketReport: (data) => ipcRenderer.invoke('mealTickets:getReport', data),

    // Works API
    getWorks: (companyId) => ipcRenderer.invoke('works:getAll', companyId),
    getWorkDetails: (id) => ipcRenderer.invoke('works:getDetails', id),
    createWork: (data) => ipcRenderer.invoke('works:create', data),
    updateWork: (data) => ipcRenderer.invoke('works:update', data),
    deleteWork: (id) => ipcRenderer.invoke('works:delete', id),

    // Customers API
    getCustomers: (companyId) => ipcRenderer.invoke('customers:getAll', companyId),
    getCustomerDetails: (id) => ipcRenderer.invoke('customers:getDetails', id),
    createCustomer: (data) => ipcRenderer.invoke('customers:create', data),
    updateCustomer: (data) => ipcRenderer.invoke('customers:update', data),
    deleteCustomer: (id) => ipcRenderer.invoke('customers:delete', id),

    addWorkItem: (data) => ipcRenderer.invoke('workItems:create', data),
    addBulkWorkItems: (data) => ipcRenderer.invoke('workItems:bulkCreate', data),
    updateWorkItem: (data) => ipcRenderer.invoke('workItems:update', data),
    deleteWorkItem: (id) => ipcRenderer.invoke('workItems:delete', id),
    deleteBulkWorkItems: (ids) => ipcRenderer.invoke('workItems:bulkDelete', ids),

    // Database Updates
    onDbUpdate: (callback) => {
        const subscription = (event, data) => callback(data)
        ipcRenderer.on('db-update', subscription)
        return () => ipcRenderer.removeListener('db-update', subscription)
    }
})
