import api, { setToken, clearToken, getStoredToken, getStoredApiUrl } from './api';

export const authService = {
  login: async (credentials: { username?: string; email?: string; password: string }) => {
    const res = await api.post('/login', credentials);
    if (res.data.success && res.data.token) {
      await setToken(res.data.token);
    }
    return res.data;
  },

  logout: async () => {
    await clearToken();
  },

  getStoredToken,
  getStoredApiUrl,
};
