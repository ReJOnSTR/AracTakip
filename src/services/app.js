export const appService = {
    getVersion: () => window.electronAPI.getAppVersion(),
    checkForUpdates: () => window.electronAPI.checkForUpdates(),
    quitAndInstall: () => window.electronAPI.quitAndInstall(),

    // PC Features
    getMemoryUsage: () => window.electronAPI.getMemoryUsage(),
    getDiskUsage: () => window.electronAPI.getDiskUsage(),

    // Notifications
    showNotification: (title, body) => window.electronAPI.showNotification(title, body),

    // Utils
    openExternal: (url) => window.electronAPI.openExternal(url),
    downloadGenelge: (url) => window.electronAPI.downloadGenelge(url),
    selectFile: () => window.electronAPI.selectFile(),

    // UI/Context
    showContextMenu: (items) => window.electronAPI.showContextMenu(items),
    onContextAction: (callback) => window.electronAPI.onContextAction(callback),
    removePCListeners: () => window.electronAPI.removePCListeners()
}
