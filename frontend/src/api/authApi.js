import axiosClient from './axiosClient.js'

const authApi = {
  register: (data) => axiosClient.post('/auth/register', data),
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  logout: () => axiosClient.post('/auth/logout'),
  me: (config) => axiosClient.get('/auth/me', config),
}

export default authApi
