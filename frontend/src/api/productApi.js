import axiosClient from './axiosClient.js'

const productApi = {
  getProducts: (params, config) => axiosClient.get('/products', { params, ...config }),
  getCategories: (config) => axiosClient.get('/categories', config),
  getFarmProducts: (config) => axiosClient.get('/farm/products', config),
  getProduct: (slug, config) =>
    axiosClient.get(`/products/${encodeURIComponent(slug)}`, config),
}

export default productApi
