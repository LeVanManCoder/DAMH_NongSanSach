import axiosClient from './axiosClient.js'

const batchApi = {
  getBatches: (params) => axiosClient.get('/batches', { params }),
  getWasteDashboard: (params) => axiosClient.get('/batches/waste', { params }),
}

export default batchApi
