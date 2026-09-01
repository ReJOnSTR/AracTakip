export const settingsService = {
    get: () => window.electronAPI.getSettings(),
    save: (settings) => window.electronAPI.saveSettings(settings),
    selectFolder: () => window.electronAPI.selectFolder()
}
