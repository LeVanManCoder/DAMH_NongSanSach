import axiosClient from './axiosClient.js'

const reviewApi = {
  getProductReviews: (productId, params, config) =>
    axiosClient.get(`/products/${productId}/reviews`, { ...config, params }),
  create: (productId, data) =>
    axiosClient.post(`/products/${productId}/reviews`, data),
}

export default reviewApi
