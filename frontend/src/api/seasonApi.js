import axiosClient from './axiosClient.js'

const seasonApi = {
  getSeasons: (config) => axiosClient.get('/seasons', config),
  createSeason: (data) => axiosClient.post('/seasons', data),
}

export default seasonApi
