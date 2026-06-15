import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { authService } from '../services/auth';
import { companyService } from '../services/dataServices';
import { setApiUrl, getStoredApiUrl, clearToken } from '../services/api';

interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

interface Company {
  id: number;
  name: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  companies: Company[];
  selectedCompanyId: number | null;
  apiUrl: string;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (credentials: { username?: string; email?: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setSelectedCompany: (id: number) => void;
  updateApiUrl: (url: string) => Promise<void>;
  fetchCompanies: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  companies: [],
  selectedCompanyId: null,
  apiUrl: 'http://192.168.1.100:9999',
  isLoading: true,
  isAuthenticated: false,

  login: async (credentials) => {
    try {
      const result = await authService.login(credentials);
      if (result.success) {
        set({
          user: result.user,
          token: result.token,
          isAuthenticated: true,
        });
        await get().fetchCompanies();
        return { success: true };
      }
      return { success: false, error: result.error || 'Giriş başarısız' };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Bağlantı hatası';
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    await clearToken();
    set({
      user: null,
      token: null,
      companies: [],
      selectedCompanyId: null,
      isAuthenticated: false,
    });
  },

  loadSession: async () => {
    try {
      const apiUrl = await getStoredApiUrl();
      const token = await authService.getStoredToken();

      if (token) {
        // Try to fetch companies to validate token
        try {
          const companiesRes = await companyService.getAll();
          if (companiesRes.success && companiesRes.data?.length > 0) {
            const savedCompanyId = await SecureStore.getItemAsync('kontrol_selected_company');
            set({
              token,
              isAuthenticated: true,
              companies: companiesRes.data,
              selectedCompanyId: savedCompanyId ? parseInt(savedCompanyId) : companiesRes.data[0].id,
              apiUrl,
              isLoading: false,
            });
            return;
          }
        } catch {
          // Token expired or invalid
          await clearToken();
        }
      }

      set({ isLoading: false, apiUrl });
    } catch {
      set({ isLoading: false });
    }
  },

  setSelectedCompany: (id) => {
    set({ selectedCompanyId: id });
    SecureStore.setItemAsync('kontrol_selected_company', id.toString());
  },

  updateApiUrl: async (url) => {
    await setApiUrl(url);
    set({ apiUrl: url });
  },

  fetchCompanies: async () => {
    try {
      const result = await companyService.getAll();
      if (result.success && result.data?.length > 0) {
        const savedCompanyId = await SecureStore.getItemAsync('kontrol_selected_company');
        const validId = savedCompanyId && result.data.some((c: Company) => c.id === parseInt(savedCompanyId))
          ? parseInt(savedCompanyId)
          : result.data[0].id;

        set({
          companies: result.data,
          selectedCompanyId: validId,
        });
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  },
}));
