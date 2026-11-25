import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    config.__authToken = token
  }

  return config
})

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url?.split('?')[0] ?? ''
    const isLoginRequest = requestUrl.endsWith('/auth/login')
    const requestToken = error.config?.__authToken
    const currentToken = localStorage.getItem('access_token')

    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      requestToken &&
      requestToken === currentToken
    ) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('auth_user')
      window.dispatchEvent(new Event('auth:session-expired'))
    }

    return Promise.reject(error)
  },
)

export default axiosClient
