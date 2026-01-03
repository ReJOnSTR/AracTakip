const { app, BrowserWindow, ipcMain, dialog, Menu, nativeImage, globalShortcut } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const db = require('./database/db')

const store = new Store()

let mainWindow


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
            nodeIntegration: false
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
    app.setAppUserModelId('com.aractakip.app') // Must match appId in package.json
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
    await db.initializeDatabase()
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// ============ IPC HANDLERS ============

// Auth handlers
ipcMain.handle('auth:register', async (event, userData) => {
    return db.registerUser(userData)
})

ipcMain.handle('auth:login', async (event, credentials) => {
    return db.loginUser(credentials)
})

// Company handlers
ipcMain.handle('companies:getAll', async (event, userId) => {
    return db.getCompanies(userId)
})

ipcMain.handle('companies:create', async (event, companyData) => {
    return db.createCompany(companyData)
})

ipcMain.handle('companies:update', async (event, companyData) => {
    return db.updateCompany(companyData)
})

ipcMain.handle('companies:delete', async (event, companyId) => {
    return db.deleteCompany(companyId)
})

// Vehicle handlers
ipcMain.handle('vehicles:getAll', async (event, companyId) => {
    return db.getVehicles(companyId)
})

ipcMain.handle('vehicles:getById', async (event, vehicleId) => {
    return db.getVehicleById(vehicleId)
})

ipcMain.handle('vehicles:create', async (event, vehicleData) => {
    return db.createVehicle(vehicleData)
})

ipcMain.handle('vehicles:update', async (event, vehicleData) => {
    return db.updateVehicle(vehicleData)
})

ipcMain.handle('vehicles:delete', async (event, vehicleId) => {
    return db.deleteVehicle(vehicleId)
})

// Maintenance handlers
ipcMain.handle('maintenances:getByVehicle', async (event, vehicleId) => {
    return db.getMaintenances(vehicleId)
})

ipcMain.handle('maintenances:getAll', async (event, companyId) => {
    return db.getAllMaintenances(companyId)
})

ipcMain.handle('maintenances:create', async (event, data) => {
    return db.createMaintenance(data)
})

ipcMain.handle('maintenances:update', async (event, data) => {
    return db.updateMaintenance(data)
})

ipcMain.handle('maintenances:delete', async (event, id) => {
    return db.deleteMaintenance(id)
})

// Inspection handlers
ipcMain.handle('inspections:getByVehicle', async (event, vehicleId) => {
    return db.getInspections(vehicleId)
})

ipcMain.handle('inspections:getAll', async (event, companyId) => {
    return db.getAllInspections(companyId)
})

ipcMain.handle('inspections:create', async (event, data) => {
    return db.createInspection(data)
})

ipcMain.handle('inspections:update', async (event, data) => {
    return db.updateInspection(data)
})

ipcMain.handle('inspections:delete', async (event, id) => {
    return db.deleteInspection(id)
})

// Insurance handlers
ipcMain.handle('insurances:getByVehicle', async (event, vehicleId) => {
    return db.getInsurances(vehicleId)
})

ipcMain.handle('insurances:getAll', async (event, companyId) => {
    return db.getAllInsurances(companyId)
})

ipcMain.handle('insurances:create', async (event, data) => {
    return db.createInsurance(data)
})

ipcMain.handle('insurances:update', async (event, data) => {
    return db.updateInsurance(data)
})

ipcMain.handle('insurances:delete', async (event, id) => {
    return db.deleteInsurance(id)
})

// Assignment handlers
ipcMain.handle('assignments:getByVehicle', async (event, vehicleId) => {
    return db.getAssignments(vehicleId)
})

ipcMain.handle('assignments:getAll', async (event, companyId) => {
    return db.getAllAssignments(companyId)
})

ipcMain.handle('assignments:create', async (event, data) => {
    return db.createAssignment(data)
})

ipcMain.handle('assignments:update', async (event, data) => {
    return db.updateAssignment(data)
})

ipcMain.handle('assignments:delete', async (event, id) => {
    return db.deleteAssignment(id)
})

// Service handlers
ipcMain.handle('services:getByVehicle', async (event, vehicleId) => {
    return db.getServices(vehicleId)
})

ipcMain.handle('services:getAll', async (event, companyId) => {
    return db.getAllServices(companyId)
})

ipcMain.handle('services:create', async (event, data) => {
    return db.createService(data)
})

ipcMain.handle('services:update', async (event, data) => {
    return db.updateService(data)
})

ipcMain.handle('services:delete', async (event, id) => {
    return db.deleteService(id)
})

// Dashboard stats
ipcMain.handle('dashboard:getStats', async (event, companyId) => {
    return db.getDashboardStats(companyId)
})

ipcMain.handle('dashboard:getUpcoming', async (event, companyId) => {
    return db.getUpcomingEvents(companyId)
})

ipcMain.handle('dashboard:getRecentActivity', async (event, companyId) => {
    return db.getRecentActivity(companyId)
})

// ============ DATA MANAGEMENT ============

ipcMain.handle('data:export', async (event, companyId) => {
    try {
        const result = db.getCompanyCompleteData(companyId)
        if (!result.success) {
            return { success: false, error: result.error }
        }

        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Verileri Dışa Aktar',
            defaultPath: `yedek-${result.data.company.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`,
            filters: [
                { name: 'JSON Dosyası', extensions: ['json'] }
            ]
        })

        if (!filePath) {
            return { success: false, error: 'İşlem iptal edildi' }
        }

        fs.writeFileSync(filePath, JSON.stringify(result.data, null, 2))
        return { success: true, filePath }
    } catch (error) {
        return { success: false, error: error.message }
    }
})

ipcMain.handle('data:import', async (event, userId) => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Verileri İçe Aktar',
            properties: ['openFile'],
            filters: [
                { name: 'JSON Dosyası', extensions: ['json'] }
            ]
        })

        if (!filePaths || filePaths.length === 0) {
            return { success: false, error: 'Dosya seçilmedi' }
        }

        const fileContent = fs.readFileSync(filePaths[0], 'utf-8')
        const backupData = JSON.parse(fileContent)

        const result = db.importCompanyData(userId, backupData)
        return result
    } catch (error) {
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
        return { success: true }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

function performAutoBackup(companyId, backupPath) {
    try {
        console.log('Starting auto backup for company:', companyId)
        const result = db.getCompanyCompleteData(companyId)
        if (result.success) {
            const fileName = `autobackup-${result.data.company.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`
            const fullPath = path.join(backupPath, fileName)
            fs.writeFileSync(fullPath, JSON.stringify(result.data, null, 2))
            console.log('Auto backup saved to:', fullPath)
            return true
        }
    } catch (error) {
        console.error('Auto backup failed:', error)
    }
    return false
}

function setupAutoBackup(settings) {
    if (backupInterval) clearInterval(backupInterval)

    if (!settings.autoBackup || !settings.backupPath) return

    console.log('Setting up auto backup:', settings.frequency)

    // Check every hour
    backupInterval = setInterval(async () => {
        const currentSettings = loadSettings()
        const now = new Date()

        // Skip if no user ID configured in settings (wait for user to save settings once)
        if (!currentSettings.userId) return

        const companiesResult = db.getCompanies(currentSettings.userId)
        // Logic: specific to logged in user? Auto-backup implies background. 
        // For simplicity: backup all companies associated with "last active" user or just loop all companies?
        // Let's loop all companies in DB? Or just the active one?
        // Better: Backup ALL companies.

        // Actually, let's keep it simple. Only if app is running.
        // We need 'lastBackup' timestamp per company or global?
        // Let's store 'lastBackup' timestamp in settings.

        const lastBackupTime = new Date(currentSettings.lastBackup?.global || 0)
        let shouldBackup = false

        if (currentSettings.frequency === 'daily') {
            // Check if 24 hours passed
            if (now - lastBackupTime > 24 * 60 * 60 * 1000) shouldBackup = true
        } else if (currentSettings.frequency === 'weekly') {
            if (now - lastBackupTime > 7 * 24 * 60 * 60 * 1000) shouldBackup = true
        } else if (currentSettings.frequency === 'monthly') {
            if (now - lastBackupTime > 30 * 24 * 60 * 60 * 1000) shouldBackup = true
        }

        if (shouldBackup) {
            // Backup all companies
            // Need a way to get all companies ID. 
            // db.getCompanies requires userId. 
            // Let's assume user ID 1 for single-user desktop app, or find a way to get all.
            // db.js doesn't have getAllCompanies without userId.
            // Let's hack: backup active user's companies? We don't know who is active in main process easily.
            // Let's add db.getAllCompanies system-wide or just skip for now and iterate if we can.
            // Safer: Just backup when user is logged in?

            // Re-read requirement: "istediğin şirketin... hatta otomatik yedeklemede ekle".
            // Implementation: When app is running, if time has passed, backup. 
            // Since we can't easily get current user in main process (it's stateless regarding auth usually unless stored),
            // let's rely on frontend triggering it? No, backup should be backend.

            // Let's add `db.getAllCompaniesSystem()`?
            // Or just store userId in settings when they turn on auto backup.

            if (currentSettings.userId) {
                const companies = db.getCompanies(currentSettings.userId)
                if (companies.success) {
                    let allSuccess = true
                    for (const comp of companies.data) {
                        const success = performAutoBackup(comp.id, currentSettings.backupPath)
                        if (!success) allSuccess = false
                    }

                    if (allSuccess) {
                        currentSettings.lastBackup = { global: now.toISOString() }
                        saveSettings(currentSettings)
                    }
                }
            }
        }
    }, 60 * 60 * 1000) // Check every hour
}

ipcMain.handle('settings:get', () => {
    return loadSettings()
})

ipcMain.handle('settings:save', (event, newSettings) => {
    return saveSettings(newSettings)
})

ipcMain.handle('settings:selectFolder', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Yedekleme Klasörü Seç',
        properties: ['openDirectory', 'createDirectory']
    })
    return { filePaths }
})

// Initialize auto backup on app start
app.on('ready', () => {
    setupAutoBackup(loadSettings())
})


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

