import axiosClient from './axiosClient.js'

const batchApi = {
  getBatches: (params) => axiosClient.get('/batches', { params }),
  getBatch: (batchId) => axiosClient.get(`/batches/${batchId}`),
  createBatch: (data) => axiosClient.post('/batches', data),
  updateBatch: (batchId, data) => axiosClient.put(`/batches/${batchId}`, data),
  deleteBatch: (batchId) => axiosClient.delete(`/batches/${batchId}`),
  generateQr: (batchId) => axiosClient.post(`/batches/${batchId}/generate-qr`),
  recordWaste: (batchId, data) =>
    axiosClient.post(`/batches/${batchId}/waste`, data),
}

export default batchApi
