import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 25000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('narmax_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function kidsApi() {
  const token = sessionStorage.getItem('narmax_kids_token');
  return axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 25000,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export default api;
