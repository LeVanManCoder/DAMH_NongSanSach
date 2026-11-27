import axiosClient from './axiosClient.js'

const productApi = {
  getProducts: (params, config) => axiosClient.get('/products', { params, ...config }),
  getCategories: (config) => axiosClient.get('/categories', config),
  getFarmProducts: (config) => axiosClient.get('/farm/products', config),
  getProduct: (slug, config) =>
    axiosClient.get(`/products/${encodeURIComponent(slug)}`, config),
  getReviews: (productId, params, config) =>
    axiosClient.get(`/products/${productId}/reviews`, { ...config, params }),
}

export default productApi
