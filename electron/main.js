const { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage, globalShortcut, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const Store = require('electron-store')
const AdmZip = require('adm-zip')
const db = require('./prismaService')
const { getPrismaClient, runAutoMigrations } = require('./prismaClient')
const log = require('./logger') // Import logger
const { startAdminServer, stopAdminServer } = require('./adminServer')


// Optional: Override console to correct log file
// console.log = log.log;

const store = new Store()

let mainWindow

function notifyDbUpdate(changeType) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('db-update', changeType)
    }
}


function createWindow() {
    // Restore window state
    const bounds = store.get('windowBounds')
    const { width, height, x, y } = bounds || { width: 1400, height: 900 }

    // Set Dock Icon for macOS (Dev Mode)
    if (process.platform === 'darwin') {
        const iconPath = path.join(__dirname, '../resources/icon-mac.png')
        if (fs.existsSync(iconPath)) {
            app.dock.setIcon(iconPath)
        }
    }

    // Determine platform icon
    let platformIcon = path.join(__dirname, '../resources/icon-win.png') // Default to Windows/Linux
    if (process.platform === 'darwin') {
        platformIcon = path.join(__dirname, '../resources/icon-mac.png')
    }

    mainWindow = new BrowserWindow({
        width,
        height,
        x,
        y,
        minWidth: 1200,
        minHeight: 700,
        icon: platformIcon,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            plugins: true // Enable PDF viewer plugin
        },

        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#18181b',
            symbolColor: '#ffffff',
            height: 38
        },
        trafficLightPosition: { x: 12, y: 12 },
        backgroundColor: '#0f0f1a',
        show: false
    })

    // Save window state
    mainWindow.on('close', () => {
        if (!mainWindow.isMaximized()) {
            store.set('windowBounds', mainWindow.getBounds())
        }
    })

    // Development or production mode
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        mainWindow.loadURL('http://localhost:5173')
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })

    // Custom Menu
    createMenu()

    // Tray Icon
    // Custom Context Menu
    ipcMain.on('show-context-menu', (event, items) => {
        const template = items.map(item => {
            if (item.type === 'separator') return { type: 'separator' }
            return {
                label: item.label,
                click: () => event.sender.send('context-action', item.id)
            }
        })
        const menu = Menu.buildFromTemplate(template)
        menu.popup({ window: BrowserWindow.fromWebContents(event.sender) })
    })


}

function createMenu() {
    const isMac = process.platform === 'darwin'
    const template = [
        ...(isMac ? [{
            label: app.name,
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { label: 'Ayarlar', accelerator: 'CmdOrCtrl+,', click: () => mainWindow.webContents.send('navigate', '/settings') },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        }] : []),
        {
            label: 'Dosya',
            submenu: [
                { label: 'Yeni Araç Ekle', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('trigger-action', 'new-vehicle') },
                { type: 'separator' },
                { role: 'close' }
            ]
        },
        {
            label: 'Düzen',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' },
                { type: 'separator' },
                { label: 'Ara', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('trigger-action', 'search') }
            ]
        },
        {
            label: 'Görünüm',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Pencere',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                ...(isMac ? [
                    { type: 'separator' },
                    { role: 'front' },
                    { type: 'separator' },
                    { role: 'window' }
                ] : [
                    { role: 'close' }
                ])
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// Set App ID for Windows Notifications
if (process.platform === 'win32') {
    app.setAppUserModelId('com.kontrol.app') // Must match appId in package.json
}



// Notification Handler
const { Notification } = require('electron')

ipcMain.handle('notification:show', (event, { title, body }) => {
    if (Notification.isSupported()) {
        const notification = new Notification({
            title,
            body,
            icon: path.join(__dirname, '../resources/icon.png'),
            sound: 'default' // Play default system sound
        })
        notification.show()

        notification.on('click', () => {
            if (mainWindow) {
                if (mainWindow.isMinimized()) mainWindow.restore()
                mainWindow.show()
            }
        })
        return true
    }
    return false
})

app.whenReady().then(async () => {
    // Initialize Database
    try {
        if (db.initializeDatabase) db.initializeDatabase()
        log.info('Database initialized')

        // Run schema migrations (add missing columns to older DBs)
        await runAutoMigrations()

        startAdminServer(getPrismaClient())
    } catch (err) {
        log.error('Failed to initialize database:', err)
        dialog.showErrorBox('Veritabanı Hatası', 'Veritabanı başlatılamadı.\n' + err.message)
        app.quit()
        return
    }

    log.info('Application started')
    createWindow()

    // Global Shortcut for DevTools (F12)
    globalShortcut.register('F12', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    stopAdminServer()
    if (process.platform !== 'darwin') {
        log.info('Application quitting (window-all-closed)')
        app.quit()
    }
})

process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error)
})

// ============ IPC HANDLERS ============

// Auth handlers
ipcMain.handle('auth:register', async (event, userData) => {
    const result = await db.registerUser(userData)
    if (result.success && result.user) {
        const hash = await db.getUserPasswordHash(result.user.id)
        if (hash) currentSessionKey = deriveKey(hash)
    }
    return result
})

ipcMain.handle('auth:login', async (event, credentials) => {
    const result = await db.loginUser(credentials)
    if (result.success && result.user) {
        const hash = await db.getUserPasswordHash(result.user.id)
        if (hash) currentSessionKey = deriveKey(hash)
    }
    return result
})

ipcMain.handle('auth:changePassword', async (event, data) => {
    return await db.changePassword(data)
})

ipcMain.handle('auth:updateProfile', async (event, data) => {
    return await db.updateProfile(data)
})

// Company handlers
ipcMain.handle('companies:getAll', async (event, userId) => {
    return await db.getCompanies(userId)
})

ipcMain.handle('companies:create', async (event, companyData) => {
    const result = await db.createCompany(companyData)
    if (result.success) notifyDbUpdate({ table: 'companies', action: 'create' })
    return result
})

ipcMain.handle('companies:update', async (event, companyData) => {
    const result = await db.updateCompany(companyData)
    if (result.success) notifyDbUpdate({ table: 'companies', action: 'update' })
    return result
})

ipcMain.handle('companies:delete', async (event, companyId) => {
    const result = await db.deleteCompany(companyId)
    if (result.success) notifyDbUpdate({ table: 'companies', action: 'delete' })
    return result
})

// Vehicle handlers
ipcMain.handle('vehicles:getAll', async (event, companyId, isArchived) => {
    return await db.getVehicles(companyId, isArchived)
})

ipcMain.handle('vehicles:getById', async (event, vehicleId) => {
    return await db.getVehicleById(vehicleId)
})

ipcMain.handle('vehicles:create', async (event, vehicleData) => {
    const result = await db.createVehicle(vehicleData)
    if (result.success) notifyDbUpdate({ table: 'vehicles', action: 'create' })
    return result
})

ipcMain.handle('vehicles:update', async (event, vehicleData) => {
    const result = await await db.updateVehicle(vehicleData)
    if (result.success) notifyDbUpdate({ table: 'vehicles', action: 'update' })
    return result
})

ipcMain.handle('vehicles:delete', async (event, vehicleId) => {
    const result = await await db.deleteVehicle(vehicleId)
    if (result.success) notifyDbUpdate({ table: 'vehicles', action: 'delete' })
    return result
})

// Maintenance handlers
ipcMain.handle('maintenances:getByVehicle', async (event, vehicleId) => {
    return await db.getMaintenances(vehicleId)
})

ipcMain.handle('maintenances:getAll', async (event, companyId, isArchived) => {
    return await db.getAllMaintenances(companyId, isArchived)
})

ipcMain.handle('maintenances:create', async (event, data) => {
    const result = await db.createMaintenance(data)
    if (result.success) notifyDbUpdate({ table: 'maintenances', action: 'create' })
    return result
})

ipcMain.handle('maintenances:update', async (event, data) => {
    const result = await await db.updateMaintenance(data)
    if (result.success) notifyDbUpdate({ table: 'maintenances', action: 'update' })
    return result
})

ipcMain.handle('maintenances:delete', async (event, id) => {
    const result = await await db.deleteMaintenance(id)
    if (result.success) notifyDbUpdate({ table: 'maintenances', action: 'delete' })
    return result
})

// Inspection handlers
ipcMain.handle('inspections:getByVehicle', async (event, vehicleId) => {
    return await db.getInspections(vehicleId)
})

ipcMain.handle('inspections:getAll', async (event, companyId, type, isArchived) => {
    return await db.getAllInspections(companyId, type, isArchived)
})

ipcMain.handle('inspections:create', async (event, data) => {
    const result = await db.createInspection(data)
    if (result.success) notifyDbUpdate({ table: 'inspections', action: 'create' })
    return result
})

ipcMain.handle('inspections:update', async (event, data) => {
    const result = await db.updateInspection(data)
    if (result.success) notifyDbUpdate({ table: 'inspections', action: 'update' })
    return result
})

ipcMain.handle('inspections:delete', async (event, id) => {
    const result = await db.deleteInspection(id)
    if (result.success) notifyDbUpdate({ table: 'inspections', action: 'delete' })
    return result
})

// Insurance handlers
ipcMain.handle('insurances:getByVehicle', async (event, vehicleId) => {
    return await db.getInsurances(vehicleId)
})

ipcMain.handle('insurances:getAll', async (event, companyId, isArchived) => {
    return await db.getAllInsurances(companyId, isArchived)
})

ipcMain.handle('insurances:create', async (event, data) => {
    const result = await db.createInsurance(data)
    if (result.success) notifyDbUpdate({ table: 'insurances', action: 'create' })
    return result
})

ipcMain.handle('insurances:update', async (event, data) => {
    const result = await db.updateInsurance(data)
    if (result.success) notifyDbUpdate({ table: 'insurances', action: 'update' })
    return result
})

ipcMain.handle('insurances:delete', async (event, id) => {
    const result = await db.deleteInsurance(id)
    if (result.success) notifyDbUpdate({ table: 'insurances', action: 'delete' })
    return result
})

// Assignment handlers
ipcMain.handle('assignments:getByVehicle', async (event, vehicleId) => {
    return await db.getAssignments(vehicleId)
})

ipcMain.handle('assignments:getAll', async (event, companyId, isArchived) => {
    return await db.getAllAssignments(companyId, isArchived)
})

ipcMain.handle('assignments:create', async (event, data) => {
    const result = await db.createAssignment(data)
    if (result.success) notifyDbUpdate({ table: 'assignments', action: 'create' })
    return result
})

ipcMain.handle('assignments:update', async (event, data) => {
    const result = await db.updateAssignment(data)
    if (result.success) notifyDbUpdate({ table: 'assignments', action: 'update' })
    return result
})

ipcMain.handle('assignments:delete', async (event, id) => {
    const result = await db.deleteAssignment(id)
    if (result.success) notifyDbUpdate({ table: 'assignments', action: 'delete' })
    return result
})

// Service handlers
ipcMain.handle('services:getByVehicle', async (event, vehicleId) => {
    return await db.getServices(vehicleId)
})

ipcMain.handle('services:getAll', async (event, companyId, isArchived) => {
    return await db.getAllServices(companyId, isArchived)
})

ipcMain.handle('services:create', async (event, data) => {
    const result = await db.createService(data)
    if (result.success) notifyDbUpdate({ table: 'services', action: 'create' })
    return result
})

ipcMain.handle('services:update', async (event, data) => {
    const result = await db.updateService(data)
    if (result.success) notifyDbUpdate({ table: 'services', action: 'update' })
    return result
})

ipcMain.handle('services:delete', async (event, id) => {
    const result = await db.deleteService(id)
    if (result.success) notifyDbUpdate({ table: 'services', action: 'delete' })
    return result
})

// Finance handlers
ipcMain.handle('finance:getAll', async (event, companyId, isArchived) => {
    return db.getTransactions(companyId, isArchived)
})

ipcMain.handle('finance:getById', async (event, id) => {
    return db.getTransactionById(id)
})

ipcMain.handle('finance:create', async (event, data) => {
    const result = await db.createTransaction(data)
    if (result.success) notifyDbUpdate({ table: 'transactions', action: 'create' })
    return result
})

ipcMain.handle('finance:update', async (event, data) => {
    const result = await db.updateTransaction(data)
    if (result.success) notifyDbUpdate({ table: 'transactions', action: 'update' })
    return result
})

ipcMain.handle('finance:delete', async (event, id) => {
    const result = await db.deleteTransaction(id)
    if (result.success) notifyDbUpdate({ table: 'transactions', action: 'delete' })
    return result
})

ipcMain.handle('finance:getStats', async (event, companyId) => {
    return db.getFinanceStats(companyId)
})

ipcMain.handle('finance:getChecks', async (event, companyId, isArchived) => {
    return db.getChecksAndNotes(companyId, isArchived)
})

ipcMain.handle('finance:updateCheckStatus', async (event, payload) => {
    const { id, status } = payload
    const result = await db.updateCheckStatus(id, status)
    if (result.success) notifyDbUpdate({ table: 'transactions', action: 'update' })
    return result
})


// ============ MEAL TICKETS ============

ipcMain.handle('mealTickets:getAll', async (event, companyId, isArchived) => {
    return db.getMealTickets(companyId, isArchived)
})

ipcMain.handle('mealTickets:create', async (event, data) => {
    const result = await db.addMealTicket(data)
    if (result.success) notifyDbUpdate({ table: 'meal_tickets', action: 'create' })
    return result
})

ipcMain.handle('mealTickets:update', async (event, data) => {
    const result = await db.updateMealTicket(data)
    if (result.success) notifyDbUpdate({ table: 'meal_tickets', action: 'update' })
    return result
})

ipcMain.handle('mealTickets:delete', async (event, id) => {
    const result = await db.deleteMealTicket(id)
    if (result.success) notifyDbUpdate({ table: 'meal_tickets', action: 'delete' })
    return result
})

ipcMain.handle('mealTickets:getStats', async (event, companyId) => {
    return await db.getMealTicketStats(companyId)
})

ipcMain.handle('mealTickets:getPrice', async (event, companyId) => {
    return await db.getMealPrice(companyId)
})

ipcMain.handle('mealTickets:setPrice', async (event, data) => {
    const result = await db.setMealPrice(data)
    if (result.success) notifyDbUpdate({ table: 'meal_settings', action: 'update' })
    return result
})

ipcMain.handle('mealTickets:getReport', async (event, { companyId, month, year }) => {
    return await db.getMealTicketReport(companyId, month, year)
})

// ============ EMPLOYEES ============
ipcMain.handle('employees:getAll', async (event, companyId, isArchived) => {
    return db.getEmployees(companyId, isArchived)
})
ipcMain.handle('employees:getPayrollSummary', async (event, companyId, month) => {
    return db.getPayrollSummary(companyId, month)
})

ipcMain.handle('employees:getById', async (event, id) => {
    return await db.getEmployeeById(id)
})
ipcMain.handle('employees:create', async (event, data) => {
    const result = await db.addEmployee(data)
    if (result.success) notifyDbUpdate({ table: 'employees', action: 'create' })
    return result
})
ipcMain.handle('employees:update', async (event, data) => {
    const result = await db.updateEmployee(data)
    if (result.success) notifyDbUpdate({ table: 'employees', action: 'update' })
    return result
})
ipcMain.handle('employees:delete', async (event, id) => {
    const result = await db.deleteEmployee(id)
    if (result.success) notifyDbUpdate({ table: 'employees', action: 'delete' })
    return result
})

// Salaries
ipcMain.handle('salaries:getAll', async (event, employeeId) => {
    return await db.getSalariesByEmployee(employeeId) // Correct function name mapped from EmployeeDataService
})
ipcMain.handle('salaries:create', async (event, data) => {
    const result = await db.createSalary(data)
    if (result.success) notifyDbUpdate({ table: 'salaries', action: 'create' })
    return result
})
ipcMain.handle('salaries:update', async (event, data) => {
    const result = await db.updateSalary(data)
    if (result.success) notifyDbUpdate({ table: 'salaries', action: 'update' })
    return result
})
ipcMain.handle('salaries:delete', async (event, id) => {
    const result = await db.deleteSalary(id)
    if (result.success) notifyDbUpdate({ table: 'salaries', action: 'delete' })
    return result
})

// Salary History
ipcMain.handle('salaryHistory:create', async (event, data) => {
    const result = await db.createSalaryHistory(data)
    if (result.success) notifyDbUpdate({ table: 'employee_salary_history', action: 'create' })
    return result
})
ipcMain.handle('salaryHistory:update', async (event, data) => {
    const result = await db.updateSalaryHistory(data)
    if (result.success) notifyDbUpdate({ table: 'employee_salary_history', action: 'update' })
    return result
})
ipcMain.handle('salaryHistory:delete', async (event, id) => {
    const result = await db.deleteSalaryHistory(id)
    if (result.success) notifyDbUpdate({ table: 'employee_salary_history', action: 'delete' })
    return result
})

// Leaves
ipcMain.handle('leaves:getAll', async (event, employeeId) => {
    return await db.getLeavesByEmployee(employeeId)
})
ipcMain.handle('leaves:getAllByCompany', async (event, companyId) => {
    return await db.getAllLeaves(companyId)
})
ipcMain.handle('leaves:create', async (event, data) => {
    const result = await db.createLeave(data)
    if (result.success) notifyDbUpdate({ table: 'leaves', action: 'create' })
    return result
})
ipcMain.handle('leaves:update', async (event, data) => {
    const result = await db.updateLeave(data)
    if (result.success) notifyDbUpdate({ table: 'leaves', action: 'update' })
    return result
})
ipcMain.handle('leaves:delete', async (event, id) => {
    const result = await db.deleteLeave(id)
    if (result.success) notifyDbUpdate({ table: 'leaves', action: 'delete' })
    return result
})

// Overtimes
ipcMain.handle('overtimes:getAll', async (event, employeeId) => {
    return db.getOvertimes(employeeId)
})
ipcMain.handle('overtimes:create', async (event, data) => {
    const result = await db.addOvertime(data)
    if (result.success) notifyDbUpdate({ table: 'overtimes', action: 'create' })
    return result
})
ipcMain.handle('overtimes:update', async (event, data) => {
    const result = await db.updateOvertime(data)
    if (result.success) notifyDbUpdate({ table: 'overtimes', action: 'update' })
    return result
})
ipcMain.handle('overtimes:delete', async (event, id) => {
    const result = await db.deleteOvertime(id)
    if (result.success) notifyDbUpdate({ table: 'overtimes', action: 'delete' })
    return result
})

// Employee Assignments (Zimmet)
ipcMain.handle('employeeAssignments:getAll', async (event, employeeId) => {
    return db.getEmployeeAssignments(employeeId)
})
ipcMain.handle('employeeAssignments:create', async (event, data) => {
    const result = await db.addEmployeeAssignment(data)
    if (result.success) notifyDbUpdate({ table: 'employee_assignments', action: 'create' })
    return result
})
ipcMain.handle('employeeAssignments:update', async (event, data) => {
    const result = await db.updateEmployeeAssignment(data)
    if (result.success) notifyDbUpdate({ table: 'employee_assignments', action: 'update' })
    return result
})
ipcMain.handle('employeeAssignments:delete', async (event, id) => {
    const result = await db.deleteEmployeeAssignment(id)
    if (result.success) notifyDbUpdate({ table: 'employee_assignments', action: 'delete' })
    return result
})

// Employee Documents
    ipcMain.handle('employeeDocuments:getAll', async (event, employeeId, isArchived) => {
        return await db.getEmployeeDocuments(employeeId, isArchived);
    });
    ipcMain.handle('employeeDocuments:getUpcoming', async (event, companyId) => {
        return await db.getUpcomingDocuments(companyId);
    });
ipcMain.handle('employeeDocuments:create', async (event, data) => {
    try {
        const userDataPath = app.getPath('userData')
        const filesDir = path.join(userDataPath, 'files')

        // Ensure directory exists
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true })
        }

        const sourcePath = data.filePath
        const ext = path.extname(sourcePath)
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
        const destPath = path.join(filesDir, fileName)

        // Copy file
        fs.copyFileSync(sourcePath, destPath)

        // Save to DB with the NEW path (the filename in our storage)
        const result = await db.addEmployeeDocument({
            ...data,
            fileName: data.fileName || path.basename(sourcePath), // Prioritize provided name
            filePath: fileName // New storage name (timestamped)
        })

        if (result.success) notifyDbUpdate({ table: 'employee_documents', action: 'create' })
        return result
    } catch (error) {
        console.error('Employee document create error:', error)
        return { success: false, error: error.message }
    }
})
ipcMain.handle('employeeDocuments:delete', async (event, id) => {
    try {
        // 1. Find document to get file path
        const docRes = await db.getEmployeeDocumentById(id)
        if (docRes.success && docRes.data) {
            const fileName = docRes.data.file_path
            const userDataPath = app.getPath('userData')
            const filePath = path.join(userDataPath, 'files', fileName)
            
            // 2. Delete physical file if exists
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        }

        // 3. Delete from DB
        const result = await db.deleteEmployeeDocument(id)
        if (result.success) notifyDbUpdate({ table: 'employee_documents', action: 'delete' })
        return result
    } catch (error) {
        console.error('Employee document delete error:', error)
        return { success: false, error: error.message }
    }
})
ipcMain.handle('employeeDocuments:update', async (event, data) => {
    try {
        let finalData = { ...data }

        if (data.filePath && !data.filePath.includes(app.getPath('userData'))) {
            // New file selected (full path), copy it
            const userDataPath = app.getPath('userData')
            const filesDir = path.join(userDataPath, 'files')
            if (!fs.existsSync(filesDir)) fs.mkdirSync(filesDir, { recursive: true })

            const ext = path.extname(data.filePath)
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
            const destPath = path.join(filesDir, fileName)

            fs.copyFileSync(data.filePath, destPath)
            finalData.fileName = path.basename(data.filePath)
            finalData.filePath = fileName
        }

        const result = await db.updateEmployeeDocument(finalData)
        if (result.success) notifyDbUpdate({ table: 'employee_documents', action: 'update' })
        return result
    } catch (error) {
        console.error('Employee document update error:', error)
        return { success: false, error: error.message }
    }
})


// Global Search
ipcMain.handle('global:search', async (event, companyId, query) => {
    if (!query || query.length < 2) return { success: true, data: [] }
    try {
        const q = query.toLocaleLowerCase('tr-TR').replace(/\s/g, '')
        const [vehiclesRes, employeesRes, customersRes] = await Promise.all([
            db.getVehicles(companyId, false).catch(() => ({ success: false })),
            db.getEmployees(companyId, false).catch(() => ({ success: false })),
            db.getCustomers(companyId, 0).catch(() => ({ success: false }))
        ])

        const results = []
        const vehicles = (vehiclesRes && vehiclesRes.success) ? (vehiclesRes.data || []) : []
        const employees = (employeesRes && employeesRes.success) ? (employeesRes.data || []) : []
        const customers = (customersRes && customersRes.success) ? (customersRes.data || []) : []

        // Search Vehicles
        if (Array.isArray(vehicles)) {
            vehicles.forEach(v => {
                if (!v) return
                const plate = (v.plate?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                const brand = (v.brand?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                const model = (v.model?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                if (plate.includes(q) || brand.includes(q) || model.includes(q)) {
                    results.push({ id: v.id, type: 'vehicle', title: v.plate, subtitle: `${v.brand || ''} ${v.model || ''}`, icon: 'Car' })
                }
            })
        }

        // Search Employees
        if (Array.isArray(employees)) {
            employees.forEach(e => {
                if (!e) return
                const firstName = e.first_name?.toLocaleLowerCase('tr-TR') || ''
                const lastName = e.last_name?.toLocaleLowerCase('tr-TR') || ''
                const fullName = `${firstName}${lastName}`.replace(/\s/g, '')
                const phone = (e.phone?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                const pos = (e.position?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                if (fullName.includes(q) || phone.includes(q) || pos.includes(q)) {
                    results.push({ id: e.id, type: 'employee', title: `${e.first_name} ${e.last_name}`, subtitle: e.position || 'Personel', icon: 'User' })
                }
            })
        }

        // Search Customers
        if (Array.isArray(customers)) {
            customers.forEach(c => {
                if (!c) return
                const name = (c.name?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                const phone = (c.phone?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                const company = (c.tax_office?.toLocaleLowerCase('tr-TR') || '').replace(/\s/g, '')
                if (name.includes(q) || phone.includes(q) || company.includes(q)) {
                    results.push({ id: c.id, type: 'customer', title: c.name, subtitle: c.phone || 'Müşteri', icon: 'Building2' })
                }
            })
        }

        return { success: true, data: results.slice(0, 15) }
    } catch (error) {
        console.error('Global search error:', error)
        return { success: false, error: error.message }
    }
})

// Archive handler
ipcMain.handle('archive:item', async (event, table, id, isArchived) => {
    return await db.archiveItem(table, id, isArchived)
})

// Works & Timesheets
ipcMain.handle('works:getAll', async (event, companyId, isArchived) => {
    return db.getWorks(companyId, isArchived)
})
ipcMain.handle('works:getDetails', async (event, id) => {
    return db.getWorkDetails(id)
})
ipcMain.handle('works:create', async (event, data) => {
    return db.createWork(data)
})
ipcMain.handle('works:update', async (event, data) => {
    return db.updateWork(data)
})
ipcMain.handle('works:delete', async (event, id) => {
    return db.deleteWork(id)
})

// Customers
ipcMain.handle('customers:getAll', async (event, companyId, isArchived) => {
    return db.getCustomers(companyId, isArchived)
})
ipcMain.handle('customers:getDetails', async (event, id) => {
    return db.getCustomerDetails(id)
})
ipcMain.handle('customers:create', async (event, data) => {
    return db.createCustomer(data)
})
ipcMain.handle('customers:update', async (event, data) => {
    return db.updateCustomer(data)
})
ipcMain.handle('customers:delete', async (event, id) => {
    return db.deleteCustomer(id)
})

ipcMain.handle('workItems:create', async (event, data) => {
    return db.addWorkItem(data)
})
ipcMain.handle('workItems:bulkCreate', async (event, data) => {
    return db.addBulkWorkItems(data)
})
ipcMain.handle('workItems:update', async (event, data) => {
    return db.updateWorkItem(data)
})
ipcMain.handle('workItems:delete', async (event, id) => {
    return db.deleteWorkItem(id)
})
ipcMain.handle('workItems:bulkDelete', async (event, ids) => {
    return db.deleteBulkWorkItems(ids)
})

// Dashboard stats
ipcMain.handle('dashboard:getStats', async (event, companyId) => {
    return await db.getDashboardStats(companyId)
})

ipcMain.handle('dashboard:getUpcoming', async (event, companyId) => {
    return await db.getUpcomingEvents(companyId)
})

ipcMain.handle('dashboard:getRecentActivity', async (event, companyId) => {
    return await db.getRecentActivity(companyId)
})

// ============ DATA MANAGEMENT ============

ipcMain.handle('data:export', async (event, payload) => {
    try {
        const userId = payload.userId

        // Fetch companies to get a relevant backup name
        const companies = await db.getCompanies(userId)
        const companyName = companies.length > 0 ? companies[0].name : "system"

        // Determine Encryption Key (Currently unused for raw zip, but can ZIP encrypt later)
        let key = currentSessionKey || LEGACY_KEY

        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Tam Güvenli Yedekleme (ZIP)',
            defaultPath: `muayen-yedek-${companyName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.zip`,
            filters: [
                { name: 'Güvenli Yedek Arşivi', extensions: ['zip'] }
            ]
        })

        if (!filePath) {
            return { success: false, error: 'İşlem iptal edildi' }
        }

        // We now bypass JSON serialization and just zip the pristine SQLite database file
        createBackupZip(filePath)

        return { success: true, filePath }
    } catch (error) {
        console.error('Backup error:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('data:import', async (event, userId) => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Yedeği Geri Yükle',
            properties: ['openFile'],
            filters: [
                { name: 'Yedek Arşivi', extensions: ['zip'] }
            ]
        })

        if (!filePaths || filePaths.length === 0) {
            return { success: false, error: 'Dosya seçilmedi' }
        }

        const zip = new AdmZip(filePaths[0])
        const zipEntries = zip.getEntries()

        // Locate the database file within the zip (it should be at the root of the zip archive as 'aractakip.db')
        const dbEntry = zipEntries.find(entry => entry.entryName === "aractakip.db" || entry.entryName.endsWith("aractakip.db"))

        if (!dbEntry) {
            // Check for legacy data.json just to reject gracefully
            const legacyEntry = zipEntries.find(entry => entry.entryName === "data.json" || entry.entryName === "data.enc")
            if (legacyEntry) {
                return { success: false, error: 'Eski JSON formatlı yedekler Prisma mimarisi ile uyumlu değildir. Lütfen SQL yedeklerini kullanın.' }
            }
            return { success: false, error: 'Geçersiz yedek dosyası (Veritabanı bulunamadı)' }
        }

        const userDataPath = app.getPath('userData')

        // 1. Disconnect Prisma to unlock the file
        const prismaClient = getPrismaClient()
        await prismaClient.$disconnect()
        log.info('Prisma client disconnected for restore.')

        // 2. Extract and Overwrite the Database File
        const dataDir = path.join(userDataPath, 'data')
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true })
        }

        // Write the DB file directly
        const newDbContent = dbEntry.getData()
        const targetDbPath = path.join(dataDir, 'aractakip.db')
        fs.writeFileSync(targetDbPath, newDbContent)
        log.info('Database file successfully overwritten from backup.')

        // 3. Extract Files (Images, Documents)
        const filesDir = path.join(userDataPath, 'files')
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true })
        }

        zipEntries.forEach(entry => {
            if (entry.entryName.startsWith("files/") && !entry.isDirectory) {
                try {
                    zip.extractEntryTo(entry, filesDir, false, true)
                } catch (err) {
                    console.warn('Failed to extract file:', entry.entryName, err)
                }
            }
        })

        // Notify frontend to hard reload
        mainWindow.webContents.send('db-update', 'companies')

        // IMPORTANT: We must reload the app to reinitialize Prisma with the new DB safely.
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Geri Yükleme Başarılı',
            message: 'Veritabanı başarıyla geri yüklendi. Değişikliklerin uygulanabilmesi için uygulama yeniden başlatılacak.',
            buttons: ['Tamam']
        }).then(() => {
            app.relaunch()
            app.quit()
        })

        return { success: true }
    } catch (error) {
        console.error('Import error:', error)
        // Force app quit if it fails mid-restore to prevent db corruption state
        app.relaunch()
        app.quit()
        return { success: false, error: error.message }
    }
})



// ============ SETTINGS & AUTO BACKUP ============

const settingsPath = path.join(app.getPath('userData'), 'settings.json')
let backupInterval = null

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        }
    } catch (error) {
        console.error('Settings load error:', error)
    }
    return { autoBackup: false, frequency: 'daily', backupPath: '', lastBackup: {} }
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        setupAutoBackup(settings) // Re-setup when saved
        setupArventoPolling(settings) // Re-setup Arvento polling when settings are saved
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

// Encryption Helpers
// Encryption Helpers
const LEGACY_KEY = crypto.scryptSync('muayen-app-secure-key-v1', 'salt', 32)
const IV_LENGTH = 16
let currentSessionKey = null

function deriveKey(passwordHash) {
    return crypto.scryptSync(passwordHash, 'salt', 32)
}

function encryptData(text, key) {
    const finalKey = key || LEGACY_KEY
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv('aes-256-cbc', finalKey, iv)
    let encrypted = cipher.update(text)
    encrypted = Buffer.concat([encrypted, cipher.final()])
    return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decryptData(text, key) {
    const finalKey = key || LEGACY_KEY
    const textParts = text.split(':')
    const iv = Buffer.from(textParts.shift(), 'hex')
    const encryptedText = Buffer.from(textParts.join(':'), 'hex')
    const decipher = crypto.createDecipheriv('aes-256-cbc', finalKey, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    return decrypted.toString()
}

// Helper for ZIP creation
function createBackupZip(outputPath) {
    try {
        const zip = new AdmZip()
        const userDataPath = app.getPath('userData')

        // 1. Add the Database file directly to the ZIP
        const dbPath = path.join(userDataPath, 'data', 'aractakip.db')
        if (fs.existsSync(dbPath)) {
            zip.addLocalFile(dbPath)
        } else {
            console.warn('Backup: aractakip.db not found at', dbPath)
        }

        // 2. Add physical files (images/documents)
        const filesDir = path.join(userDataPath, 'files')
        if (fs.existsSync(filesDir)) {
            zip.addLocalFolder(filesDir, "files")
        }

        zip.writeZip(outputPath)
        return true
    } catch (error) {
        console.error('Zip creation error:', error)
        throw error
    }
}

async function performAutoBackup(companyId, backupPath) {
    try {
        console.log('Starting auto backup for company:', companyId)

        // Use a generic name if company is not fetched, or rely on active company ID
        const fileName = `autobackup-system-${new Date().toISOString().split('T')[0]}.zip`
        const fullPath = path.join(backupPath, fileName)

        createBackupZip(fullPath)

        console.log('Auto backup saved to:', fullPath)
        return true
    } catch (error) {
        console.error('Auto backup failed:', error)
        return false
    }
}

function setupAutoBackup(settings) {
    if (backupInterval) clearInterval(backupInterval)

    if (!settings.autoBackup || !settings.backupPath) return

    console.log('Setting up auto backup:', settings.frequency)

    // Check every hour
    backupInterval = setInterval(async () => {
        const currentSettings = loadSettings()
        const now = new Date()

        // Skip if autoBackup was turned off in settings file manually
        if (!currentSettings.autoBackup || !currentSettings.backupPath) return

        const lastBackupTime = new Date(currentSettings.lastBackup?.global || 0)
        let shouldBackup = false

        const diffTime = now - lastBackupTime
        if (currentSettings.frequency === 'daily') {
            if (diffTime > 24 * 60 * 60 * 1000) shouldBackup = true
        } else if (currentSettings.frequency === 'weekly') {
            if (diffTime > 7 * 24 * 60 * 60 * 1000) shouldBackup = true
        } else if (currentSettings.frequency === 'monthly') {
            if (diffTime > 30 * 24 * 60 * 60 * 1000) shouldBackup = true
        }

        if (shouldBackup) {
            // Since our backup creates a ZIP of the entire database, 
            // we only need to run it once, not per company.
            const success = await performAutoBackup('system', currentSettings.backupPath)
            
            if (success) {
                currentSettings.lastBackup = { global: now.toISOString() }
                saveSettings(currentSettings)
                log.info('Auto backup completed successfully')
            } else {
                log.error('Auto backup failed')
            }
        }
    }, 60 * 60 * 1000) // Check every hour
}

let arventoPollingInterval = null

function setupArventoPolling(settings) {
    if (arventoPollingInterval) {
        clearInterval(arventoPollingInterval)
        arventoPollingInterval = null
    }

    if (!settings.arvento || !settings.arvento.enabled) {
        log.info('Arvento background polling is disabled')
        return
    }

    const intervalMinutes = parseInt(settings.arvento.interval || 3)
    log.info(`Setting up Arvento background polling (every ${intervalMinutes} minutes)`)
    // Run once immediately
    db.getArventoVehicleStatus().catch(err => {
        log.error('Arvento background polling immediate run error:', err.message)
    })

    // Check and fetch every X minutes
    arventoPollingInterval = setInterval(async () => {
        try {
            const currentSettings = loadSettings()
            if (currentSettings && currentSettings.arvento && currentSettings.arvento.enabled) {
                log.info('Arvento background polling run...')
                await db.getArventoVehicleStatus()
            }
        } catch (err) {
            log.error('Arvento background polling error:', err.message)
        }
    }, intervalMinutes * 60 * 1000)
}

ipcMain.handle('settings:get', () => {
    return loadSettings()
})

ipcMain.handle('settings:save', (event, newSettings) => {
    return saveSettings(newSettings)
})

// Arvento API Handlers
ipcMain.handle('arvento:testConnection', async (event, credentials) => {
    return await db.testArventoConnection(credentials)
})
ipcMain.handle('arvento:getStatus', async () => {
    return await db.getArventoVehicleStatus()
})
ipcMain.handle('arvento:getMappings', async () => {
    return await db.getArventoLicensePlateNodeMappings()
})
ipcMain.handle('arvento:getInfo', async () => {
    return await db.getArventoVehicleInfo()
})
ipcMain.handle('arvento:getDailyReport', async (event, date) => {
    return await db.getArventoVehicleDailyStatus(date)
})
ipcMain.handle('arvento:getAlarms', async () => {
    return await db.getArventoAlarms()
})
ipcMain.handle('arvento:getHistory', async (event, filters) => {
    return await db.getArventoHistory(filters)
})

// Personnel Settings
ipcMain.handle('settings:getDepartments', async (event, companyId) => db.getDepartments(companyId))
ipcMain.handle('settings:createDepartment', async (event, data) => {
    const result = await db.createDepartment(data)
    if (result.success) notifyDbUpdate({ table: 'departments', action: 'create' })
    return result
})
ipcMain.handle('settings:updateDepartment', async (event, data) => {
    const result = await db.updateDepartment(data)
    if (result.success) notifyDbUpdate({ table: 'departments', action: 'update' })
    return result
})
ipcMain.handle('settings:deleteDepartment', async (event, id) => {
    const result = await db.deleteDepartment(id)
    if (result.success) notifyDbUpdate({ table: 'departments', action: 'delete' })
    return result
})

ipcMain.handle('settings:getLeaveTypes', async (event, companyId) => db.getLeaveTypes(companyId))
ipcMain.handle('settings:createLeaveType', async (event, data) => {
    const result = await db.createLeaveType(data)
    if (result.success) notifyDbUpdate({ table: 'leave_types', action: 'create' })
    return result
})
ipcMain.handle('settings:updateLeaveType', async (event, data) => {
    const result = await db.updateLeaveType(data)
    if (result.success) notifyDbUpdate({ table: 'leave_types', action: 'update' })
    return result
})
ipcMain.handle('settings:deleteLeaveType', async (event, id) => {
    const result = await db.deleteLeaveType(id)
    if (result.success) notifyDbUpdate({ table: 'leave_types', action: 'delete' })
    return result
})

ipcMain.handle('settings:getDocumentCategories', async (event, companyId) => db.getDocumentCategories(companyId))
ipcMain.handle('settings:createDocumentCategory', async (event, data) => {
    const result = await db.createDocumentCategory(data)
    if (result.success) notifyDbUpdate({ table: 'document_categories', action: 'create' })
    return result
})
ipcMain.handle('settings:updateDocumentCategory', async (event, data) => {
    const result = await db.updateDocumentCategory(data)
    if (result.success) notifyDbUpdate({ table: 'document_categories', action: 'update' })
    return result
})
ipcMain.handle('settings:deleteDocumentCategory', async (event, id) => {
    const result = await db.deleteDocumentCategory(id)
    if (result.success) notifyDbUpdate({ table: 'document_categories', action: 'delete' })
    return result
})

// Vehicle Types
ipcMain.handle('settings:getVehicleTypes', async (event, companyId) => db.getVehicleTypes(companyId))
ipcMain.handle('settings:createVehicleType', async (event, data) => {
    const result = await db.createVehicleType(data)
    if (result.success) notifyDbUpdate({ table: 'vehicle_types', action: 'create' })
    return result
})
ipcMain.handle('settings:updateVehicleType', async (event, data) => {
    const result = await db.updateVehicleType(data)
    if (result.success) notifyDbUpdate({ table: 'vehicle_types', action: 'update' })
    return result
})
ipcMain.handle('settings:deleteVehicleType', async (event, id) => {
    const result = await db.deleteVehicleType(id)
    if (result.success) notifyDbUpdate({ table: 'vehicle_types', action: 'delete' })
    return result
})

ipcMain.handle('settings:selectFolder', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Yedekleme Klasörü Seç',
        properties: ['openDirectory', 'createDirectory']
    })
    return { filePaths }
})

// Initialize auto backup and notifications on app start
app.on('ready', () => {
    const settings = loadSettings()
    setupAutoBackup(settings)
    setupArventoPolling(settings)
    setupNotificationCheck()
})

let notificationInterval = null
let notifiedEvents = new Set() // Store keys to avoid double notifying in same session

async function checkAndNotify() {
    const settings = loadSettings()
    if (!settings.userId) return

    try {
        const companies = await db.getCompanies(settings.userId)
        if (!companies.success) return

        for (const company of companies.data) {
            const result = await db.getUpcomingEvents(company.id)
            if (result.success) {
                // Filter events based on user preferences
                const preferences = settings.notificationPreferences || {}
                const criticalEvents = result.data.filter(e => {
                    // Check if this category is enabled (default to true if not set)
                    const isEnabled = preferences[e.eventType] !== false
                    if (!isEnabled) return false

                    const eventDate = new Date(e.date)
                    const now = new Date()
                    const diffDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24))
                    return diffDays < 3 
                })

                for (const event of criticalEvents) {
                    const eventKey = `${event.eventType}-${event.id}-${event.date}`
                    if (!notifiedEvents.has(eventKey)) {
                        let title = 'Hatırlatma'
                        let body = ''

                        const formattedDate = new Date(event.date).toLocaleDateString('tr-TR')
                        const daysUntil = Math.ceil((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24))
                        const timeStatus = daysUntil < 0 ? 'GECİKTİ!' : (daysUntil === 0 ? 'BUGÜN!' : `${daysUntil} gün kaldı`)

                        switch (event.eventType) {
                            case 'maintenance':
                                title = `Bakım: ${event.plate}`
                                body = `${event.plate} plakalı aracın bakımı yaklaşıyor (${timeStatus}). Tarih: ${formattedDate}`
                                break
                            case 'inspection':
                                title = `Muayene: ${event.plate}`
                                body = `${event.plate} plakalı aracın ${event.type} zamanı (${timeStatus}). Tarih: ${formattedDate}`
                                break
                            case 'insurance':
                                title = `Sigorta: ${event.plate}`
                                body = `${event.plate} plakalı aracın ${event.type} süresi doluyor (${timeStatus}). Tarih: ${formattedDate}`
                                break
                            case 'employee_document':
                                title = `Personel: ${event.employeeName}`
                                body = `${event.employeeName} isimli personelin ${event.type} süresi doluyor (${timeStatus}). Tarih: ${formattedDate}`
                                break
                            case 'finance_check':
                                title = `Finans: Çek/Senet`
                                body = `${event.type} vadesi geldi (${timeStatus}). Tutar: ${event.amount ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(event.amount) : ''}`
                                break
                            case 'reminder':
                                title = event.type
                                body = `${event.description || 'Hatırlatma zamanı geldi.'} (${timeStatus})`
                                break
                            default:
                                title = event.plate || event.employeeName || 'Önemli Hatırlatma'
                                body = `${event.type} (${timeStatus}). Tarih: ${formattedDate}`
                        }
                        
                        if (Notification.isSupported()) {
                            new Notification({ 
                                title, 
                                body,
                                icon: path.join(__dirname, '../resources/icon.png')
                            }).show()
                        }
                        
                        notifiedEvents.add(eventKey)
                    }
                }
            }
        }
    } catch (error) {
        log.error('Periodic notification check failed:', error)
    }
}

async function checkPeriodicSummary() {
    // Check for Daily Summary
    await checkAndNotifySummary()
}

async function checkAndNotifySummary() {
    const settings = loadSettings()
    if (!settings.notificationSummaryEnabled || !settings.notificationSummaryTime || !settings.userId) return

    const now = new Date()
    const currentHourMin = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    if (currentHourMin !== settings.notificationSummaryTime) return

    const todayStr = now.toISOString().split('T')[0]
    const eventKey = `summary-${settings.userId}-${todayStr}`
    
    if (notifiedEvents.has(eventKey)) return

    try {
        const companies = await db.getCompanies(settings.userId)
        if (!companies.success) return

        let totalUpcoming = 0
        let summaryLines = []

        for (const company of companies.data) {
            const result = await db.getUpcomingEvents(company.id)
            if (result.success && result.data.length > 0) {
                const criticalCount = result.data.length
                totalUpcoming += criticalCount
                
                // Categorize
                const categories = {}
                result.data.forEach(e => {
                    const cat = e.eventType === 'maintenance' ? 'Bakım' : 
                                e.eventType === 'inspection' ? 'Muayene' :
                                e.eventType === 'insurance' ? 'Sigorta' : 'Diğer'
                    categories[cat] = (categories[cat] || 0) + 1
                })
                
                const catStr = Object.entries(categories).map(([k, v]) => `${v} ${k}`).join(', ')
                summaryLines.push(`${company.name}: ${criticalCount} işlem (${catStr})`)
            }
        }

        if (totalUpcoming > 0) {
            if (Notification.isSupported()) {
                new Notification({
                    title: `Günlük Hatırlatıcı Özeti`,
                    body: `Takip etmeniz gereken ${totalUpcoming} güncel işlem var.\n${summaryLines.slice(0, 3).join('\n')}${summaryLines.length > 3 ? '\n...' : ''}`,
                    icon: path.join(__dirname, '../resources/icon.png')
                }).show()
            }
            notifiedEvents.add(eventKey)
        }
    } catch (error) {
        log.error('Summary notification failed:', error)
    }
}

function setupNotificationCheck() {
    if (notificationInterval) clearInterval(notificationInterval)
    // Every 30 minutes for general checks
    notificationInterval = setInterval(checkAndNotify, 30 * 60 * 1000)
    
    // Every 1 minute for daily summary time-check
    setInterval(checkPeriodicSummary, 60 * 1000)

    // Run first checks after a short delay
    setTimeout(() => {
        checkAndNotify()
        checkPeriodicSummary()
    }, 10000)
}


// ============ AUTO UPDATER ============

// Configure auto updater
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

// Update Events
autoUpdater.on('checking-for-update', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status: 'checking' })
})

autoUpdater.on('update-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status: 'available', info })
})

autoUpdater.on('update-not-available', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status: 'not-available', info })
})

autoUpdater.on('error', (err) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status: 'error', error: err.message })
})

autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-progress', progressObj)
})

autoUpdater.on('update-downloaded', (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update-status', { status: 'downloaded', info })
})

// Update IPC Handlers
ipcMain.handle('app:checkForUpdates', () => {
    // Check if we are in development mode
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
        return { status: 'dev-mode', message: 'Geliştirici modunda güncelleme kontrolü yapılamaz.' }
    }

    try {
        autoUpdater.checkForUpdates()
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('app:downloadUpdate', () => {
    autoUpdater.downloadUpdate()
})

ipcMain.handle('app:quitAndInstall', () => {
    autoUpdater.quitAndInstall()
})

ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
})

ipcMain.on('app:openExternal', (event, url) => {
    require('electron').shell.openExternal(url)
})

// File handlers
ipcMain.handle('files:select', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Belgeler', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'] }
        ]
    })
    return result
})

ipcMain.handle('files:save', async (event, sourcePath) => {
    if (!sourcePath) return null
    try {
        const userDataPath = app.getPath('userData')
        const filesDir = path.join(userDataPath, 'files')
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true })
        }

        const ext = path.extname(sourcePath)
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
        const destPath = path.join(filesDir, fileName)

        fs.copyFileSync(sourcePath, destPath)
        return fileName
    } catch (error) {
        console.error('File save error:', error)
        return null
    }
})

ipcMain.handle('files:open', async (event, fileName) => {
    if (!fileName) return
    const userDataPath = app.getPath('userData')
    const filePath = path.join(userDataPath, 'files', fileName)
    if (fs.existsSync(filePath)) {
        await shell.openPath(filePath)
    }
})

// Document Management Handlers
ipcMain.handle('documents:add', async (event, data) => {
    try {
        const userDataPath = app.getPath('userData')
        const filesDir = path.join(userDataPath, 'files')

        // Ensure directory exists
        if (!fs.existsSync(filesDir)) {
            fs.mkdirSync(filesDir, { recursive: true })
        }

        const sourcePath = data.filePath
        const ext = path.extname(sourcePath)
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
        const destPath = path.join(filesDir, fileName)

        // Copy file
        fs.copyFileSync(sourcePath, destPath)

        // Add to DB
        const result = await db.addDocument({
            vehicleId: data.vehicleId,
            relatedType: data.relatedType,
            relatedId: data.relatedId,
            fileName: data.fileName || path.basename(sourcePath),
            filePath: fileName, // Store relative path (filename only)
            fileType: ext,
            startDate: data.startDate,
            endDate: data.endDate
        })

        return result
    } catch (error) {
        console.error('Document add error:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('documents:getByVehicle', (event, vehicleId) => {
    return db.getDocumentsByVehicle(vehicleId)
})

ipcMain.handle('documents:getByCompany', (event, companyId) => {
    return db.getDocumentsByCompany(companyId)
})

ipcMain.handle('documents:delete', (event, id) => {
    try {
        // 1. Get info to find file
        const docResult = db.getDocument(id)
        if (docResult.success && docResult.data) {
            const fileName = docResult.data.file_path
            const userDataPath = app.getPath('userData')
            const filePath = path.join(userDataPath, 'files', fileName)

            // 2. Delete physical file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
        }

        // 3. Delete from DB
        return db.deleteDocument(id)
    } catch (error) {
        console.error('Document delete error:', error)
        return { success: false, error: error.message }
    }
})

ipcMain.handle('documents:open', async (event, fileName) => {
    if (!fileName) return 'No filename provided'
    const userDataPath = app.getPath('userData')
    const filePath = path.join(userDataPath, 'files', fileName)
    if (fs.existsSync(filePath)) {
        const error = await shell.openPath(filePath)
        return error // Returns error string or empty string if success
    }
    return 'File not found at: ' + filePath
})

ipcMain.handle('documents:readData', async (event, fileName) => {
    try {
        if (!fileName) return { success: false, error: 'No filename' }
        const userDataPath = app.getPath('userData')
        const filePath = path.join(userDataPath, 'files', fileName)

        if (!fs.existsSync(filePath)) {
            return { success: false, error: 'File not found' }
        }

        const ext = path.extname(fileName).toLowerCase()
        const mimeTypes = {
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.pdf': 'application/pdf'
        }

        const mimeType = mimeTypes[ext]
        if (!mimeType) {
            return { success: false, error: 'Preview not supported for this file type' }
        }

        const fileData = fs.readFileSync(filePath, { encoding: 'base64' })
        return { success: true, data: `data:${mimeType};base64,${fileData}`, type: mimeType }
    } catch (error) {
        console.error('Read data error:', error)
        return { success: false, error: error.message }
    }
})

// Add PDF Save Handler
ipcMain.handle('save-pdf', async (event) => {
    try {
        const win = BrowserWindow.fromWebContents(event.sender)
        
        const { canceled, filePath } = await dialog.showSaveDialog(win, {
            title: 'PDF Olarak Kaydet',
            defaultPath: `Rapor-${Date.now()}.pdf`,
            filters: [
                { name: 'PDF Belgeleri', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        const pdfData = await win.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'printableArea' } // Allow default margins but capture perfectly
        });

        fs.writeFileSync(filePath, pdfData);
        return { success: true, filePath };
    } catch (err) {
        console.error('Save PDF Error:', err);
        return { success: false, error: err.message };
    }
})

// Report PDF - Hidden window approach (no visible window opens)
ipcMain.handle('save-report-pdf', async (event, route = '/print') => {
    let hiddenWin = null;
    try {
        const parentWin = BrowserWindow.fromWebContents(event.sender);

        // Show save dialog first
        const { canceled, filePath } = await dialog.showSaveDialog(parentWin, {
            title: 'Belgeyi PDF Olarak Kaydet',
            defaultPath: `Belge_${new Date().toISOString().split('T')[0]}.pdf`,
            filters: [
                { name: 'PDF Belgeleri', extensions: ['pdf'] }
            ]
        });

        if (canceled || !filePath) return { success: false, canceled: true };

        // Create hidden window
        hiddenWin = new BrowserWindow({
            width: 1200,
            height: 900,
            show: false,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                contextIsolation: true,
                nodeIntegration: false
            }
        });

        // Load the print page route
        const baseURL = process.env.NODE_ENV === 'development' || !app.isPackaged
            ? `http://localhost:5173/#${route}`
            : `file://${path.join(__dirname, '../dist/index.html')}#${route}`;

        await hiddenWin.loadURL(baseURL);

        // Inject the data directly to avoid localStorage sync issues
        const storedData = await parentWin.webContents.executeJavaScript(`localStorage.getItem('printDocData')`);
        const printData = await parentWin.webContents.executeJavaScript(`localStorage.getItem('printData')`);
        
        if (storedData) {
            await hiddenWin.webContents.executeJavaScript(`
                localStorage.setItem('printDocData', ${JSON.stringify(storedData)});
                window.dispatchEvent(new Event('storage'));
                if (window.refreshPrintData) window.refreshPrintData();
            `);
        }
        if (printData) {
            await hiddenWin.webContents.executeJavaScript(`
                localStorage.setItem('printData', ${JSON.stringify(printData)});
                window.dispatchEvent(new Event('storage'));
                if (window.refreshPrintData) window.refreshPrintData();
            `);
        }

        // Wait for content to fully render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Generate PDF
        const pdfData = await hiddenWin.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
            margins: { marginType: 'default' }
        });

        fs.writeFileSync(filePath, pdfData);

        hiddenWin.close();
        hiddenWin = null;

        return { success: true, filePath };
    } catch (err) {
        console.error('Report PDF Error:', err);
        if (hiddenWin && !hiddenWin.isDestroyed()) {
            hiddenWin.close();
        }
        return { success: false, error: err.message };
    }
})
