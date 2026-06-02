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

export const getStatus = () => api.get('/status').then((r) => r.data)

export const uploadFile = (tipo, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/upload/${tipo}`, fd).then((r) => r.data)
}

export const runGerar = () => api.post('/run/gerar').then((r) => r.data)
export const runMetricas = () => api.post('/run/metricas').then((r) => r.data)
export const runDistancias = () => api.post('/run/distancias').then((r) => r.data)
export const runViz = () => api.post('/run/viz').then((r) => r.data)

export const getGraphData = () => api.get('/data/graph').then((r) => r.data)
export const getMetrics = () => api.get('/data/metrics').then((r) => r.data)
export const getRegions = () => api.get('/data/regions').then((r) => r.data)
export const getGrades = () => api.get('/data/grades').then((r) => r.data)
export const getEgo = () => api.get('/data/ego').then((r) => r.data)
export const getRoutes = () => api.get('/data/routes').then((r) => r.data)

export const runAlgorithm = (params) => api.post('/algorithm', params).then((r) => r.data)

export const getCaminhosObrigatorios = () =>
  api.get('/data/caminhos-obrigatorios').then((r) => r.data)

export const getAviationStats = () =>
  api.get('/data/aviation-stats').then((r) => r.data)

// ---- Parte 2 — Rede NBA ----
export const getNbaGraph = () => api.get('/parte2/graph').then((r) => r.data)
export const getNbaReport = () => api.get('/parte2/report').then((r) => r.data)
export const getNbaStats = () => api.get('/parte2/stats').then((r) => r.data)
export const runNbaAlgorithm = (params) =>
  api.post('/parte2/algorithm', params).then((r) => r.data)
