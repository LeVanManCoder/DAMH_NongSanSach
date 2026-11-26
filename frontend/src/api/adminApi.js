import axiosClient from './axiosClient.js'

const adminApi = {
  getDashboard: (config) => axiosClient.get('/admin/dashboard', config),
  getUsers: (params, config) =>
    axiosClient.get('/admin/users', { ...config, params }),
  updateUserStatus: (userId, isActive) =>
    axiosClient.patch(`/admin/users/${userId}/status`, { is_active: isActive }),
  getAuditLogs: (params, config) =>
    axiosClient.get('/admin/audit-logs', { ...config, params }),
  getCategories: (params, config) =>
    axiosClient.get('/admin/categories', { ...config, params }),
  createCategory: (data) => axiosClient.post('/admin/categories', data),
  updateCategory: (categoryId, data) =>
    axiosClient.put(`/admin/categories/${categoryId}`, data),
  deleteCategory: (categoryId) =>
    axiosClient.delete(`/admin/categories/${categoryId}`),
  getProducts: (params, config) =>
    axiosClient.get('/admin/products', { ...config, params }),
  createProduct: (formData) =>
    axiosClient.post('/admin/products', formData, {
      headers: { 'Content-Type': undefined },
    }),
  updateProduct: (productId, formData) =>
    axiosClient.post(`/admin/products/${productId}`, formData, {
      headers: { 'Content-Type': undefined },
    }),
  deleteProduct: (productId) =>
    axiosClient.delete(`/admin/products/${productId}`),
}

export default adminApi
