import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail
    if (detail) err.message = detail
    return Promise.reject(err)
  },
)

export const getGraphData = () => api.get('/data/graph').then((r) => r.data)

export const runAlgorithm = (params) => api.post('/algorithm', params).then((r) => r.data)

export const getCaminhosObrigatorios = () =>
  api.get('/data/caminhos-obrigatorios').then((r) => r.data)

export const getAviationStats = () =>
  api.get('/data/aviation-stats').then((r) => r.data)

export const getNbaGraph = () => api.get('/parte2/graph').then((r) => r.data)
export const getNbaReport = () => api.get('/parte2/report').then((r) => r.data)
export const getNbaStats = () => api.get('/parte2/stats').then((r) => r.data)
export const runNbaAlgorithm = (params) =>
  api.post('/parte2/algorithm', params).then((r) => r.data)
