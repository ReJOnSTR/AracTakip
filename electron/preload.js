const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    // Auth
    register: (userData) => ipcRenderer.invoke('auth:register', userData),
    login: (credentials) => ipcRenderer.invoke('auth:login', credentials),

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
    getAllMaintenances: (companyId) => ipcRenderer.invoke('maintenances:getAll', companyId),
    createMaintenance: (data) => ipcRenderer.invoke('maintenances:create', data),
    updateMaintenance: (data) => ipcRenderer.invoke('maintenances:update', data),
    deleteMaintenance: (id) => ipcRenderer.invoke('maintenances:delete', id),

    // Inspections
    getInspectionsByVehicle: (vehicleId) => ipcRenderer.invoke('inspections:getByVehicle', vehicleId),
    getAllInspections: (companyId) => ipcRenderer.invoke('inspections:getAll', companyId),
    createInspection: (data) => ipcRenderer.invoke('inspections:create', data),
    updateInspection: (data) => ipcRenderer.invoke('inspections:update', data),
    deleteInspection: (id) => ipcRenderer.invoke('inspections:delete', id),

    // Insurances
    getInsurancesByVehicle: (vehicleId) => ipcRenderer.invoke('insurances:getByVehicle', vehicleId),
    getAllInsurances: (companyId) => ipcRenderer.invoke('insurances:getAll', companyId),
    createInsurance: (data) => ipcRenderer.invoke('insurances:create', data),
    updateInsurance: (data) => ipcRenderer.invoke('insurances:update', data),
    deleteInsurance: (id) => ipcRenderer.invoke('insurances:delete', id),

    // Assignments
    getAssignmentsByVehicle: (vehicleId) => ipcRenderer.invoke('assignments:getByVehicle', vehicleId),
    getAllAssignments: (companyId) => ipcRenderer.invoke('assignments:getAll', companyId),
    createAssignment: (data) => ipcRenderer.invoke('assignments:create', data),
    updateAssignment: (data) => ipcRenderer.invoke('assignments:update', data),
    deleteAssignment: (id) => ipcRenderer.invoke('assignments:delete', id),

    // Services
    getServicesByVehicle: (vehicleId) => ipcRenderer.invoke('services:getByVehicle', vehicleId),
    getAllServices: (companyId) => ipcRenderer.invoke('services:getAll', companyId),
    createService: (data) => ipcRenderer.invoke('services:create', data),
    updateService: (data) => ipcRenderer.invoke('services:update', data),
    deleteService: (id) => ipcRenderer.invoke('services:delete', id),

    // Dashboard
    getDashboardStats: (companyId) => ipcRenderer.invoke('dashboard:getStats', companyId),
    getUpcomingEvents: (companyId) => ipcRenderer.invoke('dashboard:getUpcoming', companyId),
    getRecentActivity: (companyId) => ipcRenderer.invoke('dashboard:getRecentActivity', companyId),

    // Data Management
    exportCompanyData: (companyId) => ipcRenderer.invoke('data:export', companyId),
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
    showNotification: (title, body) => ipcRenderer.invoke('notification:show', { title, body })
})
