import axiosClient from './axiosClient.js'

const cartApi = {
  addItem: (data) => axiosClient.post('/cart', data),
}

export default cartApi
