import axiosClient from './axiosClient.js'

const productApi = {
  getProducts: (params) => axiosClient.get('/products', { params }),
  getProduct: (productId) => axiosClient.get(`/products/${productId}`),
}

export default productApi
