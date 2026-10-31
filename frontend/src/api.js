import axios from 'axios';

// Detectar automáticamente la URL de la API según dónde esté alojada la app
export const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  const origin = window.location.origin;
  if (!origin || origin === 'null' || origin.startsWith('file:') || origin === 'http://localhost:5173') {
    return '/api';
  }
  let pathname = window.location.pathname;
  if (!pathname.endsWith('/')) {
    pathname = pathname.substring(0, pathname.lastIndexOf('/') + 1);
  }
  return `${origin}${pathname}api`.replace(/([^:]\/)\/+/g, '$1');
};

export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  let clean = path.replace(/^\/+/, '');
  clean = clean.replace(/^(static\/)+/i, 'static/');
  const apiBase = getBaseURL();
  const rootBase = apiBase.replace(/\/api$/, '');
  return `${rootBase}/${clean}`.replace(/([^:]\/)\/+/g, '$1');
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token de docente en todas las peticiones
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cata_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Admin-Token'] = token;
  }
  return config;
});

export default api;
