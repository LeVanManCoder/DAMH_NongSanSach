import axiosClient from './axiosClient.js'

const addressApi = {
  getAddresses: (config) => axiosClient.get('/addresses', config),
  create: (data) => axiosClient.post('/addresses', data),
  update: (addressId, data) => axiosClient.put(`/addresses/${addressId}`, data),
  remove: (addressId) => axiosClient.delete(`/addresses/${addressId}`),
  setDefault: (addressId) => axiosClient.patch(`/addresses/${addressId}/default`),
}

export default addressApi
