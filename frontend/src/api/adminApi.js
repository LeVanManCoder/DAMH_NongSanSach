import axiosClient from './axiosClient.js'

const adminApi = {
  getDashboard: (config) => axiosClient.get('/admin/dashboard', config),
  getUsers: (params, config) =>
    axiosClient.get('/admin/users', { ...config, params }),
  updateUserStatus: (userId, isActive) =>
    axiosClient.patch(`/admin/users/${userId}/status`, { is_active: isActive }),
  getAuditLogs: (params, config) =>
    axiosClient.get('/admin/audit-logs', { ...config, params }),
}

export default adminApi
