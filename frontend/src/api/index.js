import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export const initiateVerification = async (data) => {
  const response = await api.post('/verification/initiate', data)
  return response.data
}

export const getVerificationStatus = async (requestId) => {
  const response = await api.get(`/verification/status/${requestId}`)
  return response.data
}

export const saveApplication = async (data) => {
  const response = await api.post('/application/save', data)
  return response.data
}

export const getApplication = async (id) => {
  const response = await api.get(`/application/${id}`)
  return response.data
}

export const getAdminMetrics = async () => {
  const response = await api.get('/admin/metrics')
  return response.data
}

export const getAdminVerifications = async (params) => {
  const response = await api.get('/admin/verifications', { params })
  return response.data
}

export default api
