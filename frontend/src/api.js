import axios from 'axios';

// Detectar automáticamente la URL de la API según dónde esté alojada la app
export const getBaseURL = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '');
  }
  return '/api';
};

export const getAssetUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  let clean = path.replace(/^\/+/, '');
  clean = clean.replace(/^(static\/)+/i, 'static/');
  if (!clean.toLowerCase().startsWith('static/')) {
    clean = `static/${clean}`;
  }
  return `/${clean}`;
};

export const getCabinaSede = () => {
  return localStorage.getItem('cata_cabina_sede') || 'universal';
};

export const setCabinaSede = (sede) => {
  const s = String(sede || '').toLowerCase();
  let clean = 'universal';
  if (s.includes('jeru')) clean = 'jerusalen';
  else if (s === 'central') clean = 'central';
  localStorage.setItem('cata_cabina_sede', clean);
  return clean;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar token de docente y sede activa de la cabina
api.interceptors.request.use((config) => {
  // Si se envían archivos o formularios FormData, no forzar application/json para que el navegador cree el boundary multipart correcto
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  const token = localStorage.getItem('cata_admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    config.headers['X-Admin-Token'] = token;
  }

  // Inyectar sede de la cabina si no se especificó otra explícitamente
  if (!config.headers['X-Sede']) {
    config.headers['X-Sede'] = getCabinaSede();
  }

  return config;
});

export default api;
