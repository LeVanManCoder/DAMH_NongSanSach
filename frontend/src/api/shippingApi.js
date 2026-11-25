import axiosClient from './axiosClient.js'

const shippingApi = {
  calculate: (data, config) =>
    axiosClient.post('/shipping/calculate', data, config),
}

export default shippingApi
