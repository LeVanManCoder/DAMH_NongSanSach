import axiosClient from './axiosClient.js'

const subscriptionApi = {
  getPlans: (config) => axiosClient.get('/subscription-plans', config),
  getSubscriptions: (params, config) =>
    axiosClient.get('/subscriptions', { ...config, params }),
  create: (data) => axiosClient.post('/subscriptions', data),
  updateStatus: (subscriptionId, status) =>
    axiosClient.patch(`/subscriptions/${subscriptionId}/status`, {
      trang_thai: status,
    }),
}

export default subscriptionApi
