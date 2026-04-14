export const authService = {
    register: (userData) => window.electronAPI.register(userData),
    login: (credentials) => window.electronAPI.login(credentials),
    changePassword: (data) => window.electronAPI.changePassword(data),
    updateUser: (data) => window.electronAPI.updateUser(data)
}
