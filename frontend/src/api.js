const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

export async function apiRequest(path, { body, headers = {}, ...options } = {}) {
  const token = localStorage.getItem('access_token')
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }
  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: requestHeaders,
    body: body === undefined || body instanceof FormData ? body : JSON.stringify(body),
  })
  const responseText = await response.text()
  const data = responseText ? JSON.parse(responseText) : null

  if (!response.ok) {
    if (response.status === 401 && token) {
      localStorage.removeItem('access_token')
      window.dispatchEvent(new Event('auth:session-expired'))
    }
    const validationMessage = Object.values(data?.errors || {}).flat().join(' ')
    const error = new Error(validationMessage || data?.message || `Yêu cầu thất bại (${response.status}).`)
    error.status = response.status
    throw error
  }

  return data
}
