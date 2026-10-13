import axios from 'axios';
import { useAppStore } from '../store/appStore';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
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
    if (error.response?.status === 401 && useAppStore.getState().token) {
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
  return fallback;
}

export default api;
