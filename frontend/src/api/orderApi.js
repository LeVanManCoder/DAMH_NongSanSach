import axiosClient from './axiosClient.js'

const orderApi = {
  create: (data) => axiosClient.post('/orders', data),
}

export default orderApi
