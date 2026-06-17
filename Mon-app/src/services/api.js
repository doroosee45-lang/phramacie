import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach token
api.interceptors.request.use(
  (config) => {
    const auth = JSON.parse(localStorage.getItem('pharmaerp-auth') || '{}');
    const token = auth?.state?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

// Response interceptor — handle errors
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const msg = err.response?.data?.message || 'Erreur réseau';
    if (err.response?.status === 401) {
      localStorage.removeItem('pharmaerp-auth');
      window.location.href = '/login';
      return Promise.reject(err);
    }
    if (err.response?.status >= 500) {
      toast.error('Erreur serveur. Réessayez.');
    }
    return Promise.reject({ ...err, message: msg });
  }
);

export default api;

// API service helpers
export const productService = {
  getAll:     (params) => api.get('/products', { params }),
  getOne:     (id)     => api.get(`/products/${id}`),
  create:     (data)   => api.post('/products', data),
  update:     (id, d)  => api.put(`/products/${id}`, d),
  delete:     (id)     => api.delete(`/products/${id}`),
  search:     (q)      => api.get('/products/search', { params: { q } }),
  expiring:   (days)   => api.get('/products/expiring', { params: { days } }),
  lowStock:   ()       => api.get('/products/low-stock'),
  addLot:     (id, d)  => api.post(`/products/${id}/lots`, d),
  adjust:     (id, d)  => api.post(`/products/${id}/adjust`, d),
  uploadImage:(id, file) => {
    const formData = new FormData();
    formData.append('image', file);
    return api.post(`/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const saleService = {
  create:     (data)   => api.post('/sales', data),
  getAll:     (params) => api.get('/sales', { params }),
  getOne:     (id)     => api.get(`/sales/${id}`),
  refund:     (id)     => api.post(`/sales/${id}/refund`),
  todaySummary: ()     => api.get('/sales/summary/today'),
};

export const dashboardService = {
  kpis:         ()       => api.get('/dashboard/kpis'),
  salesChart:   (days)   => api.get('/dashboard/sales-chart', { params: { days } }),
  categoryChart:()       => api.get('/dashboard/category-chart'),
  topProducts:  (params) => api.get('/dashboard/top-products', { params }),
  stockMovements:(days)  => api.get('/dashboard/stock-movements', { params: { days } }),
  paymentMethods:()      => api.get('/dashboard/payment-methods'),
};

export const clientService = {
  getAll:  (params) => api.get('/clients', { params }),
  getOne:  (id)     => api.get(`/clients/${id}`),
  create:  (data)   => api.post('/clients', data),
  update:  (id, d)  => api.put(`/clients/${id}`, d),
  getSales:(id)     => api.get(`/clients/${id}/sales`),
};

export const orderService = {
  getAll:    (params)  => api.get('/orders', { params }),
  getOne:    (id)      => api.get(`/orders/${id}`),
  create:    (data)    => api.post('/orders', data),
  update:    (id, d)   => api.put(`/orders/${id}`, d),
  setStatus: (id, d)   => api.put(`/orders/${id}/status`, d),
};

export const supplierService = {
  getAll:  (params) => api.get('/suppliers', { params }),
  getOne:  (id)     => api.get(`/suppliers/${id}`),
  create:  (data)   => api.post('/suppliers', data),
  update:  (id, d)  => api.put(`/suppliers/${id}`, d),
};

export const prescriptionService = {
  getAll:  (params) => api.get('/prescriptions', { params }),
  create:  (data)   => api.post('/prescriptions', data),
  remove:  (id)     => api.delete(`/prescriptions/${id}`),
};

export const invoiceService = {
  getAll:  (params) => api.get('/invoices', { params }),
  getOne:  (id)     => api.get(`/invoices/${id}`),
  create:  (data)   => api.post('/invoices', data),
  pay:     (id, d)  => api.put(`/invoices/${id}/pay`, d),
  cancel:  (id)     => api.delete(`/invoices/${id}`),
};

export const alertService = {
  getAll:   (params) => api.get('/alerts', { params }),
  resolve:  (id, d)  => api.put(`/alerts/${id}/resolve`, d),
  readAll:  ()       => api.put('/alerts/read-all'),
};

export const analyticsService = {
  ruptureForecast: ()     => api.get('/analytics/rupture-forecast'),
  aiSuggest:       (data) => api.post('/analytics/ai-suggest', data),
  anomalies:       ()     => api.get('/analytics/anomalies'),
  trends:          (weeks) => api.get('/analytics/trends', { params: { weeks } }),
};

export const financeService = {
  summary: ()      => api.get('/finance/summary'),
  trend:   (days)  => api.get('/finance/trend', { params: { days } }),
  ledger:  (params) => api.get('/finance/ledger', { params }),
};

export const settingsService = {
  get:    ()    => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const archiveService = {
  getAll:  (params) => api.get('/archive', { params }),
  summary: ()       => api.get('/archive/summary'),
};

export const userService = {
  getAll:  ()      => api.get('/users'),
  create:  (data)  => api.post('/users', data),
  update:  (id, d) => api.put(`/users/${id}`, d),
  delete:  (id)    => api.delete(`/users/${id}`),
};
