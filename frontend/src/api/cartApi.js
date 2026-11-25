import axiosClient from './axiosClient.js'

const cartApi = {
  getCart: (config) => axiosClient.get('/cart', config),
  addItem: (data) => axiosClient.post('/cart', data),
  updateItem: (itemId, data) => axiosClient.put(`/cart/${itemId}`, data),
  removeItem: (itemId) => axiosClient.delete(`/cart/${itemId}`),
}

export default cartApi
