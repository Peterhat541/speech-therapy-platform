import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
};

export const patientsAPI = {
  list: (params) => api.get('/patients', { params }),
  get: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
};

export const appointmentsAPI = {
  list: (params) => api.get('/appointments', { params }),
  today: () => api.get('/appointments/today'),
  get: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  addNotes: (id, data) => api.post(`/appointments/${id}/notes`, data),
};

export const exercisesAPI = {
  list: (params) => api.get('/exercises', { params }),
  get: (id) => api.get(`/exercises/${id}`),
  create: (data) => api.post('/exercises', data),
  update: (id, data) => api.put(`/exercises/${id}`, data),
  delete: (id) => api.delete(`/exercises/${id}`),
  assign: (data) => api.post('/exercises/assign', data),
  updateProgress: (id, data) => api.put(`/exercises/progress/${id}`, data),
};

export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
  confirm: (id, data) => api.put(`/payments/${id}/confirm`, data),
  summary: () => api.get('/payments/summary'),
};

export const reportsAPI = {
  dashboard: () => api.get('/reports/dashboard'),
  patients: () => api.get('/reports/patients'),
  appointments: () => api.get('/reports/appointments'),
};

export default api;
