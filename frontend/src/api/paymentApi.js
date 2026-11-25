import axiosClient from './axiosClient.js'

const paymentApi = {
  create: (data) => axiosClient.post('/payments/create', data),
  sendIpn: (data) => axiosClient.post('/payments/ipn', data),
}

export default paymentApi
