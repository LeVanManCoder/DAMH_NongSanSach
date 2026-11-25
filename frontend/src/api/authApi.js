import axiosClient from './axiosClient.js'

const authApi = {
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  logout: () => axiosClient.post('/auth/logout'),
}

export default authApi
