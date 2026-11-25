import axiosClient from './axiosClient.js'

const traceApi = {
  getTrace: (qrCode, config) =>
    axiosClient.get(`/trace/${encodeURIComponent(qrCode)}`, config),
}

export default traceApi
