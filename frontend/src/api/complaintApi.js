import axiosClient from './axiosClient.js'

const complaintApi = {
  getComplaints: (params, config) =>
    axiosClient.get('/complaints', { ...config, params }),
  updateComplaint: (complaintId, data) =>
    axiosClient.put(`/complaints/${complaintId}`, data),
}

export default complaintApi
