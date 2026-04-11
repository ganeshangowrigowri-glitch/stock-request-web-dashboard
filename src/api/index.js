import axios from 'axios';

const API_URL = 'https://stock-request-system-backend-production.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

export const getAllRequests = async () => {
  const response = await api.get('/requests');
  return response.data;
};

export const getRequestById = async (id) => {
  const response = await api.get(`/requests/${id}`);
  return response.data;
};

export const approveRequest = async (id, items) => {
  const response = await api.put(`/requests/${id}/approve`, { items });
  return response.data;
};

export const rejectRequest = async (id) => {
  const response = await api.put(`/requests/${id}/reject`);
  return response.data;
};

export const deleteRequest = async (id) => {
  const response = await api.delete(`/requests/${id}`);
  return response.data;
};

export const clearOldRequests = async () => {
  const response = await api.delete('/requests/clear/old');
  return response.data;
};

export const getSalesSummary = async (categoryId, filter) => {
  const response = await api.get(`/requests/sales/summary?category_id=${categoryId}&filter=${filter}`);
  return response.data;
};

export const getAllBrands = async () => {
  const response = await api.get('/brand-management');
  return response.data;
};

export const addBrand = async (data) => {
  const response = await api.post('/brand-management', data);
  return response.data;
};

export const updateBrand = async (id, data) => {
  const response = await api.put(`/brand-management/${id}`, data);
  return response.data;
};

export const deleteBrand = async (id) => {
  const response = await api.delete(`/brand-management/${id}`);
  return response.data;
};

export const getAllPrices = async () => {
  const response = await api.get('/prices');
  return response.data;
};

export const updatePrice = async (id, price) => {
  const response = await api.put(`/prices/${id}`, { price });
  return response.data;
};

export const getAllNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

export const deleteNotification = async (id) => {
  const response = await api.delete(`/notifications/${id}`);
  return response.data;
};

export const clearAllNotifications = async () => {
  const response = await api.delete('/notifications/clear/all');
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/categories');
  return response.data;
};
// ===== NEW SHOP MANAGEMENT FUNCTIONS =====
export const getShops = async () => {
  const response = await api.get('/shops');
  return response.data;
};

export const addShop = async (shop_name) => {
  const response = await api.post('/shops', { shop_name });
  return response.data;
};

export const updateShop = async (id, shop_name) => {
  const response = await api.put(`/shops/${id}`, { shop_name });
  return response.data;
};

export const deleteShop = async (id) => {
  const response = await api.delete(`/shops/${id}`);
  return response.data;
};
export const getApprovedSummary = async (categoryId, filter) => {
  const response = await api.get(`/requests/approved/summary?category_id=${categoryId}&filter=${filter}`);
  return response.data;
};

export default api;
