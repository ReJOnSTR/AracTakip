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
      return match[1];
    }
  } catch (e) {
    console.warn('Failed to parse dynamic host:', e);
  }
  return null;
}

// Sanitize malformed or partial URLs (e.g. ttp://127.0.0.1:9999 -> http://127.0.0.1:9999)
export function sanitizeUrl(url: string): string {
  if (!url) return 'http://127.0.0.1:9999';
  let cleaned = url.trim();
  if (cleaned.startsWith('ttp://')) {
    cleaned = 'h' + cleaned;
  } else if (cleaned.startsWith('ttps://')) {
    cleaned = 'h' + cleaned;
  }
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `http://${cleaned.replace(/^[^\w]+/, '')}`;
  }
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }
  return cleaned;
}

let baseURL = 'http://127.0.0.1:9999';

export async function getStoredApiUrl(): Promise<string> {
  const stored = await SecureStore.getItemAsync(API_URL_KEY);
  // Default to 127.0.0.1:9999 which is 100% reliable for local Mac Express backend
  let targetUrl = 'http://127.0.0.1:9999';

  if (stored) {
    const cleanStored = sanitizeUrl(stored);
    if (!cleanStored.includes('192.168.1.') && !cleanStored.includes('10.0.')) {
      targetUrl = cleanStored;
    }
  }

  baseURL = targetUrl;
  await SecureStore.setItemAsync(API_URL_KEY, targetUrl);
  api.defaults.baseURL = `${targetUrl}/api`;
  return targetUrl;
}

export async function setApiUrl(url: string): Promise<void> {
  const cleanUrl = sanitizeUrl(url);
  baseURL = cleanUrl;
  await SecureStore.setItemAsync(API_URL_KEY, cleanUrl);
  api.defaults.baseURL = `${cleanUrl}/api`;
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
  const base = api.defaults.baseURL ? api.defaults.baseURL.replace(/\/api$/, '') : 'http://127.0.0.1:9999';
  return `${base}/uploads/${filePath}`;
}

export default api;
