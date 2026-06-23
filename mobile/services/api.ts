import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as Linking from 'expo-linking';

const API_URL_KEY = 'kontrol_api_url';
const TOKEN_KEY = 'kontrol_auth_token';

// Helper to resolve dynamic API URL from packager host
export function getDynamicHost(): string | null {
  try {
    const url = Linking.createURL('/');
    const match = url.match(/exp:\/\/([^:/]+)/);
    if (match && match[1]) {
      const host = match[1];
      if (host !== 'localhost' && host !== '127.0.0.1') {
        return host;
      }
    }
  } catch (e) {
    console.warn('Failed to parse dynamic host:', e);
  }
  return null;
}

let baseURL = 'http://192.168.1.100:9999';

export async function getStoredApiUrl(): Promise<string> {
  const stored = await SecureStore.getItemAsync(API_URL_KEY);
  if (stored) {
    baseURL = stored;
    api.defaults.baseURL = `${stored}/api`;
    return stored;
  }
  
  // Dynamic default based on packager host
  const dynamicHost = getDynamicHost();
  const defaultUrl = dynamicHost ? `http://${dynamicHost}:9999` : 'http://192.168.1.100:9999';
  baseURL = defaultUrl;
  api.defaults.baseURL = `${defaultUrl}/api`;
  return defaultUrl;
}

export async function setApiUrl(url: string): Promise<void> {
  baseURL = url;
  await SecureStore.setItemAsync(API_URL_KEY, url);
  api.defaults.baseURL = `${url}/api`;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

const api = axios.create({
  baseURL: `${baseURL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle errors and auto-recover from DHCP IP changes
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — will be handled by auth store
      clearToken();
      return Promise.reject(error);
    }

    // Check if network connection error (usually occurs when IP changes and backend is unreachable)
    const isNetworkError = !error.response && (
      error.code === 'ERR_NETWORK' ||
      error.message.includes('Network Error') ||
      error.code === 'ECONNABORTED'
    );

    if (isNetworkError) {
      const dynamicHost = getDynamicHost();
      if (dynamicHost) {
        const newUrl = `http://${dynamicHost}:9999`;
        if (baseURL !== newUrl) {
          console.log(`[API] Connection failed to ${baseURL}. Trying auto-recovery to Metro host: ${newUrl}`);
          
          // Update local baseURL and Axios default
          baseURL = newUrl;
          api.defaults.baseURL = `${newUrl}/api`;
          
          try {
            // Lazily require authStore to prevent circular dependency
            const { useAuthStore } = require('../stores/authStore');
            await useAuthStore.getState().updateApiUrl(newUrl);
          } catch (storeErr) {
            await setApiUrl(newUrl);
          }
          
          // Retry the request with the new baseURL
          if (error.config) {
            error.config.baseURL = `${newUrl}/api`;
            if (error.config.url) {
              if (error.config.url.startsWith('http')) {
                error.config.url = error.config.url.replace(/http:\/\/[^/]+/, newUrl);
              }
            }
            return api(error.config);
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export function getFileUrl(filePath: string): string {
  if (!filePath) return '';
  if (filePath.startsWith('http')) return filePath;
  const base = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'http://192.168.1.100:9999';
  return `${base}/uploads/${filePath}`;
}

export default api;
