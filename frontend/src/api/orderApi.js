import axiosClient from './axiosClient.js'

const orderApi = {
  getOrders: (params, config) =>
    axiosClient.get('/orders', { ...config, params }),
  getMyOrders: (params, config) =>
    axiosClient.get('/orders', { ...config, params }),
  create: (data) => axiosClient.post('/orders', data),
  updateStatus: (orderId, status) =>
    axiosClient.put(`/orders/${orderId}/status`, { trang_thai: status }),
  submitComplaint: (orderId, formData) =>
    axiosClient.post(`/orders/${orderId}/complaints`, formData, {
      headers: { 'Content-Type': undefined },
    }),
}

export default orderApi
