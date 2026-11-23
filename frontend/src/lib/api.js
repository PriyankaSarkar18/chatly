import axios from 'axios';

const TOKEN_KEY = 'chatly.token';

export const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

const apiUrl = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: apiUrl,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      window.dispatchEvent(new Event('chatly:auth-expired'));
    }
    const message =
      error.response?.data?.message || error.message || 'Network error, please try again';
    return Promise.reject(new Error(message));
  }
);

/** Resolves attachment paths so they work behind the dev proxy and in production. */
export const assetUrl = (value) => {
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const base = apiUrl.replace(/\/api\/?$/, '');
  return `${base}${value.startsWith('/') ? value : `/${value}`}`;
};

export default api;
