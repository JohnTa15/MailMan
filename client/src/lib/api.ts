import axios from 'axios';
import { useAppStore } from '../store/appStore';

/** Running inside the desktop (Electron) or Android (Capacitor) app. */
export function isNativeApp(): boolean {
  const platform = window.Capacitor?.getPlatform?.();
  return !!window.electronAPI || (!!platform && platform !== 'web');
}

/** Turns what someone typed ("mail.example.com") into a server origin. */
export function normalizeServerUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** The API base: the server chosen in the app, else the build's default. */
export function apiBase(): string {
  const server = normalizeServerUrl(useAppStore.getState().serverUrl || '');
  if (server) return `${server}/api`;
  return import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
}

/** The server's own address, for links such as invites. */
export function serverOrigin(): string {
  const base = apiBase();
  return /^https?:/i.test(base) ? base.replace(/\/api$/, '') : window.location.origin;
}

const api = axios.create({ timeout: 30000 });

api.interceptors.request.use((config) => {
  config.baseURL = apiBase();
  const { token } = useAppStore.getState();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // An expired session signs out; a failed sign-in attempt does not
    const url: string = error.config?.url || '';
    if (error.response?.status === 401 && useAppStore.getState().token && !url.startsWith('/auth/')) {
      useAppStore.getState().signOut();
    }
    return Promise.reject(error);
  }
);

/** The server's error message, if it sent one. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Cannot reach the Mailman server.';
    const message = error.response.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message.length) return String(message[0]);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default api;
